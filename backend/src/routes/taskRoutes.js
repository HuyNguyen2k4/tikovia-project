// src/routes/taskRoutes.js
const router = require('express').Router();
const ctrls = require('@controllers/taskController');
const tokenUtils = require('@middlewares/jwt');

/* -------------------- ✅ ANALYTICS ROUTES (đặt trước dynamic routes) -------------------- */

/**
 * @desc Lấy thống kê tổng quan các preparation tasks
 * @route GET /api/tasks/stats/overview
 * @access Private (admin, manager)
 */
router.get(
    '/stats/overview',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.getTaskStats
);

/**
 * @desc Lấy thống kê các task theo từng user (packer)
 * @route GET /api/tasks/stats/by-user/:userId
 * @access Private (admin, manager, sup_picker, picker)
 */
router.get(
    '/stats/by-user/:userId',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'sup_picker', 'picker']),
    ],
    ctrls.getTaskStatsByUser
);

/**
 * @desc Lấy toàn bộ task thuộc supervisor hiện tại (theo token)
 * @route GET /api/tasks/mine/supervisor
 * @access Private (sup_picker)
 */
router.get(
    '/mine/supervisor',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['sup_picker'])],
    ctrls.getTasksByCurrentSupervisor
);

/**
 * @desc Lấy toàn bộ task thuộc packer hiện tại (theo token)
 * @route GET /api/tasks/mine/packer
 * @access Private (packer)
 */
router.get(
    '/mine/packer',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['picker'])],
    ctrls.getTasksByCurrentPacker
);

/* -------------------- ✅ MAIN CRUD ROUTES -------------------- */

/**
 * @desc Lấy danh sách preparation tasks với phân trang và filter
 * @route GET /api/tasks
 * @query q?, status?, supervisorId?, packerId?, limit?, offset?
 * @access Private (admin, manager, sup_picker, accountant, picker)
 */
router.get(
    '/',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'picker', 'sup_picker', 'accountant']),
    ],
    ctrls.getTasks
);

/**
 * @desc Tạo preparation task mới (bao gồm danh sách items)
 * @route POST /api/tasks
 * @body orderId, supervisorId, packerId, deadline, note?, items[]
 * @access Private (manager, sup_picker, admin)
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'sup_picker'])],
    ctrls.createTaskWithItems
);

/**
 * @desc Lấy chi tiết 1 preparation task kèm danh sách items
 * @route GET /api/tasks/:id
 * @access Private (admin, manager, sup_picker, picker)
 */
router.get(
    '/:id',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'sup_picker', 'picker']),
    ],
    ctrls.getTaskById
);

/**
 * @desc Lấy danh sách preparation items của 1 task cụ thể
 * @route GET /api/tasks/:id/items
 * @access Private (admin, manager, sup_picker, picker)
 */
router.get(
    '/:id/items',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'sup_picker', 'picker']),
    ],
    ctrls.getItemsByTask
);

/**
 * @desc Cập nhật thông tin và danh sách items của preparation task
 * @route PUT /api/tasks/:id
 * @body supervisorId?, packerId?, status?, deadline?, note?, startedAt?, completedAt?, items[]?
 * @access Private (admin, manager, sup_picker, picker)
 */
router.put(
    '/:id',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'sup_picker', 'picker']),
    ],
    ctrls.updateTaskWithItems
);

/**
 * @desc Cập nhật trạng thái preparation task (assign → in_progress → pending_review → completed)
 * @route PATCH /api/tasks/:id/status
 * @body { status: string }
 * @access Private (admin, manager, picker, sup_picker)
 */
router.patch(
    '/:id/status',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'picker', 'sup_picker']),
    ],
    ctrls.updateTaskStatus
);

/**
 * @desc Cập nhật kết quả review của preparation task
 * @route PATCH /api/tasks/:id/review
 * @body { result: 'pending' | 'confirmed' | 'rejected', reason?: string }
 * @access Private (sup_picker, manager, admin)
 */
router.patch(
    '/:id/review',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'sup_picker'])],
    ctrls.updateTaskReview
);

/**
 * @desc Picker cập nhật item trong task (số lượng & ảnh)
 * @route PUT /api/tasks/:taskId/items/:itemId
 * @body postQty?, preEvd?, postEvd?
 * @access Private (picker)
 */
router.put(
    '/:taskId/items/:itemId',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['picker'])],
    ctrls.updateTaskItemByPicker
);

/**
 * @desc Xóa preparation task (và toàn bộ items liên quan)
 * @route DELETE /api/tasks/:id
 * @access Private (admin)
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteTask
);

/**
 * @desc Lấy tổng số lượng đã post cho một order item trong tất cả các tasks
 * @route GET /api/tasks/order-item/:orderItemId/post-qty
 * @access Private (any authenticated user)
 */
router.get(
    '/order-item/:orderItemId/post-qty',
    tokenUtils.verifyAccessToken,
    ctrls.getPostQtyByOrderItemId
);

module.exports = router;
