const { query, withTransaction } = require('@src/config/dbconnect');

const PUBLIC_FIELDS = `
  id, name
`;

// Map row -> object JS
function toProductCategory(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
    };
}

/* -------------------- BASIC CRUD -------------------- */

// Tạo product category mới
async function createProductCategory({ name }) {
    const sql = `
        INSERT INTO product_categories (name)
        VALUES ($1)
        RETURNING ${PUBLIC_FIELDS}
    `;
    const params = [name];
    const { rows } = await query(sql, params);
    return toProductCategory(rows[0]);
}

// Tìm product category theo ID
async function findById(id) {
    const sql = `SELECT ${PUBLIC_FIELDS} FROM product_categories WHERE id = $1`;
    const { rows } = await query(sql, [id]);
    return toProductCategory(rows[0]);
}

// Tìm product category theo name
async function findByName(name) {
    const sql = `SELECT ${PUBLIC_FIELDS} FROM product_categories WHERE name = $1`;
    const { rows } = await query(sql, [name]);
    return toProductCategory(rows[0]);
}

// Tìm product category theo name không phân biệt hoa thường
async function findByNameInsensitive(name) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM product_categories
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
    `;
    const { rows } = await query(sql, [name]);
    return toProductCategory(rows[0]);
}

// Liệt kê product categories (có hỗ trợ tìm kiếm và phân trang)
async function listProductCategories({ q, limit = 20, offset = 0 } = {}) {
    try {
        const clauses = [];
        const params = [];
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`name ILIKE $${params.length}`);
        }
        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM product_categories
            ${where}
            ORDER BY name ASC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toProductCategory);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách danh mục sản phẩm:', error.message);
        throw new Error('Không thể lấy danh sách danh mục sản phẩm');
    }
}

// Đếm tổng số product categories, có thể kèm theo bộ lọc tìm kiếm
async function countProductCategories({ q } = {}) {
    try {
        const searchQuery = q && q.trim() ? `%${q.trim()}%` : null;
        const clauses = [];
        const params = [];

        if (searchQuery) {
            params.push(searchQuery);
            clauses.push(`name ILIKE $${params.length}`);
        }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM product_categories
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        if (!rows || rows.length === 0) {
            throw new Error('Không thể lấy tổng số danh mục sản phẩm');
        }
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm danh mục sản phẩm:', error.message);
        throw new Error('Không thể lấy tổng số danh mục sản phẩm');
    }
}

// Liệt kê tất cả product categories (hỗ trợ tìm kiếm, KHÔNG phân trang)
async function getAllProdCategory({ q } = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo tên danh mục
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`name ILIKE $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        // 👇 Bỏ LIMIT/OFFSET, chỉ còn ORDER BY
        const sql = `
      SELECT ${PUBLIC_FIELDS}
      FROM product_categories
      ${where}
      ORDER BY name ASC
    `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toProductCategory);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách danh mục sản phẩm:', error.message);
        throw new Error('Không thể lấy danh sách danh mục sản phẩm');
    }
}

// Cập nhật product category
async function updateProductCategory(id, payload = {}) {
    const fields = [];
    const params = [];
    const map = {
        name: 'name',
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
        UPDATE product_categories SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING ${PUBLIC_FIELDS}
    `;
    const { rows } = await query(sql, params);
    return toProductCategory(rows[0]);
}

// Xóa product category
async function deleteProductCategory(id) {
    const sql = `DELETE FROM product_categories WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

// ========== EXTRA HELPERS ========== //

// Tạo hàm deleteMany để xóa nhiều product category cùng lúc (dùng cho fakeData)
async function deleteMany(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `DELETE FROM product_categories WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    createProductCategory,
    findById,
    findByName,
    findByNameInsensitive,
    listProductCategories,
    updateProductCategory,
    deleteProductCategory,
    countProductCategories,
    deleteMany,
    getAllProdCategory, // Lấy tất cả danh mục sản phẩm không phân trang
};
