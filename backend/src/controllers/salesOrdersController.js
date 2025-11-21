const asyncHandler = require('express-async-handler');
const SalesOrder = require('@src/models/SalesOrders');
const Customer = require('@src/models/Customers');
const User = require('@src/models/Users');
const InventoryLot = require('@src/models/InventoryLots');
const Product = require('@src/models/Products');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const Department = require('@src/models/Departments');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function để parse date từ frontend
const parseDate = (dateString) => {
    if (!dateString) return null;
    try {
        const parsed = dayjs(dateString);
        if (!parsed.isValid()) throw new Error('Invalid date format');
        return parsed.utc().toDate();
    } catch (error) {
        throw new Error(`Invalid date: ${error.message}`);
    }
};

// Helper function để parse boolean value từ string hoặc boolean
const parseBooleanValue = (value) => {
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return Boolean(value);
};

// Helper function để validate customer_id có tồn tại
const validateCustomerId = async (customerId) => {
    if (customerId) {
        const customer = await Customer.findById(customerId);
        if (!customer) {
            throw new Error('Customer ID không tồn tại');
        }
    }
};

// Helper function để validate seller_id có tồn tại
const validateSellerId = async (sellerId) => {
    if (sellerId) {
        const seller = await User.findById(sellerId);
        if (!seller) {
            throw new Error('Seller ID không tồn tại');
        }
    }
};

// Helper function để validate unique order_no
const validateUniqueOrderNo = async (orderNo, excludeId = null) => {
    const existingOrder = await SalesOrder.findByOrderNo(orderNo);
    if (existingOrder && existingOrder.id !== excludeId) {
        throw new Error(`Mã đơn hàng '${orderNo}' đã tồn tại`);
    }
};

// Helper function để validate status
const validateStatus = (status) => {
    const validStatuses = [
        'draft',
        'pending_preparation',
        'assigned_preparation',
        'prepared',
        'confirmed',
        'delivering',
        'delivered',
        'completed',
        'cancelled',
    ];
    if (status && !validStatuses.includes(status)) {
        throw new Error(`Status phải là một trong: ${validStatuses.join(', ')}`);
    }
};

// Helper function để validate mảng items
const validateItems = (items) => {
    if (!Array.isArray(items)) throw new Error('Items phải là một mảng');
    const seen = new Set();
    for (const [index, item] of items.entries()) {
        if (!item.productId || item.qty === undefined) {
            throw new Error(`Sản phẩm thứ ${index + 1} phải có productId và qty`);
        }
        const qtyNum = parseFloat(item.qty);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            throw new Error(`Số lượng của sản phẩm thứ ${index + 1} phải là một số lớn hơn 0`);
        }
        if (seen.has(item.productId)) {
            throw new Error(
                `Sản phẩm thứ ${index + 1} lặp trong danh sách. Vui lòng gộp vào một sản phẩm duy nhất.`
            );
        }
        seen.add(item.productId);
    }
};

// ✅ NEW: Helper function để lấy URL form tạo đơn hàng
const getSalesOrderFormUrl = () => {
    if (process.env.SALES_ORDER_FORM_URL && process.env.SALES_ORDER_FORM_URL.trim()) {
        return process.env.SALES_ORDER_FORM_URL.trim();
    }
    if (process.env.CLIENT_URL && process.env.CLIENT_URL.trim()) {
        return `${process.env.CLIENT_URL.replace(/\/$/, '')}/sales-orders`;
    }
    return 'http://localhost:5173/sales-orders';
};

