// src/controllers/taskController.js
const asyncHandler = require('express-async-handler');
const Task = require('@src/models/Task');
const { query } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { get } = require('@src/routes/authRoutes');

dayjs.extend(utc);
dayjs.extend(timezone);

/* ===================== Helpers ===================== */
const validateUuidFormat = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

const formatToVietnamTime = (date) => {
    if (!date) return null;
    return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
};

/* ===================== CONTROLLERS ===================== */

/**
 * @desc Lấy danh sách preparation tasks (phân quyền theo role)
 * @route GET /api/tasks
 * @access Private (admin, manager, accountant, supervisor, picker)
 */
const getTasks = asyncHandler(async (req, res) => {
    const { q, status, limit, offset } = req.query;
    const user = req.user;
    const userRole = user?.role;
    const userId = user?.id;

    const parsedLimit = Math.min(parseInt(limit) || 50, 200);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    if (!userRole) {
        return res.status(403).json({
            success: false,
            message: 'Không xác định được vai trò người dùng',
        });
    }

    try {
        const filters = { q, status, limit: parsedLimit, offset: parsedOffset };

        if (['sup_picker'].includes(userRole)) {
            // bỏ supervisor
            filters.supervisorId = userId;
        } else if (userRole === 'picker') {
            filters.packerId = userId;
        }

        const { rows, total } = await Task.listTasks(filters);

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                limit: parsedLimit,
                offset: parsedOffset,
                total, // ✅ tổng thật từ DB
            },
            metadata: {
                role: userRole,
                userId,
                generatedAt: dayjs().tz('Asia/Ho_Chi_Minh').format(),
            },
        });
    } catch (error) {
        console.error('Error in getTasks:', error.message);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách tasks',
            error: error.message,
        });
    }
});

/**
 * @desc Lấy chi tiết 1 task kèm items
 * @route GET /api/tasks/:id
 * @access Private
 */
const getTaskById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!validateUuidFormat(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }

    const task = await Task.findTaskWithItemsById(id);
    if (!task) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
    }

    res.status(200).json({ success: true, data: task });
});

/**
 * @desc Tạo mới 1 preparation task cùng danh sách items
 * @route POST /api/tasks
 * @access Private
 */
