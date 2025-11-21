const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const PUBLIC_FIELDS = `
  p.id, p.sku_code, p.name, p.category_id, p.storage_rule, p.status,
  p.admin_locked, p.low_stock_threshold, p.near_expiry_days,
  p.pack_unit, p.main_unit, p.img_url,
  p.created_at, p.updated_at,
  pc.name AS category_name
`;

const PUBLIC_FIELDS_ONLY = `
  id, sku_code, name, category_id, storage_rule, status,
  admin_locked, low_stock_threshold, near_expiry_days,
  pack_unit, main_unit, img_url,
  created_at, updated_at
`;

// Map row -> object JS
function toProduct(row) {
    if (!row) return null;

    // Helper function để chuyển đổi UTC sang giờ Việt Nam
    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        skuCode: row.sku_code,
        name: row.name,
        imgUrl: row.img_url,
        categoryId: row.category_id,
        categoryName: row.category_name || null,
        storageRule: row.storage_rule,
        status: row.status,
        adminLocked: row.admin_locked,
        lowStockThreshold: parseFloat(row.low_stock_threshold) || 0,
        nearExpiryDays: parseInt(row.near_expiry_days, 10) || 7,
        // ✅ NEW: Thêm các trường unit mới
        packUnit: row.pack_unit,
        mainUnit: row.main_unit,
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),
    };
}

/* -------------------- BASIC CRUD -------------------- */

// ✅ UPDATED: Tạo product mới với pack_unit và main_unit
async function createProduct({
    skuCode,
    name,
    categoryId,
    storageRule,
    status = 'active',
    adminLocked = false,
    lowStockThreshold = 0,
    nearExpiryDays = 7,
    packUnit, // ✅ NEW: Bắt buộc
    mainUnit, // ✅ NEW: Bắt buộc
    imgUrl = null,
}) {
    const sql = `
        INSERT INTO products (
            sku_code, name, category_id, storage_rule, status,
            admin_locked, low_stock_threshold, near_expiry_days,
            pack_unit, main_unit, img_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING ${PUBLIC_FIELDS_ONLY}
    `;
    const params = [
        skuCode,
        name,
        categoryId,
        storageRule,
        status,
        adminLocked,
        lowStockThreshold,
        nearExpiryDays,
        packUnit, // ✅ NEW
        mainUnit, // ✅ NEW
        imgUrl,
    ];
    const { rows } = await query(sql, params);
    return toProduct(rows[0]);
}

async function findBySkuCodes(skuCodes = []) {
    if (!Array.isArray(skuCodes) || skuCodes.length === 0) return [];

    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.sku_code = ANY($1::text[])
    `;
    const { rows } = await query(sql, [skuCodes]);
    return rows.map(toProduct);
}

// Tìm product theo ID (có join với category)
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.id = $1
    `;
    const { rows } = await query(sql, [id]);
    return toProduct(rows[0]);
}

// Tìm product theo SKU code
async function findBySkuCode(skuCode) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.sku_code = $1
    `;
    const { rows } = await query(sql, [skuCode]);
    return toProduct(rows[0]);
}

// Tìm product theo name
async function findByName(name) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.name = $1
    `;
    const { rows } = await query(sql, [name]);
    return toProduct(rows[0]);
}

// Liệt kê products (có hỗ trợ tìm kiếm và phân trang)
async function listProducts({ q, categoryId, status, adminLocked, limit = 20, offset = 0 } = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa (bao gồm cả pack_unit và main_unit)
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(p.sku_code ILIKE $${params.length} OR p.name ILIKE $${params.length} OR p.storage_rule ILIKE $${params.length} OR p.pack_unit ILIKE $${params.length} OR p.main_unit ILIKE $${params.length})`
            );
        }

        // Lọc theo category
        if (categoryId) {
            params.push(categoryId);
            clauses.push(`p.category_id = $${params.length}`);
        }

        // Lọc theo status (active, warning, disable)
        if (status) {
            params.push(status);
            clauses.push(`p.status = $${params.length}`);
        }

        // Lọc theo admin_locked
        if (adminLocked !== undefined) {
            params.push(adminLocked);
            clauses.push(`p.admin_locked = $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            ${where}
            ORDER BY p.created_at DESC, p.name ASC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toProduct);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sản phẩm:', error.message);
        throw new Error('Không thể lấy danh sách sản phẩm');
    }
}

