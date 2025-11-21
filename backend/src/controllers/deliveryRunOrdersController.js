const asyncHandler = require('express-async-handler');
const DeliveryRunOrder = require('@src/models/DeliveryRunOrders');
const DeliveryRun = require('@src/models/DeliveryRuns');
const SalesOrder = require('@src/models/SalesOrders');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function để validate UUID
const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

// Helper function để validate delivery run ID có tồn tại
const validateDeliveryRunId = async (runId) => {
    if (runId) {
        const run = await DeliveryRun.findById(runId);
        if (!run) {
            throw new Error('Delivery Run ID không tồn tại');
        }
    }
};

// Helper function để validate sales order ID có tồn tại
const validateSalesOrderId = async (orderId) => {
    if (orderId) {
        const order = await SalesOrder.findById(orderId);
        if (!order) {
            throw new Error('Sales Order ID không tồn tại');
        }
    }
};

// Helper function để validate status
const validateStatus = (status) => {
    const validStatuses = ['assigned', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
        throw new Error(`Status phải là một trong: ${validStatuses.join(', ')}`);
    }
};

// Helper function để kiểm tra và cập nhật delivery run status
const checkAndUpdateDeliveryRunStatus = async (runId) => {
    try {
        // Lấy delivery run hiện tại để kiểm tra status
        const deliveryRun = await DeliveryRun.findById(runId);
        if (!deliveryRun) {
            return;
        }

        // Lấy tất cả orders của delivery run
        const orders = await DeliveryRunOrder.findByRunId(runId);

        if (!orders || orders.length === 0) {
            return;
        }

        // Kiểm tra xem có order nào đang in_progress không
        const hasInProgress = orders.some((order) => order.status === 'in_progress');

        // Nếu có order đang in_progress và delivery run vẫn đang assigned, chuyển sang in_progress
        if (hasInProgress && deliveryRun.status === 'assigned') {
            const timestamp = dayjs().utc().toDate();
            await DeliveryRun.updateStatus(runId, 'in_progress', timestamp);
            return;
        }

        // Kiểm tra xem tất cả orders đã hoàn thành chưa
        const allCompleted = orders.every((order) => order.status === 'completed');
        const hasCancelled = orders.some((order) => order.status === 'cancelled');

        // Nếu tất cả orders đã hoàn thành, cập nhật delivery run thành completed
        if (allCompleted) {
            const timestamp = dayjs().utc().toDate();
            await DeliveryRun.updateStatus(runId, 'completed', timestamp);
        }
        // Nếu có orders bị cancelled nhưng không có orders nào đang in_progress,
        // và có ít nhất 1 order completed, thì cũng coi như completed
        else if (
            hasCancelled &&
            !orders.some((order) => order.status === 'in_progress' || order.status === 'assigned')
        ) {
            const hasAnyCompleted = orders.some((order) => order.status === 'completed');
            if (hasAnyCompleted) {
                const timestamp = dayjs().utc().toDate();
                await DeliveryRun.updateStatus(runId, 'completed', timestamp);
            }
        }
    } catch (error) {
        console.error('Error checking delivery run status:', error);
        // Không throw error để không ảnh hưởng đến response chính
    }
};

/**
 * @desc     Lấy danh sách delivery run orders
 * @route    GET /api/delivery-run-orders
 * @query    {string} q - Từ khóa tìm kiếm
 * @query    {string} runId - Lọc theo delivery run
 * @query    {string} orderId - Lọc theo sales order
 * @query    {string} status - Lọc theo trạng thái
 * @query    {number} limit - Số lượng item trên mỗi trang (default: 20)
 * @query    {number} offset - Vị trí bắt đầu (default: 0)
 * @return   {object} - Trả về object với danh sách delivery run orders và thông tin phân trang
 */
