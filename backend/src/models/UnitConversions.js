// const { query } = require('@src/config/dbconnect');
// const dayjs = require('dayjs');
// const utc = require('dayjs/plugin/utc');
// const timezone = require('dayjs/plugin/timezone');

// // Cấu hình dayjs
// dayjs.extend(utc);
// dayjs.extend(timezone);

// const PUBLIC_FIELDS = `
//   uc.id, uc.lot_id, uc.pack_unit, uc.main_unit,
//   uc.conversion_rate, uc.created_at, uc.updated_at,
//   p.name AS product_name, p.sku_code AS product_sku,
//   il.lot_no, il.expiry_date
// `;

// const PUBLIC_FIELDS_ONLY = `
//   id, lot_id, pack_unit, main_unit,
//   conversion_rate, created_at, updated_at
// `;

// // Map row -> object JS
// function toUnitConversion(row) {
//     if (!row) return null;

//     // Helper function để chuyển đổi UTC sang giờ Việt Nam
//     const formatToVietnamTime = (date) => {
//         if (!date) return null;
//         return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
//     };

//     return {
//         id: row.id,
//         lotId: row.lot_id,
//         packUnit: row.pack_unit,
//         mainUnit: row.main_unit,
//         conversionRate: parseFloat(row.conversion_rate) || 0,
//         createdAt: formatToVietnamTime(row.created_at), // ✅ Thay đổi
//         updatedAt: formatToVietnamTime(row.updated_at), // ✅ Thay đổi
//         // Join fields
//         productName: row.product_name || null,
//         productSku: row.product_sku || null,
//         lotNo: row.lot_no || null,
//         expiryDate: row.expiry_date ? formatToVietnamTime(row.expiry_date) : null, // ✅ Thay đổi
//     };
// }

// /* -------------------- BASIC CRUD -------------------- */

// // Tạo unit conversion mới
// async function createUnitConversion({ lotId, packUnit, mainUnit, conversionRate }) {
//     const sql = `
//     INSERT INTO unit_conversions (
//       lot_id, pack_unit, main_unit, conversion_rate
//     )
//     VALUES ($1, $2, $3, $4)
//     RETURNING ${PUBLIC_FIELDS_ONLY}
//   `;
//     const { rows } = await query(sql, [lotId, packUnit, mainUnit, conversionRate]);
//     return toUnitConversion(rows[0]);
// }

// // Tìm unit conversion theo ID
// async function findById(id) {
//     const sql = `
//     SELECT ${PUBLIC_FIELDS}
//     FROM unit_conversions uc
//     LEFT JOIN inventory_lots il ON uc.lot_id = il.id
//     LEFT JOIN products p ON il.product_id = p.id
//     WHERE uc.id = $1
//   `;
//     const { rows } = await query(sql, [id]);
//     return toUnitConversion(rows[0]);
// }

// // Liệt kê unit conversions
// async function listUnitConversions({ q, lotId, packUnit, mainUnit, limit = 20, offset = 0 } = {}) {
//     try {
//         const clauses = [];
//         const params = [];

//         if (q && q.trim()) {
//             params.push(`%${q.trim()}%`);
//             clauses.push(`
//         (uc.pack_unit ILIKE $${params.length}
//         OR uc.main_unit ILIKE $${params.length}
//         OR p.name ILIKE $${params.length}
//         OR p.sku_code ILIKE $${params.length}
//         OR il.lot_no ILIKE $${params.length})
//       `);
//         }

//         if (lotId) {
//             params.push(lotId);
//             clauses.push(`uc.lot_id = $${params.length}`);
//         }

//         if (packUnit) {
//             params.push(packUnit);
//             clauses.push(`uc.pack_unit = $${params.length}`);
//         }

//         if (mainUnit) {
//             params.push(mainUnit);
//             clauses.push(`uc.main_unit = $${params.length}`);
//         }

//         params.push(limit, offset);
//         const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
//         const sql = `
//       SELECT ${PUBLIC_FIELDS}
//       FROM unit_conversions uc
//       LEFT JOIN inventory_lots il ON uc.lot_id = il.id
//       LEFT JOIN products p ON il.product_id = p.id
//       ${where}
//       ORDER BY uc.created_at DESC, p.name ASC
//       LIMIT $${params.length - 1} OFFSET $${params.length}
//     `;

//         const { rows } = await query(sql, params);
//         return rows.map(toUnitConversion);
//     } catch (error) {
//         console.error('Lỗi khi lấy danh sách unit conversions:', error.message);
//         throw new Error('Không thể lấy danh sách unit conversions');
//     }
// }

