const asyncHandler = require('express-async-handler');
const Product = require('@src/models/Products');
const ProductCategory = require('@src/models/ProductCategories');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function để parse date từ frontend (chuẩn bị cho tương lai)
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

// Helper function để validate category_id có tồn tại
const validateCategoryId = async (categoryId) => {
    if (categoryId) {
        const category = await ProductCategory.findById(categoryId);
        if (!category) {
            throw new Error('Category ID không tồn tại');
        }
    }
};

// Helper function để validate unique SKU code
const validateUniqueSkuCode = async (skuCode, excludeId = null) => {
    const exists = await Product.isSkuCodeExists(skuCode, excludeId);
    if (exists) {
        throw new Error(`SKU code '${skuCode}' đã tồn tại`);
    }
};

// Helper function để validate status
const validateStatus = (status) => {
    const validStatuses = ['active', 'warning', 'disable'];
    if (status && !validStatuses.includes(status)) {
        throw new Error(`Status phải là một trong: ${validStatuses.join(', ')}`);
    }
};

// Helper function để validate URL format
const validateUrlFormat = (url) => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// ✅ NEW: Helper function để validate đơn vị
const validateUnits = (packUnit, mainUnit) => {
    if (!packUnit || !packUnit.trim()) {
        throw new Error('Pack unit (đơn vị đóng gói) là bắt buộc');
    }
    if (!mainUnit || !mainUnit.trim()) {
        throw new Error('Main unit (đơn vị cơ bản) là bắt buộc');
    }

    // Biểu thức chính quy mới hỗ trợ Unicode (tiếng Việt có dấu)
    const unitPattern = /^[\p{L}0-9\s]+$/u;

    if (!unitPattern.test(packUnit.trim())) {
        throw new Error('Pack unit chỉ được chứa chữ cái, số và khoảng trắng');
    }
    if (!unitPattern.test(mainUnit.trim())) {
        throw new Error('Main unit chỉ được chứa chữ cái, số và khoảng trắng');
    }
};

const SKU_CODE_REGEX = /^[A-Z0-9][A-Z0-9._-]*$/i;

const normalizeSkuCode = (raw) => {
    if (raw === undefined || raw === null) return '';
    return raw.toString().trim().replace(/\s+/g, '').toUpperCase();
};

const normalizeText = (raw) => {
    if (raw === undefined || raw === null) return '';
    return raw.toString().trim();
};

const parseNonNegativeNumber = (raw, fieldLabel) => {
    if (raw === undefined || raw === null || raw === '') return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`${fieldLabel} phải là số không âm`);
    }
    return parsed;
};

const getDefaultProductFormUrl = () => {
    if (process.env.PRODUCT_FORM_URL && process.env.PRODUCT_FORM_URL.trim()) {
        return process.env.PRODUCT_FORM_URL.trim();
    }
    if (process.env.CLIENT_URL && process.env.CLIENT_URL.trim()) {
        return `${process.env.CLIENT_URL.replace(/\/$/, '')}/products`;
    }
    return 'http://localhost:5173/products';
};

