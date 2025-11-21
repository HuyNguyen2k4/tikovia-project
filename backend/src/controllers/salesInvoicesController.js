const asyncHandler = require('express-async-handler');
const SalesInvoice = require('@src/models/SalesInvoices');
const SalesOrder = require('@src/models/SalesOrders');
const SalesOrderItem = require('@src/models/SalesOrderItems');
const Customer = require('@src/models/Customers');

// Helper function để validate unique invoice_no
const validateUniqueInvoiceNo = async (invoiceNo, excludeId = null) => {
    const existing = await SalesInvoice.findByInvoiceNo(invoiceNo);
    if (existing && existing.id !== excludeId) {
        throw new Error(`Mã hóa đơn '${invoiceNo}' đã tồn tại`);
    }
};

// Helper function để validate order_id
const validateOrderId = async (orderId) => {
    if (!orderId) throw new Error('Cần cung cấp Order ID');

    // 1. Kiểm tra Order có tồn tại
    const order = await SalesOrder.findById(orderId);
    if (!order) {
        throw new Error('Sales Order ID không tồn tại');
    }

    // 2. Kiểm tra Order đã có hóa đơn chưa (Constraint: uq_sales_invoices_order_id)
    const existingInvoice = await SalesInvoice.findByOrderId(orderId);
    if (existingInvoice) {
        throw new Error(`Đơn hàng ${order.orderNo} đã có hóa đơn (ID: ${existingInvoice.id})`);
    }
};

// Helper function để validate status
// const validateStatus = (status) => {
//     const validStatuses = ['open', 'paid', 'cancelled'];
//     if (status && !validStatuses.includes(status)) {
//         throw new Error(`Status phải là một trong: ${validStatuses.join(', ')}`);
//     }
// };

/**
 * Helper function để validate mảng items
 * @param {Array<object>} items - Mảng item từ body
 * @param {string} orderId - ID của đơn hàng
 */
const validateItems = async (items, orderId) => {
    if (!Array.isArray(items)) throw new Error('Items phải là một mảng');

    // Lấy tất cả order_item_id hợp lệ của đơn hàng này
    const orderItems = await SalesOrderItem.findByOrderId(orderId);
    if (orderItems.length === 0) {
        throw new Error('Đơn hàng này không có sản phẩm (sales_order_items) để tạo hóa đơn.');
    }
    const validOrderItemIds = new Set(orderItems.map((i) => i.id));
    const seenInPayload = new Set();

    for (const [index, item] of items.entries()) {
        if (!item.orderItemId || item.unitPrice === undefined) {
            throw new Error(`Item thứ ${index + 1} phải có orderItemId và unitPrice`);
        }

        const priceNum = parseFloat(item.unitPrice);
        if (isNaN(priceNum) || priceNum < 0) {
            throw new Error(
                `Đơn giá (unitPrice) của item thứ ${index + 1} phải là một số lớn hơn hoặc bằng 0`
            );
        }

        if (!validOrderItemIds.has(item.orderItemId)) {
            throw new Error(
                `Item thứ ${index + 1} (orderItemId: ${item.orderItemId}) không thuộc đơn hàng ${orderId}`
            );
        }

        if (seenInPayload.has(item.orderItemId)) {
            throw new Error(
                `Item thứ ${index + 1} (orderItemId: ${item.orderItemId}) bị lặp lại trong danh sách`
            );
        }
        seenInPayload.add(item.orderItemId);
    }
};

/**
 * @desc     Lấy danh sách hóa đơn
 * @route    GET /api/sales-invoices
 * @query    {string} q - Từ khóa tìm kiếm (invoice_no, customer name, order_no)
 * @query    {string} customerId - Lọc theo khách hàng
 * @query    {string} orderId - Lọc theo đơn hàng
 * @query    {string} status - Lọc theo trạng thái
 * @query    {number} limit - (default: 20)
 * @query    {number} offset - (default: 0)
 * @return   {object} - Danh sách hóa đơn và phân trang
 */
const getSalesInvoices = asyncHandler(async (req, res) => {
    const { q, customerId, orderId, status, limit, offset } = req.query;
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
            customerId,
            orderId,
            status,
        };

        const [invoices, total] = await Promise.all([
            SalesInvoice.listSalesInvoices({
                ...filterOptions,
                limit: parsedLimit,
                offset: parsedOffset,
            }),
            SalesInvoice.countSalesInvoices(filterOptions),
        ]);

        res.status(200).json({
            success: true,
            data: invoices,
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
 * @desc     Lấy thông tin hóa đơn theo ID
 * @route    GET /api/sales-invoices/:id
 * @param    {string} id - Invoice ID
 * @return   {object} - Hóa đơn
 */
const getSalesInvoiceById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({ success: false, message: 'ID hóa đơn không hợp lệ' });
    }

    const invoice = await SalesInvoice.findById(id);
    if (!invoice) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }

    res.status(200).json({ success: true, data: invoice });
});

/**
 * @desc     Lấy thông tin hóa đơn theo order_id có phân trang
 * @route    GET /api/sales-invoices/order/:orderId
 * @param    {string} orderId - Order ID
 * @query    {number} limit - (default: 10)
 * @query    {number} offset - (default: 0)
 * @return   {object} - Hóa đơn
 */
const getSalesInvoiceByOrderId = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const invoice = await SalesInvoice.findByOrderId(orderId);
    // if (!invoice) {
    //     return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    // }

    res.status(200).json({ success: true, data: invoice });
});

