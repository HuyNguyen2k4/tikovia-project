const { query } = require('@src/config/dbconnect');

const fetchProductsForExport = async (productIds, departmentId) => {
    const params = [];
    let productWhere = '';
    let lotWhere = '';

    // ✅ NEW: Handle productIds logic
    if (productIds && productIds.length > 0) {
        params.push(productIds);
        productWhere = 'WHERE p.id = ANY($1::uuid[])';
        lotWhere = 'product_id = ANY($1::uuid[])';
    } else {
        // ✅ NEW: Export all products if no productIds provided
        productWhere = 'WHERE 1=1'; // Always true condition
        lotWhere = '1=1'; // Always true condition
    }

    // ✅ Handle departmentId filter for lots
    if (departmentId) {
        params.push(departmentId);
        lotWhere += ` AND department_id = $${params.length}`;
    }

    const sql = `
        WITH lot_summary AS (
            SELECT product_id,
                   SUM(qty_on_hand) AS total_qty,
                   SUM(CASE WHEN expiry_date < NOW() THEN qty_on_hand ELSE 0 END) AS expired_qty
            FROM inventory_lots
            WHERE ${lotWhere}
            GROUP BY product_id
        )
        SELECT p.*,
               pc.name AS category_name,
               COALESCE(ls.total_qty, 0) AS total_qty,
               COALESCE(ls.expired_qty, 0) AS expired_qty
        FROM products p
        JOIN product_categories pc ON pc.id = p.category_id
        LEFT JOIN lot_summary ls ON ls.product_id = p.id
        ${productWhere}
        ORDER BY p.name;
    `;
    const { rows } = await query(sql, params);
    return rows;
};

const fetchLotsForExport = async (productIds, departmentId) => {
    const params = [];
    let where = 'WHERE ';

    // ✅ NEW: Handle productIds logic
    if (productIds && productIds.length > 0) {
        params.push(productIds);
        where += 'il.product_id = ANY($1::uuid[])';
    } else {
        // ✅ NEW: Export all lots if no productIds provided
        where += '1=1'; // Always true condition
    }

    // ✅ Handle departmentId filter
    if (departmentId) {
        params.push(departmentId);
        where += ` AND il.department_id = $${params.length}`;
    }

    const sql = `
        SELECT il.*,
               d.name AS department_name,
               p.sku_code,
               p.name AS product_name
        FROM inventory_lots il
        JOIN departments d ON d.id = il.department_id
        JOIN products p ON p.id = il.product_id
        ${where}
        ORDER BY il.expiry_date ASC, il.lot_no ASC;
    `;
    const { rows } = await query(sql, params);
    return rows;
};

// ✅ THÊM: Hàm lấy tên department
const fetchDepartmentName = async (departmentId) => {
    if (!departmentId) return null;

    const sql = 'SELECT name FROM departments WHERE id = $1';
    const { rows } = await query(sql, [departmentId]);
    return rows[0]?.name || null;
};

const fetchInventoryForExport = async ({ productIds, departmentId }) => {
    const [products, lots, departmentName] = await Promise.all([
        fetchProductsForExport(productIds, departmentId),
        fetchLotsForExport(productIds, departmentId),
        fetchDepartmentName(departmentId),
    ]);
    return { products, lots, departmentName };
};

module.exports = {
    fetchInventoryForExport,
};