const buildPrefillUrl = (baseUrl, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (typeof value === 'string' && !value.trim()) return;
        query.append(key, value);
    });

    if (!query.toString()) return baseUrl;
    const joinChar = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${joinChar}${query.toString()}`;
};

/**
 * @desc    Lấy danh sách products với phân trang và tìm kiếm
 * @route   GET /api/products
 * @access  Private
 * @query   {string} q - Từ khóa tìm kiếm (tìm trong sku_code, name, storage_rule, pack_unit, main_unit)
 * @query   {string} categoryId - Lọc theo danh mục sản phẩm
 * @query   {string} status - Lọc theo trạng thái (active, warning, disable)
 * @query   {boolean} adminLocked - Lọc theo trạng thái admin lock
 * @query   {string} packUnit - Lọc theo đơn vị đóng gói
 * @query   {string} mainUnit - Lọc theo đơn vị cơ bản
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 20, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách products (có kèm categoryName, packUnit, mainUnit) và thông tin phân trang
 */
const getProducts = asyncHandler(async (req, res) => {
    const { q, categoryId, status, adminLocked, packUnit, mainUnit, limit, offset } = req.query;

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

    // Parse adminLocked từ string sang boolean nếu có
    let parsedAdminLocked;
    if (adminLocked !== undefined) {
        parsedAdminLocked = adminLocked === 'true' || adminLocked === true;
    }

    // Validate status nếu có
    if (status) {
        try {
            validateStatus(status);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    const finalLimit = Math.min(parsedLimit, maxLimit);

    try {
        // Gọi song song để tối ưu hiệu suất
        const [products, total] = await Promise.all([
            Product.listProducts({
                q: q ? q.trim() : undefined,
                categoryId,
                status,
                adminLocked: parsedAdminLocked,
                packUnit: packUnit ? packUnit.trim() : undefined,
                mainUnit: mainUnit ? mainUnit.trim() : undefined,
                limit: finalLimit,
                offset: parsedOffset,
            }),
            Product.countProducts({
                q: q ? q.trim() : undefined,
                categoryId,
                status,
                adminLocked: parsedAdminLocked,
                packUnit: packUnit ? packUnit.trim() : undefined,
                mainUnit: mainUnit ? mainUnit.trim() : undefined,
            }),
        ]);

        res.status(200).json({
            success: true,
            data: products,
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
            message: 'Lỗi khi lấy danh sách sản phẩm',
            error: error.message,
        });
    }
});

/**
 * @desc    Tạo product mới
 * @route   POST /api/products
 * @access  Private
 * @body    {string} skuCode - Mã SKU sản phẩm (bắt buộc, unique)
 * @body    {string} name - Tên sản phẩm (bắt buộc)
 * @body    {string} categoryId - ID danh mục sản phẩm (bắt buộc)
 * @body    {string} packUnit - Đơn vị đóng gói (bắt buộc)
 * @body    {string} mainUnit - Đơn vị cơ bản (bắt buộc)
 * @body    {string} storageRule - Quy tắc lưu trữ (tùy chọn)
 * @body    {string} status - Trạng thái (active/warning/disable, default: active)
 * @body    {boolean} adminLocked - Khóa bởi admin (default: false)
 * @body    {number} lowStockThreshold - Ngưỡng cảnh báo hết hàng (default: 0)
 * @body    {number} nearExpiryDays - Số ngày cảnh báo gần hết hạn (default: 7)
 * @body    {string} imgUrl - URL hình ảnh sản phẩm (tùy chọn)
 * @return  {object} - Trả về object product vừa tạo
 */
const createProduct = asyncHandler(async (req, res) => {
    const {
        skuCode,
        name,
        categoryId,
        packUnit, // ✅ NEW: Bắt buộc
        mainUnit, // ✅ NEW: Bắt buộc
        storageRule,
        status,
        adminLocked,
        lowStockThreshold,
        nearExpiryDays,
        imgUrl,
    } = req.body;

    // Validate các trường bắt buộc
    if (!skuCode || !skuCode.trim()) {
        return res.status(400).json({
            success: false,
            message: 'SKU code là bắt buộc',
        });
    }

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Tên sản phẩm là bắt buộc',
        });
    }

    if (!categoryId) {
        return res.status(400).json({
            success: false,
            message: 'Category ID là bắt buộc',
        });
    }

    // ✅ NEW: Validate đơn vị bắt buộc
    try {
        validateUnits(packUnit, mainUnit);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }

    // Validate status
    if (status) {
        try {
            validateStatus(status);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Validate numeric fields
    if (lowStockThreshold !== undefined && (isNaN(lowStockThreshold) || lowStockThreshold < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Ngưỡng cảnh báo hết hàng phải là số không âm',
        });
    }

    if (nearExpiryDays !== undefined && (isNaN(nearExpiryDays) || nearExpiryDays < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Số ngày cảnh báo gần hết hạn phải là số không âm',
        });
    }

    // Validate imgUrl nếu có
    if (imgUrl && !validateUrlFormat(imgUrl.trim())) {
        return res.status(400).json({
            success: false,
            message: 'URL hình ảnh không hợp lệ',
        });
    }

    try {
        // Validate category tồn tại
        await validateCategoryId(categoryId);

        // Validate SKU code unique
        await validateUniqueSkuCode(skuCode.trim());

        // Tạo product mới
        const newProduct = await Product.createProduct({
            skuCode: skuCode.trim().toUpperCase(),
            name: name.trim(),
            categoryId,
            packUnit: packUnit.trim(), // ✅ NEW
            mainUnit: mainUnit.trim(), // ✅ NEW
            storageRule: storageRule ? storageRule.trim() : null,
            status: status || 'active',
            adminLocked: adminLocked !== undefined ? parseBooleanValue(adminLocked) : false,
            lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 0,
            nearExpiryDays: nearExpiryDays !== undefined ? Number(nearExpiryDays) : 7,
            imgUrl: imgUrl ? imgUrl.trim() : null,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo sản phẩm thành công',
            data: newProduct,
        });
    } catch (error) {
        // Xử lý các lỗi cụ thể
        if (error.message.includes('Category ID không tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.message.includes('đã tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        // Lỗi database constraint
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'SKU code đã tồn tại',
            });
        }
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Category ID không hợp lệ',
            });
        }
        if (error.code === '23514') {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ (kiểm tra status, số âm, v.v.)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo sản phẩm',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thông tin product theo ID
 * @route   GET /api/products/:id
 * @access  Private
 * @param   {string} id - Product ID
 * @return  {object} - Trả về object product (có kèm categoryName, packUnit, mainUnit) nếu tìm thấy
 */
const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID sản phẩm không hợp lệ',
        });
    }

    const product = await Product.findById(id);
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm',
        });
    }

    res.status(200).json({
        success: true,
        data: product,
    });
});

/**
 * @desc    Cập nhật thông tin product
 * @route   PUT /api/products/:id
 * @access  Private
 * @param   {string} id - Product ID
 * @body    {string} skuCode - Mã SKU sản phẩm
 * @body    {string} name - Tên sản phẩm
 * @body    {string} categoryId - ID danh mục sản phẩm
 * @body    {string} packUnit - Đơn vị đóng gói
 * @body    {string} mainUnit - Đơn vị cơ bản
 * @body    {string} storageRule - Quy tắc lưu trữ
 * @body    {string} status - Trạng thái (active/warning/disable)
 * @body    {boolean} adminLocked - Khóa bởi admin
 * @body    {number} lowStockThreshold - Ngưỡng cảnh báo hết hàng
 * @body    {number} nearExpiryDays - Số ngày cảnh báo gần hết hạn
 * @body    {string} imgUrl - URL hình ảnh sản phẩm
 * @return  {object} - Trả về object product đã cập nhật
 */
const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        skuCode,
        name,
        categoryId,
        packUnit, // ✅ NEW
        mainUnit, // ✅ NEW
        storageRule,
        status,
        adminLocked,
        lowStockThreshold,
        nearExpiryDays,
        imgUrl,
    } = req.body;

    // Kiểm tra product tồn tại
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm',
        });
    }

    // Validate dữ liệu đầu vào
    if (name !== undefined && (!name || !name.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Tên sản phẩm không được để trống',
        });
    }

    if (skuCode !== undefined && (!skuCode || !skuCode.trim())) {
        return res.status(400).json({
            success: false,
            message: 'SKU code không được để trống',
        });
    }

    // ✅ NEW: Validate đơn vị nếu có cập nhật
    if (packUnit !== undefined || mainUnit !== undefined) {
        try {
            const finalPackUnit = packUnit !== undefined ? packUnit : existingProduct.packUnit;
            const finalMainUnit = mainUnit !== undefined ? mainUnit : existingProduct.mainUnit;
            validateUnits(finalPackUnit, finalMainUnit);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Validate status
    if (status) {
        try {
            validateStatus(status);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Validate numeric fields
    if (lowStockThreshold !== undefined && (isNaN(lowStockThreshold) || lowStockThreshold < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Ngưỡng cảnh báo hết hàng phải là số không âm',
        });
    }

    if (nearExpiryDays !== undefined && (isNaN(nearExpiryDays) || nearExpiryDays < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Số ngày cảnh báo gần hết hạn phải là số không âm',
        });
    }

    // Validate imgUrl nếu có
    if (imgUrl && !validateUrlFormat(imgUrl.trim())) {
        return res.status(400).json({
            success: false,
            message: 'URL hình ảnh không hợp lệ',
        });
    }

    try {
        // Validate category nếu có thay đổi
        if (categoryId && categoryId !== existingProduct.categoryId) {
            await validateCategoryId(categoryId);
        }

        // Validate SKU code unique nếu có thay đổi
        if (skuCode && skuCode.trim().toUpperCase() !== existingProduct.skuCode) {
            await validateUniqueSkuCode(skuCode.trim(), id);
        }

        // Chuẩn bị payload cho update
        const updatePayload = {};
        if (skuCode !== undefined) updatePayload.skuCode = skuCode.trim().toUpperCase();
        if (name !== undefined) updatePayload.name = name.trim();
        if (categoryId !== undefined) updatePayload.categoryId = categoryId;
        if (packUnit !== undefined) updatePayload.packUnit = packUnit.trim(); // ✅ NEW
        if (mainUnit !== undefined) updatePayload.mainUnit = mainUnit.trim(); // ✅ NEW
        if (storageRule !== undefined)
            updatePayload.storageRule = storageRule ? storageRule.trim() : null;
        if (status !== undefined) updatePayload.status = status;
        if (adminLocked !== undefined) updatePayload.adminLocked = parseBooleanValue(adminLocked);
        if (lowStockThreshold !== undefined)
            updatePayload.lowStockThreshold = Number(lowStockThreshold);
        if (nearExpiryDays !== undefined) updatePayload.nearExpiryDays = Number(nearExpiryDays);
        if (imgUrl !== undefined) updatePayload.imgUrl = imgUrl ? imgUrl.trim() : null;

        // Kiểm tra có dữ liệu để update không
        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu để cập nhật',
            });
        }

        const updatedProduct = await Product.updateProduct(id, updatePayload);
        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm để cập nhật',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật sản phẩm thành công',
            data: updatedProduct,
        });
    } catch (error) {
        // Xử lý các lỗi cụ thể
        if (error.message.includes('Category ID không tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.message.includes('đã tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        // Lỗi database constraint
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'SKU code đã tồn tại',
            });
        }
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Category ID không hợp lệ',
            });
        }
        if (error.code === '23514') {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ (kiểm tra status, số âm, v.v.)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật sản phẩm',
            error: error.message,
        });
    }
});

// ✅ NEW: Lấy danh sách products theo đơn vị
/**
 * @desc    Lấy products theo pack_unit hoặc main_unit
 * @route   GET /api/products/units
 * @access  Private
 * @query   {string} packUnit - Lọc theo đơn vị đóng gói
 * @query   {string} mainUnit - Lọc theo đơn vị cơ bản
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách products và filter units
 */
const getProductsByUnits = asyncHandler(async (req, res) => {
    const { packUnit, mainUnit, limit, offset } = req.query;

    if (!packUnit && !mainUnit) {
        return res.status(400).json({
            success: false,
            message: 'Cần ít nhất một trong packUnit hoặc mainUnit',
        });
    }

    try {
        const products = await Product.getProductsByUnits({
            packUnit: packUnit ? packUnit.trim() : undefined,
            mainUnit: mainUnit ? mainUnit.trim() : undefined,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
        });

        res.status(200).json({
            success: true,
            data: products,
            filter: {
                packUnit: packUnit || null,
                mainUnit: mainUnit || null,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy sản phẩm theo đơn vị',
            error: error.message,
        });
    }
});

// ✅ NEW: Lấy danh sách các đơn vị được sử dụng
/**
 * @desc    Lấy danh sách các đơn vị được sử dụng trong hệ thống
 * @route   GET /api/products/units/list
 * @access  Private
 * @return  {object} - Trả về object với danh sách packUnits, mainUnits và combinations
 */
const getUsedUnits = asyncHandler(async (req, res) => {
    try {
        const units = await Product.getUsedUnits();

        res.status(200).json({
            success: true,
            data: units,
            message: 'Danh sách đơn vị được sử dụng',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách đơn vị',
            error: error.message,
        });
    }
});

// ✅ NEW: Thống kê sản phẩm theo đơn vị
/**
 * @desc    Lấy thống kê sản phẩm theo đơn vị
 * @route   GET /api/products/stats/units
 * @access  Private
 * @return  {object} - Trả về object với thống kê số lượng sản phẩm theo từng combination đơn vị
 */
const getProductUnitStats = asyncHandler(async (req, res) => {
    try {
        const stats = await Product.getProductUnitStats();

        res.status(200).json({
            success: true,
            data: stats,
            message: 'Thống kê sản phẩm theo đơn vị',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê sản phẩm theo đơn vị',
            error: error.message,
        });
    }
});

// ... Giữ nguyên các functions khác từ code cũ ...
const listProducts = asyncHandler(async (req, res) => {
    const { q, categoryId } = req.query;

    const products = await Product.getAllProduct({
        q: q ? q.trim() : undefined,
        categoryId,
    });

    res.status(200).json({
        success: true,
        total: products.length,
        data: products,
    });
});

const getProductsByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { limit, offset } = req.query;

    const category = await ProductCategory.findById(categoryId);
    if (!category) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy danh mục sản phẩm',
        });
    }

    const products = await Product.getProductsByCategory(categoryId, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
    });

    res.status(200).json({
        success: true,
        data: products,
        category: category,
    });
});

const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Kiểm tra product tồn tại
    const product = await Product.findById(id);
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm để xóa',
        });
    }

    try {
        await Product.deleteProduct(id);
        res.status(200).json({
            success: true,
            message: 'Xóa sản phẩm thành công',
        });
    } catch (error) {
        // Xử lý lỗi foreign key constraint
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message:
                    'Không thể xóa sản phẩm vì còn dữ liệu liên quan (inventory, đơn hàng, v.v.)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa sản phẩm',
            error: error.message,
        });
    }
});

/**
 * @desc    Cập nhật trạng thái admin lock hàng loạt
 * @route   PUT /api/products/bulk-admin-lock
 * @access  Private (Admin only)
 * @body    {string[]} ids - Danh sách Product IDs
 * @body    {boolean} adminLocked - Trạng thái lock mới
 * @return  {object} - Trả về thông tin số lượng sản phẩm đã cập nhật
 */
const updateBulkAdminLock = asyncHandler(async (req, res) => {
    const { ids, adminLocked } = req.body;

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Danh sách ID sản phẩm không hợp lệ',
        });
    }

    if (adminLocked === undefined || typeof adminLocked !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: 'Trạng thái adminLocked phải là true hoặc false',
        });
    }

    try {
        const updatedCount = await Product.updateAdminLocked(ids, adminLocked);

        res.status(200).json({
            success: true,
            message: `Đã cập nhật trạng thái admin lock cho ${updatedCount} sản phẩm`,
            data: {
                updatedCount,
                totalRequested: ids.length,
                adminLocked,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái admin lock',
            error: error.message,
        });
    }
});

/**
 * @desc    Tìm kiếm product theo SKU code
 * @route   GET /api/products/sku/:skuCode
 * @access  Private
 * @param   {string} skuCode - SKU code của sản phẩm
 * @return  {object} - Trả về object product nếu tìm thấy (có kèm categoryName)
 */
const getProductBySkuCode = asyncHandler(async (req, res) => {
    const { skuCode } = req.params;

    if (!skuCode || !skuCode.trim()) {
        return res.status(400).json({
            success: false,
            message: 'SKU code không được để trống',
        });
    }

    const product = await Product.findBySkuCode(skuCode.trim().toUpperCase());
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm với SKU code này',
        });
    }

    res.status(200).json({
        success: true,
        data: product,
    });
});

/**
 * @desc    Lấy products theo status
 * @route   GET /api/products/status/:status
 * @access  Private
 * @param   {string} status - Status (active/warning/disable)
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách products và filter status (có kèm categoryName)
 */
const getProductsByStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;
    const { limit, offset } = req.query;

    // Validate status
    try {
        validateStatus(status);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }

    try {
        const products = await Product.getProductsByStatus(status, {
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
        });

        res.status(200).json({
            success: true,
            data: products,
            filter: { status },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy sản phẩm theo status',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy products có cảnh báo (warning/disable)
 * @route   GET /api/products/warnings
 * @access  Private
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Trả về object với danh sách products có cảnh báo (có kèm categoryName)
 */
const getWarningProducts = asyncHandler(async (req, res) => {
    const { limit, offset } = req.query;

    try {
        const products = await Product.getWarningProducts({
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
        });

        res.status(200).json({
            success: true,
            data: products,
            message: 'Danh sách sản phẩm có cảnh báo',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy sản phẩm có cảnh báo',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thống kê sản phẩm theo status
 * @route   GET /api/products/stats/status
 * @access  Private
 * @return  {object} - Trả về object với số lượng sản phẩm theo từng status
 */
const getProductStatusStats = asyncHandler(async (req, res) => {
    try {
        const stats = await Product.getProductStatusStats();

        res.status(200).json({
            success: true,
            data: stats,
            message: 'Thống kê sản phẩm theo trạng thái',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê sản phẩm',
            error: error.message,
        });
    }
});

/**
 * @desc    Refresh status của một product
 * @route   POST /api/products/:id/refresh-status
 * @access  Private (Admin only)
 * @param   {string} id - Product ID
 * @return  {object} - Trả về object product đã cập nhật
 */
const refreshProductStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Kiểm tra product tồn tại
    const product = await Product.findById(id);
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm',
        });
    }

    try {
        await Product.refreshProductStatus(id);

        // Lấy lại thông tin product sau khi refresh
        const refreshedProduct = await Product.findById(id);

        res.status(200).json({
            success: true,
            message: 'Refresh status sản phẩm thành công',
            data: refreshedProduct,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi refresh status sản phẩm',
            error: error.message,
        });
    }
});

/**
 * @desc    Refresh status của tất cả products
 * @route   POST /api/products/refresh-all-status
 * @access  Private (Admin only)
 * @return  {object} - Trả về message thành công hoặc lỗi
 */
const refreshAllProductsStatus = asyncHandler(async (req, res) => {
    try {
        await Product.refreshAllProductsStatus();

        res.status(200).json({
            success: true,
            message: 'Refresh status tất cả sản phẩm thành công',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi refresh status tất cả sản phẩm',
            error: error.message,
        });
    }
});

/**
 * @desc    Generate auto-fill product form link for chatbot/n8n flows
 * @route   POST /api/products/prefill-link
 * @access  Private (requires JWT)
 */
const generateProductPrefillLink = asyncHandler(async (req, res) => {
    const {
        skuCode,
        name,
        categoryId,
        categoryName,
        packUnit,
        mainUnit,
        lowStockThreshold,
        nearExpiryDays,
        storageRule,
        imgUrl,
        add,
        baseFormUrl,
    } = req.body || {};

    const errors = [];
    const sanitized = {};

    const normalizedSku = normalizeSkuCode(skuCode);
    if (!normalizedSku) {
        errors.push('SKU code la bat buoc');
    } else if (!SKU_CODE_REGEX.test(normalizedSku)) {
        errors.push('SKU code chi cho phep ky tu chu, so, dau ._- va khong co khoang trang');
    } else {
        const skuExists = await Product.isSkuCodeExists(normalizedSku);
        if (skuExists) {
            errors.push(`SKU code '${normalizedSku}' da ton tai`);
        } else {
            sanitized.skuCode = normalizedSku;
        }
    }

    const normalizedName = normalizeText(name);
    if (!normalizedName) {
        errors.push('Ten san pham la bat buoc');
    } else {
        sanitized.name = normalizedName;
    }

    const normalizedCategoryId = normalizeText(categoryId);
    const normalizedCategoryName = normalizeText(categoryName);
    let resolvedCategory = null;
    if (normalizedCategoryId) {
        resolvedCategory = await ProductCategory.findById(normalizedCategoryId);
        if (!resolvedCategory) {
            errors.push(`Category ID '${normalizedCategoryId}' khong ton tai`);
        }
    } else if (normalizedCategoryName) {
        resolvedCategory = await ProductCategory.findByNameInsensitive(normalizedCategoryName);
        if (!resolvedCategory) {
            errors.push(`Khong tim thay danh muc '${normalizedCategoryName}'`);
        }
    } else {
        errors.push('Can truyen categoryId hoac categoryName');
    }

    if (resolvedCategory) {
        sanitized.categoryName = resolvedCategory.name;
    }

    try {
        validateUnits(packUnit, mainUnit);
        sanitized.packUnit = packUnit.toString().trim();
        sanitized.mainUnit = mainUnit.toString().trim();
    } catch (error) {
        errors.push(error.message);
    }

    try {
        const parsedThreshold = parseNonNegativeNumber(
            lowStockThreshold,
            'Nguong canh bao het hang'
        );
        if (parsedThreshold !== null) {
            sanitized.lowStockThreshold = parsedThreshold;
        }
    } catch (error) {
        errors.push(error.message);
    }

    try {
        const parsedNearExpiry = parseNonNegativeNumber(
            nearExpiryDays,
            'So ngay canh bao gan het han'
        );
        if (parsedNearExpiry !== null) {
            sanitized.nearExpiryDays = parsedNearExpiry;
        }
    } catch (error) {
        errors.push(error.message);
    }

    const normalizedStorageRule = normalizeText(storageRule);
    if (normalizedStorageRule) {
        sanitized.storageRule = normalizedStorageRule;
    }

    if (imgUrl && imgUrl.trim()) {
        if (!validateUrlFormat(imgUrl.trim())) {
            errors.push('URL hinh anh khong hop le');
        } else {
            sanitized.imgUrl = imgUrl.trim();
        }
    }

    const shouldAddFlag = add !== undefined ? parseBooleanValue(add) : true;
    const normalizedBaseUrl = normalizeText(baseFormUrl) || getDefaultProductFormUrl();
    if (!validateUrlFormat(normalizedBaseUrl)) {
        errors.push('Base form URL khong hop le. Dat baseFormUrl hoac bien PRODUCT_FORM_URL.');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Du lieu chua hop le',
            errors,
        });
    }

    const queryParams = {
        add: shouldAddFlag,
        skuCode: sanitized.skuCode,
        name: sanitized.name,
        categoryName: sanitized.categoryName,
        lowStockThreshold: sanitized.lowStockThreshold,
        nearExpiryDays: sanitized.nearExpiryDays,
        packUnit: sanitized.packUnit,
        mainUnit: sanitized.mainUnit,
        storageRule: sanitized.storageRule,
        imgUrl: sanitized.imgUrl,
    };

    const filteredQuery = Object.fromEntries(
        Object.entries(queryParams).filter(
            ([, value]) => value !== undefined && value !== null && `${value}`.trim() !== ''
        )
    );

    const formUrl = buildPrefillUrl(normalizedBaseUrl, filteredQuery);

    // bản đầy đủ thông tin để test postman hoặc công cụ khác
    // return res.status(200).json({
    //     success: true,
    //     message: 'Tao link auto fill thanh cong',
    //     data: {
    //         formUrl,
    //         query: filteredQuery,
    //         category: resolvedCategory
    //             ? {
    //                   id: resolvedCategory.id,
    //                   name: resolvedCategory.name,
    //               }
    //             : null,
    //     },
    //     meta: {
    //         baseFormUrl: normalizedBaseUrl,
    //     },
    // });

    // bản rút gọn chỉ trả về link cho n8n/chatbot (tiết kiệm token và băng thông)
    return res.status(200).json({
        success: true,
        data: {
            formUrl,
        },
    });
});

// Export tất cả các controller functions
module.exports = {
    // Basic CRUD
    getProducts,
    createProduct,
    getProductById,
    listProducts,
    getProductsByCategory,
    updateProduct,
    deleteProduct,

    // Bulk operations
    updateBulkAdminLock,

    // Search & Filter
    getProductBySkuCode,
    getProductsByStatus,
    getWarningProducts,

    // ✅ NEW: Unit-related endpoints
    getProductsByUnits,
    getUsedUnits,
    getProductUnitStats,

    // Stats & Analytics
    getProductStatusStats,

    // Status management
    refreshProductStatus,
    refreshAllProductsStatus,

    // Automation
    generateProductPrefillLink,
};
