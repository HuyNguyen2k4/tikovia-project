const router = require('express').Router();
const ctrls = require('@src/controllers/deliveryRunsController');
const tokenUtils = require('@middlewares/jwt');

// ============================================================
// DELIVERY RUNS ROUTES
// ============================================================

/**
 * [GET] /api/delivery-runs
 * Query: q, supervisorId, shipperId, status, limit, offset
 * Access: authenticated users (admin, supervisor, shipper)
 */
router.get('/', [tokenUtils.verifyAccessToken], ctrls.getDeliveryRuns);

/**
 * [GET] /api/delivery-runs/:id
 * Access: authenticated users
 */
router.get('/:id', [tokenUtils.verifyAccessToken], ctrls.getDeliveryRunById);

/**
 * [POST] /api/delivery-runs
 * Body: deliveryNo, supervisorId, shipperId, vehicleNo, status, orders (optional)
 * Access: admin, sup_shipper
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'sup_shipper'])],
    ctrls.createDeliveryRun
);

/**
 * [PUT] /api/delivery-runs/:id
 * Body: deliveryNo, supervisorId, shipperId, vehicleNo, status
 * Access: admin, sup_shipper
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'sup_shipper'])],
    ctrls.updateDeliveryRun
);

/**
 * [DELETE] /api/delivery-runs/:id
 * Access: admin
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteDeliveryRun
);

/**
 * [PATCH] /api/delivery-runs/:id/start
 * Start delivery run (assigned -> in_progress)
 * Access: sup_shipper, shipper
 */
router.patch(
    '/:id/start',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['sup_shipper', 'shipper'])],
    ctrls.startDeliveryRun
);

/**
 * [PATCH] /api/delivery-runs/:id/complete
 * Complete delivery run (in_progress -> completed)
 * Access: sup_shipper, shipper
 */
router.patch(
    '/:id/complete',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['sup_shipper', 'shipper'])],
    ctrls.completeDeliveryRun
);

/**
 * [PATCH] /api/delivery-runs/:id/cancel
 * Cancel delivery run (any status -> cancelled)
 * Access: admin only
 */
router.patch(
    '/:id/cancel',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.cancelDeliveryRun
);

module.exports = router;

