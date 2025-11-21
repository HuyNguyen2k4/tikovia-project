const router = require('express').Router();
const ctrls = require('@src/controllers/salesInvoicesController');
const tokenUtils = require('@middlewares/jwt');

// ============================================================
// SALES INVOICES ROUTES
// ============================================================

/**
 * Lấy danh sách hóa đơn
 * [GET] /api/sales-invoices
 * Query: q, customerId, orderId, status, limit, offset
 * Access: Admin, accountant, seller (sellers can see invoices for their orders only)
 * 
 */
router.get(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant', 'seller'])],
    ctrls.getSalesInvoices
);

/**
 * @desc     Lấy thông tin hóa đơn theo order_id
 * @route    GET /api/sales-invoices/order/:orderId
 * @param    {string} orderId - Order ID
 * @return   {object} - Hóa đơn
 * Access: Admin, accountant, seller (sellers can see invoices for their orders only)
 */
router.get(
    '/order/:orderId',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant', 'seller'])],
    ctrls.getSalesInvoiceByOrderId
);

/**
 * Tạo hóa đơn mới
 * [POST] /api/sales-invoices
 * Body: orderId, taxAmount, discountAmount, items
 * Items: array of { orderItemId, unitPrice }
 * Access: admin, accountant
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant'])],
    ctrls.createSalesInvoice
);

/**
 * Lấy thông tin hóa đơn theo ID
 * [GET] /api/sales-invoices/:id
 * Access:  Admin, accountant, seller (sellers can see invoices for their orders only)
 */
router.get(
    '/:id',
    [tokenUtils.verifyAccessToken],
    tokenUtils.checkRole(['admin', 'accountant', 'seller']),
    ctrls.getSalesInvoiceById
);

/**
 * Cập nhật hóa đơn
 * [PUT] /api/sales-invoices/:id
 * Body: invoiceNo, taxAmount, discountAmount, items
 * Items: array of { id (optional), unitPrice }
 * Access: admin
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.updateSalesInvoice
);

/**
 * Xóa hóa đơn
 * [DELETE] /api/sales-invoices/:id
 * Access: admin
 * Note: Controller có logic ngăn xóa nếu đã có thanh toán.
 * Không cho delete
 */
// router.delete(
//     '/:id',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
//     ctrls.deleteSalesInvoice
// );

module.exports = router;