// Đếm tổng số products, có thể kèm theo bộ lọc tìm kiếm
async function countProducts({ q, categoryId, status, adminLocked } = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa (bao gồm cả pack_unit và main_unit)
        if (q && q.trim()) {
            const searchQuery = `%${q.trim()}%`;
            params.push(searchQuery);
            clauses.push(
                `(p.sku_code ILIKE $${params.length} OR p.name ILIKE $${params.length} OR p.storage_rule ILIKE $${params.length} OR p.pack_unit ILIKE $${params.length} OR p.main_unit ILIKE $${params.length})`
            );
        }

        // Lọc theo category
        if (categoryId) {
            params.push(categoryId);
            clauses.push(`p.category_id = $${params.length}`);
        }

        // Lọc theo status
        if (status) {
            params.push(status);
            clauses.push(`p.status = $${params.length}`);
        }

        // Lọc theo admin_locked
        if (adminLocked !== undefined) {
            params.push(adminLocked);
            clauses.push(`p.admin_locked = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        if (!rows || rows.length === 0) {
            throw new Error('Không thể lấy tổng số sản phẩm');
        }
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm sản phẩm:', error.message);
        throw new Error('Không thể lấy tổng số sản phẩm');
    }
}

// Liệt kê tất cả products (hỗ trợ tìm kiếm, lọc, nhưng KHÔNG phân trang)
async function getAllProduct({ q, categoryId, status, adminLocked } = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa (bao gồm cả pack_unit và main_unit)
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(p.sku_code ILIKE $${params.length} OR p.name ILIKE $${params.length} OR p.storage_rule ILIKE $${params.length} OR p.pack_unit ILIKE $${params.length} OR p.main_unit ILIKE $${params.length})`
            );
        }

        // Lọc theo category
        if (categoryId) {
            params.push(categoryId);
            clauses.push(`p.category_id = $${params.length}`);
        }

        // Lọc theo status (active, warning, disable)
        if (status) {
            params.push(status);
            clauses.push(`p.status = $${params.length}`);
        }

        // Lọc theo admin_locked
        if (adminLocked !== undefined) {
            params.push(adminLocked);
            clauses.push(`p.admin_locked = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            ${where}
            ORDER BY p.created_at DESC, p.name ASC
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toProduct);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sản phẩm:', error.message);
        throw new Error('Không thể lấy danh sách sản phẩm');
    }
}

// ✅ UPDATED: Cập nhật product với pack_unit và main_unit
async function updateProduct(id, payload = {}) {
    const fields = [];
    const params = [];
    const map = {
        skuCode: 'sku_code',
        name: 'name',
        categoryId: 'category_id',
        storageRule: 'storage_rule',
        status: 'status',
        adminLocked: 'admin_locked',
        lowStockThreshold: 'low_stock_threshold',
        nearExpiryDays: 'near_expiry_days',
        packUnit: 'pack_unit', // ✅ NEW
        mainUnit: 'main_unit', // ✅ NEW
        imgUrl: 'img_url',
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
        UPDATE products SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING ${PUBLIC_FIELDS_ONLY}
    `;
    const { rows } = await query(sql, params);
    return toProduct(rows[0]);
}

// Xóa product
async function deleteProduct(id) {
    const sql = `DELETE FROM products WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

// ========== EXTRA HELPERS ========== //

// Lấy products theo category ID (chỉ lấy sản phẩm active)
async function getProductsByCategory(categoryId, { limit = 50, offset = 0 } = {}) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.category_id = $1 AND p.status = 'active'
        ORDER BY p.name ASC
        LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [categoryId, limit, offset]);
    return rows.map(toProduct);
}

// Tìm products theo danh sách IDs
async function findByIds(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.id IN (${placeholders})
        ORDER BY p.name ASC
    `;
    const { rows } = await query(sql, ids);
    return rows.map(toProduct);
}

// ✅ NEW: Lấy products theo pack_unit hoặc main_unit
async function getProductsByUnits({ packUnit, mainUnit, limit = 50, offset = 0 } = {}) {
    const clauses = [];
    const params = [];

    if (packUnit) {
        params.push(packUnit);
        clauses.push(`p.pack_unit = $${params.length}`);
    }

    if (mainUnit) {
        params.push(mainUnit);
        clauses.push(`p.main_unit = $${params.length}`);
    }

    if (clauses.length === 0) {
        throw new Error('Cần ít nhất một trong packUnit hoặc mainUnit');
    }

    params.push(limit, offset);
    const where = `WHERE ${clauses.join(' AND ')}`;
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        ${where}
        ORDER BY p.name ASC
        LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await query(sql, params);
    return rows.map(toProduct);
}

// ✅ NEW: Lấy danh sách các đơn vị được sử dụng
async function getUsedUnits() {
    const sql = `
        SELECT DISTINCT 
            pack_unit,
            main_unit
        FROM products
        WHERE pack_unit IS NOT NULL AND main_unit IS NOT NULL
        ORDER BY pack_unit ASC, main_unit ASC
    `;
    const { rows } = await query(sql);

    // Tách thành 2 danh sách riêng biệt
    const packUnits = [...new Set(rows.map((row) => row.pack_unit))].sort();
    const mainUnits = [...new Set(rows.map((row) => row.main_unit))].sort();

    return {
        packUnits,
        mainUnits,
        combinations: rows.map((row) => ({
            packUnit: row.pack_unit,
            mainUnit: row.main_unit,
        })),
    };
}

// Cập nhật trạng thái admin_locked hàng loạt
async function updateAdminLocked(ids = [], adminLocked = true) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `
        UPDATE products 
        SET admin_locked = $${ids.length + 1}
        WHERE id IN (${placeholders})
    `;
    const { rowCount } = await query(sql, [...ids, adminLocked]);
    return rowCount;
}

// Cập nhật status hàng loạt (chỉ nên dùng khi cần thiết, thường status được tự động tính)
async function updateStatus(ids = [], status = 'active') {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    if (!['active', 'warning', 'disable'].includes(status)) {
        throw new Error('Status phải là active, warning, hoặc disable');
    }
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `
        UPDATE products 
        SET status = $${ids.length + 1}
        WHERE id IN (${placeholders})
    `;
    const { rowCount } = await query(sql, [...ids, status]);
    return rowCount;
}

// Tạo hàm deleteMany để xóa nhiều product cùng lúc (dùng cho fakeData)
async function deleteMany(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `DELETE FROM products WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

// Kiểm tra sku_code có tồn tại chưa (dùng cho validation)
async function isSkuCodeExists(skuCode, excludeId = null) {
    let sql = `SELECT id FROM products WHERE sku_code = $1`;
    const params = [skuCode];

    if (excludeId) {
        params.push(excludeId);
        sql += ` AND id != $${params.length}`;
    }

    const { rowCount } = await query(sql, params);
    return rowCount > 0;
}

// ========== STATUS MANAGEMENT FUNCTIONS ========== //

// Refresh trạng thái sản phẩm (gọi stored procedure)
async function refreshProductStatus(productId) {
    const sql = `SELECT refresh_product_status($1)`;
    await query(sql, [productId]);
    return true;
}

// Refresh trạng thái cho tất cả sản phẩm
async function refreshAllProductsStatus() {
    const sql = `
        SELECT refresh_product_status(id)
        FROM products
    `;
    await query(sql);
    return true;
}

// Lấy products theo trạng thái
async function getProductsByStatus(status, { limit = 50, offset = 0 } = {}) {
    if (!['active', 'warning', 'disable'].includes(status)) {
        throw new Error('Status phải là active, warning, hoặc disable');
    }

    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.status = $1
        ORDER BY p.updated_at DESC, p.name ASC
        LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [status, limit, offset]);
    return rows.map(toProduct);
}

// Lấy products có cảnh báo (status = warning hoặc disable)
async function getWarningProducts({ limit = 50, offset = 0 } = {}) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.status IN ('warning', 'disable')
        ORDER BY 
            CASE p.status 
                WHEN 'disable' THEN 1 
                WHEN 'warning' THEN 2 
                ELSE 3 
            END,
            p.updated_at DESC
        LIMIT $1 OFFSET $2
    `;
    const { rows } = await query(sql, [limit, offset]);
    return rows.map(toProduct);
}

// Thống kê sản phẩm theo status
async function getProductStatusStats() {
    const sql = `
        SELECT 
            status,
            COUNT(*) as count,
            COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
        FROM products
        GROUP BY status
        ORDER BY 
            CASE status 
                WHEN 'active' THEN 1 
                WHEN 'warning' THEN 2 
                WHEN 'disable' THEN 3 
                ELSE 4 
            END
    `;
    const { rows } = await query(sql);
    return rows.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
        percentage: parseFloat(row.percentage),
    }));
}

