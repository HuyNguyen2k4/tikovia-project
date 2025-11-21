const asyncHandler = require('express-async-handler');
const InventoryLot = require('@src/models/InventoryLots');
const Product = require('@src/models/Products');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

// ✅ NEW: Helper để validate conversion rate
const validateConversionRate = (conversionRate) => {
    if (conversionRate !== undefined) {
        const rate = parseFloat(conversionRate);
        if (isNaN(rate) || rate <= 0) {
            throw new Error('Tỷ lệ quy đổi phải là số dương');
        }
        return rate;
    }
    return 1; // Default value
};

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

// Helper function để validate product_id có tồn tại
const validateProductId = async (productId) => {
    if (productId) {
        const product = await Product.findById(productId);
        if (!product) {
            throw new Error(`Product ID '${productId}' không tồn tại`);
        }
        return product;
    }
};

// Helper function để validate unique lot_no theo product + department
const validateUniqueLotNo = async (lotNo, productId, departmentId, excludeId = null) => {
    const exists = await InventoryLot.isLotNoExists(lotNo, productId, departmentId, excludeId);
    if (exists) {
        throw new Error(`Lot number '${lotNo}' đã tồn tại cho sản phẩm và phòng ban này`);
    }
};

// Helper function để validate expiry date
const validateExpiryDate = (expiryDate) => {
    if (expiryDate) {
        const date = dayjs(expiryDate); // ✅ Sử dụng dayjs thay vì new Date()
        if (!date.isValid()) {
            throw new Error('Ngày hết hạn không hợp lệ');
        }

        // Kiểm tra ngày hết hạn là ngày trong tương lai
        const today = dayjs().startOf('day'); // ✅ Sử dụng dayjs
        if (date.isBefore(today)) {
            throw new Error(
                `Ngày hết hạn phải là ngày trong tương lai (sau ngày ${today.format('YYYY-MM-DD')})`
            );
        }
    }
};

// Helper function để validate quantity
const validateQuantity = (quantity) => {
    if (quantity !== undefined) {
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty < 0) {
            throw new Error('Số lượng phải là số không âm');
        }
        return qty;
    }
    return 0;
};

/**
 * @desc    Lấy danh sách inventory lots với phân trang và tìm kiếm
 * @route   GET /api/inventory-lots
 * @access  Private
 * @query   {string} q - Từ khóa tìm kiếm (tìm trong lot_no, sku_code, product_name)
 * @query   {string} productId - Lọc theo sản phẩm
 * @query   {string} departmentId - Lọc theo phòng ban
 * @query   {boolean} expiredOnly - Chỉ lấy lô đã hết hạn
 * @query   {boolean} lowStockOnly - Chỉ lấy lô có số lượng thấp
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 20, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách inventory lots và thông tin phân trang
 */
const getInventoryLots = asyncHandler(async (req, res) => {
    const { q, productId, departmentId, expiredOnly, lowStockOnly, limit, offset } = req.query;

    // Validate và parse các tham số
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const maxLimit = 100;

    // Kiểm tra tham số hợp lệ
    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giới hạn và vị trí phải là số không âm',
        });
    }

    // Parse boolean filters
    const parsedExpiredOnly = expiredOnly === 'true' || expiredOnly === true;
    const parsedLowStockOnly = lowStockOnly === 'true' || lowStockOnly === true;

    const finalLimit = Math.min(parsedLimit, maxLimit);

    try {
        // Gọi song song để tối ưu hiệu suất
        const [inventoryLots, total] = await Promise.all([
            InventoryLot.listInventoryLots({
                q: q ? q.trim() : undefined,
                productId,
                departmentId,
                expiredOnly: parsedExpiredOnly,
                lowStockOnly: parsedLowStockOnly,
                limit: finalLimit,
                offset: parsedOffset,
            }),
            InventoryLot.countInventoryLots({
                q: q ? q.trim() : undefined,
                productId,
                departmentId,
                expiredOnly: parsedExpiredOnly,
                lowStockOnly: parsedLowStockOnly,
            }),
        ]);

        res.status(200).json({
            success: true,
            data: inventoryLots,
            pagination: {
                total,
                limit: finalLimit,
                offset: parsedOffset,
                hasMore: parsedOffset + finalLimit < total,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách inventory lots',
            error: error.message,
        });
    }
});