const getDeliveryRunOrders = asyncHandler(async (req, res) => {
    const { q, runId, orderId, status, limit, offset } = req.query;
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res
            .status(400)
            .json({ success: false, message: 'Limit và offset phải là số không âm' });
    }

    try {
        const filterOptions = {
            q: q ? q.trim() : undefined,
            runId,
            orderId,
            status,
        };

        const [orders, total] = await Promise.all([
            DeliveryRunOrder.listDeliveryRunOrders({
                ...filterOptions,
                limit: parsedLimit,
                offset: parsedOffset,
            }),
            DeliveryRunOrder.countDeliveryRunOrders(filterOptions),
        ]);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                total,
                limit: parsedLimit,
                offset: parsedOffset,
                hasMore: parsedOffset + parsedLimit < total,
            },
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc     Lấy thông tin delivery run order theo ID
 * @route    GET /api/delivery-run-orders/:id
 * @param    {string} id - Delivery Run Order ID
 * @return   {object} - Trả về object delivery run order nếu tìm thấy
 */
const getDeliveryRunOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res
            .status(400)
            .json({ success: false, message: 'ID delivery run order không hợp lệ' });
    }

    const order = await DeliveryRunOrder.findById(id);
    if (!order) {
        return res
            .status(404)
            .json({ success: false, message: 'Không tìm thấy delivery run order' });
    }

    res.status(200).json({ success: true, data: order });
});

/**
 * @desc     Lấy tất cả orders của một delivery run
 * @route    GET /api/delivery-run-orders/run/:runId
 * @param    {string} runId - Delivery Run ID
 * @return   {array} - Trả về mảng các delivery run orders
 */
const getDeliveryRunOrdersByRunId = asyncHandler(async (req, res) => {
    const { runId } = req.params;

    if (!isValidUUID(runId)) {
        return res.status(400).json({ success: false, message: 'ID delivery run không hợp lệ' });
    }

    const orders = await DeliveryRunOrder.findByRunId(runId);
    res.status(200).json({ success: true, data: orders, total: orders.length });
});

/**
 * @desc     Lấy tất cả delivery runs của một sales order
 * @route    GET /api/delivery-run-orders/order/:orderId
 * @param    {string} orderId - Sales Order ID
 * @return   {array} - Trả về mảng các delivery run orders
 */
const getDeliveryRunOrdersByOrderId = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    if (!isValidUUID(orderId)) {
        return res.status(400).json({ success: false, message: 'ID sales order không hợp lệ' });
    }

    const orders = await DeliveryRunOrder.findByOrderId(orderId);
    res.status(200).json({ success: true, data: orders, total: orders.length });
});

/**
 * @desc     Tạo delivery run order mới
 * @route    POST /api/delivery-run-orders
 * @body     {string} runId - ID delivery run (bắt buộc)
 * @body     {string} orderId - ID sales order (bắt buộc)
 * @body     {number} routeSeq - Thứ tự giao hàng (bắt buộc)
 * @body     {number} codAmount - Số tiền COD (optional, default: 0)
 * @body     {string} status - Trạng thái (optional, default: 'pending')
 * @body     {number} actualPay - Số tiền thực tế thu được (optional, default: 0)
 * @body     {string} evdUrl - URL bằng chứng giao hàng (optional)
 * @body     {string} note - Ghi chú (optional)
 * @return   {object} - Trả về object delivery run order vừa tạo
 */
const createDeliveryRunOrder = asyncHandler(async (req, res) => {
    const { runId, orderId, routeSeq, codAmount, status, actualPay, evdUrl, note } = req.body;

    if (!runId || !orderId || routeSeq === undefined) {
        return res
            .status(400)
            .json({ success: false, message: 'Vui lòng cung cấp đủ thông tin delivery run order' });
    }

    try {
        // Validate status
        if (status) {
            validateStatus(status);
        }

        // Validate runId và orderId tồn tại
        await Promise.all([validateDeliveryRunId(runId), validateSalesOrderId(orderId)]);

        // Tạo delivery run order
        const newOrder = await DeliveryRunOrder.createDeliveryRunOrder({
            runId,
            orderId,
            routeSeq: parseInt(routeSeq),
            codAmount: codAmount ? parseFloat(codAmount) : 0,
            status: status || 'assigned',
            actualPay: actualPay ? parseFloat(actualPay) : 0,
            evdUrl: evdUrl || null,
            note: note ? note.trim() : null,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo delivery run order thành công',
            data: newOrder,
        });
    } catch (error) {
        if (!error.code) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.code === '23505') {
            return res
                .status(400)
                .json({ success: false, message: 'Delivery run order này đã tồn tại' });
        }
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Delivery Run ID hoặc Sales Order ID không hợp lệ',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo delivery run order',
            error: error.message,
        });
    }
});

