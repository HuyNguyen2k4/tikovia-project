const asyncHandler = require('express-async-handler');
const Supplier = require('@src/models/Suppliers');
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

// Helper function để validate email format
const validateEmailFormat = (email) => {
    if (!email) return true; // Email không bắt buộc
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Helper function để validate phone format (chỉ số và dấu +, -, space, ())
const validatePhoneFormat = (phone) => {
    if (!phone) return false;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.trim().length >= 8;
};

// Helper function để validate unique code
const validateUniqueCode = async (code, excludeId = null) => {
    const exists = await Supplier.isCodeExists(code, excludeId);
    if (exists) {
        throw new Error(`Mã nhà cung cấp '${code}' đã tồn tại`);
    }
};

// Helper function để validate unique email
const validateUniqueEmail = async (email, excludeId = null) => {
    if (!email) return; // Email không bắt buộc
    const exists = await Supplier.isEmailExists(email, excludeId);
    if (exists) {
        throw new Error(`Email '${email}' đã được sử dụng`);
    }
};

// Helper function để validate unique tax code
const validateUniqueTaxCode = async (taxCode, excludeId = null) => {
    if (!taxCode) return; // Tax code không bắt buộc
    const exists = await Supplier.isTaxCodeExists(taxCode, excludeId);
    if (exists) {
        throw new Error(`Mã số thuế '${taxCode}' đã được sử dụng`);
    }
};

/**
 * @desc    Lấy danh sách suppliers với phân trang và tìm kiếm
 * @route   GET /api/suppliers
 * @access  Private
 * @query   {string} q - Từ khóa tìm kiếm (tìm trong code, name, phone, email, address, tax_code)
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 20, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Danh sách suppliers kèm thông tin phân trang
 */
const getSuppliers = asyncHandler(async (req, res) => {
    const { q, limit, offset } = req.query;

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

    const finalLimit = Math.min(parsedLimit, maxLimit);

    try {
        // Gọi song song để tối ưu hiệu suất
        const [suppliers, total] = await Promise.all([
            Supplier.listSuppliers({
                q: q ? q.trim() : undefined,
                limit: finalLimit,
                offset: parsedOffset,
            }),
            Supplier.countSuppliers({
                q: q ? q.trim() : undefined,
            }),
        ]);

        res.status(200).json({
            success: true,
            data: suppliers,
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
            message: 'Lỗi khi lấy danh sách nhà cung cấp',
            error: error.message,
        });
    }
});

/**
 * @desc    Tạo supplier mới
 * @route   POST /api/suppliers
 * @access  Private (Admin, Manager)
 * @body    {string} code - Mã nhà cung cấp (bắt buộc, unique)
 * @body    {string} name - Tên nhà cung cấp (bắt buộc)
 * @body    {string} phone - Số điện thoại (bắt buộc)
 * @body    {string} email - Email (tùy chọn, unique nếu có)
 * @body    {string} address - Địa chỉ (tùy chọn)
 * @body    {string} taxCode - Mã số thuế (tùy chọn, unique nếu có)
 * @body    {string} note - Ghi chú (tùy chọn)
 * @return  {object} - Supplier mới tạo
 */
const createSupplier = asyncHandler(async (req, res) => {
    const { code, name, phone, email, address, taxCode, note } = req.body;

    // Validate các trường bắt buộc
    if (!code || !code.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Mã nhà cung cấp là bắt buộc',
        });
    }

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Tên nhà cung cấp là bắt buộc',
        });
    }

    if (!phone || !phone.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Số điện thoại là bắt buộc',
        });
    }

    // Validate format
    if (!validatePhoneFormat(phone)) {
        return res.status(400).json({
            success: false,
            message:
                'Số điện thoại không hợp lệ (tối thiểu 8 ký tự, chỉ chứa số và ký tự đặc biệt)',
        });
    }

    if (email && !validateEmailFormat(email)) {
        return res.status(400).json({
            success: false,
            message: 'Email không hợp lệ',
        });
    }

    try {
        // Validate unique constraints
        await validateUniqueCode(code.trim());
        await validateUniqueEmail(email ? email.trim() : null);
        await validateUniqueTaxCode(taxCode ? taxCode.trim() : null);

        // Tạo supplier mới
        const newSupplier = await Supplier.createSupplier({
            code: code.trim().toUpperCase(),
            name: name.trim(),
            phone: phone.trim(),
            email: email ? email.trim().toLowerCase() : null,
            address: address ? address.trim() : null,
            taxCode: taxCode ? taxCode.trim() : null,
            note: note ? note.trim() : null,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo nhà cung cấp thành công',
            data: newSupplier,
        });
    } catch (error) {
        // Xử lý các lỗi cụ thể
        if (error.message.includes('đã tồn tại') || error.message.includes('đã được sử dụng')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        // Lỗi database constraint
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu đã tồn tại (mã nhà cung cấp, email hoặc mã số thuế)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo nhà cung cấp',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thông tin supplier theo ID
 * @route   GET /api/suppliers/:id
 * @access  Private
 * @param   {string} id - Supplier ID
 * @return  {object} - Supplier object
 */
const getSupplierById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID nhà cung cấp không hợp lệ',
        });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy nhà cung cấp',
        });
    }

    res.status(200).json({
        success: true,
        data: supplier,
    });
});

