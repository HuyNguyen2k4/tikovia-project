const router = require('express').Router();
const ctrls = require('@src/controllers/salesOrdersController');
const tokenUtils = require('@middlewares/jwt');

// ============================================================
// SALES ORDERS ROUTES
// ============================================================

/**
 * [GET] /api/sales-orders
 * Query: q, customerId, sellerId, status, adminLocked, limit, offset
 * Access: any authenticated user
 */
router.get('/', [tokenUtils.verifyAccessToken], ctrls.getSalesOrders);

/**
 * [POST] /api/sales-orders
 * Body: orderNo, customerId, slaDeliveryAt, address, items
 * Items: array of { productId, qty, note }
 * Access: seller (sellerId taken from req.user in controller)
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['seller'])],
    ctrls.createSalesOrder
);

/**
 * [GET] /api/sales-orders/with-invoice
 * Query: q, customerId, sellerId, departmentId, status, adminLocked, limit, offset
 * Access: any authenticated user
 */
router.get('/with-invoice', [tokenUtils.verifyAccessToken], ctrls.getSalesOrdersWithInvoiceFull);

/**
 * [POST] /api/sales-orders/prefill-link
 * Body: customerId, sellerId, items
 * Items: array of { productId, qty, note }
 * Access: only n8n chatbot caller with API key
 */
router.post(
    '/prefill-link',
    tokenUtils.verifyChatbotCaller, // Chỉ cho phép n8n gọi với API key
    ctrls.generateSalesOrderPrefillLink
);

/**
 * [GET] /api/sales-orders/:id
 * Access: any authenticated user
 */
router.get('/:id', [tokenUtils.verifyAccessToken], ctrls.getSalesOrderById);

/**
 * [PUT] /api/sales-orders/:id
 * Body: orderNo, customerId, sellerId (ignored for sellers), status, slaDeliveryAt, address, adminLocked, items
 * Items: array of { id, productId, qty, note }
 * Access: admin, seller
 * Note: controller ensures sellerId comes from req.user for callers with role 'seller'
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller'])],
    ctrls.updateSalesOrder
);

/**
 * [PATCH] /api/sales-orders/:id/admin-lock
 * Body: { adminLocked: boolean }
 * Access: admin, seller
 */
router.patch(
    '/:id/admin-lock',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller'])],
    ctrls.updateSalesOrderAdminLock
);

/**
 * [DELETE] /api/sales-orders/:id
 * Access: admin
 * Note: soft delete / cancel logic handled in controller/model
 */
// router.delete(
//     '/:id',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
//     ctrls.deleteSalesOrder
// );

module.exports = router;
