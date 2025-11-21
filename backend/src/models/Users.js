// models/user.model.js
const crypto = require('crypto');
const { query, withTransaction } = require('@src/config/dbconnect');
const { hashPassword, verifyPassword, createPasswordResetToken } = require('@utils/password');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

require('dotenv').config();

/* ========== PUBLIC FIELDS ========== */
const PUBLIC_FIELDS_BASE = `
  id, google_id, avatar, email, username, full_name, phone, status, role,
  department_id, created_at, updated_at
`;

const PUBLIC_FIELDS_JOINED = `
  users.id, users.google_id, users.avatar, users.email, users.username, users.full_name, users.phone, users.status, users.role,
  users.department_id, users.created_at, users.updated_at,
  d.name AS department_name, d.code AS department_code
`;

/* ========== MAPPER ========== */
function toUser(row) {
    if (!row) return null;

    // Helper function để chuyển đổi UTC sang giờ Việt Nam
    const formatToVietnamTime = (date) => {
        if (!date) return null;
        // Chuyển từ UTC sang giờ Việt Nam và trả về ISO string với timezone
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        googleId: row.google_id,
        avatar: row.avatar,
        email: row.email,
        username: row.username,
        fullName: row.full_name,
        phone: row.phone,
        status: row.status,
        role: row.role,
        departmentId: row.department_id,
        departmentName: row.department_name || null,
        departmentCode: row.department_code || null,
        createdAt: formatToVietnamTime(row.created_at), // "2025-10-09T15:00:00+07:00"
        updatedAt: formatToVietnamTime(row.updated_at), // "2025-10-09T15:00:00+07:00"
    };
}

// Helper function để chuyển đổi từ frontend time về UTC cho database
function convertToUTC(dateString) {
    if (!dateString) return null;
    // Nếu dateString đã có timezone thì dayjs sẽ tự động xử lý
    // Nếu không có timezone thì coi như là giờ Việt Nam
    return dayjs.tz(dateString, 'Asia/Ho_Chi_Minh').utc().toDate();
}

/* ========== BASIC CRUD ========== */

async function createUser({
    email,
    username,
    password,
    fullName,
    phone,
    role = 'seller',
    status = 'active',
    googleId = null,
    avatar = null,
    departmentId = null,
}) {
    const hashed = await hashPassword(password);

    const sql = `
    INSERT INTO users (email, username, password, full_name, phone, role, status, google_id, avatar, department_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id
  `;
    const params = [
        email,
        username,
        hashed,
        fullName,
        phone,
        role,
        status,
        googleId,
        avatar,
        departmentId,
    ];
    const { rows } = await query(sql, params);
    return findById(rows[0].id);
}

async function findById(id) {
    const sql = `
    SELECT ${PUBLIC_FIELDS_JOINED}
    FROM users
    LEFT JOIN departments d ON users.department_id = d.id
    WHERE users.id = $1
  `;
    const { rows } = await query(sql, [id]);
    return toUser(rows[0]);
}

async function findByEmail(email) {
    const sql = `
    SELECT ${PUBLIC_FIELDS_JOINED}, users.password
    FROM users
    LEFT JOIN departments d ON users.department_id = d.id
    WHERE users.email = $1
  `;
    const { rows } = await query(sql, [email]);
    if (!rows[0]) return null;
    const { password, ...rest } = rows[0];
    return toUser(rest);
}

async function findByUsername(username) {
    const sql = `
    SELECT ${PUBLIC_FIELDS_JOINED}, users.password
    FROM users
    LEFT JOIN departments d ON users.department_id = d.id
    WHERE users.username = $1
  `;
    const { rows } = await query(sql, [username]);
    if (!rows[0]) return null;
    const { password, ...rest } = rows[0];
    return toUser(rest);
}

