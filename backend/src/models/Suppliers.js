const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const PUBLIC_FIELDS = `
  id, code, name, phone, email, address, tax_code, note, created_at, updated_at
`;

// Map row -> object JS
function toSupplier(row) {
    if (!row) return null;

    // Helper function để chuyển đổi UTC sang giờ Việt Nam
    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        code: row.code,
        name: row.name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        taxCode: row.tax_code,
        note: row.note,
        createdAt: formatToVietnamTime(row.created_at), // ✅ Thay đổi
        updatedAt: formatToVietnamTime(row.updated_at), // ✅ Thay đổi
    };
}

/* -------------------- BASIC CRUD -------------------- */

// Tạo supplier mới
async function createSupplier({ code, name, phone, email, address, taxCode, note }) {
    const sql = `
        INSERT INTO suppliers (code, name, phone, email, address, tax_code, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${PUBLIC_FIELDS}
    `;
    const params = [code, name, phone, email, address, taxCode, note];
    const { rows } = await query(sql, params);
    return toSupplier(rows[0]);
}

// Tìm supplier theo ID
async function findById(id) {
    const sql = `SELECT ${PUBLIC_FIELDS} FROM suppliers WHERE id = $1`;
    const { rows } = await query(sql, [id]);
    return toSupplier(rows[0]);
}

// Tìm supplier theo code
async function findByCode(code) {
    const sql = `SELECT ${PUBLIC_FIELDS} FROM suppliers WHERE code = $1`;
    const { rows } = await query(sql, [code]);
    return toSupplier(rows[0]);
}

// Tìm supplier theo email
async function findByEmail(email) {
    const sql = `SELECT ${PUBLIC_FIELDS} FROM suppliers WHERE email = $1`;
    const { rows } = await query(sql, [email]);
    return toSupplier(rows[0]);
}

// Tìm supplier theo tax code
async function findByTaxCode(taxCode) {
    const sql = `SELECT ${PUBLIC_FIELDS} FROM suppliers WHERE tax_code = $1`;
    const { rows } = await query(sql, [taxCode]);
    return toSupplier(rows[0]);
}

