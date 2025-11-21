const router = require('express').Router();
const ctrls = require('@controllers/supTransactionPaymentController');
const tokenUtils = require('@middlewares/jwt');

// ============================================================
// SPECIALIZED QUERIES - ĐẶT TRƯỚC CÁC ROUTE CÓ PARAMS
// ============================================================

/**
 * [GET] /supplier-transaction-payments/transaction/:transId - Lấy tất cả payments của một transaction
 * Params: transId (UUID)
 * Access: Admin, Manager, Accountant
 * returns: Mảng các payments
 */
router.get(
    '/transaction/:transId',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getPaymentsByTransactionId
);

/**
 * [GET] /supplier-transaction-payments/paid-by/:paidBy - Lấy payments theo người thanh toán
 * Params: paidBy (UUID)
 * Query params: limit, offset
 * Access: Admin, Manager, Accountant
 * returns: Mảng các payments
 */
router.get(
    '/paid-by/:paidBy',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getPaymentsByPaidBy
);

/**
 * [GET] /supplier-transaction-payments/created-by/:createdBy - Lấy payments theo người tạo
 * Params: createdBy (UUID)
 * Query params: limit, offset
 * Access: Admin, Manager, Accountant
 * returns: Mảng các payments
 */
router.get(
    '/created-by/:createdBy',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getPaymentsByCreatedBy
);

/**
 * [GET] /supplier-transaction-payments/stats/by-user - Lấy thống kê thanh toán theo user
 * Query params: from, to, period, timezone
 * Access: Admin, Manager, Accountant
 * returns: Thống kê thanh toán theo user
 */
router.get(
    '/stats/by-user',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getPaymentStatsByUser
);

/**
 * [GET] /supplier-transaction-payments/stats/by-month - Lấy thống kê thanh toán theo tháng
 * Access: Admin và Manager, Accountant
 * returns: Thống kê thanh toán theo tháng
 */
router.get(
    '/stats/by-month',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getPaymentStatsByMonth
);

// ============================================================
// BULK OPERATIONS
// ============================================================

/**
 * [DELETE] /supplier-transaction-payments/bulk - Xóa nhiều payments cùng lúc
 * Body: { ids: string[] }
 * Access: Admin
 * returns: Số lượng payments đã xóa
 */
router.delete(
    '/bulk',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteBulkSupplierTransactionPayments
);

// ============================================================
// BASIC CRUD OPERATIONS
// ============================================================

/**
 * [GET] /supplier-transaction-payments - Lấy danh sách payments với phân trang và tìm kiếm
 * Query params: q, transId, supplierId, departmentId, paidBy, createdBy, fromDate, toDate, limit, offset
 * Access: Admin, Manager, Accountant
 * returns: Mảng các payments
 */
router.get(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getSupplierTransactionPayments
);

/**
 * [POST] /supplier-transaction-payments - Tạo payment mới
 * Body: transId, amount, paidAt, paidBy, evdUrl, note
 * Access: Admin, Manager, Accountant
 * returns: Payment vừa tạo
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.createSupplierTransactionPayment
);

/**
 * [GET] /supplier-transaction-payments/:id - Lấy thông tin payment theo ID
 * Params: id (UUID)
 * Access: Admin, Manager, Accountant
 * returns: Payment hoặc null nếu không tìm thấy
 */
router.get(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getSupplierTransactionPaymentById
);

/**
 * [PUT] /supplier-transaction-payments/:id - Cập nhật thông tin payment
 * Params: id (UUID)
 * Body: amount, paidAt, paidBy, evdUrl, note
 * Access: Admin, Manager, Accountant
 * returns: Payment sau khi update hoặc null nếu không tìm thấy
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.updateSupplierTransactionPayment
);

/**
 * [DELETE] /supplier-transaction-payments/:id - Xóa payment
 * Params: id (UUID)
 * Access: Admin, Manager
 * returns: Payment vừa xóa hoặc null nếu không tìm thấy
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.deleteSupplierTransactionPayment
);

/**
 * [DELETE] /supplier-transaction-payments/transaction/:transId - Xóa tất cả payments của một transaction
 * Params: transId (UUID)
 * Access: Admin, Manager
 * returns: Số lượng payments đã xóa
 */
router.delete(
    '/transaction/:transId',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.deletePaymentsByTransactionId
);

/**
 * [GET] /supplier-transaction-payments/transaction/:transId/total - Tính tổng số tiền đã thanh toán cho một transaction
 * Params: transId (UUID)
 * Access: Admin, Manager, Accountant
 * returns: Tổng số tiền đã thanh toán
 */
router.get(
    '/transaction/:transId/total',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.calculateTotalPaidAmount
);

module.exports = router;
