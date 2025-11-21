/* src/routes/orderReturnRoutes.js */
const router = require('express').Router();
const orderReturnsController = require('@controllers/orderReturnsController');
const tokenUtils = require('@middlewares/jwt');

/**
 * @desc    Lấy danh sách đơn trả hàng
 * @route   GET /api/order-returns
 * @access  Private (admin, manager, accountant, seller)
 */
router.get(
    '/',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'accountant', 'seller']),
    ],
    orderReturnsController.getOrderReturns
);

/**
 * @desc    Lấy thống kê đơn trả hàng theo trạng thái
 * @route   GET /api/order-returns/stats/by-status
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
    '/stats/by-status',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    orderReturnsController.getOrderReturnStatsByStatus
);

/**
 * @desc    Kiểm tra đơn hàng có thể tạo trả hàng không
 * @route   GET /api/order-returns/check-order/:orderId
 * @access  Private (All authenticated users)
 */
router.get(
    '/check-order/:orderId',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'accountant', 'seller']),
    ],
    orderReturnsController.checkOrderCanReturn
);

/**
 * @desc    Lấy đơn trả hàng theo order ID
 * @route   GET /api/order-returns/order/:orderId
 * @access  Private (All authenticated users)
 */
router.get(
    '/order/:orderId',
    [tokenUtils.verifyAccessToken],
    orderReturnsController.getOrderReturnByOrderId
);

/**
 * @desc    Tạo đơn trả hàng mới
 * @route   POST /api/order-returns
 * @access  Private (Admin, Accountant, Seller)
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant', 'seller'])],
    orderReturnsController.createOrderReturn
);

/**
 * @desc    Lấy chi tiết đơn trả hàng
 * @route   GET /api/order-returns/:id
 * @access  Private (Admin, Accountant, Seller)
 */
router.get(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant', 'seller'])],
    orderReturnsController.getOrderReturnById
);

/**
 * @desc    Cập nhật đơn trả hàng
 * @route   PUT /api/order-returns/:id
 * @access  Private (Admin, Accountant, Seller)
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    orderReturnsController.updateOrderReturn
);

/**
 * @desc    Xóa đơn trả hàng
 * @route   DELETE /api/order-returns/:id
 * @access  Private (Admin, Manager)
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    orderReturnsController.deleteOrderReturn
);

module.exports = router;