/**
 * ✅ UPDATED: Tạo inventory lot mới với conversion_rate
 * @route   POST /api/inventory-lots
 * @access  Private
 * @body    {string} lotNo - Số lô hàng (bắt buộc, unique)
 * @body    {string} productId - ID sản phẩm (bắt buộc)
 * @body    {string} departmentId - ID phòng ban (bắt buộc)
 * @body    {string} expiryDate - Ngày hết hạn (bắt buộc)
 * @body    {number} qtyOnHand - Số lượng tồn kho theo main_unit (default: 0)
 * @body    {number} conversionRate - Tỷ lệ quy đổi pack->main (bắt buộc, > 0)
 */
const createInventoryLot = asyncHandler(async (req, res) => {
    const {
        lotNo,
        productId,
        departmentId,
        expiryDate,
        qtyOnHand,
        conversionRate, // ✅ NEW: Bắt buộc
    } = req.body;

    // Validate các trường bắt buộc
    if (!lotNo || !lotNo.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Số lô hàng là bắt buộc',
        });
    }

    if (!productId) {
        return res.status(400).json({
            success: false,
            message: 'Product ID là bắt buộc',
        });
    }

    if (!departmentId) {
        return res.status(400).json({
            success: false,
            message: 'Department ID là bắt buộc',
        });
    }

    if (!expiryDate) {
        return res.status(400).json({
            success: false,
            message: 'Ngày hết hạn là bắt buộc',
        });
    }

    // ✅ NEW: Validate conversion rate (bắt buộc)
    if (conversionRate === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Tỷ lệ quy đổi (conversionRate) là bắt buộc',
        });
    }

    try {
        // Validate product tồn tại
        await validateProductId(productId);

        // Validate lot number unique
        await validateUniqueLotNo(lotNo.trim(), productId, departmentId);

        // Validate expiry date
        validateExpiryDate(expiryDate);

        // Validate quantity và conversion rate
        const validatedQty = validateQuantity(qtyOnHand);
        const validatedConversionRate = validateConversionRate(conversionRate); // ✅ NEW

        // Tạo inventory lot mới
        const newInventoryLot = await InventoryLot.createInventoryLot({
            lotNo: lotNo.trim().toUpperCase(),
            productId,
            departmentId,
            expiryDate: parseDate(expiryDate),
            qtyOnHand: validatedQty,
            conversionRate: validatedConversionRate, // ✅ NEW
        });

        res.status(201).json({
            success: true,
            message: 'Tạo inventory lot thành công',
            data: newInventoryLot,
        });
    } catch (error) {
        // Xử lý các lỗi cụ thể
        if (error.message.includes('Product ID không tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.message.includes('đã tồn tại')) {
            return res.status(409).json({
                success: false,
                message: error.message,
            });
        }
        if (
            error.message.includes('Ngày hết hạn') ||
            error.message.includes('Số lượng') ||
            error.message.includes('Tỷ lệ quy đổi')
        ) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        // Lỗi database constraint
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Số lô hàng đã tồn tại',
            });
        }
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Product ID hoặc Department ID không tồn tại',
            });
        }
        if (error.code === '23514') {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ (kiểm tra conversion_rate > 0, qty >= 0)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo inventory lot',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thông tin inventory lot theo ID
 * @route   GET /api/inventory-lots/:id
 * @access  Private
 * @param   {string} id - Inventory Lot ID
 * @return  {object} - Trả về object inventory lot nếu tìm thấy
 */
const getInventoryLotById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID inventory lot không hợp lệ',
        });
    }

    const inventoryLot = await InventoryLot.findById(id);
    if (!inventoryLot) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy inventory lot',
        });
    }

    res.status(200).json({
        success: true,
        data: inventoryLot,
    });
});

/**
 * @desc    Lấy inventory lots theo product ID
 * @route   GET /api/inventory-lots/product/:productId
 * @access  Private
 * @param   {string} productId - Product ID
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách inventory lots
 */
const getInventoryLotsByProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { limit, offset } = req.query;

    // Validate product tồn tại
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm',
        });
    }

    const inventoryLots = await InventoryLot.getInventoryLotsByProduct(productId, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
    });

    res.status(200).json({
        success: true,
        data: inventoryLots,
        product: product,
    });
});

/**
 * @desc    Lấy inventory lots theo department ID
 * @route   GET /api/inventory-lots/department/:departmentId
 * @access  Private
 * @param   {string} departmentId - Department ID
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách inventory lots
 */
const getInventoryLotsByDepartment = asyncHandler(async (req, res) => {
    const { departmentId } = req.params;
    const { limit, offset } = req.query;

    const inventoryLots = await InventoryLot.getInventoryLotsByDepartment(departmentId, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
    });

    res.status(200).json({
        success: true,
        data: inventoryLots,
        departmentId: departmentId,
    });
});

/**
 * ✅ UPDATED: Cập nhật inventory lot với conversion_rate
 * @route   PUT /api/inventory-lots/:id
 * @access  Private (Admin, Manager)
 * @body    {string} lotNo - Số lô hàng
 * @body    {string} productId - ID sản phẩm
 * @body    {string} departmentId - ID phòng ban
 * @body    {string} expiryDate - Ngày hết hạn
 * @body    {number} qtyOnHand - Số lượng tồn kho theo main_unit
 * @body    {number} conversionRate - Tỷ lệ quy đổi pack->main (> 0)
 */
const updateInventoryLot = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        lotNo,
        productId,
        departmentId,
        expiryDate,
        qtyOnHand,
        conversionRate, // ✅ NEW
    } = req.body;

    // Kiểm tra inventory lot tồn tại
    const existingInventoryLot = await InventoryLot.findById(id);
    if (!existingInventoryLot) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy inventory lot',
        });
    }

    // Validate dữ liệu đầu vào
    if (lotNo !== undefined && (!lotNo || !lotNo.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Số lô hàng không được để trống',
        });
    }

    // Validate expiry date nếu có
    if (expiryDate !== undefined) {
        try {
            validateExpiryDate(expiryDate);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Validate quantity và conversion rate nếu có
    let validatedQty, validatedConversionRate;
    if (qtyOnHand !== undefined) {
        try {
            validatedQty = validateQuantity(qtyOnHand);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ✅ NEW: Validate conversion rate
    if (conversionRate !== undefined) {
        try {
            validatedConversionRate = validateConversionRate(conversionRate);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    try {
        // Validate product nếu có thay đổi
        if (productId && productId !== existingInventoryLot.productId) {
            await validateProductId(productId);
        }

        // Validate lot number unique nếu có thay đổi
        if (lotNo && lotNo.trim().toUpperCase() !== existingInventoryLot.lotNo) {
            await validateUniqueLotNo(lotNo.trim(), productId, departmentId);
        }

        // Chuẩn bị payload cho update
        const updatePayload = {};
        if (lotNo !== undefined) updatePayload.lotNo = lotNo.trim().toUpperCase();
        if (productId !== undefined) updatePayload.productId = productId;
        if (departmentId !== undefined) updatePayload.departmentId = departmentId;
        if (expiryDate !== undefined) updatePayload.expiryDate = parseDate(expiryDate);
        if (qtyOnHand !== undefined) updatePayload.qtyOnHand = validatedQty;
        if (conversionRate !== undefined) updatePayload.conversionRate = validatedConversionRate; // ✅ NEW

        // Kiểm tra có dữ liệu để update không
        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu để cập nhật',
            });
        }

        const updatedInventoryLot = await InventoryLot.updateInventoryLot(id, updatePayload);
        if (!updatedInventoryLot) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy inventory lot để cập nhật',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật inventory lot thành công',
            data: updatedInventoryLot,
        });
    } catch (error) {
        // Xử lý các lỗi cụ thể
        if (error.message.includes('Product ID không tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.message.includes('đã tồn tại')) {
            return res.status(409).json({
                success: false,
                message: error.message,
            });
        }

        // Lỗi database constraint
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Số lô hàng đã tồn tại',
            });
        }
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Product ID hoặc Department ID không tồn tại',
            });
        }
        if (error.code === '23514') {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ (kiểm tra conversion_rate > 0, qty >= 0)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật inventory lot',
            error: error.message,
        });
    }
});

