const asyncHandler = require('express-async-handler');
const DeliveryRun = require('@src/models/DeliveryRuns');
const DeliveryRunOrder = require('@src/models/DeliveryRunOrders');
const User = require('@src/models/Users');
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

// Helper function để validate user ID có tồn tại
const validateUserId = async (userId, fieldName = 'User') => {
    if (userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error(`${fieldName} ID không tồn tại`);
        }
    }
};

// Helper function để validate unique delivery_no
// const validateUniqueDeliveryNo = async (deliveryNo, excludeId = null) => {
//     const existingRun = await DeliveryRun.findByDeliveryNo(deliveryNo);
//     if (existingRun && existingRun.id !== excludeId) {
//         throw new Error(`Mã delivery run '${deliveryNo}' đã tồn tại`);
//     }
// };

// Helper function để validate status
const validateStatus = (status) => {
    const validStatuses = ['assigned', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
        throw new Error(`Status phải là một trong: ${validStatuses.join(', ')}`);
    }
};

/**
 * @desc     Lấy danh sách delivery runs
 * @route    GET /api/delivery-runs
 * @query    {string} q - Từ khóa tìm kiếm (tìm trong delivery_no, vehicle_no, supervisor, shipper)
 * @query    {string} supervisorId - Lọc theo người giám sát
 * @query    {string} shipperId - Lọc theo người giao hàng
 * @query    {string} status - Lọc theo trạng thái
 * @query    {number} limit - Số lượng item trên mỗi trang (default: 20)
 * @query    {number} offset - Vị trí bắt đầu (default: 0)
 * @return   {object} - Trả về object với danh sách delivery runs và thông tin phân trang
 */
const getDeliveryRuns = asyncHandler(async (req, res) => {
    const { q, supervisorId, shipperId, status, limit, offset } = req.query;
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
            supervisorId,
            shipperId,
            status,
        };

        const [runs, total] = await Promise.all([
            DeliveryRun.listDeliveryRuns({
                ...filterOptions,
                limit: parsedLimit,
                offset: parsedOffset,
            }),
            DeliveryRun.countDeliveryRuns(filterOptions),
        ]);

        res.status(200).json({
            success: true,
            data: runs,
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
 * @desc     Lấy thông tin delivery run theo ID
 * @route    GET /api/delivery-runs/:id
 * @param    {string} id - Delivery Run ID
 * @return   {object} - Trả về object delivery run nếu tìm thấy
 */
const getDeliveryRunById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID delivery run không hợp lệ' });
    }

    const run = await DeliveryRun.findById(id);
    if (!run) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy delivery run' });
    }

    res.status(200).json({ success: true, data: run });
});

/**
 * @desc     Tạo delivery run mới
 * @route    POST /api/delivery-runs
 * @body     {string} supervisorId - ID người giám sát (bắt buộc)
 * @body     {string} shipperId - ID người giao hàng (bắt buộc)
 * @body     {string} vehicleNo - Biển số xe (bắt buộc)
 * @body     {string} status - Trạng thái (optional, default: 'assigned')
 * @body     {array} orders - Mảng các order IDs để thêm vào delivery run (optional)
 * @return   {object} - Trả về object delivery run vừa tạo
 */
