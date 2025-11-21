const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const PUBLIC_FIELDS = `
  il.id, il.lot_no, il.product_id, il.department_id, il.expiry_date, 
  il.qty_on_hand, il.conversion_rate,
  p.sku_code, p.name AS product_name, p.pack_unit, p.main_unit,
  p.near_expiry_days, p.low_stock_threshold,
  d.name AS department_name, d.code AS department_code
`;

const PUBLIC_FIELDS_ONLY = `
  id, lot_no, product_id, department_id, expiry_date, qty_on_hand, conversion_rate
`;

// Map row -> object JS
function toInventoryLot(row) {
    if (!row) return null;

    // Helper function để chuyển đổi UTC sang giờ Việt Nam
    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        lotNo: row.lot_no,
        productId: row.product_id,
        departmentId: row.department_id,
        expiryDate: formatToVietnamTime(row.expiry_date),
        qtyOnHand: parseFloat(row.qty_on_hand) || 0,
        conversionRate: parseFloat(row.conversion_rate) || 1, // ✅ NEW
        // Join fields from products
        skuCode: row.sku_code || null,
        productName: row.product_name || null,
        packUnit: row.pack_unit || null, // ✅ NEW: Từ products
        mainUnit: row.main_unit || null, // ✅ NEW: Từ products
        // Join fields from departments
        departmentName: row.department_name || null,
        departmentCode: row.department_code || null,
        // Config fields
        nearExpiryDays:
            row.near_expiry_days !== undefined ? parseInt(row.near_expiry_days, 10) : null,
        lowStockThreshold:
            row.low_stock_threshold !== undefined ? parseFloat(row.low_stock_threshold) : null,
        // ✅ COMPUTED: Tính toán qty theo pack_unit
        qtyInPack:
            row.conversion_rate > 0
                ? parseFloat(
                      (parseFloat(row.qty_on_hand) || 0) / parseFloat(row.conversion_rate)
                  ).toFixed(3)
                : 0,
    };
}

/* -------------------- BASIC CRUD -------------------- */

// ✅ UPDATED: Tạo inventory lot mới với conversion_rate
async function createInventoryLot({
    lotNo,
    productId,
    departmentId,
    expiryDate,
    qtyOnHand = 0,
    conversionRate = 1, // ✅ NEW: Bắt buộc > 0
}) {
    const sql = `
        INSERT INTO inventory_lots (
            lot_no, product_id, department_id, expiry_date, qty_on_hand, conversion_rate
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `;
    const params = [lotNo, productId, departmentId, expiryDate, qtyOnHand, conversionRate];
    const { rows } = await query(sql, params);

    // Sau khi tạo xong, gọi findById để lấy đầy đủ thông tin có join
    const newId = rows[0].id;
    return await findById(newId);
}

// Tìm inventory lot theo ID (có join với product và department)
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM inventory_lots il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN departments d ON il.department_id = d.id
        WHERE il.id = $1
    `;
    const { rows } = await query(sql, [id]);
    return toInventoryLot(rows[0]);
}

// Tìm inventory lot theo lot_no
async function findByLotNo(lotNo) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM inventory_lots il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN departments d ON il.department_id = d.id
        WHERE il.lot_no = $1
    `;
    const { rows } = await query(sql, [lotNo]);
    return toInventoryLot(rows[0]);
}