/**
 * @desc     Cập nhật thông tin delivery run order
 * @route    PUT /api/delivery-run-orders/:id
 * @param    {string} id - Delivery Run Order ID
 * @body     {string} runId - ID delivery run
 * @body     {string} orderId - ID sales order
 * @body     {number} routeSeq - Thứ tự giao hàng
 * @body     {number} codAmount - Số tiền COD
 * @body     {string} status - Trạng thái
 * @body     {number} actualPay - Số tiền thực tế thu được
 * @body     {string} evdUrl - URL bằng chứng giao hàng
 * @body     {string} note - Ghi chú
 * @return   {object} - Trả về object delivery run order đã cập nhật
 */
const updateDeliveryRunOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!isValidUUID(id)) {
        return res
            .status(400)
            .json({ success: false, message: 'ID delivery run order không hợp lệ' });
    }

    const existingOrder = await DeliveryRunOrder.findById(id);
    if (!existingOrder) {
        return res
            .status(404)
            .json({ success: false, message: 'Không tìm thấy delivery run order' });
    }

    try {
        const updatePayload = {};

        // Validate và chuẩn bị payload
        if (updateData.runId !== undefined) {
            await validateDeliveryRunId(updateData.runId);
            updatePayload.runId = updateData.runId;
        }
        if (updateData.orderId !== undefined) {
            await validateSalesOrderId(updateData.orderId);
            updatePayload.orderId = updateData.orderId;
        }
        if (updateData.routeSeq !== undefined) {
            updatePayload.routeSeq = parseInt(updateData.routeSeq);
        }
        if (updateData.codAmount !== undefined) {
            updatePayload.codAmount = parseFloat(updateData.codAmount);
        }
        if (updateData.status !== undefined) {
            validateStatus(updateData.status);
            updatePayload.status = updateData.status;
        }
        if (updateData.actualPay !== undefined) {
            updatePayload.actualPay = parseFloat(updateData.actualPay);
        }
        if (updateData.evdUrl !== undefined) {
            updatePayload.evdUrl = updateData.evdUrl || null;
        }
        if (updateData.note !== undefined) {
            updatePayload.note = updateData.note ? updateData.note.trim() : null;
        }

        const updatedOrder = await DeliveryRunOrder.updateDeliveryRunOrder(id, updatePayload);
        res.status(200).json({
            success: true,
            message: 'Cập nhật delivery run order thành công',
            data: updatedOrder,
        });
    } catch (error) {
        if (!error.code) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật delivery run order',
            error: error.message,
        });
    }
});

/**
 * @desc     Xóa delivery run order
 * @route    DELETE /api/delivery-run-orders/:id
 * @param    {string} id - Delivery Run Order ID
 * @return   {object} - Trả về message thành công
 */
const deleteDeliveryRunOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res
            .status(400)
            .json({ success: false, message: 'ID delivery run order không hợp lệ' });
    }

    const order = await DeliveryRunOrder.findById(id);
    if (!order) {
        return res
            .status(404)
            .json({ success: false, message: 'Không tìm thấy delivery run order để xóa' });
    }

    try {
        await DeliveryRunOrder.deleteDeliveryRunOrder(id);
        res.status(200).json({ success: true, message: 'Xóa delivery run order thành công' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa delivery run order vì còn dữ liệu liên quan',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa delivery run order',
            error: error.message,
        });
    }
});

