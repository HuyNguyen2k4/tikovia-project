require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cấu hình SSL
let sslConfig = false;
// let sslConfig = {
//     ca: process.env.PG_SSL_CA || undefined,
//     rejectUnauthorized: false, // Tạm thời false để xử lý self-signed cert
//     checkServerIdentity: () => undefined, // Bỏ qua kiểm tra server identity
// };

// if (process.env.PG_SSL_CA) {
//     try {
//         const caPath = path.resolve(process.env.PG_SSL_CA);
//         const ca = fs.readFileSync(caPath, 'utf8');

//         sslConfig = {
//             ca: ca,
//             rejectUnauthorized: false, // Tạm thời false để xử lý self-signed cert
//             checkServerIdentity: () => undefined, // Bỏ qua kiểm tra server identity
//         };
//         console.log('✅ SSL CA certificate loaded from:', caPath);
//     } catch (error) {
//         console.error('❌ Failed to load SSL CA certificate:', error.message);
//         process.exit(1);
//     }
// }

// Khởi tạo Pool với cấu hình SSL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: sslConfig,
    max: 20, // Giới hạn tối đa 10 connections
    min: 2, // Giữ tối thiểu 2 connections
    idleTimeoutMillis: 30000, // Đóng connection sau 30s idle
    connectionTimeoutMillis: 5000, // Timeout khi tạo connection mới
    allowExitOnIdle: true, // Cho phép đóng pool khi tất cả connections idle
});

// ✅ Hàm test kết nối, tự log, không cần await bên ngoài
function testConnection() {
    pool.query('SELECT NOW()')
        .then((res) => {
            console.log(
                `✅ PostgreSQL connected! Time: ${res.rows[0].now} | SSL: ${sslConfig ? 'ENABLED' : 'DISABLED'}`
            );
        })
        .catch((err) => {
            console.error('❌ PostgreSQL connection failed!', err.message);
            process.exit(1);
        });
}

// Helper query để dùng xuyên suốt
async function query(text, params) {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error('❌ Query error:', err.message);
        throw err;
    }
}

// Transaction helper
async function withTransaction(work) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Đóng pool khi app tắt (docker, pm2, nodemon)
const gracefulShutdown = () => {
    pool.end()
        .then(() => {
            console.log('🛑 PostgreSQL pool closed.');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Error closing pool:', err.message);
            process.exit(1);
        });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Nodemon restart

module.exports = { pool, query, withTransaction, testConnection };