// ✅ NEW: Thống kê sản phẩm theo đơn vị
async function getProductUnitStats() {
    const sql = `
        SELECT 
            pack_unit,
            main_unit,
            COUNT(*) as product_count
        FROM products
        WHERE pack_unit IS NOT NULL AND main_unit IS NOT NULL
        GROUP BY pack_unit, main_unit
        ORDER BY product_count DESC, pack_unit ASC, main_unit ASC
    `;
    const { rows } = await query(sql);
    return rows.map((row) => ({
        packUnit: row.pack_unit,
        mainUnit: row.main_unit,
        productCount: parseInt(row.product_count, 10),
    }));
}

// ✅ NEW: Thêm hàm tìm kiếm theo tên không phân biệt hoa thường
/**
 * @desc    Tìm product theo tên (không phân biệt hoa thường)
 * @param   {string} name - Tên sản phẩm
 * @return  {object|null} - Product object hoặc null
 */
async function findByNameInsensitive(name) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.name ILIKE $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [name]);
    return toProduct(rows[0]);
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    // Basic CRUD
    createProduct,
    findById,
    findBySkuCode,
    findBySkuCodes,
    findByName,
    listProducts,
    updateProduct,
    deleteProduct,
    countProducts,
    getAllProduct,

    // Helper functions
    getProductsByCategory,
    findByIds,
    updateAdminLocked,
    updateStatus,
    deleteMany,
    isSkuCodeExists,
    findByNameInsensitive,

    // ✅ NEW: Unit-related functions
    getProductsByUnits,
    getUsedUnits,
    getProductUnitStats,

    // Status management
    refreshProductStatus,
    refreshAllProductsStatus,
    getProductsByStatus,
    getWarningProducts,
    getProductStatusStats,
};