/**
 * @desc    Lấy supplier theo code
 * @route   GET /api/suppliers/code/:code
 * @access  Private
 * @param   {string} code - Supplier code
 * @return  {object} - Supplier object
 */
const getSupplierByCode = asyncHandler(async (req, res) => {
    const { code } = req.params;

    if (!code || !code.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Mã nhà cung cấp không được để trống',
        });
    }

    const supplier = await Supplier.findByCode(code.trim().toUpperCase());
    if (!supplier) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy nhà cung cấp với mã này',
        });
    }

    res.status(200).json({
        success: true,
        data: supplier,
    });
});

/**
 * @desc    Cập nhật thông tin supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private (Admin, Manager)
 * @param   {string} id - Supplier ID
 * @body    {string} code - Mã nhà cung cấp
 * @body    {string} name - Tên nhà cung cấp
 * @body    {string} phone - Số điện thoại
 * @body    {string} email - Email
 * @body    {string} address - Địa chỉ
 * @body    {string} taxCode - Mã số thuế
 * @body    {string} note - Ghi chú
 * @return  {object} - Supplier đã được cập nhật
 */
const updateSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, name, phone, email, address, taxCode, note } = req.body;

    // Kiểm tra supplier tồn tại
    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy nhà cung cấp',
        });
    }

    // Validate dữ liệu đầu vào
    if (name !== undefined && (!name || !name.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Tên nhà cung cấp không được để trống',
        });
    }

    if (code !== undefined && (!code || !code.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Mã nhà cung cấp không được để trống',
        });
    }

    if (phone !== undefined && (!phone || !phone.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Số điện thoại không được để trống',
        });
    }

    // Validate format
    if (phone !== undefined && !validatePhoneFormat(phone)) {
        return res.status(400).json({
            success: false,
            message: 'Số điện thoại không hợp lệ',
        });
    }

    if (email !== undefined && email && !validateEmailFormat(email)) {
        return res.status(400).json({
            success: false,
            message: 'Email không hợp lệ',
        });
    }

    try {
        // Validate unique constraints nếu có thay đổi
        if (code && code.trim().toUpperCase() !== existingSupplier.code) {
            await validateUniqueCode(code.trim(), id);
        }

        if (email !== undefined) {
            const emailToCheck = email ? email.trim().toLowerCase() : null;
            if (emailToCheck !== existingSupplier.email) {
                await validateUniqueEmail(emailToCheck, id);
            }
        }

        if (taxCode !== undefined) {
            const taxCodeToCheck = taxCode ? taxCode.trim() : null;
            if (taxCodeToCheck !== existingSupplier.taxCode) {
                await validateUniqueTaxCode(taxCodeToCheck, id);
            }
        }

        // Chuẩn bị payload cho update
        const updatePayload = {};
        if (code !== undefined) updatePayload.code = code.trim().toUpperCase();
        if (name !== undefined) updatePayload.name = name.trim();
        if (phone !== undefined) updatePayload.phone = phone.trim();
        if (email !== undefined) updatePayload.email = email ? email.trim().toLowerCase() : null;
        if (address !== undefined) updatePayload.address = address ? address.trim() : null;
        if (taxCode !== undefined) updatePayload.taxCode = taxCode ? taxCode.trim() : null;
        if (note !== undefined) updatePayload.note = note ? note.trim() : null;

        // Kiểm tra có dữ liệu để update không
        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu để cập nhật',
            });
        }

        const updatedSupplier = await Supplier.updateSupplier(id, updatePayload);
        if (!updatedSupplier) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhà cung cấp để cập nhật',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật nhà cung cấp thành công',
            data: updatedSupplier,
        });
    } catch (error) {
        // Xử lý các lỗi cụ thể
        if (error.message.includes('đã tồn tại') || error.message.includes('đã được sử dụng')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        // Lỗi database constraint
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu đã tồn tại (mã nhà cung cấp, email hoặc mã số thuế)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật nhà cung cấp',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private (Admin only)
 * @param   {string} id - Supplier ID
 */
const deleteSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Kiểm tra supplier tồn tại
    const supplier = await Supplier.findById(id);
    if (!supplier) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy nhà cung cấp để xóa',
        });
    }

    try {
        await Supplier.deleteSupplier(id);
        res.status(200).json({
            success: true,
            message: 'Xóa nhà cung cấp thành công',
        });
    } catch (error) {
        // Xử lý lỗi foreign key constraint
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message:
                    'Không thể xóa nhà cung cấp vì còn dữ liệu liên quan (đơn hàng, sản phẩm, v.v.)',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa nhà cung cấp',
            error: error.message,
        });
    }
});