const createTaskWithItems = asyncHandler(async (req, res) => {
    const { orderId, packerId, deadline, note, items = [] } = req.body;

    // Lấy supervisorId từ token (không cho phép gửi từ frontend)
    const supervisorId = req.user?.id;

    if (!orderId || !packerId || !deadline || !items.length) {
        return res.status(400).json({
            success: false,
            message: 'orderId, packerId, deadline và ít nhất 1 item là bắt buộc',
        });
    }

    if (
        !validateUuidFormat(orderId) ||
        !validateUuidFormat(packerId) ||
        !validateUuidFormat(supervisorId)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Một trong các ID không hợp lệ (orderId / packerId / supervisorId)',
        });
    }

    try {
        const newTask = await Task.createTaskWithItems({
            orderId,
            supervisorId, // Lấy từ token
            packerId,
            deadline,
            note,
            items,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo preparation task thành công',
            data: newTask,
        });
    } catch (error) {
        console.error('Error in createTaskWithItems:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc Cập nhật task + items
 * @route PUT /api/tasks/:id
 * @access Private
 */
const updateTaskWithItems = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { supervisorId, packerId, status, deadline, note, startedAt, completedAt, items } =
        req.body;

    if (!validateUuidFormat(id))
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });

    try {
        const updatedTask = await Task.updateTaskWithItems(id, {
            supervisorId,
            packerId,
            status,
            deadline,
            note,
            startedAt,
            completedAt,
            items,
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật preparation task thành công',
            data: updatedTask,
        });
    } catch (error) {
        console.error('Error in updateTaskWithItems:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc Xóa 1 task (và toàn bộ items)
 * @route DELETE /api/tasks/:id
 * @access Private
 */
const deleteTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!validateUuidFormat(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }

    try {
        await Task.deleteTask(id);
        res.status(200).json({
            success: true,
            message: 'Xóa preparation task thành công',
        });
    } catch (error) {
        console.error('Error in deleteTask:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc Lấy danh sách items của 1 task cụ thể
 * @route GET /api/tasks/:id/items
 * @access Private
 */
const getItemsByTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!validateUuidFormat(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }

    const task = await Task.findTaskWithItemsById(id);
    if (!task) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
    }

    res.status(200).json({
        success: true,
        data: task.items,
        metadata: { taskId: id, itemCount: task.items.length },
    });
});

/**
 * @desc Lấy danh sách task đang pending hoặc sắp tới hạn
 * @route GET /api/tasks/stats/overview
 * @access Private
 */
const getTaskStats = asyncHandler(async (req, res) => {
    const sql = `
    SELECT 
      status,
      COUNT(*) as total,
      SUM(CASE WHEN deadline < now() THEN 1 ELSE 0 END) as overdue
    FROM preparation_tasks
    GROUP BY status
  `;
    const { rows } = await query(sql);

    res.status(200).json({
        success: true,
        data: rows.map((r) => ({
            status: r.status,
            total: parseInt(r.total),
            overdue: parseInt(r.overdue),
        })),
        metadata: { generatedAt: dayjs().tz('Asia/Ho_Chi_Minh').format() },
    });
});

/**
 * @desc Kiểm tra task theo supervisor/packer (cho dashboard)
 * @route GET /api/tasks/stats/by-user/:userId
 * @access Private
 */
const getTaskStatsByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!validateUuidFormat(userId)) {
        return res.status(400).json({ success: false, message: 'userId không hợp lệ' });
    }

    const sql = `
    SELECT 
      status,
      COUNT(*) as total
    FROM preparation_tasks
    WHERE supervisor_id = $1 OR packer_id = $1
    GROUP BY status
  `;
    const { rows } = await query(sql, [userId]);

    res.status(200).json({
        success: true,
        data: rows.map((r) => ({
            status: r.status,
            total: parseInt(r.total),
        })),
        metadata: { userId, generatedAt: dayjs().tz('Asia/Ho_Chi_Minh').format() },
    });
});

/**
 * @desc Lấy toàn bộ task thuộc về supervisor đang đăng nhập
 * @route GET /api/tasks/mine/supervisor
 * @access Private (supervisor)
 */
const getTasksByCurrentSupervisor = asyncHandler(async (req, res) => {
    const supervisorId = req.user?.id;

    if (!validateUuidFormat(supervisorId)) {
        return res.status(400).json({
            success: false,
            message: 'supervisorId không hợp lệ hoặc token không chứa id hợp lệ',
        });
    }

    try {
        const sql = `
      SELECT *
      FROM preparation_tasks
      WHERE supervisor_id = $1
      ORDER BY created_at DESC
    `;
        const { rows } = await query(sql, [supervisorId]);

        res.status(200).json({
            success: true,
            data: rows,
            metadata: {
                count: rows.length,
                supervisorId,
                generatedAt: dayjs().tz('Asia/Ho_Chi_Minh').format(),
            },
        });
    } catch (error) {
        console.error('Error in getTasksByCurrentSupervisor:', error.message);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách task của supervisor hiện tại',
        });
    }
});

/**
 * @desc Lấy toàn bộ task thuộc về packer đang đăng nhập
 * @route GET /api/tasks/mine/packer
 * @access Private (packer)
 */
const getTasksByCurrentPacker = asyncHandler(async (req, res) => {
    const packerId = req.user?.id;

    if (!validateUuidFormat(packerId)) {
        return res.status(400).json({
            success: false,
            message: 'packerId không hợp lệ hoặc token không chứa id hợp lệ',
        });
    }

    try {
        const sql = `
      SELECT *
      FROM preparation_tasks
      WHERE packer_id = $1
      ORDER BY created_at DESC
    `;
        const { rows } = await query(sql, [packerId]);

        res.status(200).json({
            success: true,
            data: rows,
            metadata: {
                count: rows.length,
                packerId,
                generatedAt: dayjs().tz('Asia/Ho_Chi_Minh').format(),
            },
        });
    } catch (error) {
        console.error('Error in getTasksByCurrentPacker:', error.message);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách task của packer hiện tại',
        });
    }
});