// ✅ NEW: Helper function để build URL với định dạng mảng lồng nhau
const buildNestedUrl = (baseUrl, params = {}) => {
    const queryParts = [];

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                Object.entries(item).forEach(([itemKey, itemValue]) => {
                    if (itemValue !== undefined && itemValue !== null) {
                        queryParts.push(
                            `${key}[${index}][${itemKey}]=${encodeURIComponent(itemValue)}`
                        );
                    }
                });
            });
        } else {
            queryParts.push(`${key}=${encodeURIComponent(value)}`);
        }
    });

    if (queryParts.length === 0) return baseUrl;
    const joinChar = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${joinChar}${queryParts.join('&')}`;
};

/**
 * @desc    Generate auto-fill sales order form link for chatbot/n8n
 * @route   POST /api/sales-orders/prefill-link
 * @access  Private (Chatbot API Key)
 */
const generateSalesOrderPrefillLink = asyncHandler(async (req, res) => {
    const {
        customerName,
        departmentName,
        slaDeliveryAt,
        items,
        baseFormUrl, // Tùy chọn: URL form từ client
    } = req.body || {};

    const errors = [];
    const prefillData = {
        items: [],
    };

    let resolvedDepartment = null;

    // 1. Validate Customer
    if (customerName && customerName.trim()) {
        const customer = await Customer.findByNameInsensitive(customerName.trim());
        if (!customer) {
            errors.push(`Không tìm thấy khách hàng '${customerName.trim()}'`);
        } else {
            prefillData.customerName = customer.name; // Trả về tên chuẩn
        }
    } else {
        errors.push('Tên khách hàng là bắt buộc');
    }

    // 2. Validate Department
    if (departmentName && departmentName.trim()) {
        const department = await Department.findByNameInsensitive(departmentName.trim());
        if (!department) {
            errors.push(`Không tìm thấy kho hàng '${departmentName.trim()}'`);
        } else {
            resolvedDepartment = department; // Lưu để kiểm tra stock sau
            prefillData.departmentName = department.name; // Trả về tên chuẩn
        }
    } else {
        errors.push('Tên kho hàng là bắt buộc');
    }

    // 3. Validate SLA Delivery At
    if (slaDeliveryAt) {
        if (dayjs(slaDeliveryAt).isValid()) {
            prefillData.slaDeliveryAt = dayjs(slaDeliveryAt).toISOString();
        } else {
            errors.push(`Ngày giờ giao hàng (slaDeliveryAt) không hợp lệ`);
        }
    }

    // 4. Validate Items (bao gồm kiểm tra tồn kho)
    if (!Array.isArray(items) || items.length === 0) {
        errors.push('Danh sách sản phẩm (items) là bắt buộc');
    } else {
        for (const [index, item] of items.entries()) {
            const { productName, skuCode, qty, unit, note } = item;
            const itemLabel = `Sản phẩm #${index + 1}`;

            if (!productName && !skuCode) {
                errors.push(`${itemLabel}: Cần cung cấp 'productName' hoặc 'skuCode'`);
                continue;
            }
            if (qty === undefined || isNaN(Number(qty)) || Number(qty) <= 0) {
                errors.push(
                    `${itemLabel} ('${productName || skuCode}'): Số lượng (qty) phải là số lớn hơn 0`
                );
                continue;
            }
            if (!unit || !unit.trim()) {
                errors.push(
                    `${itemLabel} ('${productName || skuCode}'): Đơn vị (unit) là bắt buộc`
                );
                continue;
            }

            // ✅ NEW: Tìm sản phẩm
            let product = null;
            if (skuCode) {
                product = await Product.findBySkuCode(skuCode.trim().toUpperCase());
            } else if (productName) {
                product = await Product.findByNameInsensitive(productName.trim());
            }

            if (!product) {
                errors.push(`${itemLabel}: Không tìm thấy sản phẩm '${productName || skuCode}'`);
                continue;
            }

            // ✅ NEW: Kiểm tra sản phẩm có bị disable hay không
            if (product.status === 'disable') {
                errors.push(
                    `${itemLabel} ('${product.name}'): Sản phẩm đã bị vô hiệu hóa, không thể bán`
                );
                continue;
            }

            // ✅ NEW: Kiểm tra sản phẩm có bị admin lock hay không
            if (product.adminLocked) {
                errors.push(
                    `${itemLabel} ('${product.name}'): Sản phẩm đã bị khóa bởi admin, không thể bán`
                );
                continue;
            }

            // ✅ Validate unit
            const validUnits = [product.mainUnit.toLowerCase(), product.packUnit.toLowerCase()];
            if (!validUnits.includes(unit.trim().toLowerCase())) {
                errors.push(
                    `${itemLabel} ('${product.name}'): Đơn vị '${unit}' không hợp lệ. Chỉ chấp nhận '${product.mainUnit}' hoặc '${product.packUnit}'.`
                );
                continue;
            }

            // ✅ NEW: Kiểm tra tồn kho tại department (chỉ khi có department hợp lệ)
            if (resolvedDepartment) {
                try {
                    const availableStock = await InventoryLot.getTotalStockByProductAndDepartment(
                        product.id,
                        resolvedDepartment.id
                    );

                    if (availableStock <= 0) {
                        errors.push(
                            `${itemLabel} ('${product.name}'): Không có hàng tồn kho tại ${resolvedDepartment.name}`
                        );
                        continue;
                    }

                    if (Number(qty) > availableStock) {
                        errors.push(
                            `${itemLabel} ('${product.name}'): Số lượng yêu cầu (${qty}) vượt quá tồn kho có sẵn (${availableStock}) tại ${resolvedDepartment.name}`
                        );
                        continue;
                    }
                } catch (stockError) {
                    console.error(`Lỗi kiểm tra tồn kho cho ${product.name}:`, stockError);
                    errors.push(
                        `${itemLabel} ('${product.name}'): Không thể kiểm tra tồn kho tại ${resolvedDepartment.name}`
                    );
                    continue;
                }
            }

            // ✅ Nếu tất cả validation đều pass, thêm vào prefillData
            prefillData.items.push({
                productName: product.name, // Trả về tên chuẩn
                qty: Number(qty),
                unit: unit.trim(),
                note: note || '',
            });
        }
    }

    // 5. Check for errors
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu chưa hợp lệ, không thể tạo link',
            errors,
        });
    }

    // 6. Build URL
    const finalBaseUrl = baseFormUrl || getSalesOrderFormUrl();
    const queryParams = {
        add: true,
        ...prefillData,
    };

    const formUrl = buildNestedUrl(finalBaseUrl, queryParams);

    res.status(200).json({
        success: true,
        message: 'Tạo link auto-fill thành công!',
        data: {
            formUrl,
        },
    });
});