// ✅ NEW: Cập nhật qty với conversion support
/**
 * @desc    Cập nhật số lượng với hỗ trợ conversion
 * @route   PUT /api/inventory-lots/:id/quantity-with-conversion
 * @access  Private
 * @param   {string} id - Inventory Lot ID
 * @body    {number} [qtyInMain] - Số lượng theo main_unit
 * @body    {number} [qtyInPack] - Số lượng theo pack_unit
 * @body    {number} [conversionRate] - Tỷ lệ quy đổi mới (nếu có)
 * @note    Chỉ được cung cấp qtyInMain HOẶC (qtyInPack + conversionRate)
 */
const updateQuantityWithConversion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { qtyInMain, qtyInPack, conversionRate } = req.body;

    // Kiểm tra inventory lot tồn tại
    const existingLot = await InventoryLot.findById(id);
    if (!existingLot) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy inventory lot',
        });
    }

    // Validate input logic
    if (qtyInMain !== undefined && (qtyInPack !== undefined || conversionRate !== undefined)) {
        return res.status(400).json({
            success: false,
            message: 'Chỉ được cung cấp qtyInMain HOẶC (qtyInPack + conversionRate)',
        });
    }

    if (qtyInPack !== undefined && conversionRate === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Khi cung cấp qtyInPack, conversionRate là bắt buộc',
        });
    }

    if (qtyInMain === undefined && qtyInPack === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Phải cung cấp qtyInMain hoặc qtyInPack',
        });
    }

    try {
        const updatedLot = await InventoryLot.updateQuantityWithConversion(id, {
            qtyInMain,
            qtyInPack,
            conversionRate,
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật số lượng với conversion thành công',
            data: updatedLot,
        });
    } catch (error) {
        if (error.message.includes('Phải cung cấp')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật số lượng',
            error: error.message,
        });
    }
});

/**
 * @desc    Cập nhật số lượng tồn kho
 * @route   PUT /api/inventory-lots/:id/quantity
 * @access  Private
 * @param   {string} id - Inventory Lot ID
 * @body    {number} qtyOnHand - Số lượng tồn kho mới
 * @return  {object} - Trả về object inventory lot đã cập nhật
 */
const updateInventoryLotQuantity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { qtyOnHand } = req.body;

    // Kiểm tra inventory lot tồn tại
    const existingInventoryLot = await InventoryLot.findById(id);
    if (!existingInventoryLot) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy inventory lot',
        });
    }

    // Validate quantity
    if (qtyOnHand === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Số lượng tồn kho là bắt buộc',
        });
    }

    try {
        const validatedQty = validateQuantity(qtyOnHand);
        const updatedInventoryLot = await InventoryLot.updateQuantity(id, validatedQty);

        res.status(200).json({
            success: true,
            message: 'Cập nhật số lượng tồn kho thành công',
            data: updatedInventoryLot,
        });
    } catch (error) {
        if (error.message.includes('Số lượng')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật số lượng',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa inventory lot
 * @route   DELETE /api/inventory-lots/:id
 * @access  Private (Admin only)
 * @param   {string} id - Inventory Lot ID
 * @return  {object} - Trả về message thành công hoặc lỗi
 */
const deleteInventoryLot = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Kiểm tra inventory lot tồn tại
    const inventoryLot = await InventoryLot.findById(id);
    if (!inventoryLot) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy inventory lot',
        });
    }

    try {
        await InventoryLot.deleteInventoryLot(id);
        res.status(200).json({
            success: true,
            message: 'Xóa inventory lot thành công',
        });
    } catch (error) {
        // Lỗi constraint (có thể có transaction hoặc reference khác)
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa inventory lot vì đang được sử dụng',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa inventory lot',
            error: error.message,
        });
    }
});

