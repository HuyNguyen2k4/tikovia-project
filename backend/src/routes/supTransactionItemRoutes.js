// const router = require('express').Router();
// const ctrls = require('@controllers/supTransactionItemController');
// const tokenUtils = require('@middlewares/jwt');

// // ============================================================
// // SPECIALIZED QUERIES - ĐẶT TRƯỚC CÁC ROUTE CÓ PARAMS
// // ============================================================

// /**
//  * [GET] /supplier-transaction-items/transaction/:transId - Lấy tất cả items của một transaction
//  * Params: transId (UUID)
//  * Access: Admin, Manager, Accountant
//  * returns: Mảng các items
//  */
// router.get(
//     '/transaction/:transId',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.getItemsByTransactionId
// );

// /**
//  * [GET] /supplier-transaction-items/product/:productId - Lấy items theo product ID
//  * Params: productId (UUID)
//  * Query params: limit, offset
//  * Access: Admin, Manager, Accountant
//  * returns: Mảng các items
//  */
// router.get(
//     '/product/:productId',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.getItemsByProductId
// );

// /**
//  * [GET] /supplier-transaction-items/lot/:lotId - Lấy items theo lot ID
//  * Params: lotId (UUID)
//  * Access: Admin, Manager, Accountant
//  * returns: Mảng các items
//  */
// router.get(
//     '/lot/:lotId',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.getItemsByLotId
// );

// /**
//  * [GET] /supplier-transaction-items/stats/by-product - Lấy thống kê items theo sản phẩm
//  * Access: Admin, Manager, Accountant
//  * returns: Thống kê items
//  */
// router.get(
//     '/stats/by-product',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.getItemStatsByProduct
// );

// // ============================================================
// // BULK OPERATIONS
// // ============================================================

// /**
//  * [DELETE] /supplier-transaction-items/bulk - Xóa nhiều items cùng lúc
//  * Body: { ids: string[] }
//  * Access: Admin và Manager
//  * returns: Số lượng items đã xóa
//  */
// router.delete(
//     '/bulk',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
//     ctrls.deleteBulkSupplierTransactionItems
// );

// // ============================================================
// // BASIC CRUD OPERATIONS
// // ============================================================

// /**
//  * [GET] /supplier-transaction-items/:id - Lấy thông tin item theo ID
//  * Params: id (UUID)
//  * Access: Admin, Manager, Accountant
//  * returns: Item hoặc null nếu không tìm thấy
//  */
// router.get(
//     '/:id',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.getSupplierTransactionItemById
// );

// /**
//  * [POST] /supplier-transaction-items - Tạo item mới
//  * Body: transId, productId, lotId, qty, unitPrice
//  * Access: Admin, Manager, Accountant
//  * returns: Item vừa tạo
//  */
// router.post(
//     '/',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.createSupplierTransactionItem
// );

// /**
//  * [PUT] /supplier-transaction-items/:id - Cập nhật thông tin item
//  * Params: id (UUID)
//  * Body: transId, productId, lotId, qty, unitPrice
//  * Access: Admin, Manager, Accountant
//  * returns: Item sau khi update hoặc null nếu không tìm thấy
//  */
// router.put(
//     '/:id',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.updateSupplierTransactionItem
// );

// /**
//  * [DELETE] /supplier-transaction-items/:id - Xóa item
//  * Params: id (UUID)
//  * Access: Admin, Manager, Accountant
//  * returns: Item vừa xóa hoặc null nếu không tìm thấy
//  */
// router.delete(
//     '/:id',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.deleteSupplierTransactionItem
// );

// /**
//  * [DELETE] /supplier-transaction-items/transaction/:transId - Xóa tất cả items của một transaction
//  * Params: transId (UUID)
//  * Access: Admin và Manager
//  * returns: Số lượng items đã xóa
//  */
// router.delete(
//     '/transaction/:transId',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.deleteItemsByTransactionId
// );

// /**
//  * [GET] /supplier-transaction-items/transaction/:transId/total - Tính tổng giá trị của một transaction
//  * Params: transId (UUID)
//  * Access: All authenticated users
//  * returns: Tổng giá trị của transaction
//  */
// router.get(
//     '/transaction/:transId/total',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
//     ctrls.calculateTransactionTotal
// );

// module.exports = router;
