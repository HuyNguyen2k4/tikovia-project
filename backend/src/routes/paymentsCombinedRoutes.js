/* src/routes/paymentsCombinedRoutes.js */
const router = require('express').Router();
const paymentsCombinedController = require('@src/controllers/paymentsCombinedController');
const tokenUtils = require('@src/middlewares/jwt');

/**
 * @desc    Lấy danh sách payments
 * @route   GET /api/payments-combined
 * @access  Private (admin, accountant, seller)
 */
router.get(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    paymentsCombinedController.getPayments
);

/**
 * @desc    Lấy thống kê payments theo phương thức thanh toán
 * @route   GET /api/payments-combined/stats/by-method
 * @access  Private (Admin, Accountant)
 */
router.get(
    '/stats/by-method',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant'])],
    paymentsCombinedController.getPaymentStatsByMethod
);

/**
 * @desc    Lấy tổng số tiền đã nhận cho một invoice
 * @route   GET /api/payments-combined/invoice/:invoiceId/total-received
 * @access  Private (Admin, Seller, Accountant)
 */
router.get(
    '/invoice/:invoiceId/total-received',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    paymentsCombinedController.getTotalReceivedForInvoice
);

/**
 * @desc    Lấy allocations của một invoice
 * @route   GET /api/payments-combined/invoice/:invoiceId/allocations
 * @access  Private (Admin, Seller, Accountant)
 */
router.get(
    '/invoice/:invoiceId/allocations',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    paymentsCombinedController.getAllocationsByInvoiceId
);

/**
 * @desc    Tạo payment mới
 * @route   POST /api/payments-combined
 * @access  Private (Admin, Accountant)
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant'])],
    paymentsCombinedController.createPayment
);

/**
 * @desc    Lấy chi tiết payment
 * @route   GET /api/payments-combined/:id
 * @access  Private (Admin, Seller, Accountant)
 */
router.get(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    paymentsCombinedController.getPaymentById
);

/**
 * @desc    Cập nhật payment
 * @route   PUT /api/payments-combined/:id
 * @access  Private (Admin, Accountant)
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant'])],
    paymentsCombinedController.updatePayment
);

/**
 * @desc    Xóa payment
 * @route   DELETE /api/payments-combined/:id
 * @access  Private (Admin)
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    paymentsCombinedController.deletePayment
);

module.exports = router;