// Liệt kê inventory lots (có hỗ trợ tìm kiếm và phân trang)
async function listInventoryLots({
    q,
    productId,
    departmentId,
    expiredOnly,
    lowStockOnly,
    limit = 20,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(il.lot_no ILIKE $${params.length} OR p.sku_code ILIKE $${params.length} OR p.name ILIKE $${params.length})`
            );
        }

        // Lọc theo product
        if (productId) {
            params.push(productId);
            clauses.push(`il.product_id = $${params.length}`);
        }

        // Lọc theo department
        if (departmentId) {
            params.push(departmentId);
            clauses.push(`il.department_id = $${params.length}`);
        }

        // Lọc chỉ lấy lô đã hết hạn
        if (expiredOnly) {
            clauses.push(`il.expiry_date < NOW()`);
        }

        // Lọc chỉ lấy lô có số lượng thấp (< 10)
        if (lowStockOnly) {
            clauses.push(`il.qty_on_hand < 10`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM inventory_lots il
            LEFT JOIN products p ON il.product_id = p.id
            LEFT JOIN departments d ON il.department_id = d.id
            ${where}
            ORDER BY il.expiry_date ASC, il.lot_no ASC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toInventoryLot);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách inventory lots:', error.message);
        throw new Error('Không thể lấy danh sách inventory lots');
    }
}

// Đếm tổng số inventory lots, có thể kèm theo bộ lọc tìm kiếm
async function countInventoryLots({ q, productId, departmentId, expiredOnly, lowStockOnly } = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa
        if (q && q.trim()) {
            const searchQuery = `%${q.trim()}%`;
            params.push(searchQuery);
            clauses.push(
                `(il.lot_no ILIKE $${params.length} OR p.sku_code ILIKE $${params.length} OR p.name ILIKE $${params.length})`
            );
        }

        // Lọc theo product
        if (productId) {
            params.push(productId);
            clauses.push(`il.product_id = $${params.length}`);
        }

        // Lọc theo department
        if (departmentId) {
            params.push(departmentId);
            clauses.push(`il.department_id = $${params.length}`);
        }

        // Lọc chỉ lấy lô đã hết hạn
        if (expiredOnly) {
            clauses.push(`il.expiry_date < NOW()`);
        }

        // Lọc chỉ lấy lô có số lượng thấp
        if (lowStockOnly) {
            clauses.push(`il.qty_on_hand < 10`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM inventory_lots il
            LEFT JOIN products p ON il.product_id = p.id
            LEFT JOIN departments d ON il.department_id = d.id
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        if (!rows || rows.length === 0) {
            throw new Error('Không thể lấy tổng số inventory lots');
        }
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm inventory lots:', error.message);
        throw new Error('Không thể lấy tổng số inventory lots');
    }
}

// ✅ UPDATED: Cập nhật inventory lot với conversion_rate
async function updateInventoryLot(id, payload = {}) {
    const fields = [];
    const params = [];
    const map = {
        lotNo: 'lot_no',
        productId: 'product_id',
        departmentId: 'department_id',
        expiryDate: 'expiry_date',
        qtyOnHand: 'qty_on_hand',
        conversionRate: 'conversion_rate', // ✅ NEW
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
        UPDATE inventory_lots SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING id
    `;
    const { rows } = await query(sql, params);

    // Sau khi update xong, gọi findById để lấy đầy đủ thông tin có join
    return await findById(rows[0].id);
}

// Xóa inventory lot
async function deleteInventoryLot(id) {
    const sql = `DELETE FROM inventory_lots WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

// ========== EXTRA HELPERS ========== //

// Lấy inventory lots theo product ID
async function getInventoryLotsByProduct(productId, { limit = 50, offset = 0 } = {}) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM inventory_lots il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN departments d ON il.department_id = d.id
        WHERE il.product_id = $1
        ORDER BY il.expiry_date ASC
        LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [productId, limit, offset]);
    return rows.map(toInventoryLot);
}

// Lấy inventory lots theo department ID
async function getInventoryLotsByDepartment(departmentId, { limit = 50, offset = 0 } = {}) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM inventory_lots il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN departments d ON il.department_id = d.id
        WHERE il.department_id = $1
        ORDER BY il.expiry_date ASC
        LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [departmentId, limit, offset]);
    return rows.map(toInventoryLot);
}

// Lấy inventory lots sắp hết hạn (trong X ngày tới)
async function getExpiringLots(days = 7, { limit = 50, offset = 0 } = {}) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM inventory_lots il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN departments d ON il.department_id = d.id
        WHERE il.expiry_date <= NOW() + INTERVAL '${days} days'
          AND il.expiry_date > NOW()
          AND il.qty_on_hand > 0
        ORDER BY il.expiry_date ASC
        LIMIT $1 OFFSET $2
    `;
    const { rows } = await query(sql, [limit, offset]);
    return rows.map(toInventoryLot);
}

// Lấy inventory lots đã hết hạn
async function getExpiredLots({ limit = 50, offset = 0 } = {}) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM inventory_lots il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN departments d ON il.department_id = d.id
        WHERE il.expiry_date < NOW()
          AND il.qty_on_hand > 0
        ORDER BY il.expiry_date ASC
        LIMIT $1 OFFSET $2
    `;
    const { rows } = await query(sql, [limit, offset]);
    return rows.map(toInventoryLot);
}

// Lấy inventory lots có số lượng thấp
async function getLowStockLots(threshold = 10, { limit = 50, offset = 0 } = {}) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM inventory_lots il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN departments d ON il.department_id = d.id
        WHERE il.qty_on_hand <= $1 AND il.qty_on_hand > 0
        ORDER BY il.qty_on_hand ASC, il.expiry_date ASC
        LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [threshold, limit, offset]);
    return rows.map(toInventoryLot);
}

// Cập nhật số lượng tồn kho
async function updateQuantity(id, newQuantity) {
    const sql = `
        UPDATE inventory_lots 
        SET qty_on_hand = $1
        WHERE id = $2
        RETURNING id
    `;
    const { rows } = await query(sql, [newQuantity, id]);

    // Sau khi update xong, gọi findById để lấy đầy đủ thông tin có join
    return await findById(rows[0].id);
}

// Tìm inventory lots theo danh sách IDs
async function findByIds(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM inventory_lots il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN departments d ON il.department_id = d.id
        WHERE il.id IN (${placeholders})
        ORDER BY il.expiry_date ASC
    `;
    const { rows } = await query(sql, ids);
    return rows.map(toInventoryLot);
}

