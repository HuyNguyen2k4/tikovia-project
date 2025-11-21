/* src/controllers/orderReturnsController.js */
const asyncHandler = require('express-async-handler');
const OrderReturnsCombined = require('@src/models/OrderReturnsCombined');
const SalesOrder = require('@src/models/SalesOrders');
const SalesInvoice = require('@src/models/SalesInvoices');
const Product = require('@src/models/Products');

// Helper function để validate order_id
const validateOrderId = async (orderId) => {
    if (!orderId) throw new Error('Cần cung cấp Order ID');

    // Sử dụng function kiểm tra từ model
    const checkResult = await OrderReturnsCombined.checkOrderCanReturn(orderId);
    if (!checkResult.canReturn) {
        throw new Error(checkResult.message);
    }
};

/**
 * Helper function để validate mảng items
 * @param {Array<object>} items - Mảng item từ body
 * @param {string} orderId - ID của đơn hàng
 */
const validateItems = async (items, orderId) => {
    if (!Array.isArray(items)) throw new Error('Items phải là một mảng');
    if (items.length === 0) throw new Error('Phải có ít nhất một sản phẩm trả hàng');

    // Lấy tất cả sản phẩm của đơn hàng này từ invoice
    const invoice = await SalesInvoice.findByOrderId(orderId);
    if (!invoice || !invoice.items || invoice.items.length === 0) {
        throw new Error('Không tìm thấy hóa đơn hoặc sản phẩm của đơn hàng này');
    }

    const validProductIds = new Set(invoice.items.map((item) => item.productId));
    const invoiceItemsMap = new Map(invoice.items.map((item) => [item.productId, item]));
    const seenInPayload = new Set();

    for (const [index, item] of items.entries()) {
        if (!item.productId || item.qty === undefined || item.unitPrice === undefined) {
            throw new Error(`Item thứ ${index + 1} phải có productId, qty và unitPrice`);
        }

        const qtyNum = parseFloat(item.qty);
        const priceNum = parseFloat(item.unitPrice);

        if (isNaN(qtyNum) || qtyNum <= 0) {
            throw new Error(`Số lượng trả (qty) của item thứ ${index + 1} phải là số dương`);
        }

        if (isNaN(priceNum) || priceNum < 0) {
            throw new Error(`Đơn giá (unitPrice) của item thứ ${index + 1} phải là số không âm`);
        }

        if (!validProductIds.has(item.productId)) {
            throw new Error(
                `Sản phẩm ${item.productId} ở item thứ ${index + 1} không có trong đơn hàng gốc`
            );
        }

        if (seenInPayload.has(item.productId)) {
            throw new Error(
                `Sản phẩm ${item.productId} ở item thứ ${index + 1} bị lặp lại trong danh sách`
            );
        }
        seenInPayload.add(item.productId);

        // Kiểm tra số lượng trả không vượt quá số lượng gốc
        const invoiceItem = invoiceItemsMap.get(item.productId);
        if (qtyNum > invoiceItem.qty) {
            throw new Error(
                `Số lượng trả (${qtyNum}) của sản phẩm ${invoiceItem.productName} vượt quá số lượng gốc (${invoiceItem.qty})`
            );
        }

        // Kiểm tra đơn giá trả không vượt quá đơn giá gốc
        if (priceNum > invoiceItem.unitPrice) {
            throw new Error(
                `Đơn giá trả (${priceNum}) của sản phẩm ${invoiceItem.productName} vượt quá đơn giá gốc (${invoiceItem.unitPrice})`
            );
        }
    }
};

/**
 * @desc     Lấy danh sách đơn trả hàng
 * @route    GET /api/order-returns
 * @query    {string} q - Từ khóa tìm kiếm (order_no, customer name, note)
 * @query    {string} orderId - Lọc theo đơn hàng
 * @query    {string} customerId - Lọc theo khách hàng
 * @query    {string} createdBy - Lọc theo người tạo
 * @query    {string} status - Lọc theo trạng thái
 * @query    {string} fromDate - Từ ngày
 * @query    {string} toDate - Đến ngày
 * @query    {number} minAmount - Số tiền tối thiểu
 * @query    {number} maxAmount - Số tiền tối đa
 * @query    {number} limit - (default: 20)
 * @query    {number} offset - (default: 0)
 * @return   {object} - Danh sách đơn trả hàng và phân trang
 */
