// const { query, withTransaction } = require('@src/config/dbconnect');
// const dayjs = require('dayjs');
// const utc = require('dayjs/plugin/utc');
// const timezone = require('dayjs/plugin/timezone');

// // Cấu hình dayjs
// dayjs.extend(utc);
// dayjs.extend(timezone);

// const PUBLIC_FIELDS = `
//   id, trans_id, product_id, lot_id, qty, unit_price
// `;

// const PUBLIC_FIELDS_WITH_JOIN = `
//   sti.id, sti.trans_id, sti.product_id, sti.lot_id, sti.qty, sti.unit_price,
//   p.sku_code, p.name as product_name,
//   il.lot_no, il.expiry_date,
//   st.doc_no
// `;

// // Map row -> object JS
// function toSupplierTransactionItem(row) {
//     if (!row) return null;

//     // Helper function để chuyển đổi UTC sang giờ Việt Nam
//     const formatToVietnamTime = (date) => {
//         if (!date) return null;
//         return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
//     };

//     const qty = parseFloat(row.qty) || 0;
//     const price = parseFloat(row.unit_price) || 0;

//     return {
//         id: row.id,
//         transId: row.trans_id,
//         productId: row.product_id,
//         lotId: row.lot_id,
//         qty,
//         unitPrice: price,
//         lineTotal: Math.round(qty * price * 1000) / 1000,
//         // Join fields
//         skuCode: row.sku_code || null,
//         productName: row.product_name || null,
//         lotNo: row.lot_no || null,
//         expiryDate: formatToVietnamTime(row.expiry_date), // ✅ Thay đổi
//         docNo: row.doc_no || null,
//     };
// }

// /* -------------------- BASIC CRUD -------------------- */

// // Tạo supplier transaction item mới
// async function createSupplierTransactionItem({ transId, productId, lotId, qty, unitPrice }) {
//     const sql = `
//         INSERT INTO supplier_transaction_items (trans_id, product_id, lot_id, qty, unit_price)
//         VALUES ($1, $2, $3, $4, $5)
//         RETURNING id
//     `;
//     const params = [transId, productId, lotId, qty, unitPrice];
//     const { rows } = await query(sql, params);

//     // Sau khi tạo xong, gọi findById để lấy đầy đủ thông tin có join
//     const newId = rows[0].id;
//     return await findById(newId);
// }

// // Tìm supplier transaction item theo ID
// async function findById(id) {
//     const sql = `
//         SELECT ${PUBLIC_FIELDS_WITH_JOIN}
//         FROM supplier_transaction_items sti
//         LEFT JOIN products p ON sti.product_id = p.id
//         LEFT JOIN inventory_lots il ON sti.lot_id = il.id
//         LEFT JOIN supplier_transactions st ON sti.trans_id = st.id
//         WHERE sti.id = $1
//     `;
//     const { rows } = await query(sql, [id]);
//     return toSupplierTransactionItem(rows[0]);
// }

// // Lấy tất cả items của một transaction
// async function getItemsByTransactionId(transId) {
//     const sql = `
//         SELECT ${PUBLIC_FIELDS_WITH_JOIN}
//         FROM supplier_transaction_items sti
//         LEFT JOIN products p ON sti.product_id = p.id
//         LEFT JOIN inventory_lots il ON sti.lot_id = il.id
//         LEFT JOIN supplier_transactions st ON sti.trans_id = st.id
//         WHERE sti.trans_id = $1
//         ORDER BY p.name ASC, il.lot_no ASC
//     `;
//     const { rows } = await query(sql, [transId]);
//     return rows.map(toSupplierTransactionItem);
// }

// // Lấy items theo product ID
// async function getItemsByProductId(productId, { limit = 50, offset = 0 } = {}) {
//     const sql = `
//         SELECT ${PUBLIC_FIELDS_WITH_JOIN}
//         FROM supplier_transaction_items sti
//         LEFT JOIN products p ON sti.product_id = p.id
//         LEFT JOIN inventory_lots il ON sti.lot_id = il.id
//         LEFT JOIN supplier_transactions st ON sti.trans_id = st.id
//         WHERE sti.product_id = $1
//         ORDER BY st.trans_date DESC
//         LIMIT $2 OFFSET $3
//     `;
//     const { rows } = await query(sql, [productId, limit, offset]);
//     return rows.map(toSupplierTransactionItem);
// }

// // Lấy items theo lot ID
// async function getItemsByLotId(lotId) {
//     const sql = `
//         SELECT ${PUBLIC_FIELDS_WITH_JOIN}
//         FROM supplier_transaction_items sti
//         LEFT JOIN products p ON sti.product_id = p.id
//         LEFT JOIN inventory_lots il ON sti.lot_id = il.id
//         LEFT JOIN supplier_transactions st ON sti.trans_id = st.id
//         WHERE sti.lot_id = $1
//         ORDER BY st.trans_date DESC
//     `;
//     const { rows } = await query(sql, [lotId]);
//     return rows.map(toSupplierTransactionItem);
// }

