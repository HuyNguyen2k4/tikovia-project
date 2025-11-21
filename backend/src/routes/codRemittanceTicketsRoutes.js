const router = require('express').Router();
const ctrls = require('@src/controllers/codRemittanceTicketsController');
const tokenUtils = require('@middlewares/jwt');

// ============================================================
// COD REMITTANCE TICKETS ROUTES
// ============================================================

/**
 * [GET] /api/cod-remittance-tickets/available-delivery-runs
 * Lấy danh sách delivery runs khả dụng (completed và chưa có ticket)
 * Query: shipperId, limit, offset
 * Access: authenticated users (admin, accountant, sup_shipper)
 */
router.get(
    '/available-delivery-runs',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant', 'sup_shipper'])],
    ctrls.getAvailableDeliveryRuns
);

/**
 * [GET] /api/cod-remittance-tickets
 * Query: q, shipperId, deliveryRunId, status, createdBy, fromDate, toDate, limit, offset
 * Access: authenticated users (admin, accountant, sup_shipper)
 */
router.get(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant', 'sup_shipper'])],
    ctrls.getCodRemittanceTickets
);

/**
 * [GET] /api/cod-remittance-tickets/:id
 * Access: authenticated users (admin, accountant, sup_shipper)
 */
router.get(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant', 'sup_shipper'])],
    ctrls.getCodRemittanceTicketById
);

/**
 * ✅ NEW: [GET] /api/cod-remittance-tickets/:id/details
 * Lấy thông tin chi tiết ticket bao gồm cả danh sách orders
 * Access: authenticated users (admin, accountant, sup_shipper)
 */
router.get(
    '/:id/details',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant', 'sup_shipper'])],
    ctrls.getCodRemittanceTicketDetails
);

/**
 * [POST] /api/cod-remittance-tickets
 * Body: deliveryRunId, receivedAmount, status (optional), note (optional)
 * Access: admin, accountant, sup_shipper
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant', 'sup_shipper'])],
    ctrls.createCodRemittanceTicket
);

/**
 * [PUT] /api/cod-remittance-tickets/:id
 * Body: receivedAmount, status, note
 * Access: admin, accountant
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant'])],
    ctrls.updateCodRemittanceTicket
);

/**
 * [DELETE] /api/cod-remittance-tickets/:id
 * Access: admin only
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteCodRemittanceTicket
);

module.exports = router;