/**
 * @desc    Tìm kiếm inventory lot theo lot number
 * @route   GET /api/inventory-lots/lot/:lotNo
 * @access  Private
 * @param   {string} lotNo - Lot number
 * @return  {object} - Trả về object inventory lot nếu tìm thấy
 */
const getInventoryLotByLotNo = asyncHandler(async (req, res) => {
    const { lotNo } = req.params;

    if (!lotNo || !lotNo.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Lot number không được để trống',
        });
    }

    const inventoryLot = await InventoryLot.findByLotNo(lotNo.trim().toUpperCase());
    if (!inventoryLot) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy inventory lot',
        });
    }

    res.status(200).json({
        success: true,
        data: inventoryLot,
    });
});

/**
 * @desc    Lấy inventory lots sắp hết hạn
 * @route   GET /api/inventory-lots/expiring
 * @access  Private
 * @query   {number} days - Số ngày trước khi hết hạn (default: 7)
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách inventory lots sắp hết hạn
 */
const getExpiringInventoryLots = asyncHandler(async (req, res) => {
    const { days, limit, offset } = req.query;

    const expiringDays = parseInt(days) || 7;
    const parsedLimit = parseInt(limit) || 50;
    const parsedOffset = parseInt(offset) || 0;

    // Validate days
    if (expiringDays < 0 || expiringDays > 365) {
        return res.status(400).json({
            success: false,
            message: 'Số ngày phải từ 0 đến 365',
        });
    }

    try {
        const expiringLots = await InventoryLot.getExpiringLots(expiringDays, {
            limit: parsedLimit,
            offset: parsedOffset,
        });

        res.status(200).json({
            success: true,
            data: expiringLots,
            filter: {
                days: expiringDays,
                description: `Sắp hết hạn trong ${expiringDays} ngày tới`,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách inventory lots sắp hết hạn',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy inventory lots đã hết hạn
 * @route   GET /api/inventory-lots/expired
 * @access  Private
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách inventory lots đã hết hạn
 */
const getExpiredInventoryLots = asyncHandler(async (req, res) => {
    const { limit, offset } = req.query;

    try {
        const expiredLots = await InventoryLot.getExpiredLots({
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
        });

        res.status(200).json({
            success: true,
            data: expiredLots,
            filter: {
                description: 'Đã hết hạn',
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách inventory lots đã hết hạn',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy inventory lots có số lượng thấp
 * @route   GET /api/inventory-lots/low-stock
 * @access  Private
 * @query   {number} threshold - Ngưỡng số lượng thấp (default: 10)
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách inventory lots có số lượng thấp
 */
const getLowStockInventoryLots = asyncHandler(async (req, res) => {
    const { threshold, limit, offset } = req.query;

    const stockThreshold = parseInt(threshold) || 10;
    const parsedLimit = parseInt(limit) || 50;
    const parsedOffset = parseInt(offset) || 0;

    // Validate threshold
    if (stockThreshold < 0) {
        return res.status(400).json({
            success: false,
            message: 'Ngưỡng số lượng thấp phải là số không âm',
        });
    }

    try {
        const lowStockLots = await InventoryLot.getLowStockLots(stockThreshold, {
            limit: parsedLimit,
            offset: parsedOffset,
        });

        res.status(200).json({
            success: true,
            data: lowStockLots,
            filter: {
                threshold: stockThreshold,
                description: `Số lượng tồn kho <= ${stockThreshold}`,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách inventory lots có số lượng thấp',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thống kê inventory theo product
 * @route   GET /api/inventory-lots/stats/by-product
 * @access  Private (admin, manager, accountant)
 * @return  {object} - productId, productName, totalLots (count lô hàng) , totalQtyOnHand, expiredQtyOnHand, expiringQtyOnHand
 */
const getInventoryStatsByProduct = asyncHandler(async (req, res) => {
    try {
        const stats = await InventoryLot.getInventoryStatsByProduct();
        res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê inventory theo product',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa nhiều inventory lots cùng lúc
 * @route   DELETE /api/inventory-lots/bulk
 * @access  Private (Admin only)
 * @body    {string[]} ids - Danh sách Inventory Lot IDs
 * @return  {object} - Trả về thông tin số lượng inventory lots đã xóa
 */
const deleteBulkInventoryLots = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Danh sách IDs không hợp lệ hoặc rỗng',
        });
    }

    // Validate UUID format cho từng ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = ids.filter((id) => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Một số ID không hợp lệ',
            invalidIds,
        });
    }

    try {
        const deletedCount = await InventoryLot.deleteMany(ids);
        res.status(200).json({
            success: true,
            message: `Đã xóa ${deletedCount} inventory lots`,
            deletedCount,
        });
    } catch (error) {
        // Lỗi constraint
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa một số inventory lots vì đang được sử dụng',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa inventory lots',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy danh sách các sản phẩm có tồn kho (>0) trong một phòng ban cụ thể.
 * @route   GET /api/inventory-lots/find-products-in-department/:departmentId
 * @access  Private
 * @param   {string} departmentId - ID của phòng ban (lấy từ URL param)
 * @query   {string} q - Từ khóa tìm kiếm (sku_code, product_name)
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 20, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object chứa danh sách sản phẩm và thông tin phân trang.
 */
const getProductsInDepartmentInventory = asyncHandler(async (req, res) => {
    const { departmentId } = req.params;
    const { q, limit, offset } = req.query;

    // Validate và parse các tham số phân trang
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const finalLimit = Math.min(parsedLimit, 100); // Giới hạn tối đa 100 item/trang

    if (finalLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Các tham số `limit` và `offset` phải là số không âm.',
        });
    }

    try {
        const result = await InventoryLot.getProductsInDepartmentInventory(departmentId, {
            q: q ? q.trim() : undefined,
            limit: finalLimit,
            offset: parsedOffset,
        });

        res.status(200).json({
            success: true,
            ...result, // result đã chứa { items, pagination }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách sản phẩm trong kho của phòng ban.',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy danh sách các lô tồn kho của một sản phẩm trong một phòng ban.
 * @route   GET /api/inventory-lots/find-with-department-product/:departmentId/:productId
 * @access  Private
 * @param   {string} departmentId - ID của phòng ban (lấy từ URL param)
 * @param   {string} productId - ID của sản phẩm (lấy từ URL param)
 * @query   {string} q - Từ khóa tìm kiếm (lot_no, sku_code, product_name)
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 10, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object chứa danh sách lô hàng và thông tin phân trang.
 */
const getInventoryLotsByProductInDepartment = asyncHandler(async (req, res) => {
    const { departmentId, productId } = req.params;
    const { q, limit, offset } = req.query;

    // Validate và parse các tham số phân trang
    const parsedLimit = parseInt(limit) || 10;
    const parsedOffset = parseInt(offset) || 0;
    const finalLimit = Math.min(parsedLimit, 100);

    if (finalLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Các tham số `limit` và `offset` phải là số không âm.',
        });
    }

    try {
        const result = await InventoryLot.getInventoryLotsByProductInDepartment(
            productId,
            departmentId,
            {
                q: q ? q.trim() : undefined,
                limit: finalLimit,
                offset: parsedOffset,
            }
        );

        res.status(200).json({
            success: true,
            ...result, // result đã chứa { items, pagination }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách lô tồn kho của sản phẩm trong phòng ban.',
            error: error.message,
        });
    }
});

// Export tất cả các controller functions
module.exports = {
    // Basic CRUD
    getInventoryLots,
    createInventoryLot,
    getInventoryLotById,
    updateInventoryLot,
    deleteInventoryLot,

    // Department-specific inventory
    getProductsInDepartmentInventory,
    getInventoryLotsByProductInDepartment,

    // Conversion support
    updateQuantityWithConversion,

    // Specialized queries
    getInventoryLotsByProduct,
    getInventoryLotsByDepartment,
    getInventoryLotByLotNo,

    // Quantity management
    updateInventoryLotQuantity,

    // Business logic endpoints
    getExpiringInventoryLots,
    getExpiredInventoryLots,
    getLowStockInventoryLots,

    // Analytics & Reports
    getInventoryStatsByProduct,

    // Bulk operations
    deleteBulkInventoryLots,
};