/**
 * @desc Cập nhật trạng thái của 1 preparation task
 * @route PATCH /api/tasks/:id/status
 * @body { status: 'in_progress' | 'pending_review' | 'completed' | 'cancelled' }
 * @access Private (manager, supervisor, packer)
 */
const updateTaskStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!validateUuidFormat(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
    if (!status) {
        return res
            .status(400)
            .json({ success: false, message: 'Thiếu trường trạng thái (status)' });
    }

    const allowedStatuses = ['assigned', 'in_progress', 'pending_review', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    try {
        // Nếu hủy task → hoàn tồn kho và remain
        if (status === 'cancelled') {
            await Task.cancelTaskAndRestoreInventory(id);
            return res.status(200).json({
                success: true,
                message: 'Đã hủy task và hoàn trả tồn kho + remain thành công',
                data: { id, status: 'cancelled' },
            });
        }

        // Các trạng thái khác xử lý như cũ
        let timeField = '';
        if (status === 'in_progress') timeField = 'started_at';
        if (status === 'completed') timeField = 'completed_at';

        const sql = `
      UPDATE preparation_tasks
      SET status = $1,
          ${timeField ? `${timeField} = COALESCE(${timeField}, NOW()),` : ''}
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, status, started_at, completed_at, updated_at
    `;
        const { rows } = await query(sql, [status, id]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        }

        // Gọi hàm refresh trạng thái nếu có
        try {
            await query('SELECT refresh_prep_task_status($1)', [id]);
        } catch (err) {
            console.warn('refresh_prep_task_status warning:', err.message);
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái task thành công',
            data: rows[0],
        });
    } catch (error) {
        console.error('Error in updateTaskStatus:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Không thể cập nhật trạng thái task',
        });
    }
});

const updateTaskItemByPicker = asyncHandler(async (req, res) => {
    const { taskId, itemId } = req.params;
    const { postQty, preEvd, postEvd } = req.body;

    if (!validateUuidFormat(taskId) || !validateUuidFormat(itemId)) {
        return res.status(400).json({
            success: false,
            message: 'Task ID hoặc Item ID không hợp lệ',
        });
    }

    try {
        const updatedItem = await Task.updateTaskItemByPicker(taskId, itemId, {
            postQty,
            preEvd,
            postEvd,
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật item trong task thành công',
            data: updatedItem,
        });
    } catch (error) {
        console.error('Error in updateTaskItemByPicker:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

const updateTaskReview = asyncHandler(async (req, res) => {
    const { id } = req.params; // taskId
    const { result, reason } = req.body;

    const review = await Task.updatePreparationReview(id, { result, reason });

    res.status(200).json({
        success: true,
        message: 'Cập nhật kết quả review thành công',
        data: review,
    });
});

const getPostQtyByOrderItemId = asyncHandler(async (req, res) => {
    const { orderItemId } = req.params;

    if (!validateUuidFormat(orderItemId)) {
        return res.status(400).json({ success: false, message: 'orderItemId không hợp lệ' });
    }

    // Truy vấn tổng postQty theo order_item_id
    const sql = `
        SELECT order_item_id, COALESCE(SUM(post_qty), 0) AS total_post_qty
        FROM preparation_items
        WHERE order_item_id = $1
        GROUP BY order_item_id
    `;

    const { rows } = await query(sql, [orderItemId]);

    if (!rows.length) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy item' });
    }

    res.status(200).json({
        success: true,
        data: {
            orderItemId: rows[0].order_item_id,
            postQty: parseFloat(rows[0].total_post_qty)
        }
    });
});


/* ===================== EXPORTS ===================== */
module.exports = {
    getTasks,
    getTaskById,
    getItemsByTask,
    createTaskWithItems,
    updateTaskWithItems,
    deleteTask,
    getTaskStats,
    getTaskStatsByUser,
    updateTaskStatus,
    getTasksByCurrentSupervisor,
    getTasksByCurrentPacker,
    updateTaskItemByPicker,
    updateTaskReview,
    getPostQtyByOrderItemId,
};
