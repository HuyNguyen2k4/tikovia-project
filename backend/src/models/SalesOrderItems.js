const { query } = require('@src/config/dbconnect');

const PUBLIC_FIELDS = `
    soi.id,
    soi.order_id,
    soi.product_id,
    soi.qty,
    soi.remain,
    soi.note,
    p.name AS product_name
`;
function toSalesOrderItem(row) {
    if (!row) return null;
    return {
        id: row.id,
        orderId: row.order_id,
        productId: row.product_id,
        productName: row.product_name,
        qty: parseFloat(row.qty),
        remain: row.remain !== undefined ? parseFloat(row.remain) : null,
        note: row.note,
    };
}

/**
 * Lấy tất cả item của một đơn hàng.
 * @param {string} orderId - ID của đơn hàng.
 * @returns {Promise<Array<object>>}
 */
async function findByOrderId(orderId) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.order_id = $1
        ORDER BY soi.id
    `;
    const { rows } = await query(sql, [orderId]);
    return rows.map(toSalesOrderItem);
}

/**
 * Xóa các item dựa trên danh sách ID.
 * @param {Array<string>} ids - Mảng các item ID cần xóa.
 * @returns {Promise<number>}
 */
async function deleteMany(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const sql = `DELETE FROM sales_order_items WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

/**
 * Cập nhật nhiều item.
 * @param {Array<object>} items - Mảng item cần cập nhật, mỗi item phải có 'id' và các trường productId, qty, note.
 * @returns {Promise<void>}
 */
async function updateMany(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const promises = items.map(item => {
        const { id, productId, qty, note } = item;
        const sql = `UPDATE sales_order_items SET product_id = $1, qty = $2, note = $3 WHERE id = $4`;
        return query(sql, [productId, qty, note, id]);
    });
    await Promise.all(promises);
}

/**
 * Tạo nhiều item mới cho một đơn hàng.
 * @param {string} orderId - ID của đơn hàng cha.
 * @param {Array<object>} items - Mảng item cần tạo.
 * @returns {Promise<Array<object>>}
 */
// async function createMany(orderId, items) {
//     if (!Array.isArray(items) || items.length === 0) return [];
//     const createdItems = [];
//     for (const item of items) {
//         const { productId, qty, note } = item;
//         const sql = `
//             INSERT INTO sales_order_items (order_id, product_id, qty, note)
//             VALUES ($1, $2, $3, $4)
//             RETURNING id, order_id, product_id, qty, note
//         `;
//         const params = [orderId, productId, qty, note || null];
//         const { rows } = await query(sql, params);
//         createdItems.push(toSalesOrderItem(rows[0]));
//     }
//     return createdItems;
// }
async function createMany(orderId, items) {
    if (!Array.isArray(items) || items.length === 0) return [];

    // Loại bỏ sản phẩm duplicate trong payload (giữ phần tử đầu tiên)
    const map = new Map();
    for (const it of items) {
        if (!map.has(it.productId)) map.set(it.productId, it);
    }
    const uniqItems = Array.from(map.values());

    // Tạo batch INSERT với ON CONFLICT -> cập nhật qty/note nếu muốn (hoặc DO NOTHING)
    const values = [];
    const placeholders = [];
    uniqItems.forEach((item, idx) => {
        const base = idx * 4;
        values.push(orderId, item.productId, item.qty, item.note || null);
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
    });

    const sql = `
        INSERT INTO sales_order_items (order_id, product_id, qty, note)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (order_id, product_id) DO UPDATE
          SET qty = EXCLUDED.qty, note = EXCLUDED.note
        RETURNING id, order_id, product_id, qty, note
    `;
    const { rows } = await query(sql, values);
    return rows.map(toSalesOrderItem);
}

module.exports = {
    findByOrderId,
    deleteMany,
    updateMany,
    createMany,
};