// Liệt kê suppliers (có hỗ trợ tìm kiếm và phân trang)
async function listSuppliers({ q, limit = 20, offset = 0 } = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(code ILIKE $${params.length} OR name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR address ILIKE $${params.length} OR tax_code ILIKE $${params.length})`
            );
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM suppliers
            ${where}
            ORDER BY name ASC, created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toSupplier);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nhà cung cấp:', error.message);
        throw new Error('Không thể lấy danh sách nhà cung cấp');
    }
}

// Đếm tổng số suppliers, có thể kèm theo bộ lọc tìm kiếm
async function countSuppliers({ q } = {}) {
    try {
        const searchQuery = q && q.trim() ? `%${q.trim()}%` : null;
        const clauses = [];
        const params = [];

        if (searchQuery) {
            params.push(searchQuery);
            clauses.push(
                `(code ILIKE $${params.length} OR name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR address ILIKE $${params.length} OR tax_code ILIKE $${params.length})`
            );
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM suppliers
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        if (!rows || rows.length === 0) {
            throw new Error('Không thể lấy tổng số nhà cung cấp');
        }
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm nhà cung cấp:', error.message);
        throw new Error('Không thể lấy tổng số nhà cung cấp');
    }
}

// Cập nhật supplier
async function updateSupplier(id, payload = {}) {
    const fields = [];
    const params = [];
    const map = {
        code: 'code',
        name: 'name',
        phone: 'phone',
        email: 'email',
        address: 'address',
        taxCode: 'tax_code',
        note: 'note',
    };

    Object.entries(map).forEach(([kSrc, kDb]) => {
        if (payload[kSrc] !== undefined) {
            params.push(payload[kSrc]);
            fields.push(`${kDb} = $${params.length}`);
        }
    });

    if (fields.length === 0) return findById(id);

    params.push(id);
    const sql = `
        UPDATE suppliers SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING ${PUBLIC_FIELDS}
    `;
    const { rows } = await query(sql, params);
    return toSupplier(rows[0]);
}

// Xóa supplier
async function deleteSupplier(id) {
    const sql = `DELETE FROM suppliers WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

// ========== EXTRA HELPERS ========== //

// Tìm suppliers theo danh sách IDs
async function findByIds(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM suppliers
        WHERE id IN (${placeholders})
        ORDER BY name ASC
    `;
    const { rows } = await query(sql, ids);
    return rows.map(toSupplier);
}

// Tạo hàm deleteMany để xóa nhiều supplier cùng lúc (dùng cho fakeData)
async function deleteMany(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `DELETE FROM suppliers WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

// Kiểm tra code có tồn tại chưa (dùng cho validation)
async function isCodeExists(code, excludeId = null) {
    let sql = `SELECT id FROM suppliers WHERE code = $1`;
    const params = [code];

    if (excludeId) {
        params.push(excludeId);
        sql += ` AND id != $${params.length}`;
    }

    const { rowCount } = await query(sql, params);
    return rowCount > 0;
}

// Kiểm tra email có tồn tại chưa (dùng cho validation)
async function isEmailExists(email, excludeId = null) {
    if (!email) return false; // Email không bắt buộc

    let sql = `SELECT id FROM suppliers WHERE email = $1`;
    const params = [email];

    if (excludeId) {
        params.push(excludeId);
        sql += ` AND id != $${params.length}`;
    }

    const { rowCount } = await query(sql, params);
    return rowCount > 0;
}

// Kiểm tra tax code có tồn tại chưa (dùng cho validation)
async function isTaxCodeExists(taxCode, excludeId = null) {
    if (!taxCode) return false; // Tax code không bắt buộc

    let sql = `SELECT id FROM suppliers WHERE tax_code = $1`;
    const params = [taxCode];

    if (excludeId) {
        params.push(excludeId);
        sql += ` AND id != $${params.length}`;
    }

    const { rowCount } = await query(sql, params);
    return rowCount > 0;
}

// Tìm kiếm nâng cao suppliers
async function searchSuppliers({
    code,
    name,
    phone,
    email,
    address,
    taxCode,
    limit = 50,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm chính xác theo từng field
        if (code && code.trim()) {
            params.push(`%${code.trim()}%`);
            clauses.push(`code ILIKE $${params.length}`);
        }

        if (name && name.trim()) {
            params.push(`%${name.trim()}%`);
            clauses.push(`name ILIKE $${params.length}`);
        }

        if (phone && phone.trim()) {
            params.push(`%${phone.trim()}%`);
            clauses.push(`phone ILIKE $${params.length}`);
        }

        if (email && email.trim()) {
            params.push(`%${email.trim()}%`);
            clauses.push(`email ILIKE $${params.length}`);
        }

        if (address && address.trim()) {
            params.push(`%${address.trim()}%`);
            clauses.push(`address ILIKE $${params.length}`);
        }

        if (taxCode && taxCode.trim()) {
            params.push(`%${taxCode.trim()}%`);
            clauses.push(`tax_code ILIKE $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM suppliers
            ${where}
            ORDER BY name ASC, created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toSupplier);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm nhà cung cấp:', error.message);
        throw new Error('Không thể tìm kiếm nhà cung cấp');
    }
}

// Lấy suppliers được tạo gần đây
async function getRecentSuppliers(limit = 10) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM suppliers
        ORDER BY created_at DESC
        LIMIT $1
    `;
    const { rows } = await query(sql, [limit]);
    return rows.map(toSupplier);
}

// Thống kê suppliers theo tháng tạo
// Trả về mảng { month: 'YYYY-MM', count: number }
async function getSupplierCreationStats() {
    const sql = `
        SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count
        FROM suppliers
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
    `;
    const { rows } = await query(sql);
    return rows.map((row) => ({
        month: dayjs.utc(row.month).tz('Asia/Ho_Chi_Minh').format('YYYY-MM'), // ✅ Thay đổi
        count: parseInt(row.count, 10),
    }));
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    // Basic CRUD
    createSupplier,
    findById,
    findByCode,
    findByEmail,
    findByTaxCode,
    listSuppliers,
    updateSupplier,
    deleteSupplier,
    countSuppliers,

    // Helper functions
    findByIds,
    deleteMany,
    isCodeExists,
    isEmailExists,
    isTaxCodeExists,

    // Advanced search & analytics
    searchSuppliers,
    getRecentSuppliers,
    getSupplierCreationStats,
};