/**
 * @desc     Bắt đầu giao hàng (chuyển status sang 'in_progress')
 * @route    PATCH /api/delivery-run-orders/:id/start
 * @param    {string} id - Delivery Run Order ID
 * @return   {object} - Trả về object delivery run order đã cập nhật
 */
const startDelivery = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res
            .status(400)
            .json({ success: false, message: 'ID delivery run order không hợp lệ' });
    }

    const existingOrder = await DeliveryRunOrder.findById(id);
    if (!existingOrder) {
        return res
            .status(404)
            .json({ success: false, message: 'Không tìm thấy delivery run order' });
    }

    if (existingOrder.status !== 'assigned') {
        return res.status(400).json({
            success: false,
            message: 'Chỉ có thể bắt đầu giao hàng ở trạng thái "assigned"',
        });
    }

    try {
        const timestamp = dayjs().utc().toDate();
        const updatedOrder = await DeliveryRunOrder.updateStatus(id, 'in_progress', timestamp);

        // Kiểm tra và cập nhật delivery run status nếu cần
        await checkAndUpdateDeliveryRunStatus(existingOrder.runId);

        res.status(200).json({
            success: true,
            message: 'Bắt đầu giao hàng thành công',
            data: updatedOrder,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi bắt đầu giao hàng',
            error: error.message,
        });
    }
});

/**
 * @desc     Hoàn thành giao hàng (chuyển status sang 'completed')
 * @route    PATCH /api/delivery-run-orders/:id/complete
 * @param    {string} id - Delivery Run Order ID
 * @body     {number} actualPay - Số tiền thực tế thu được (optional)
 * @body     {string} evdUrl - URL bằng chứng giao hàng (optional)
 * @body     {string} note - Ghi chú (optional)
 * @return   {object} - Trả về object delivery run order đã cập nhật
 */
const completeDelivery = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { actualPay, evdUrl, note } = req.body;

    if (!isValidUUID(id)) {
        return res
            .status(400)
            .json({ success: false, message: 'ID delivery run order không hợp lệ' });
    }

    const existingOrder = await DeliveryRunOrder.findById(id);
    if (!existingOrder) {
        return res
            .status(404)
            .json({ success: false, message: 'Không tìm thấy delivery run order' });
    }

    if (existingOrder.status !== 'in_progress') {
        return res.status(400).json({
            success: false,
            message: 'Chỉ có thể hoàn thành giao hàng ở trạng thái "in_progress"',
        });
    }

    try {
        const timestamp = dayjs().utc().toDate();
        const additionalData = {};

        if (actualPay !== undefined) {
            additionalData.actualPay = parseFloat(actualPay);
        }
        if (evdUrl !== undefined) {
            additionalData.evdUrl = evdUrl;
        }
        if (note !== undefined) {
            additionalData.note = note ? note.trim() : null;
        }

        const updatedOrder = await DeliveryRunOrder.updateStatus(
            id,
            'completed',
            timestamp,
            additionalData
        );

        // Kiểm tra và cập nhật delivery run status nếu cần
        await checkAndUpdateDeliveryRunStatus(existingOrder.runId);

        res.status(200).json({
            success: true,
            message: 'Hoàn thành giao hàng thành công',
            data: updatedOrder,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi hoàn thành giao hàng',
            error: error.message,
        });
    }
});

/**
 * @desc     Đánh dấu giao hàng thất bại (chuyển status sang 'cancelled')
 * @route    PATCH /api/delivery-run-orders/:id/fail
 * @param    {string} id - Delivery Run Order ID
 * @body     {string} note - Lý do thất bại (required)
 * @return   {object} - Trả về object delivery run order đã cập nhật
 */