/**
 * @desc     Tạo hóa đơn mới
 * @route    POST /api/sales-invoices
 * @body     {string} orderId - ID đơn hàng (bắt buộc, unique)
 * @body     {number} taxAmount - Thuế (default: 0)
 * @body     {number} discountAmount - Giảm giá (default: 0)
 * @body     {number} surcharge - Phụ phí (default: 0)
 * @body     {array} items - Mảng chi tiết hóa đơn
 * Mỗi item: { orderItemId: string, unitPrice: number }
 * @return   {object} - Hóa đơn vừa tạo
 */
const createSalesInvoice = asyncHandler(async (req, res) => {
    const { orderId, taxAmount, discountAmount, surcharge, items } = req.body;

    if (!orderId) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp orderId' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res
            .status(400)
            .json({ success: false, message: 'Phải cung cấp ít nhất một item trong hóa đơn' });
    }

    try {
        // Validate song song
        await Promise.all([
            validateOrderId(orderId), // Kiểm tra order tồn tại VÀ chưa có hóa đơn
            validateItems(items, orderId), // Kiểm tra items có hợp lệ
        ]);

        const newInvoice = await SalesInvoice.createSalesInvoice({
            orderId,
            taxAmount: parseFloat(taxAmount) || 0,
            discountAmount: parseFloat(discountAmount) || 0,
            surcharge: parseFloat(surcharge) || 0,
            items: items,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo hóa đơn thành công',
            data: newInvoice,
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
            if (constraint === 'sales_invoices_invoice_no_key') {
                return res
                    .status(400)
                    .json({ success: false, message: `Mã hóa đơn '${invoiceNo}' đã tồn tại` });
            }
            if (
                constraint === 'uq_sales_invoices_order_id' ||
                constraint === 'sales_invoice_items_order_item_id_key'
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Lỗi trùng lặp: Đơn hàng hoặc chi tiết đơn hàng đã được tạo hóa đơn',
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
                message:
                    'Dữ liệu không hợp lệ: Order ID, Customer ID, hoặc Order Item ID không tồn tại',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo hóa đơn',
            error: error.message,
        });
    }
});

/**
 * @desc     Cập nhật thông tin hóa đơn
 * @route    PUT /api/sales-invoices/:id
 * @param    {string} id - Invoice ID
 * @body     {string} invoiceNo - Mã hóa đơn (unique) (không thay đổi trường này disable bên FE)
 * @body     {number} taxAmount - Thuế
 * @body     {number} discountAmount - Giảm giá
 * @body     {number} surcharge - Phụ phí (default: 0)
 * @body     {array} items - Mảng chi tiết sản phẩm (chỉ cập nhật unitPrice của item đã có, không thêm/xóa item mới)
 * @return   {object} - Hóa đơn đã cập nhật
 */
const updateSalesInvoice = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { taxAmount, discountAmount, surcharge, items } = req.body;
    const existingInvoice = await SalesInvoice.findById(id);
    if (!existingInvoice) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }
    try {
        const updatePayload = {};

        if (taxAmount !== undefined) {
            updatePayload.taxAmount = parseFloat(taxAmount);
            if (isNaN(updatePayload.taxAmount)) throw new Error('taxAmount phải là một con số');
        }
        if (discountAmount !== undefined) {
            updatePayload.discountAmount = parseFloat(discountAmount);
            if (isNaN(updatePayload.discountAmount))
                throw new Error('discountAmount phải là một con số');
        }

        if (surcharge !== undefined) {
            updatePayload.surcharge = parseFloat(surcharge);
            if (isNaN(updatePayload.surcharge)) throw new Error('surcharge phải là một con số');
        }

        // Nếu 'items' được cung cấp: chỉ cho phép cập nhật unitPrice của item đã có (không thêm/xóa)
        // Nếu 'items' được cung cấp, validate chúng
        if (items !== undefined) {
            // Dùng existingInvoice.orderId để validate
            await validateItems(items, existingInvoice.orderId);
            updatePayload.items = items;
        }

        const updatedInvoice = await SalesInvoice.updateSalesInvoice(id, updatePayload);
        res.status(200).json({
            success: true,
            message: 'Cập nhật hóa đơn thành công',
            data: updatedInvoice,
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
            return res
                .status(400)
                .json({ success: false, message: `Mã hóa đơn '${invoiceNo}' đã tồn tại` });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật hóa đơn',
            error: error.message,
        });
    }
});

/**
 * @desc     Xóa hóa đơn
 * @route    DELETE /api/sales-invoices/:id
 * @param    {string} id - Invoice ID
 * @return   {object} - Message thành công
 */
// const deleteSalesInvoice = asyncHandler(async (req, res) => {
//     const { id } = req.params;
//     const invoice = await SalesInvoice.findById(id);
//     if (!invoice) {
//         return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn để xóa' });
//     }

//     // Kiểm tra trạng thái an toàn
//     if (invoice.status === 'paid' || invoice.receivedIn > 0) {
//         return res.status(400).json({ success: false, message: 'Không thể xóa hóa đơn đã có thanh toán' });
//     }

//     try {
//         await SalesInvoice.deleteSalesInvoice(id);
//         res.status(200).json({ success: true, message: 'Xóa hóa đơn thành công' });
//     } catch (error) {
//         if (error.code === '23503') { // foreign_key_violation
//             return res.status(400).json({
//                 success: false,
//                 message: 'Không thể xóa hóa đơn vì còn dữ liệu liên quan (ví dụ: thanh toán, trả hàng)',
//             });
//         }
//         res.status(500).json({
//             success: false,
//             message: 'Lỗi server khi xóa hóa đơn',
//             error: error.message,
//         });
//     }
// });

module.exports = {
    getSalesInvoices,
    getSalesInvoiceById,
    createSalesInvoice,
    updateSalesInvoice,
    // deleteSalesInvoice,
    getSalesInvoiceByOrderId,
};