// // Cập nhật supplier transaction item
// async function updateSupplierTransactionItem(id, payload = {}) {
//     const fields = [];
//     const params = [];
//     const map = {
//         transId: 'trans_id',
//         productId: 'product_id',
//         lotId: 'lot_id',
//         qty: 'qty',
//         unitPrice: 'unit_price',
//     };

//     Object.entries(map).forEach(([kSrc, kDb]) => {
//         if (payload[kSrc] !== undefined) {
//             params.push(payload[kSrc]);
//             fields.push(`${kDb} = $${params.length}`);
//         }
//     });

//     if (fields.length === 0) return findById(id);

//     params.push(id);
//     const sql = `
//         UPDATE supplier_transaction_items SET ${fields.join(', ')}
//         WHERE id = $${params.length}
//         RETURNING id
//     `;
//     const { rows } = await query(sql, params);

//     // Sau khi update xong, gọi findById để lấy đầy đủ thông tin có join
//     return await findById(rows[0].id);
// }

// // Xóa supplier transaction item
// async function deleteSupplierTransactionItem(id) {
//     const sql = `DELETE FROM supplier_transaction_items WHERE id = $1`;
//     await query(sql, [id]);
//     return true;
// }

// // Xóa tất cả items của một transaction
// async function deleteItemsByTransactionId(transId) {
//     const sql = `DELETE FROM supplier_transaction_items WHERE trans_id = $1`;
//     const { rowCount } = await query(sql, [transId]);
//     return rowCount;
// }

// // ========== EXTRA HELPERS ========== //

// // Tính tổng giá trị của một transaction
// async function calculateTransactionTotal(transId) {
//     const sql = `
//         SELECT SUM(qty * unit_price) as total
//         FROM supplier_transaction_items
//         WHERE trans_id = $1
//     `;
//     const { rows } = await query(sql, [transId]);
//     return parseFloat(rows[0].total) || 0;
// }

// // Lấy thống kê theo sản phẩm
// // returns [{ productId, skuCode, productName, totalTransactions, totalQuantity, avgUnitPrice, totalValue }]
// async function getItemStatsByProduct() {
//     const sql = `
//         SELECT
//             sti.product_id,
//             p.sku_code,
//             p.name as product_name,
//             COUNT(*) as total_transactions,
//             SUM(sti.qty) as total_quantity,
//             AVG(sti.unit_price) as avg_unit_price,
//             SUM(sti.qty * sti.unit_price) as total_value
//         FROM supplier_transaction_items sti
//         LEFT JOIN products p ON sti.product_id = p.id
//         GROUP BY sti.product_id, p.sku_code, p.name
//         ORDER BY total_value DESC
//     `;
//     const { rows } = await query(sql);
//     return rows.map((row) => ({
//         productId: row.product_id,
//         skuCode: row.sku_code,
//         productName: row.product_name,
//         totalTransactions: parseInt(row.total_transactions, 10),
//         // làm tròn 3 chữ số thập phân
//         totalQuantity: Math.round((parseFloat(row.total_quantity) || 0) * 1000) / 1000,
//         avgUnitPrice: Math.round((parseFloat(row.avg_unit_price) || 0) * 1000) / 1000,
//         totalValue: Math.round((parseFloat(row.total_value) || 0) * 1000) / 1000,
//     }));
// }

// // Xóa nhiều items
// async function deleteMany(ids = []) {
//     if (!Array.isArray(ids) || ids.length === 0) return 0;
//     const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
//     const sql = `DELETE FROM supplier_transaction_items WHERE id IN (${placeholders})`;
//     const { rowCount } = await query(sql, ids);
//     return rowCount;
// }

// // Tìm theo danh sách IDs
// async function findByIds(ids = []) {
//     if (!Array.isArray(ids) || ids.length === 0) return [];
//     const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
//     const sql = `
//         SELECT ${PUBLIC_FIELDS_WITH_JOIN}
//         FROM supplier_transaction_items sti
//         LEFT JOIN products p ON sti.product_id = p.id
//         LEFT JOIN inventory_lots il ON sti.lot_id = il.id
//         LEFT JOIN supplier_transactions st ON sti.trans_id = st.id
//         WHERE sti.id IN (${placeholders})
//         ORDER BY p.name ASC
//     `;
//     const { rows } = await query(sql, ids);
//     return rows.map(toSupplierTransactionItem);
// }

// /* -------------------- EXPORT -------------------- */

// module.exports = {
//     // Basic CRUD
//     createSupplierTransactionItem,
//     findById,
//     getItemsByTransactionId,
//     getItemsByProductId,
//     getItemsByLotId,
//     updateSupplierTransactionItem,
//     deleteSupplierTransactionItem,
//     deleteItemsByTransactionId,

//     // Helper functions
//     calculateTransactionTotal,
//     getItemStatsByProduct,
//     deleteMany,
//     findByIds,
// };
