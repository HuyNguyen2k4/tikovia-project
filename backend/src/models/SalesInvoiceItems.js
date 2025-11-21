/* src/models/SalesInvoiceItems.js */
const { query } = require('@src/config/dbconnect');

// Lấy thêm thông tin từ sales_order_items và products
const PUBLIC_FIELDS = `
    sii.id,
    sii.invoice_id,
    sii.order_item_id,
    sii.unit_price,
    soi.product_id,
    soi.qty,
    p.name AS product_name,
    p.sku_code
`;

/**
 * Chuyển đổi một hàng từ database thành một đối tượng SalesInvoiceItem JS.
 * @param {object} row - Hàng dữ liệu từ database.
 * @returns {object|null}
 */
function toSalesInvoiceItem(row) {
    if (!row) return null;
    return {
        id: row.id,
        invoiceId: row.invoice_id,
        orderItemId: row.order_item_id,
        unitPrice: parseFloat(row.unit_price),
        productId: row.product_id,
        productName: row.product_name,
        skuCode: row.sku_code,
        qty: parseFloat(row.qty),
    };
}

/**
 * Lấy tất cả item của một hóa đơn.
 * @param {string} invoiceId - ID của hóa đơn.
 * @returns {Promise<Array<object>>}
 */
async function findByInvoiceId(invoiceId) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM sales_invoice_items sii
        JOIN sales_order_items soi ON sii.order_item_id = soi.id
        JOIN products p ON soi.product_id = p.id
        WHERE sii.invoice_id = $1
        ORDER BY p.name
    `;
    const { rows } = await query(sql, [invoiceId]);
    return rows.map(toSalesInvoiceItem);
}

/**
 * Xóa các item dựa trên danh sách ID.
 * @param {Array<string>} ids - Mảng các item ID cần xóa.
 * @returns {Promise<number>}
 */
async function deleteMany(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const sql = `DELETE FROM sales_invoice_items WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

/**
 * Cập nhật nhiều item.
 * @param {Array<object>} items - Mảng item cần cập nhật, mỗi item phải có 'id' và 'unitPrice'.
 * @returns {Promise<void>}
 */
async function updateMany(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const promises = items.map(item => {
        const { id, unitPrice } = item;
        // Chỉ cho phép cập nhật unit_price. order_item_id là khóa logic, không nên đổi.
        const sql = `UPDATE sales_invoice_items SET unit_price = $1 WHERE id = $2`;
        return query(sql, [unitPrice, id]);
    });
    await Promise.all(promises);
}

/**
 * Tạo nhiều item mới cho một hóa đơn.
 * Sử dụng ON CONFLICT để xử lý trường hợp item đã tồn tại (dựa trên unique(invoice_id, order_item_id)).
 * @param {string} invoiceId - ID của hóa đơn cha.
 * @param {Array<object>} items - Mảng item cần tạo. { orderItemId, unitPrice }
 * @returns {Promise<Array<object>>}
 */
async function createMany(invoiceId, items) {
    if (!Array.isArray(items) || items.length === 0) return [];

    // Lọc item trùng lặp trong payload
    const map = new Map();
    for (const it of items) {
        if (!map.has(it.orderItemId)) map.set(it.orderItemId, it);
    }
    const uniqItems = Array.from(map.values());

    const values = [];
    const placeholders = [];
    uniqItems.forEach((item, idx) => {
        const base = idx * 3;
        values.push(invoiceId, item.orderItemId, item.unitPrice);
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    });

    const sql = `
        INSERT INTO sales_invoice_items (invoice_id, order_item_id, unit_price)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (invoice_id, order_item_id) DO UPDATE
          SET unit_price = EXCLUDED.unit_price
        RETURNING id, invoice_id, order_item_id, unit_price
    `;
    
    // Lấy lại dữ liệu đầy đủ (gồm cả product_name, qty...) để trả về
    const { rows } = await query(sql, values);
    if (rows.length === 0) return [];

    const newIds = rows.map(r => r.id);
    const sqlFind = `
        SELECT ${PUBLIC_FIELDS}
        FROM sales_invoice_items sii
        JOIN sales_order_items soi ON sii.order_item_id = soi.id
        JOIN products p ON soi.product_id = p.id
        WHERE sii.id IN (${newIds.map((_, i) => `$${i + 1}`).join(',')})
    `;
    const { rows: fullRows } = await query(sqlFind, newIds);
    return fullRows.map(toSalesInvoiceItem);
}

module.exports = {
    findByInvoiceId,
    deleteMany,
    updateMany,
    createMany,
};