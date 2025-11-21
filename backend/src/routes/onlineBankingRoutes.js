const router = require('express').Router();
const ctrls = require('@src/controllers/onlineBankingController');
const tokenUtils = require('@middlewares/jwt');

/**
 * @desc    Endpoint nhận webhook từ SePay khi có giao dịch mới
 * @route   POST /api/payments/sepay-webhook
 * @access  Public (vì SePay gọi vào, nhưng sẽ được bảo vệ bằng secure token)
 */
router.post('/sepay-webhook', ctrls.handleSepayWebhook);

// ✅ NEW: Log management endpoints
/**
 * @desc    Lấy danh sách logs SePay với filter và phân trang
 * @route   GET /api/payments/sepay-logs
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
    '/sepay-logs',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getSepayLogs
);

/**
 * @desc    Lấy thống kê logs SePay theo trạng thái
 * @route   GET /api/payments/sepay-logs/stats
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
    '/sepay-logs/stats',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getSepayLogsStats
);

/**
 * @desc    Lấy chi tiết log SePay theo ID
 * @route   GET /api/payments/sepay-logs/:id
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
    '/sepay-logs/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getSepayLogById
);

module.exports = router;