/**
 * @desc     Lấy danh sách đơn hàng
 * @route    GET /api/sales-orders
 * @query    {string} q - Từ khóa tìm kiếm (tìm trong order_no, customer name, seller full_name)
 * @query    {string} customerId - Lọc theo khách hàng
 * @query    {string} sellerId - Lọc theo nhân viên bán hàng
 * @query    {string|Array<string>} status - Lọc theo trạng thái (có thể là 1 chuỗi hoặc 1 mảng chuỗi)
 * @query    {boolean} adminLocked - Lọc theo trạng thái admin lock
 * @query    {number} departmentId - Lọc theo kho xuất hàng
 * @query    {number} limit - Số lượng item trên mỗi trang (default: 20)
 * @query    {number} offset - Vị trí bắt đầu (default: 0)
 * @return   {object} - Trả về object với danh sách đơn hàng và thông tin phân trang
 */
const getSalesOrders = asyncHandler(async (req, res) => {
    // 1. Lấy tất cả query params, bao gồm cả 'status' (có thể là string hoặc array)
    const { q, customerId, sellerId, departmentId, status, adminLocked, limit, offset } = req.query;
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res
            .status(400)
            .json({ success: false, message: 'Limit và offset phải là số không âm' });
    }

    try {
        // 2. Gom tất cả tùy chọn lọc vào một object
        //    Lưu ý: chúng ta truyền 'status' trực tiếp. Express tự động
        //    biến ?status=a&status=b thành một mảng.
        //    Hàm listAndCountSalesOrders của chúng ta đã xử lý cả 2 trường hợp (string và array).
        const filterOptions = {
            q: q ? q.trim() : undefined,
            customerId,
            sellerId,
            departmentId,
            status, // Truyền trực tiếp, có thể là string hoặc array
            adminLocked: adminLocked !== undefined ? parseBooleanValue(adminLocked) : undefined,
            limit: parsedLimit,
            offset: parsedOffset,
        };

        // 3. GỌI HÀM KẾT HỢP
        // Thay vì dùng Promise.all với 2 hàm, ta gọi 1 hàm duy nhất
        const { data: orders, count: total } =
            await SalesOrder.listAndCountSalesOrders(filterOptions);

        // 4. Trả về kết quả
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
 * @desc     Lấy thông tin đơn hàng theo ID
 * @route    GET /api/sales-orders/:id
 * @param    {string} id - Order ID
 * @return   {object} - Trả về object đơn hàng nếu tìm thấy
 * @return   {null} - Trả về null nếu không tìm thấy
 */
const getSalesOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });
    }

    const order = await SalesOrder.findById(id);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    res.status(200).json({ success: true, data: order });
});

/**
 * @desc     Tạo đơn hàng mới
 * @route    POST /api/sales-orders
 * @body     {string} orderNo - Mã đơn hàng (bắt buộc, unique)
 * @body     {string} customerId - ID khách hàng (bắt buộc)
 * @body     {string} departmentId - ID của kho xuất hàng (bắt buộc)
 * @req.user.id     {string} sellerId - ID nhân viên bán hàng (bắt buộc) lấy từ req.user
 * @body     {string} slaDeliveryAt - Thời gian giao hàng cam kết (bắt buộc, ISO 8601 format)
 * @body     {string} address - Địa chỉ giao hàng (bắt buộc)
 * @body     {array} items - Mảng chi tiết sản phẩm trong đơn hàng
 *         Mỗi item trong mảng có cấu trúc: { productId: string, qty: number, note: string (optional) }
 * @return   {object} - Trả về object đơn hàng vừa tạo
 */