// Xóa nhiều inventory lots cùng lúc (dùng cho fakeData)
async function deleteMany(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `DELETE FROM inventory_lots WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

// Kiểm tra lot_no có tồn tại chưa (theo cặp product_id + department_id)
async function isLotNoExists(lotNo, productId, departmentId, excludeId = null) {
    let sql = `
    SELECT id FROM inventory_lots 
    WHERE lot_no = $1 
      AND product_id = $2 
      AND department_id = $3
  `;
    const params = [lotNo, productId, departmentId];

    if (excludeId) {
        params.push(excludeId);
        sql += ` AND id != $${params.length}`;
    }

    const { rowCount } = await query(sql, params);
    return rowCount > 0;
}

// Thống kê inventory theo product
// returns: productId, productName, totalLots (count lô hàng) , totalQtyOnHand, expiredQtyOnHand, expiringQtyOnHand
async function getInventoryStatsByProduct() {
    const sql = `
        SELECT 
            p.id AS product_id,
            p.sku_code,
            p.name AS product_name,
            COUNT(il.id) AS total_lots,
            SUM(il.qty_on_hand) AS total_quantity,
            SUM(CASE WHEN il.expiry_date < NOW() THEN il.qty_on_hand ELSE 0 END) AS expired_quantity,
            SUM(CASE WHEN il.expiry_date <= NOW() + INTERVAL '7 days' AND il.expiry_date > NOW() THEN il.qty_on_hand ELSE 0 END) AS expiring_quantity
        FROM products p
        LEFT JOIN inventory_lots il ON p.id = il.product_id
        GROUP BY p.id, p.sku_code, p.name
        ORDER BY p.name ASC
    `;
    const { rows } = await query(sql);
    return rows.map((row) => ({
        productId: row.product_id,
        skuCode: row.sku_code,
        productName: row.product_name,
        totalLots: parseInt(row.total_lots, 10),
        totalQuantity: parseFloat(row.total_quantity) || 0,
        expiredQuantity: parseFloat(row.expired_quantity) || 0,
        expiringQuantity: parseFloat(row.expiring_quantity) || 0,
    }));
}

// ✅ UPDATED: Cập nhật quantities với conversion support
async function updateQuantityWithConversion(id, { qtyInMain, qtyInPack, conversionRate }) {
    // Chỉ cho phép cập nhật 1 trong 2: qtyInMain HOẶC (qtyInPack + conversionRate)
    let finalMainQty;

    if (qtyInMain !== undefined) {
        finalMainQty = parseFloat(qtyInMain);
    } else if (qtyInPack !== undefined && conversionRate !== undefined) {
        finalMainQty = parseFloat(qtyInPack) * parseFloat(conversionRate);
    } else {
        throw new Error('Phải cung cấp qtyInMain HOẶC (qtyInPack + conversionRate)');
    }

    const sql = `
        UPDATE inventory_lots 
        SET qty_on_hand = $1, 
            conversion_rate = COALESCE($2, conversion_rate)
        WHERE id = $3
        RETURNING id
    `;
    const { rows } = await query(sql, [finalMainQty, conversionRate || null, id]);

    return await findById(rows[0].id);
}

// Lấy các products trong inventory của 1 department, có tồn kho (>0) (có hỗ trợ tìm kiếm và phân trang)
// Hàm này lấy luôn cả các sản phẩm đã hết hạn nhưng vẫn còn tồn kho (mục đích là để như trả hàng cho nhà cung cấp)
// returns: productId, skuCode, productName, totalQtyOnHand
// ✅ UPDATED: Lấy products inventory với conversion info
async function getProductsInDepartmentInventory(departmentId, { q, limit = 10, offset = 0 } = {}) {
    try {
        const clauses = [`il.department_id = $1`, `il.qty_on_hand > 0`];
        const params = [departmentId];
        let paramIndex = 1;

        // Tìm kiếm theo từ khóa (bao gồm units)
        if (q && q.trim()) {
            paramIndex += 1;
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(p.sku_code ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex} 
                  OR p.pack_unit ILIKE $${paramIndex} OR p.main_unit ILIKE $${paramIndex})`
            );
        }

        const queryParams = [...params, limit, offset];
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        // ✅ UPDATED: Thêm thông tin units và conversion
        const sql = `
            SELECT 
                p.id AS product_id,
                p.sku_code,
                p.name AS product_name,
                p.pack_unit,
                p.main_unit,
                SUM(il.qty_on_hand) AS total_qty_main_unit,
                SUM(il.qty_on_hand / il.conversion_rate) AS total_qty_pack_unit,
                COUNT(il.id) AS lot_count,
                AVG(il.conversion_rate) AS avg_conversion_rate,
                MIN(il.expiry_date) AS earliest_expiry,
                MAX(il.expiry_date) AS latest_expiry
            FROM inventory_lots il
            LEFT JOIN products p ON il.product_id = p.id
            ${where}
            GROUP BY p.id, p.sku_code, p.name, p.pack_unit, p.main_unit
            ORDER BY p.name ASC
            LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
        `.trim();

        const { rows } = await query(sql, queryParams);
        const items = rows.map((row) => ({
            productId: row.product_id,
            skuCode: row.sku_code,
            productName: row.product_name,
            packUnit: row.pack_unit, // ✅ NEW
            mainUnit: row.main_unit, // ✅ NEW
            totalQuantity: parseFloat(row.total_qty_main_unit) || 0,
            totalQtyPackUnit: parseFloat(row.total_qty_pack_unit) || 0, // ✅ NEW
            lotCount: parseInt(row.lot_count, 10), // ✅ NEW
            avgConversionRate: parseFloat(row.avg_conversion_rate) || 1, // ✅ NEW
            earliestExpiry: row.earliest_expiry
                ? dayjs.utc(row.earliest_expiry).tz('Asia/Ho_Chi_Minh').format()
                : null, // ✅ NEW
            latestExpiry: row.latest_expiry
                ? dayjs.utc(row.latest_expiry).tz('Asia/Ho_Chi_Minh').format()
                : null, // ✅ NEW
        }));

        // Count query không thay đổi
        const countSql = `
            SELECT COUNT(DISTINCT p.id) AS count
            FROM inventory_lots il
            LEFT JOIN products p ON il.product_id = p.id
            ${where}
        `.trim();

        // Chỉ sử dụng các params cần thiết cho mệnh đề WHERE
        const countParams = params;
        const countResult = await query(countSql, countParams);
        const totalItems = parseInt(countResult.rows[0].count, 10);

        // Tạo đối tượng pagination
        const pagination = {
            total: totalItems,
            limit: limit,
            offset: offset,
            hasMore: offset + items.length < totalItems,
        };

        return { items, pagination };
    } catch (error) {
        console.error('Lỗi khi lấy products trong inventory của department:', error.message);
        throw new Error('Không thể lấy products trong inventory của department');
    }
}