const getOrderReturns = asyncHandler(async (req, res) => {
    const {
        q,
        orderId,
        customerId,
        createdBy,
        status,
        fromDate,
        toDate,
        minAmount,
        maxAmount,
        limit,
        offset,
    } = req.query;

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
            orderId,
            customerId,
            createdBy,
            status,
            fromDate,
            toDate,
            minAmount,
            maxAmount,
        };

        // ✅ THÊM: Kiểm tra role và áp dụng filter theo managedBy
        const userRole = req.user.role;
        const userId = req.user.id;

        // Nếu là seller, chỉ xem order returns của khách hàng do họ quản lý
        if (userRole === 'seller') {
            // Thêm filter managedBy để chỉ lấy customers được quản lý bởi seller này
            filterOptions.managedBy = userId;
        }
        // Admin, manager, accountant có thể xem tất cả
        // Không cần thêm filter gì thêm

        const [orderReturns, total] = await Promise.all([
            OrderReturnsCombined.listOrderReturns({
                ...filterOptions,
                limit: parsedLimit,
                offset: parsedOffset,
            }),
            OrderReturnsCombined.countOrderReturns(filterOptions),
        ]);

        res.status(200).json({
            success: true,
            data: orderReturns,
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
 * @desc     Lấy thông tin đơn trả hàng theo ID
 * @route    GET /api/order-returns/:id
 * @param    {string} id - Order Return ID
 * @return   {object} - Đơn trả hàng
 */
const getOrderReturnById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
        return res.status(400).json({ success: false, message: 'ID đơn trả hàng không hợp lệ' });
    }

    try {
        const orderReturn = await OrderReturnsCombined.findOrderReturnById(id);
        if (!orderReturn) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn trả hàng' });
        }

        res.status(200).json({ success: true, data: orderReturn });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy đơn trả hàng',
            error: error.message,
        });
    }
});

/**
 * @desc     Lấy thông tin đơn trả hàng theo order_id
 * @route    GET /api/order-returns/order/:orderId
 * @param    {string} orderId - Order ID
 * @return   {object} - Đơn trả hàng
 */
const getOrderReturnByOrderId = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    try {
        const orderReturn = await OrderReturnsCombined.findOrderReturnByOrderId(orderId);

        res.status(200).json({ success: true, data: orderReturn });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy đơn trả hàng theo order',
            error: error.message,
        });
    }
});

/**
 * @desc     Tạo đơn trả hàng mới
 * @route    POST /api/order-returns
 * @body     {string} orderId - ID đơn hàng (bắt buộc, unique)
 * @body     {string} evdUrl - URL ảnh chứng từ (bắt buộc)
 * @body     {string} note - Ghi chú (optional)
 * @body     {array} items - Mảng chi tiết sản phẩm trả
 * Mỗi item: { productId: string, qty: number, unitPrice: number }
 * @return   {object} - Đơn trả hàng vừa tạo
 */
const createOrderReturn = asyncHandler(async (req, res) => {
    const { orderId, evdUrl, note, items } = req.body;
    const createdBy = req.user.id; // Từ middleware authentication

    if (!orderId) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp orderId' });
    }

    if (!evdUrl) {
        return res
            .status(400)
            .json({ success: false, message: 'Vui lòng cung cấp evdUrl (ảnh chứng từ)' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Phải cung cấp ít nhất một sản phẩm trong đơn trả hàng',
        });
    }

    try {
        // Validate song song
        await Promise.all([
            validateOrderId(orderId), // Kiểm tra order có thể trả hàng
            validateItems(items, orderId), // Kiểm tra items hợp lệ
        ]);

        const newOrderReturn = await OrderReturnsCombined.createOrderReturn({
            orderId,
            createdBy,
            evdUrl,
            note,
            items: items,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo đơn trả hàng thành công',
            data: newOrderReturn,
        });
    } catch (error) {
        if (!error.code) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.code === '23505') {
            // unique_violation
            const constraint = error.constraint;
            if (constraint?.includes('order_returns_order_id_key')) {
                return res.status(400).json({
                    success: false,
                    message: 'Đơn hàng này đã có đơn trả hàng',
                });
            }
            if (constraint?.includes('uq_return_product')) {
                return res.status(400).json({
                    success: false,
                    message: 'Sản phẩm bị trùng lặp trong đơn trả hàng',
                });
            }
            return res
                .status(400)
                .json({ success: false, message: 'Lỗi trùng lặp dữ liệu', detail: error.detail });
        }
        if (error.code === '23503') {
            // foreign_key_violation
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ: Order ID, Product ID, hoặc User ID không tồn tại',
            });
        }
        if (error.code === '23514') {
            // check_violation
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo đơn trả hàng',
            error: error.message,
        });
    }
});