// List with optional search & pagination
async function listUsers({ q, role, limit = 20, offset = 0 } = {}) {
    const clauses = [];
    const params = [];

    if (q && q.trim()) {
        params.push(`%${q.trim()}%`);
        clauses.push(`(
      users.email ILIKE $${params.length} OR users.username ILIKE $${params.length} OR
      users.full_name ILIKE $${params.length} OR users.phone ILIKE $${params.length} OR
      users.role ILIKE $${params.length} OR users.status ILIKE $${params.length}
    )`);
    }

    // ✅ Thêm filter theo role (cho việc lấy sellers/admins)
    if (role) {
        if (Array.isArray(role)) {
            params.push(role);
            clauses.push(`users.role = ANY($${params.length}::text[])`);
        } else {
            params.push(role);
            clauses.push(`users.role = $${params.length}`);
        }
    }

    params.push(limit, offset);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const sql = `
    SELECT ${PUBLIC_FIELDS_JOINED}
    FROM users
    LEFT JOIN departments d ON users.department_id = d.id
    ${where}
    ORDER BY users.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
    const { rows } = await query(sql, params);
    return rows.map(toUser);
}

async function countUsers({ q, role } = {}) {
    const clauses = [];
    const params = [];

    if (q && q.trim()) {
        params.push(`%${q.trim()}%`);
        clauses.push(`(
      email ILIKE $${params.length} OR username ILIKE $${params.length} OR
      full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR
      role ILIKE $${params.length} OR status ILIKE $${params.length}
    )`);
    }

    // ✅ Thêm filter theo role
    if (role) {
        if (Array.isArray(role)) {
            params.push(role);
            clauses.push(`role = ANY($${params.length}::text[])`);
        } else {
            params.push(role);
            clauses.push(`role = $${params.length}`);
        }
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `
    SELECT COUNT(*) AS count
    FROM users
    ${where}
  `;
    const { rows } = await query(sql, params);
    return parseInt(rows[0]?.count ?? '0', 10);
}

// Lấy danh sách tất cả users (không phân trang) theo role
const getAllUsersByRole = async (role) => {
    const sql = `
    SELECT ${PUBLIC_FIELDS_JOINED}
    FROM users
    LEFT JOIN departments d ON users.department_id = d.id
    WHERE users.role = $1
    ORDER BY users.created_at DESC
    `;
    const { rows } = await query(sql, [role]);
    return rows.map(toUser);
};

// Lấy tất cả user có role nằm trong mảng roles (không phân trang)
async function getAllUsersByRoles(roles) {
    if (!Array.isArray(roles) || roles.length === 0) return [];
    const sql = `
        SELECT id, full_name, email, role FROM users
        WHERE role = ANY($1::text[]) AND status = 'active'
    `;
    const { rows } = await query(sql, [roles]);
    return rows;
}

async function updateUser(id, payload = {}) {
    const fields = [];
    const params = [];
    const map = {
        email: 'email',
        username: 'username',
        fullName: 'full_name',
        phone: 'phone',
        status: 'status',
        role: 'role',
        googleId: 'google_id',
        avatar: 'avatar',
        departmentId: 'department_id',
    };

    Object.entries(map).forEach(([src, col]) => {
        if (payload[src] !== undefined) {
            params.push(payload[src]);
            fields.push(`${col} = $${params.length}`);
        }
    });

    if (!fields.length) return findById(id);

    // updated_at
    fields.push(`updated_at = now()`);

    params.push(id);
    const sql = `
    UPDATE users SET ${fields.join(', ')}
    WHERE id = $${params.length}
    RETURNING id
  `;
    const { rows } = await query(sql, params);
    return rows[0] ? findById(rows[0].id) : null;
}

async function updatePassword(id, newPlainPassword) {
    const newHash = await hashPassword(newPlainPassword);
    const { rows } = await query(
        `UPDATE users SET password = $1, updated_at = now() WHERE id = $2 RETURNING id`,
        [newHash, id]
    );
    return rows[0] ? findById(rows[0].id) : null;
}

async function deleteUser(id) {
    await query(`DELETE FROM users WHERE id = $1`, [id]);
    return true;
}

// ✅ Thêm hàm findByPhone để validate phone unique
async function findByPhone(phone) {
    const sql = `
    SELECT ${PUBLIC_FIELDS_JOINED}
    FROM users
    LEFT JOIN departments d ON users.department_id = d.id
    WHERE users.phone = $1
  `;
    const { rows } = await query(sql, [phone]);
    return toUser(rows[0]);
}

/* ========== AUTH / LOGIN ========== */

async function login({ email, username, password }) {
    if (!email && !username) return { ok: false, reason: 'missing_credentials' };

    const sql = `
    SELECT id, email, username, full_name AS "fullName", role, status,
           password AS "passwordHash", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM users
    WHERE ${email ? 'email = $1' : 'username = $1'}
  `;
    const params = [email || username];
    const { rows } = await query(sql, params);
    if (!rows[0]) return { ok: false, reason: 'not_found' };

    const found = rows[0];
    const isPasswordValid = await verifyPassword(password, found.passwordHash);
    if (!isPasswordValid) return { ok: false, reason: 'invalid_password' };

    // ✅ Cập nhật format ngày tháng cho login response
    const { passwordHash, ...user } = found;
    return {
        ok: true,
        user: {
            ...user,
            createdAt: dayjs.utc(user.createdAt).tz('Asia/Ho_Chi_Minh').format(),
            updatedAt: dayjs.utc(user.updatedAt).tz('Asia/Ho_Chi_Minh').format(),
        },
    };
}

/* ========== PASSWORD RESET ========== */

async function generatePasswordReset(userId) {
    const { resetToken, passwordResetToken } = createPasswordResetToken({ expiresInMinutes: 10 });
    const { rowCount } = await query(
        `
      UPDATE users
      SET passwordresettoken = $1,
          passwordresetexpires = NOW() + INTERVAL '10 minutes'
      WHERE id = $2
    `,
        [passwordResetToken, userId]
    );
    if (rowCount === 0) throw new Error(`No user updated for id=${userId}.`);
    return resetToken;
}

async function generatePasswordResetForNewUser(userId) {
    const { resetToken, passwordResetToken } = createPasswordResetToken({
        expiresInMinutes: 60 * 24 * 7, // 7 days
    });
    const { rowCount } = await query(
        `
      UPDATE users
      SET passwordresettoken = $1,
          passwordresetexpires = NOW() + INTERVAL '7 days'
      WHERE id = $2
    `,
        [passwordResetToken, userId]
    );
    if (rowCount === 0) throw new Error(`No user updated for id=${userId}.`);
    return resetToken;
}

async function verifyPasswordResetToken(token) {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await query(
        `
      SELECT id
      FROM users
      WHERE passwordresettoken = $1
        AND passwordresetexpires > NOW()
    `,
        [hashed]
    );
    return rows[0] ? findById(rows[0].id) : null;
}

async function clearPasswordReset(userId) {
    await query(
        `UPDATE users SET passwordresettoken = NULL, passwordresetexpires = NULL WHERE id = $1`,
        [userId]
    );
    return true;
}

async function findByIdWithPassword(id) {
    const { rows } = await query(
        `
      SELECT id, email, username, password, full_name, phone, role, status
      FROM users
      WHERE id = $1
    `,
        [id]
    );
    return rows[0] || null;
}

// ========== EXTRA HELPERS ========== //

// Tạo hàm deleteMany để xóa nhiều user (dùng trong fakeData)
async function deleteMany({ where = {} } = {}) {
    const clauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(where)) {
        if (typeof value === 'object' && value !== null) {
            if (value.$like) {
                clauses.push(`${key} LIKE $${paramIndex}`);
                params.push(value.$like);
                paramIndex++;
            }
            // Có thể thêm các toán tử khác như $in, $gt, $lt nếu cần
        } else {
            clauses.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
        }
    }

    if (clauses.length === 0) {
        throw new Error('deleteMany requires at least one condition in "where"');
    }
    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const sql = `DELETE FROM users ${whereClause}`;
    const { rowCount } = await query(sql, params);
    return rowCount;
}

/* ========== EXPORTS ========== */
module.exports = {
    // CRUD
    createUser,
    findById,
    findByEmail,
    findByUsername,
    findByPhone, // ✅ Export findByPhone
    listUsers,
    countUsers,
    updateUser,
    updatePassword,
    deleteUser,

    // Extra
    getAllUsersByRole,
    getAllUsersByRoles,

    // Auth
    login,

    // Password reset
    generatePasswordReset,
    generatePasswordResetForNewUser,
    verifyPasswordResetToken,
    clearPasswordReset,

    // Utils
    findByIdWithPassword,
    deleteMany,
    convertToUTC, // ✅ Export helper function
};