// Lấy các inventory lots của 1 product trong 1 department (có tồn kho >0), sắp xếp theo expiry_date ASC (có hỗ trợ tìm kiếm và phân trang)
async function getInventoryLotsByProductInDepartment(
    productId,
    departmentId,
    { q, limit = 10, offset = 0 } = {}
) {
    try {
        const clauses = [`il.product_id = $1`, `il.department_id = $2`, `il.qty_on_hand > 0`];
        const params = [productId, departmentId];
        let paramIndex = 2;
        // Tìm kiếm theo từ khóa
        if (q && q.trim()) {
            paramIndex += 1;
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(il.lot_no ILIKE $${paramIndex} OR p.sku_code ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`
            );
        }
        const queryParams = [...params, limit, offset];
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM inventory_lots il
            LEFT JOIN products p ON il.product_id = p.id
            LEFT JOIN departments d ON il.department_id = d.id
            ${where}
            ORDER BY il.expiry_date ASC, il.lot_no ASC
            LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
        `.trim();
        const { rows } = await query(sql, queryParams);
        const items = rows.map(toInventoryLot);
        // Lấy tổng số lượng items để phân trang
        const countSql = `
            SELECT COUNT(*) AS count
            FROM inventory_lots il
            LEFT JOIN products p ON il.product_id = p.id
            LEFT JOIN departments d ON il.department_id = d.id
            ${where}
        `.trim();
        // Chỉ sử dụng các params cần thiết cho mệnh đề WHERE
        const countParams = params;
        const countResult = await query(countSql, countParams);
        const totalItems = parseInt(countResult.rows[0].count, 10);
        // Tạo đối tượng pagination
        const pagination = {
            total: totalItems,
            limit: limit,
            offset: offset,
            hasMore: offset + items.length < totalItems,
        };
        return { items, pagination };
    } catch (error) {
        console.error('Lỗi khi lấy inventory lots của product trong department:', error.message);
        throw new Error('Không thể lấy inventory lots của product trong department');
    }
}
/**
 * Lấy tổng số lượng tồn kho (qty_on_hand) của một sản phẩm trong một kho cụ thể.
 * Chỉ tính các lô hàng còn hạn sử dụng.
 * @param {string} productId - ID của sản phẩm.
 * @param {string} departmentId - ID của kho (department).
 * @returns {Promise<number>} Tổng số lượng tồn kho khả dụng.
 */
async function getTotalStockByProductAndDepartment(productId, departmentId) {
    const sql = `
        SELECT COALESCE(SUM(qty_on_hand), 0) as total_stock
        FROM inventory_lots
        WHERE product_id = $1
          AND department_id = $2
          AND expiry_date > now(); -- Chỉ lấy những lô còn hạn
    `;
    const params = [productId, departmentId];
    const { rows } = await query(sql, params);

    // rows[0].total_stock sẽ là một string, cần chuyển sang số
    return parseFloat(rows[0].total_stock);
}

// Lấy các lô hàng tồn kho thấp dựa trên threshold của từng sản phẩm
async function getLowStockLotsByProduct({ limit = 1000, offset = 0 } = {}) {
    const sql = `
        SELECT il.*, p.name as product_name, p.low_stock_threshold, d.name as department_name
        FROM inventory_lots il
        JOIN products p ON il.product_id = p.id
        JOIN departments d ON il.department_id = d.id
        WHERE il.qty_on_hand <= p.low_stock_threshold AND p.low_stock_threshold > 0
        ORDER BY il.qty_on_hand ASC
        LIMIT $1 OFFSET $2
    `;
    const { rows } = await query(sql, [limit, offset]);
    return rows;
}

// Lấy các lô hàng sắp hết hạn dựa trên near_expiry_days của từng sản phẩm
async function getExpiringLotsByProduct({ limit = 1000, offset = 0 } = {}) {
    const sql = `
        SELECT il.*, p.name as product_name, p.near_expiry_days, d.name as department_name
        FROM inventory_lots il
        JOIN products p ON il.product_id = p.id
        JOIN departments d ON il.department_id = d.id
        WHERE 
          p.near_expiry_days > 0
          AND il.expiry_date IS NOT NULL
          AND il.expiry_date > now()
          AND il.expiry_date <= (now() + (p.near_expiry_days || ' days')::interval)
        ORDER BY il.expiry_date ASC
        LIMIT $1 OFFSET $2
    `;
    const { rows } = await query(sql, [limit, offset]);
    return rows;
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    // Basic CRUD
    createInventoryLot,
    findById,
    findByLotNo,
    listInventoryLots,
    updateInventoryLot,
    deleteInventoryLot,
    countInventoryLots,

    // Products, Inventory_Lots in Department Inventory
    getProductsInDepartmentInventory,
    getInventoryLotsByProductInDepartment,

    // Conversion-related
    updateQuantityWithConversion,

    // Helper functions
    getInventoryLotsByProduct,
    getInventoryLotsByDepartment,
    getExpiringLots,
    getExpiredLots,
    getLowStockLots,
    updateQuantity,
    findByIds,
    deleteMany,
    isLotNoExists,
    getInventoryStatsByProduct,
    getTotalStockByProductAndDepartment,
    getLowStockLotsByProduct,
    getExpiringLotsByProduct,
};