const createSalesOrder = asyncHandler(async (req, res) => {
    const { customerId, slaDeliveryAt, address, items, departmentId, phone, note } = req.body;
    const sellerId = req.user.id;
    if (!customerId || !sellerId || !slaDeliveryAt || !address) {
        return res
            .status(400)
            .json({ success: false, message: 'Vui lòng cung cấp đủ thông tin đơn hàng' });
    }
    if (!departmentId) {
        return res
            .status(400)
            .json({ success: false, message: 'Vui lòng cung cấp ID của kho hàng (departmentId)' });
    }

    try {
        validateItems(items || []); // Validate mảng items
        await Promise.all(
            (items || []).map(async (item) => {
                // Lấy tồn kho và thông tin chi tiết sản phẩm song song để tối ưu
                const [availableStock, productDetails] = await Promise.all([
                    InventoryLot.getTotalStockByProductAndDepartment(item.productId, departmentId),
                    Product.findById(item.productId), // Lấy thông tin sản phẩm
                ]);

                // Kiểm tra xem sản phẩm có tồn tại không
                if (!productDetails) {
                    throw new Error(`Sản phẩm với ID: ${item.productId} không tồn tại.`);
                }

                // So sánh tồn kho
                if (item.qty > availableStock) {
                    // Ném lỗi với TÊN sản phẩm thay vì ID
                    throw new Error(
                        `Số lượng tồn kho không đủ cho sản phẩm ${productDetails.name}. Yêu cầu: ${item.qty}, Tồn kho: ${availableStock}`
                    );
                }
            })
        );
        const parsedSlaDeliveryAt = parseDate(slaDeliveryAt);
        if (!parsedSlaDeliveryAt) {
            return res
                .status(400)
                .json({ success: false, message: 'Định dạng slaDeliveryAt không hợp lệ' });
        }

        await Promise.all([validateCustomerId(customerId), validateSellerId(sellerId)]);

        const newOrder = await SalesOrder.createSalesOrder({
            customerId,
            sellerId,
            departmentId,
            slaDeliveryAt: parsedSlaDeliveryAt,
            address: address.trim(),
            items: items || [],
            phone: phone ? phone.trim() : null,
            note: note ? note.trim() : null,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo đơn hàng thành công',
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
            return res.status(400).json({ success: false, message: `Mã đơn hàng đã tồn tại` });
        }
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Customer ID, Seller ID, hoặc Product ID không hợp lệ',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo đơn hàng',
            error: error.message,
        });
    }
});

/**
 * @desc     Cập nhật thông tin đơn hàng
 * @route    PUT /api/sales-orders/:id
 * @param    {string} id - Order ID
 * @body     {string} orderNo - Mã đơn hàng (unique)
 * @body     {string} customerId - ID khách hàng
 * @body     {string} sellerId - ID nhân viên bán hàng lấy từ req.user
 * @body     {string} departmentId - ID phòng ban/kho xuất hàng
 * @body     {string} slaDeliveryAt - Thời gian giao hàng cam kết (ISO 8601 format)
 * @body     {string} address - Địa chỉ giao hàng
 * @body     {boolean} adminLocked - Trạng thái admin lock
 * @body     {array} items - Mảng chi tiết sản phẩm trong đơn hàng
 *         Mỗi item trong mảng có cấu trúc: { productId: string, qty: number, note: string (optional) }
 * @return   {object} - Trả về object đơn hàng đã cập nhật
 */
const updateSalesOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { items, ...orderData } = req.body;
    const currentUserId = req.user.id;

    const existingOrder = await SalesOrder.findById(id);
    if (!existingOrder) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    try {
        if (items !== undefined) {
            validateItems(items);
        }

        const updatePayload = { ...orderData };

        // Seller ID must come from req.user — ignore any sellerId in request body
        if (currentUserId) {
            updatePayload.sellerId = currentUserId;
        }

        // if (orderData.orderNo !== undefined) {
        //     await validateUniqueOrderNo(orderData.orderNo.trim().toUpperCase(), id);
        //     updatePayload.orderNo = orderData.orderNo.trim().toUpperCase();
        // }
        if (orderData.customerId !== undefined) await validateCustomerId(orderData.customerId);
        // note: do NOT validate orderData.sellerId because sellerId is taken from req.user
        if (orderData.slaDeliveryAt !== undefined) {
            updatePayload.slaDeliveryAt = parseDate(orderData.slaDeliveryAt);
        }
        if (orderData.departmentId !== undefined) {
            updatePayload.departmentId = orderData.departmentId;
        }
        if (orderData.adminLocked !== undefined) {
            updatePayload.adminLocked = parseBooleanValue(orderData.adminLocked);
        }
        if (orderData.phone !== undefined) {
            updatePayload.phone = orderData.phone ? orderData.phone.trim() : null;
        }
        if (orderData.note !== undefined) {
            updatePayload.note = orderData.note ? orderData.note.trim() : null;
        }

        const updatedOrder = await SalesOrder.updateSalesOrder(id, { items, ...updatePayload });
        res.status(200).json({
            success: true,
            message: 'Cập nhật đơn hàng thành công',
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
            message: 'Lỗi server khi cập nhật đơn hàng',
            error: error.message,
        });
    }
});

