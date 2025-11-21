const { query, withTransaction } = require('@src/config/dbconnect');

const PUBLIC_FIELDS = `
  id, code, name, address, status
`;

// Map row -> object JS
function toDepartment(row) {
    if (!row) return null;
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        address: row.address,
        status: row.status,
    };
}

/* -------------------- BASIC CRUD -------------------- */

// Tạo department mới
async function createDepartment({ code, name, address }) {
    const sql = `
        INSERT INTO departments (code, name, address)
        VALUES ($1, $2, $3)
        RETURNING ${PUBLIC_FIELDS}
    `;
    const params = [code, name, address];
    const { rows } = await query(sql, params);
    return toDepartment(rows[0]);
}

// Tìm department theo ID
async function findById(id) {
    const sql = `SELECT ${PUBLIC_FIELDS} FROM departments WHERE id = $1`;
    const { rows } = await query(sql, [id]);
    return toDepartment(rows[0]);
}

// Tìm department theo code
async function findByCode(code) {
    const sql = `SELECT ${PUBLIC_FIELDS} FROM departments WHERE code = $1`;
    const { rows } = await query(sql, [code]);
    return toDepartment(rows[0]);
}

// Liệt kê departments (có hỗ trợ tìm kiếm và phân trang, bao gồm address)
async function listDepartments({ q, limit = 20, offset = 0 } = {}) {
    try {
        const clauses = [];
        const params = [];
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(code ILIKE $${params.length} OR name ILIKE $${params.length} OR address ILIKE $${params.length})`
            );
        }
        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM departments
            ${where}
            ORDER BY name ASC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toDepartment);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phòng ban:', error.message);
        throw new Error('Không thể lấy danh sách phòng ban');
    }
}

// Đếm tổng số phòng ban, có thể kèm theo bộ lọc tìm kiếm (bao gồm address)
async function countDepartments({ q } = {}) {
    try {
        const searchQuery = q && q.trim() ? `%${q.trim()}%` : null;
        const clauses = [];
        const params = [];

        if (searchQuery) {
            params.push(searchQuery);
            clauses.push(
                `(code ILIKE $${params.length} OR name ILIKE $${params.length} OR address ILIKE $${params.length})`
            );
        }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM departments
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        if (!rows || rows.length === 0) {
            throw new Error('Không thể lấy tổng số phòng ban');
        }
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm phòng ban:', error.message);
        throw new Error('Không thể lấy tổng số phòng ban');
    }
}

// Liệt kê tất cả departments (hỗ trợ tìm kiếm, KHÔNG phân trang, có address)
async function getAllDepartment({ q } = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa (code, name, address)
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(code ILIKE $${params.length} OR name ILIKE $${params.length} OR address ILIKE $${params.length})`
            );
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        // 👇 Bỏ LIMIT/OFFSET, chỉ còn ORDER BY
        const sql = `
      SELECT ${PUBLIC_FIELDS}
      FROM departments
      ${where}
      ORDER BY name ASC
    `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toDepartment);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phòng ban:', error.message);
        throw new Error('Không thể lấy danh sách phòng ban');
    }
}

// Cập nhật department
async function updateDepartment(id, payload = {}) {
    const fields = [];
    const params = [];
    const map = {
        code: 'code',
        name: 'name',
        address: 'address',
        status: 'status',
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
        UPDATE departments SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING ${PUBLIC_FIELDS}
    `;
    const { rows } = await query(sql, params);
    return toDepartment(rows[0]);
}

// Xóa department
async function deleteDepartment(id) {
    const sql = `DELETE FROM departments WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

// ========== EXTRA HELPERS ========== //

// Tạo hàm deleteMany để xóa nhiều department cùng lúc (dùng cho fakeData)
async function deleteMany(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `DELETE FROM departments WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

// ✅ NEW: Thêm hàm tìm kiếm theo tên không phân biệt hoa thường
/**
 * @desc    Tìm department theo tên (không phân biệt hoa thường)
 * @param   {string} name - Tên department
 * @return  {object|null} - Department object hoặc null
 */
async function findByNameInsensitive(name) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM departments
        WHERE name ILIKE $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [name]);
    return toDepartment(rows[0]);
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    createDepartment,
    findById,
    findByCode,
    listDepartments,
    updateDepartment,
    deleteDepartment,
    countDepartments,
    deleteMany,
    getAllDepartment, // Lấy tất cả phòng ban không phân trang
    findByNameInsensitive,
};