const createDeliveryRun = asyncHandler(async (req, res) => {
    const { supervisorId, shipperId, vehicleNo, status = 'assigned', orders } = req.body;
    if ( !supervisorId || !shipperId || !vehicleNo) {
        return res
            .status(400)
            .json({ success: false, message: 'Vui lòng cung cấp đủ thông tin delivery run' });
    }

    try {
        // Validate status
        validateStatus(status);

        // Validate supervisor và shipper tồn tại
        await Promise.all([
            validateUserId(supervisorId, 'Supervisor'),
            validateUserId(shipperId, 'Shipper'),
        ]);

        // Tạo delivery run
        const newRun = await DeliveryRun.createDeliveryRun({
            supervisorId,
            shipperId,
            vehicleNo: vehicleNo.trim(),
            status,
        });

        // Nếu có orders, tạo các delivery run orders
        if (orders && Array.isArray(orders) && orders.length > 0) {
            const orderItems = orders.map((order, index) => ({
                orderId: order.orderId,
                routeSeq: order.routeSeq || index + 1,
                codAmount: order.codAmount || 0,
                status: 'assigned',
            }));
            await DeliveryRunOrder.createMany(newRun.id, orderItems);
            
            // Lấy lại delivery run với orders
            const runWithOrders = await DeliveryRun.findById(newRun.id);
            return res.status(201).json({
                success: true,
                message: 'Tạo delivery run thành công',
                data: runWithOrders,
            });
        }

        res.status(201).json({
            success: true,
            message: 'Tạo delivery run thành công',
            data: newRun,
        });
    } catch (error) {
        if (!error.code) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Supervisor ID, Shipper ID hoặc Order ID không hợp lệ',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo delivery run',
            error: error.message,
        });
    }
});

/**
 * @desc     Cập nhật thông tin delivery run
 * @route    PUT /api/delivery-runs/:id
 * @param    {string} id - Delivery Run ID
 * @body     {string} supervisorId - ID người giám sát
 * @body     {string} shipperId - ID người giao hàng
 * @body     {string} vehicleNo - Biển số xe
 * @body     {string} status - Trạng thái
 * @return   {object} - Trả về object delivery run đã cập nhật
 */
const updateDeliveryRun = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const userRole = req.user?.role; // Lấy role từ JWT token

    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID delivery run không hợp lệ' });
    }

    const existingRun = await DeliveryRun.findById(id);
    if (!existingRun) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy delivery run' });
    }

    try {
        const updatePayload = {};

        // PHÂN QUYỀN UPDATE:
        // Admin: có thể update tất cả (supervisorId, shipperId, vehicleNo)
        // Sup_Shipper: chỉ có thể update shipperId, vehicleNo
        
        // Supervisor ID - chỉ admin mới được đổi
        if (updateData.supervisorId !== undefined) {
            if (userRole !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Chỉ admin mới có quyền thay đổi người giám sát'
                });
            }
            await validateUserId(updateData.supervisorId, 'Supervisor');
            updatePayload.supervisorId = updateData.supervisorId;
        }

        // Shipper ID - admin và sup_shipper có thể đổi
        if (updateData.shipperId !== undefined) {
            if (!['admin', 'sup_shipper'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền thay đổi người giao hàng'
                });
            }
            await validateUserId(updateData.shipperId, 'Shipper');
            updatePayload.shipperId = updateData.shipperId;
        }

        // Vehicle No - admin và sup_shipper có thể đổi
        if (updateData.vehicleNo !== undefined) {
            if (!['admin', 'sup_shipper'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền thay đổi biển số xe'
                });
            }
            updatePayload.vehicleNo = updateData.vehicleNo.trim();
        }

        // KHÔNG CHO PHÉP update status thủ công - status tự động update qua orders
        if (updateData.status !== undefined) {
            return res.status(400).json({
                success: false,
                message: 'Không thể cập nhật trạng thái chuyến trực tiếp. Trạng thái tự động thay đổi khi orders được cập nhật.'
            });
        }

        // Update delivery run
        const updatedRun = await DeliveryRun.updateDeliveryRun(id, updatePayload);

        // Nếu có deliveryRunOrders cần update - CHỈ CHO PHÉP UPDATE NOTE
        if (Array.isArray(updateData.orders) && updateData.orders.length > 0) {
            // Chỉ update note cho orders (evdUrl được upload khi shipper hoàn thành order)
            const ordersToUpdate = updateData.orders
                .filter(order => order.id && order.note !== undefined)
                .map(order => ({
                    id: order.id,
                    note: order.note ? order.note.trim() : null,
                }));
            
            if (ordersToUpdate.length > 0) {
                await DeliveryRunOrder.updateMany(ordersToUpdate);
            }
        }

        // Trả về delivery run mới nhất (có orders đã cập nhật)
        const runWithOrders = await DeliveryRun.findById(id);

        res.status(200).json({
            success: true,
            message: 'Cập nhật delivery run thành công',
            data: runWithOrders,
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
            message: 'Lỗi server khi cập nhật delivery run',
            error: error.message,
        });
    }
});