/**
 * @desc     Xóa đơn hàng
 * @route    DELETE /api/sales-orders/:id
 * @param    {string} id - Order ID
 * @return   {object} - Trả về message thành công
 * Note: không được sử dụng
 */
const deleteSalesOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await SalesOrder.findById(id);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng để xóa' });
    }
    try {
        await SalesOrder.deleteSalesOrder(id);
        res.status(200).json({ success: true, message: 'Xóa đơn hàng thành công' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa đơn hàng vì còn dữ liệu liên quan',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa đơn hàng',
            error: error.message,
        });
    }
});
/**
 * @desc     Cập nhật trạng thái admin lock đơn hàng
 * @route    PATCH /api/sales-orders/:id/admin-lock
 * @access   Private (Admin, Seller)
 * @param    {string} id - Order ID
 * @body     {boolean} adminLocked - Trạng thái lock mới
 * @return   {object} - Trả về object đơn hàng đã cập nhật
 */
const updateSalesOrderAdminLock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { adminLocked } = req.body;
    const existingOrder = await SalesOrder.findById(id);
    if (!existingOrder) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    try {
        const updatedOrder = await SalesOrder.updateSalesOrder(id, { adminLocked });
        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái admin lock đơn hàng thành công',
            data: updatedOrder,
        });
    } catch (error) {
        if (
            error.message.includes('không tồn tại') ||
            error.message.includes('đã tồn tại') ||
            error.message.includes('không hợp lệ')
        ) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái admin lock đơn hàng',
            error: error.message,
        });
    }
});
/**
 * @desc     Cập nhật trạng thái admin lock hàng loạt
 * @route    PUT /api/sales-orders/bulk-admin-lock
 */
// const updateBulkAdminLock = asyncHandler(async (req, res) => {
//     const { ids, adminLocked } = req.body;
//     if (!Array.isArray(ids) || ids.length === 0 || typeof adminLocked !== 'boolean') {
//         return res.status(400).json({ success: false, message: 'Dữ liệu đầu vào không hợp lệ' });
//     }
//     try {
//         const updatedCount = await SalesOrder.updateAdminLocked(ids, adminLocked);
//         res.status(200).json({
//             success: true,
//             message: `Đã cập nhật trạng thái admin lock cho ${updatedCount} đơn hàng`,
//             data: { updatedCount },
//         });
//     } catch (error) {
//         res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật hàng loạt', error: error.message });
//     }
// });

/**
 * @desc     Lấy danh sách đơn hàng kèm đầy đủ thông tin hóa đơn
 * @route    GET /api/sales-orders/with-invoice
 * @query    Các tham số lọc giống getSalesOrders
 * @return   {object} - Danh sách đơn hàng và phân trang, mỗi order có trường 'invoice'
 */
const getSalesOrdersWithInvoiceFull = asyncHandler(async (req, res) => {
    const { q, customerId, sellerId, departmentId, status, adminLocked, limit, offset } = req.query;
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
            sellerId,
            departmentId,
            status,
            adminLocked: adminLocked !== undefined ? parseBooleanValue(adminLocked) : undefined,
            limit: parsedLimit,
            offset: parsedOffset,
        };

        const orders = await SalesOrder.listSalesOrdersWithInvoiceFull(filterOptions);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                total: orders.length,
                limit: parsedLimit,
                offset: parsedOffset,
                hasMore: orders.length === parsedLimit,
            },
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = {
    getSalesOrders,
    createSalesOrder,
    getSalesOrderById,
    updateSalesOrder,
    deleteSalesOrder,
    updateSalesOrderAdminLock,
    // updateBulkAdminLock,
    getSalesOrdersWithInvoiceFull,
    generateSalesOrderPrefillLink, // Chatbot auto-fill link
};