/**
 * @desc     Cập nhật thông tin đơn trả hàng
 * @route    PUT /api/order-returns/:id
 * @param    {string} id - Order Return ID
 * @body     {string} status - Trạng thái
 * @body     {string} evdUrl - URL ảnh chứng từ
 * @body     {string} note - Ghi chú
 * @body     {array} items - Mảng chi tiết sản phẩm (chỉ cập nhật qty và unitPrice của item đã có)
 * @return   {object} - Đơn trả hàng đã cập nhật
 */
const updateOrderReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, evdUrl, note, items } = req.body;
    try {
        const existingOrderReturn = await OrderReturnsCombined.findOrderReturnById(id);
        if (!existingOrderReturn) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn trả hàng' });
        }

        const updatePayload = {};

        if (status !== undefined) {
            const validStatuses = ['draft', 'pending', 'paid', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Status phải là một trong: ${validStatuses.join(', ')}`);
            }
            updatePayload.status = status;
        }

        if (evdUrl !== undefined) {
            updatePayload.evdUrl = evdUrl;
        }

        if (note !== undefined) {
            updatePayload.note = note;
        }

        // Nếu 'items' được cung cấp, validate chúng
        if (items !== undefined) {
            await validateItems(items, existingOrderReturn.orderId);
            updatePayload.items = items;
        }

        const updatedOrderReturn = await OrderReturnsCombined.updateOrderReturn(id, updatePayload);

        res.status(200).json({
            success: true,
            message: 'Cập nhật đơn trả hàng thành công',
            data: updatedOrderReturn,
        });
    } catch (error) {
        if (!error.code) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.code === '23514') {
            // check_violation
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật đơn trả hàng',
            error: error.message,
        });
    }
});

/**
 * @desc     Xóa đơn trả hàng
 * @route    DELETE /api/order-returns/:id
 * @param    {string} id - Order Return ID
 * @return   {object} - Message thành công
 */
const deleteOrderReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const orderReturn = await OrderReturnsCombined.findOrderReturnById(id);
        if (!orderReturn) {
            return res
                .status(404)
                .json({ success: false, message: 'Không tìm thấy đơn trả hàng để xóa' });
        }

        // Kiểm tra trạng thái an toàn - chỉ cho phép xóa nếu draft
        if (orderReturn.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể xóa đơn trả hàng ở trạng thái draft',
            });
        }

        await OrderReturnsCombined.deleteOrderReturn(id);
        res.status(200).json({ success: true, message: 'Xóa đơn trả hàng thành công' });
    } catch (error) {
        if (error.code === '23503') {
            // foreign_key_violation
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa đơn trả hàng vì còn dữ liệu liên quan',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa đơn trả hàng',
            error: error.message,
        });
    }
});

/**
 * @desc     Lấy thống kê đơn trả hàng theo trạng thái
 * @route    GET /api/order-returns/stats/by-status
 * @query    {string} customerId - Lọc theo khách hàng
 * @query    {string} createdBy - Lọc theo người tạo
 * @query    {string} fromDate - Từ ngày
 * @query    {string} toDate - Đến ngày
 * @return   {object} - Thống kê theo trạng thái
 */
const getOrderReturnStatsByStatus = asyncHandler(async (req, res) => {
    const { customerId, createdBy, fromDate, toDate } = req.query;

    try {
        const stats = await OrderReturnsCombined.getOrderReturnStatsByStatus({
            customerId,
            createdBy,
            fromDate,
            toDate,
        });

        res.status(200).json({
            success: true,
            data: stats,
            message: 'Thống kê đơn trả hàng theo trạng thái',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê đơn trả hàng',
            error: error.message,
        });
    }
});

/**
 * @desc     Kiểm tra đơn hàng có thể tạo trả hàng không
 * @route    GET /api/order-returns/check-order/:orderId
 * @param    {string} orderId - Order ID
 * @return   {object} - Kết quả kiểm tra
 */
const checkOrderCanReturn = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    try {
        const result = await OrderReturnsCombined.checkOrderCanReturn(orderId);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra đơn hàng',
            error: error.message,
        });
    }
});

module.exports = {
    getOrderReturns,
    getOrderReturnById,
    getOrderReturnByOrderId,
    createOrderReturn,
    updateOrderReturn,
    deleteOrderReturn,
    getOrderReturnStatsByStatus,
    checkOrderCanReturn,
};