/**
 * @desc     Xóa delivery run
 * @route    DELETE /api/delivery-runs/:id
 * @param    {string} id - Delivery Run ID
 * @return   {object} - Trả về message thành công
 */
const deleteDeliveryRun = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID delivery run không hợp lệ' });
    }

    const run = await DeliveryRun.findById(id);
    if (!run) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy delivery run để xóa' });
    }

    try {
        await DeliveryRun.deleteDeliveryRun(id);
        res.status(200).json({ success: true, message: 'Xóa delivery run thành công' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa delivery run vì còn dữ liệu liên quan',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa delivery run',
            error: error.message,
        });
    }
});

/**
 * @desc     Bắt đầu delivery run (chuyển status sang 'in_progress')
 * @route    PATCH /api/delivery-runs/:id/start
 * @param    {string} id - Delivery Run ID
 * @return   {object} - Trả về object delivery run đã cập nhật
 */
const startDeliveryRun = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID delivery run không hợp lệ' });
    }

    const existingRun = await DeliveryRun.findById(id);
    if (!existingRun) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy delivery run' });
    }

    if (existingRun.status !== 'assigned') {
        return res.status(400).json({
            success: false,
            message: 'Chỉ có thể bắt đầu delivery run ở trạng thái "assigned"',
        });
    }

    try {
        const timestamp = dayjs().utc().toDate();
        const updatedRun = await DeliveryRun.updateStatus(id, 'in_progress', timestamp);
        
        res.status(200).json({
            success: true,
            message: 'Bắt đầu delivery run thành công',
            data: updatedRun,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi bắt đầu delivery run',
            error: error.message,
        });
    }
});

/**
 * @desc     Hoàn thành delivery run (chuyển status sang 'completed')
 * @route    PATCH /api/delivery-runs/:id/complete
 * @param    {string} id - Delivery Run ID
 * @return   {object} - Trả về object delivery run đã cập nhật
 */
const completeDeliveryRun = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID delivery run không hợp lệ' });
    }

    const existingRun = await DeliveryRun.findById(id);
    if (!existingRun) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy delivery run' });
    }

    if (existingRun.status !== 'in_progress') {
        return res.status(400).json({
            success: false,
            message: 'Chỉ có thể hoàn thành delivery run ở trạng thái "in_progress"',
        });
    }

    try {
        const timestamp = dayjs().utc().toDate();
        const updatedRun = await DeliveryRun.updateStatus(id, 'completed', timestamp);
        
        res.status(200).json({
            success: true,
            message: 'Hoàn thành delivery run thành công',
            data: updatedRun,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi hoàn thành delivery run',
            error: error.message,
        });
    }
});

/**
 * @desc     Hủy delivery run (chuyển status sang 'cancelled')
 * @route    PATCH /api/delivery-runs/:id/cancel
 * @param    {string} id - Delivery Run ID
 * @return   {object} - Trả về object delivery run đã cập nhật
 */
const cancelDeliveryRun = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID delivery run không hợp lệ' });
    }

    const existingRun = await DeliveryRun.findById(id);
    if (!existingRun) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy delivery run' });
    }

    if (existingRun.status === 'completed') {
        return res.status(400).json({
            success: false,
            message: 'Không thể hủy delivery run đã hoàn thành',
        });
    }

    try {
        const updatedRun = await DeliveryRun.updateStatus(id, 'cancelled');
        
        res.status(200).json({
            success: true,
            message: 'Hủy delivery run thành công',
            data: updatedRun,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi hủy delivery run',
            error: error.message,
        });
    }
});

module.exports = {
    getDeliveryRuns,
    getDeliveryRunById,
    createDeliveryRun,
    updateDeliveryRun,
    deleteDeliveryRun,
    startDeliveryRun,
    completeDeliveryRun,
    cancelDeliveryRun,
};