const failDelivery = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;

    if (!isValidUUID(id)) {
        return res
            .status(400)
            .json({ success: false, message: 'ID delivery run order không hợp lệ' });
    }

    if (!note || !note.trim()) {
        return res
            .status(400)
            .json({ success: false, message: 'Vui lòng cung cấp lý do thất bại' });
    }

    const existingOrder = await DeliveryRunOrder.findById(id);
    if (!existingOrder) {
        return res
            .status(404)
            .json({ success: false, message: 'Không tìm thấy delivery run order' });
    }

    if (existingOrder.status === 'completed') {
        return res.status(400).json({
            success: false,
            message: 'Không thể đánh dấu thất bại cho giao hàng đã hoàn thành',
        });
    }

    try {
        const additionalData = { note: note.trim() };
        const updatedOrder = await DeliveryRunOrder.updateStatus(
            id,
            'cancelled',
            null,
            additionalData
        );

        // Kiểm tra và cập nhật delivery run status nếu cần
        await checkAndUpdateDeliveryRunStatus(existingOrder.runId);

        res.status(200).json({
            success: true,
            message: 'Đánh dấu giao hàng thất bại thành công',
            data: updatedOrder,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đánh dấu giao hàng thất bại',
            error: error.message,
        });
    }
});

/**
 * @desc     Hủy giao hàng (chuyển status sang 'cancelled')
 * @route    PATCH /api/delivery-run-orders/:id/cancel
 * @param    {string} id - Delivery Run Order ID
 * @body     {string} note - Lý do hủy (optional)
 * @return   {object} - Trả về object delivery run order đã cập nhật
 */
const cancelDeliveryRunOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;

    if (!isValidUUID(id)) {
        return res
            .status(400)
            .json({ success: false, message: 'ID delivery run order không hợp lệ' });
    }

    const existingOrder = await DeliveryRunOrder.findById(id);
    if (!existingOrder) {
        return res
            .status(404)
            .json({ success: false, message: 'Không tìm thấy delivery run order' });
    }

    if (existingOrder.status === 'completed') {
        return res.status(400).json({
            success: false,
            message: 'Không thể hủy giao hàng đã hoàn thành',
        });
    }

    try {
        const additionalData = note ? { note: note.trim() } : {};
        const updatedOrder = await DeliveryRunOrder.updateStatus(
            id,
            'cancelled',
            null,
            additionalData
        );

        // Kiểm tra và cập nhật delivery run status nếu cần
        await checkAndUpdateDeliveryRunStatus(existingOrder.runId);

        res.status(200).json({
            success: true,
            message: 'Hủy giao hàng thành công',
            data: updatedOrder,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi hủy giao hàng',
            error: error.message,
        });
    }
});

// Hàm mở lại giao hàng cho order đã hủy (chuyển status từ 'cancelled' về 'assigned')
const reopenDeliveryRunOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) {
        return res
            .status(400)
            .json({ success: false, message: 'ID delivery run order không hợp lệ' });
    }
    const existingOrder = await DeliveryRunOrder.findById(id);
    if (!existingOrder) {
        return res
            .status(404)
            .json({ success: false, message: 'Không tìm thấy delivery run order' });
    }
    if (existingOrder.status !== 'cancelled') {
        return res.status(400).json({
            success: false,
            message: 'Chỉ có thể mở lại giao hàng đã hủy',
        });
    }
    try {
        const updatedOrder = await DeliveryRunOrder.updateStatus(id, 'assigned', null, {
            note: null,
        });
        // Kiểm tra và cập nhật delivery run status nếu cần
        await checkAndUpdateDeliveryRunStatus(existingOrder.runId);
        res.status(200).json({
            success: true,
            message: 'Mở lại giao hàng thành công',
            data: updatedOrder,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi mở lại giao hàng',
            error: error.message,
        });
    }
});

module.exports = {
    getDeliveryRunOrders,
    getDeliveryRunOrderById,
    getDeliveryRunOrdersByRunId,
    getDeliveryRunOrdersByOrderId,
    createDeliveryRunOrder,
    updateDeliveryRunOrder,
    deleteDeliveryRunOrder,
    startDelivery,
    completeDelivery,
    failDelivery,
    cancelDeliveryRunOrder,
    reopenDeliveryRunOrder,
};