/**
 * @desc    Tìm kiếm nâng cao suppliers
 * @route   GET /api/suppliers/search
 * @access  Private
 * @query   {string} code - Tìm theo mã
 * @query   {string} name - Tìm theo tên
 * @query   {string} phone - Tìm theo số điện thoại
 * @query   {string} email - Tìm theo email
 * @query   {string} address - Tìm theo địa chỉ
 * @query   {string} taxCode - Tìm theo mã số thuế
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 */
const searchSuppliers = asyncHandler(async (req, res) => {
    const { code, name, phone, email, address, taxCode, limit, offset } = req.query;

    try {
        const suppliers = await Supplier.searchSuppliers({
            code: code ? code.trim() : undefined,
            name: name ? name.trim() : undefined,
            phone: phone ? phone.trim() : undefined,
            email: email ? email.trim() : undefined,
            address: address ? address.trim() : undefined,
            taxCode: taxCode ? taxCode.trim() : undefined,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
        });

        res.status(200).json({
            success: true,
            data: suppliers,
            message: 'Tìm kiếm nhà cung cấp thành công',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tìm kiếm nhà cung cấp',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy suppliers được tạo gần đây
 * @route   GET /api/suppliers/recent
 * @access  Private (Admin, Manager)
 * @query   {number} limit - Số lượng item (default: 10)
 */
const getRecentSuppliers = asyncHandler(async (req, res) => {
    const { limit } = req.query;

    try {
        const suppliers = await Supplier.getRecentSuppliers(parseInt(limit) || 10);

        res.status(200).json({
            success: true,
            data: suppliers,
            message: 'Danh sách nhà cung cấp mới nhất',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy nhà cung cấp gần đây',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thống kê suppliers theo tháng tạo
 * @route   GET /api/suppliers/stats/creation
 * @access  Private (Admin, Manager)
 */
const getSupplierCreationStats = asyncHandler(async (req, res) => {
    try {
        const stats = await Supplier.getSupplierCreationStats();

        res.status(200).json({
            success: true,
            data: stats,
            message: 'Thống kê nhà cung cấp theo tháng tạo',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê nhà cung cấp',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa nhiều suppliers cùng lúc
 * @route   DELETE /api/suppliers/bulk
 * @access  Private (Admin only)
 * @body    {string[]} ids - Danh sách Supplier IDs
 */
const deleteBulkSuppliers = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Danh sách ID nhà cung cấp không hợp lệ',
        });
    }

    try {
        const deletedCount = await Supplier.deleteMany(ids);

        res.status(200).json({
            success: true,
            message: `Đã xóa ${deletedCount} nhà cung cấp`,
            data: {
                deletedCount,
                totalRequested: ids.length,
            },
        });
    } catch (error) {
        // Xử lý lỗi foreign key constraint
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa một số nhà cung cấp vì còn dữ liệu liên quan',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa hàng loạt nhà cung cấp',
            error: error.message,
        });
    }
});

// Thêm vào cuối file, trước module.exports
/**
 * @desc    Test timezone conversion cho suppliers
 * @route   GET /api/suppliers/test-timezone
 * @access  Private
 * @return  {object} - Thông tin thời gian với timezone
 * Note:    Endpoint này chỉ để test, có thể xóa sau khi xác nhận hoạt động đúng
 */
const getTimezoneTest = asyncHandler(async (req, res) => {
    const now = new Date();

    res.status(200).json({
        success: true,
        data: {
            server_utc: now.toISOString(),
            server_vietnam: dayjs.utc(now).tz('Asia/Ho_Chi_Minh').format(),
            dayjs_vietnam: dayjs().tz('Asia/Ho_Chi_Minh').format(),
            timezone_info: {
                current_offset: dayjs().tz('Asia/Ho_Chi_Minh').format('Z'),
                timezone_name: 'Asia/Ho_Chi_Minh',
            },
        },
    });
});

// Export tất cả các controller functions
module.exports = {
    // Basic CRUD
    getSuppliers,
    createSupplier,
    getSupplierById,
    getSupplierByCode,
    updateSupplier,
    deleteSupplier,

    // Search & Filter
    searchSuppliers,
    getRecentSuppliers,

    // Analytics
    getSupplierCreationStats,

    // Bulk operations
    deleteBulkSuppliers,

    // Test
    getTimezoneTest, // ✅ Thêm nếu có endpoint test
};
