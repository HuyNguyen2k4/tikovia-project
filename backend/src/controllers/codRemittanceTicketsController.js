const asyncHandler = require('express-async-handler');
const CodRemittanceTicket = require('@src/models/CodRemittanceTickets');
const DeliveryRun = require('@src/models/DeliveryRuns');
const User = require('@src/models/Users');

// Helper function để validate UUID
const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

/**
 * @desc     Lấy danh sách COD remittance tickets
 * @route    GET /api/cod-remittance-tickets
 * @query    {string} q - Từ khóa tìm kiếm
 * @query    {string} shipperId - Lọc theo shipper
 * @query    {string} deliveryRunId - Lọc theo delivery run
 * @query    {string} status - Lọc theo trạng thái (balanced/unbalanced)
 * @query    {string} createdBy - Lọc theo người tạo
 * @query    {string} fromDate - Từ ngày
 * @query    {string} toDate - Đến ngày
 * @query    {number} limit - Số lượng item trên mỗi trang (default: 20)
 * @query    {number} offset - Vị trí bắt đầu (default: 0)
 * @return   {object} - Danh sách tickets và phân trang
 */
const getCodRemittanceTickets = asyncHandler(async (req, res) => {
    const { q, shipperId, deliveryRunId, status, createdBy, fromDate, toDate, limit, offset } =
        req.query;

    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res
            .status(400)
            .json({ success: false, message: 'Limit và offset phải là số không âm' });
    }

    // Validate status nếu có
    if (status && !['balanced', 'unbalanced'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Status phải là balanced hoặc unbalanced',
        });
    }

    try {
        const filterOptions = {
            q: q ? q.trim() : undefined,
            shipperId,
            deliveryRunId,
            status,
            createdBy,
            fromDate,
            toDate,
        };

        const [tickets, total] = await Promise.all([
            CodRemittanceTicket.listCodRemittanceTickets({
                ...filterOptions,
                limit: parsedLimit,
                offset: parsedOffset,
            }),
            CodRemittanceTicket.countCodRemittanceTickets(filterOptions),
        ]);

        res.status(200).json({
            success: true,
            data: tickets,
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
 * @desc     Lấy thông tin ticket theo ID
 * @route    GET /api/cod-remittance-tickets/:id
 * @param    {string} id - Ticket ID
 * @return   {object} - Ticket
 */
const getCodRemittanceTicketById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID ticket không hợp lệ' });
    }

    try {
        const ticket = await CodRemittanceTicket.findById(id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' });
        }

        res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy ticket',
            error: error.message,
        });
    }
});

/**
 * @desc     Lấy danh sách delivery runs khả dụng (completed và chưa có ticket)
 * @route    GET /api/cod-remittance-tickets/available-delivery-runs
 * @query    {string} shipperId - Lọc theo shipper (optional)
 * @query    {number} limit - Số lượng item (default: 50)
 * @query    {number} offset - Vị trí bắt đầu (default: 0)
 * @return   {object} - Danh sách delivery runs và phân trang
 */
const getAvailableDeliveryRuns = asyncHandler(async (req, res) => {
    const { shipperId, limit, offset } = req.query;

    const parsedLimit = parseInt(limit) || 50;
    const parsedOffset = parseInt(offset) || 0;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res
            .status(400)
            .json({ success: false, message: 'Limit và offset phải là số không âm' });
    }

    try {
        const filterOptions = { shipperId };

        const [deliveryRuns, total] = await Promise.all([
            CodRemittanceTicket.getAvailableDeliveryRuns({
                ...filterOptions,
                limit: parsedLimit,
                offset: parsedOffset,
            }),
            CodRemittanceTicket.countAvailableDeliveryRuns(filterOptions),
        ]);

        res.status(200).json({
            success: true,
            data: deliveryRuns,
            pagination: {
                total,
                limit: parsedLimit,
                offset: parsedOffset,
                hasMore: parsedOffset + parsedLimit < total,
            },
            message: 'Danh sách delivery runs khả dụng để tạo COD remittance ticket',
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc     Tạo COD remittance ticket mới
 * @route    POST /api/cod-remittance-tickets
 * @body     {string} deliveryRunId - ID của delivery run (bắt buộc)
 * @body     {number} receivedAmount - Số tiền thực nhận (bắt buộc)
 * @body     {string} status - Trạng thái (balanced/unbalanced, optional)
 * @body     {string} note - Ghi chú (optional)
 * @return   {object} - Ticket vừa tạo
 * @note     expectedAmount sẽ được tính tự động từ trigger refresh_cod_expected_amount()
 */
const createCodRemittanceTicket = asyncHandler(async (req, res) => {
    const { deliveryRunId, receivedAmount, status, note } = req.body;
    const createdBy = req.user.id; // Từ middleware authentication

    if (!deliveryRunId) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp deliveryRunId',
        });
    }

    if (receivedAmount === undefined || parseFloat(receivedAmount) < 0) {
        return res.status(400).json({
            success: false,
            message: 'Số tiền thực nhận phải lớn hơn hoặc bằng 0',
        });
    }

    // Validate status nếu có
    if (status && !['balanced', 'unbalanced'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Status phải là balanced hoặc unbalanced',
        });
    }

    try {
        // Kiểm tra delivery run có tồn tại không
        const deliveryRun = await DeliveryRun.findById(deliveryRunId);
        if (!deliveryRun) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy delivery run',
            });
        }

        // Kiểm tra delivery run đã hoàn thành chưa
        if (deliveryRun.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Delivery run phải ở trạng thái completed',
            });
        }

        // Kiểm tra đã có ticket cho delivery run này chưa
        const existingTicket = await CodRemittanceTicket.findByDeliveryRunId(deliveryRunId);
        if (existingTicket) {
            return res.status(400).json({
                success: false,
                message: `Delivery run ${deliveryRun.deliveryNo} đã có COD remittance ticket`,
            });
        }

        // ✅ REMOVED: Không cần tính expectedAmount thủ công nữa
        // expectedAmount sẽ được trigger tự động tính từ SUM(actual_pay)

        // ✅ UPDATED: Tạo ticket (không cần truyền expectedAmount)
        const newTicket = await CodRemittanceTicket.createCodRemittanceTicket({
            shipperId: deliveryRun.shipperId,
            deliveryRunId,
            receivedAmount: parseFloat(receivedAmount),
            status: status || 'unbalanced', // Để backend tự xác định sau khi có expectedAmount
            note,
            createdBy,
        });

        // ✅ THÊM: Sau khi tạo xong, kiểm tra lại status dựa trên expectedAmount từ trigger
        if (!status) {
            // Nếu không truyền status, tự động xác định
            const finalStatus =
                newTicket.receivedAmount === newTicket.expectedAmount ? 'balanced' : 'unbalanced';

            if (finalStatus !== newTicket.status) {
                // Cập nhật lại status nếu khác
                await CodRemittanceTicket.updateCodRemittanceTicket(newTicket.id, {
                    status: finalStatus,
                });
                newTicket.status = finalStatus;
            }
        }

        res.status(201).json({
            success: true,
            message: 'Tạo COD remittance ticket thành công',
            data: newTicket,
        });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Delivery Run ID hoặc User ID không hợp lệ',
            });
        }
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Delivery run này đã có COD remittance ticket',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo ticket',
            error: error.message,
        });
    }
});

