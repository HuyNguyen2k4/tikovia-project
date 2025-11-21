const router = require('express').Router();
const ctrls = require('@src/controllers/deliveryRunOrdersController');
const tokenUtils = require('@middlewares/jwt');

// ============================================================
// DELIVERY RUN ORDERS ROUTES
// ============================================================

/**
 * [GET] /api/delivery-run-orders
 * Query: q, runId, orderId, status, limit, offset
 * Access: authenticated users
 */
router.get('/', [tokenUtils.verifyAccessToken], ctrls.getDeliveryRunOrders);

/**
 * [GET] /api/delivery-run-orders/run/:runId
 * Get all orders of a specific delivery run
 * Access: authenticated users
 */
router.get('/run/:runId', [tokenUtils.verifyAccessToken], ctrls.getDeliveryRunOrdersByRunId);

/**
 * [GET] /api/delivery-run-orders/order/:orderId
 * Get all delivery runs of a specific sales order
 * Access: authenticated users
 */
router.get('/order/:orderId', [tokenUtils.verifyAccessToken], ctrls.getDeliveryRunOrdersByOrderId);

/**
 * [GET] /api/delivery-run-orders/:id
 * Access: authenticated users
 */
router.get('/:id', [tokenUtils.verifyAccessToken], ctrls.getDeliveryRunOrderById);

/**
 * [POST] /api/delivery-run-orders
 * Body: runId, orderId, routeSeq, codAmount, status, actualPay, evdUrl, note
 * Access: admin, sup_shipper
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'sup_shipper'])],
    ctrls.createDeliveryRunOrder
);

/**
 * [PUT] /api/delivery-run-orders/:id
 * Body: runId, orderId, routeSeq, codAmount, status, actualPay, evdUrl, note
 * Access: admin, sup_shipper
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'sup_shipper'])],
    ctrls.updateDeliveryRunOrder
);

/**
 * [DELETE] /api/delivery-run-orders/:id
 * Access: admin, sup_shipper
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'sup_shipper'])],
    ctrls.deleteDeliveryRunOrder
);

/**
 * [PATCH] /api/delivery-run-orders/:id/start
 * Start delivery (pending -> in_progress)
 * Access: sup_shipper, shipper
 */
router.patch(
    '/:id/start',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['sup_shipper', 'shipper'])],
    ctrls.startDelivery
);

/**
 * [PATCH] /api/delivery-run-orders/:id/complete
 * Complete delivery (in_progress -> completed)
 * Body: actualPay, evdUrl, note (all optional)
 * Access: sup_shipper, shipper
 */
router.patch(
    '/:id/complete',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['sup_shipper', 'shipper'])],
    ctrls.completeDelivery
);

/**
 * [PATCH] /api/delivery-run-orders/:id/fail
 * Mark delivery as failed (any status -> cancelled)
 * Body: note (required - reason for failure)
 * Access: admin only
 */
router.patch(
    '/:id/fail',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.failDelivery
);

/**
 * [PATCH] /api/delivery-run-orders/:id/cancel
 * Cancel delivery (any status -> cancelled)
 * Body: note (optional - reason for cancellation)
 * Access: admin only
 */
router.patch(
    '/:id/cancel',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.cancelDeliveryRunOrder
);

/**
 * [PATCH] /api/delivery-run-orders/:id/reopen
 * Reopen a cancelled or failed delivery run order (cancelled/failed -> pending)
 * Access: admin, sup_shipper
 */
router.patch(
    '/:id/reopen',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'sup_shipper'])],
    ctrls.reopenDeliveryRunOrder
);

module.exports = router;