// // Đếm tổng số unit conversions
// async function countUnitConversions({ q, lotId, packUnit, mainUnit } = {}) {
//     const clauses = [];
//     const params = [];

//     if (q && q.trim()) {
//         params.push(`%${q.trim()}%`);
//         clauses.push(`
//       (uc.pack_unit ILIKE $${params.length}
//       OR uc.main_unit ILIKE $${params.length}
//       OR p.name ILIKE $${params.length}
//       OR p.sku_code ILIKE $${params.length}
//       OR il.lot_no ILIKE $${params.length})
//     `);
//     }

//     if (lotId) {
//         params.push(lotId);
//         clauses.push(`uc.lot_id = $${params.length}`);
//     }

//     const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
//     const sql = `
//     SELECT COUNT(*) AS count
//     FROM unit_conversions uc
//     LEFT JOIN inventory_lots il ON uc.lot_id = il.id
//     LEFT JOIN products p ON il.product_id = p.id
//     ${where}
//   `;
//     const { rows } = await query(sql, params);
//     return parseInt(rows[0]?.count || '0', 10);
// }

// // Cập nhật unit conversion
// async function updateUnitConversion(id, payload = {}) {
//     const fields = [];
//     const params = [];
//     const map = {
//         lotId: 'lot_id',
//         packUnit: 'pack_unit',
//         mainUnit: 'main_unit',
//         conversionRate: 'conversion_rate',
//     };

//     Object.entries(map).forEach(([kSrc, kDb]) => {
//         if (payload[kSrc] !== undefined) {
//             params.push(payload[kSrc]);
//             fields.push(`${kDb} = $${params.length}`);
//         }
//     });

//     if (fields.length === 0) return findById(id);

//     params.push(dayjs().utc().toDate()); // ✅ Sử dụng dayjs thay vì new Date()
//     fields.push(`updated_at = $${params.length}`);
//     params.push(id);

//     const sql = `
//     UPDATE unit_conversions SET ${fields.join(', ')}
//     WHERE id = $${params.length}
//     RETURNING ${PUBLIC_FIELDS_ONLY}
//   `;
//     const { rows } = await query(sql, params);
//     return toUnitConversion(rows[0]);
// }

// // Xóa 1 hoặc nhiều conversion
// async function deleteUnitConversion(id) {
//     await query('DELETE FROM unit_conversions WHERE id = $1', [id]);
//     return true;
// }

// async function deleteMany(ids = []) {
//     if (!Array.isArray(ids) || ids.length === 0) return 0;
//     const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
//     const sql = `DELETE FROM unit_conversions WHERE id IN (${placeholders})`;
//     const { rowCount } = await query(sql, ids);
//     return rowCount;
// }

// /* -------------------- EXTRA HELPERS -------------------- */

// // Thay đổi từ kiểm tra (lotId, packUnit, mainUnit) thành chỉ kiểm tra lotId
// async function isConversionExists(lotId, excludeId = null) {
//     let sql = `
//         SELECT id FROM unit_conversions
//         WHERE lot_id = $1
//     `;
//     const params = [lotId];
//     if (excludeId) {
//         params.push(excludeId);
//         sql += ` AND id != $${params.length}`;
//     }
//     const { rowCount } = await query(sql, params);
//     return rowCount > 0;
// }

// // Tìm conversion rate cho 1 lot (chỉ có 1 conversion per lot)
// async function findConversionRate(lotId) {
//     const sql = `
//         SELECT pack_unit, main_unit, conversion_rate
//         FROM unit_conversions
//         WHERE lot_id = $1
//     `;
//     const { rows } = await query(sql, [lotId]);
//     if (!rows.length) return null;

//     const { pack_unit, main_unit, conversion_rate } = rows[0];
//     return {
//         packUnit: pack_unit,
//         mainUnit: main_unit,
//         conversionRate: parseFloat(conversion_rate),
//     };
// }

// // Tìm unit conversion theo lot_id
// async function findByLotId(lotId) {
//     const sql = `
//         SELECT ${PUBLIC_FIELDS}
//         FROM unit_conversions uc
//         LEFT JOIN inventory_lots il ON uc.lot_id = il.id
//         LEFT JOIN products p ON il.product_id = p.id
//         WHERE uc.lot_id = $1
//     `;
//     const { rows } = await query(sql, [lotId]);
//     return toUnitConversion(rows[0]);
// }

// /* -------------------- EXPORT -------------------- */
// module.exports = {
//     createUnitConversion,
//     findById,
//     findByLotId, // ✅ Thêm mới
//     listUnitConversions,
//     countUnitConversions,
//     updateUnitConversion,
//     deleteUnitConversion,
//     deleteMany,
//     isConversionExists,
//     findConversionRate,
// };