/**
 * @desc     Cập nhật thông tin ticket
 * @route    PUT /api/cod-remittance-tickets/:id
 * @param    {string} id - Ticket ID
 * @body     {number} receivedAmount - Số tiền thực nhận
 * @body     {string} status - Trạng thái
 * @body     {string} note - Ghi chú
 * @return   {object} - Ticket đã cập nhật
 * @note     updated_by sẽ được tự động lấy từ req.user.id
 */
const updateCodRemittanceTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user.id; // ✅ THÊM: Lấy từ middleware authentication

    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID ticket không hợp lệ' });
    }

    const existingTicket = await CodRemittanceTicket.findById(id);
    if (!existingTicket) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' });
    }

    try {
        const updatePayload = {};

        // Received amount
        if (updateData.receivedAmount !== undefined) {
            const receivedAmountNum = parseFloat(updateData.receivedAmount);
            if (isNaN(receivedAmountNum) || receivedAmountNum < 0) {
                throw new Error('Số tiền thực nhận phải lớn hơn hoặc bằng 0');
            }
            updatePayload.receivedAmount = receivedAmountNum;

            // Tự động cập nhật status nếu không được cung cấp
            if (updateData.status === undefined) {
                updatePayload.status =
                    receivedAmountNum === existingTicket.expectedAmount ? 'balanced' : 'unbalanced';
            }
        }

        // Status
        if (updateData.status !== undefined) {
            if (!['balanced', 'unbalanced'].includes(updateData.status)) {
                throw new Error('Status phải là balanced hoặc unbalanced');
            }
            updatePayload.status = updateData.status;
        }

        // Note
        if (updateData.note !== undefined) {
            updatePayload.note = updateData.note ? updateData.note.trim() : null;
        }

        // ✅ UPDATED: Truyền updatedBy vào hàm update
        const updatedTicket = await CodRemittanceTicket.updateCodRemittanceTicket(
            id,
            updatePayload,
            updatedBy
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật ticket thành công',
            data: updatedTicket,
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
            message: 'Lỗi server khi cập nhật ticket',
            error: error.message,
        });
    }
});

/**
 * @desc     Xóa ticket
 * @route    DELETE /api/cod-remittance-tickets/:id
 * @param    {string} id - Ticket ID
 * @return   {object} - Message thành công
 */
const deleteCodRemittanceTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID ticket không hợp lệ' });
    }

    const ticket = await CodRemittanceTicket.findById(id);
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy ticket để xóa' });
    }

    try {
        await CodRemittanceTicket.deleteCodRemittanceTicket(id);
        res.status(200).json({ success: true, message: 'Xóa ticket thành công' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa ticket',
            error: error.message,
        });
    }
});

/**
 * @desc     Lấy thông tin chi tiết ticket theo ID (bao gồm cả orders)
 * @route    GET /api/cod-remittance-tickets/:id/details
 * @param    {string} id - Ticket ID
 * @return   {object} - Ticket với đầy đủ thông tin chi tiết
 */
const getCodRemittanceTicketDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        return res.status(400).json({ success: false, message: 'ID ticket không hợp lệ' });
    }

    try {
        const ticket = await CodRemittanceTicket.getById(id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' });
        }

        res.status(200).json({
            success: true,
            data: ticket,
            message: 'Lấy chi tiết ticket thành công',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy chi tiết ticket',
            error: error.message,
        });
    }
});

module.exports = {
    getCodRemittanceTickets,
    getCodRemittanceTicketById, // hàm lấy ticket theo ID cơ bản
    getCodRemittanceTicketDetails, // hàm lấy ticket theo ID với chi tiết
    getAvailableDeliveryRuns,
    createCodRemittanceTicket,
    updateCodRemittanceTicket,
    deleteCodRemittanceTicket,
};
