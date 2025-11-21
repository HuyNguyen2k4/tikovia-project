// Đã fix quyền truy cập cho các API trong controller này
const asyncHandler = require('express-async-handler');
const Customer = require('@src/models/Customers');
const User = require('@src/models/Users');
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

// Helper functions để validate
const validateEmailFormat = (email) => {
    if (!email) return true; // Email không bắt buộc
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhoneFormat = (phone) => {
    if (!phone) return false;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.trim().length >= 8;
};

const validateUniqueCode = async (code, excludeId = null) => {
    const exists = await Customer.isCodeExists(code, excludeId);
    if (exists) {
        throw new Error('Mã khách hàng đã tồn tại');
    }
};

const validateUniqueEmail = async (email, excludeId = null) => {
    if (!email) return; // Email không bắt buộc
    const exists = await Customer.isEmailExists(email, excludeId);
    if (exists) {
        throw new Error('Email đã tồn tại');
    }
};

const validateUniquePhone = async (phone, excludeId = null) => {
    const exists = await Customer.isPhoneExists(phone, excludeId);
    if (exists) {
        throw new Error('Số điện thoại đã tồn tại');
    }
};

/**
 * @desc    Lấy danh sách customers với phân trang và tìm kiếm
 * @route   GET /api/customers
 * @access  Private (Admin)
 * @query   {string} q - Từ khóa tìm kiếm (tìm trong code, name, phone, email, address, tax_code)
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 20, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Danh sách customers kèm thông tin phân trang
 */
const getCustomers = asyncHandler(async (req, res) => {
    const { q, limit, offset } = req.query;

    // Validate và parse các tham số
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const maxLimit = 100;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giới hạn và vị trí phải là số không âm',
        });
    }

    const finalLimit = Math.min(parsedLimit, maxLimit);

    // Gọi listCustomers và countCustomers song song
    const [customers, total] = await Promise.all([
        Customer.listCustomers({
            q: q ? q.trim() : undefined,
            limit: finalLimit,
            offset: parsedOffset,
        }),
        Customer.countCustomers({ q: q ? q.trim() : undefined }),
    ]);

    res.status(200).json({
        success: true,
        data: customers,
        pagination: {
            total,
            limit: finalLimit,
            offset: parsedOffset,
        },
    });
});

// Lấy danh sách customers kèm tổng doanh số & công nợ (có thể tìm theo managedBy) với phân trang/tìm kiếm
const listCustomersWithMoney = asyncHandler(async (req, res) => {
    const { q, managedBy, limit, offset } = req.query;
    const currentUser = req.user; // Từ middleware auth
    // Kiểm tra quyền: phải là admin, seller hoặc accountant
    if (!['admin', 'seller', 'accountant'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập danh sách khách hàng',
        });
    }
    // Nếu là seller thì chỉ được xem khách hàng do mình quản lý
    let filterManagedBy = managedBy;
    if (currentUser.role === 'seller') {
        filterManagedBy = currentUser.id;
    }
    // Validate và parse các tham số
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const maxLimit = 100;
    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giới hạn và vị trí phải là số không âm',
        });
    }
    const finalLimit = Math.min(parsedLimit, maxLimit);
    // Gọi hàm gộp để lấy cả danh sách và tổng số
    const { items: customers, total } = await Customer.listCustomersWithMoney({
        q: q ? q.trim() : undefined,
        managedBy: filterManagedBy,
        limit: finalLimit,
        offset: parsedOffset,
    });
    res.status(200).json({
        success: true,
        data: customers,
        pagination: {
            total,
            limit: finalLimit,
            offset: parsedOffset,
        },
    });
});

/**
 * @desc    Lấy danh sách customers theo managedBy với phân trang và tìm kiếm
 * @route   GET /api/customers/managed-by/:managedBy
 * @access  Private (Admin, Seller)
 * @param   {string} managedBy - User ID quản lý
 * @query   {string} q - Từ khóa tìm kiếm (tìm trong code, name, phone, email, address, tax_code)
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 20, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Danh sách customers kèm thông tin phân trang
 * Note: Seller chỉ có thể xem khách hàng do mình quản lý
 */
const getCustomersByManagedBy = asyncHandler(async (req, res) => {
    const { managedBy } = req.params;
    const { q, limit, offset } = req.query;
    const currentUser = req.user; // Từ middleware auth

    // Kiểm tra quyền: Seller chỉ được xem khách hàng do mình quản lý
    if (currentUser.role === 'seller' && managedBy !== currentUser.id) {
        return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể xem khách hàng do mình quản lý',
        });
    }

    // Validate và parse các tham số
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const maxLimit = 100;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giới hạn và vị trí phải là số không âm',
        });
    }

    const finalLimit = Math.min(parsedLimit, maxLimit);

    // Gọi hàm gộp để lấy cả danh sách và tổng số
    const { items: customers, total } = await Customer.getCustomersByManagedByWithCount({
        managedBy,
        q: q ? q.trim() : undefined,
        limit: finalLimit,
        offset: parsedOffset,
    });

    res.status(200).json({
        success: true,
        data: customers,
        pagination: {
            total,
            limit: finalLimit,
            offset: parsedOffset,
        },
    });
});

/**
 * @desc    Tạo customer mới
 * @route   POST /api/customers
 * @access  Private (Admin, Seller)
 * @body    {string} code - Mã khách hàng (bắt buộc, unique)
 * @body    {string} name - Tên khách hàng (bắt buộc)
 * @body    {string} phone - Số điện thoại (bắt buộc, unique)
 * @body    {string} email - Email (tùy chọn, unique nếu có)
 * @body    {string} address - Địa chỉ (tùy chọn)
 * @body    {string} taxCode - Mã số thuế (tùy chọn)
 * @body    {number} creditLimit - Hạn mức tín dụng (tùy chọn)
 * @body    {string} note - Ghi chú (tùy chọn)
 * @body    {string} managedBy - ID user quản lý (tùy chọn) (chỉ chấp nhận id của seller hoặc admin)
 * @return  {object} - Customer mới tạo
 */
const createCustomer = asyncHandler(async (req, res) => {
    const { name, phone, email, address, taxCode, creditLimit, note, managedBy } = req.body;

    // Validate các field bắt buộc
    if (!name || !phone) {
        return res.status(400).json({
            success: false,
            message: 'Name và Phone là bắt buộc!',
        });
    }

    // Validate format
    if (!validatePhoneFormat(phone)) {
        return res.status(400).json({
            success: false,
            message: 'Số điện thoại không hợp lệ!',
        });
    }

    if (email && !validateEmailFormat(email)) {
        return res.status(400).json({
            success: false,
            message: 'Email không hợp lệ!',
        });
    }

    // Validate unique
    try {
        await validateUniquePhone(phone);
        if (email) await validateUniqueEmail(email);
    } catch (error) {
        return res.status(409).json({
            success: false,
            message: error.message,
        });
    }

    // Nếu có managedBy thì kiểm tra xem user đó có tồn tại và có role là seller hoặc admin không
    if (managedBy) {
        const user = await User.findById(managedBy);
        if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
            return res.status(400).json({
                success: false,
                message: 'Người quản lý không hợp lệ! Phải là Seller hoặc Admin',
            });
        }
    }

    const newCustomer = await Customer.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        taxCode: taxCode ? taxCode.trim() : null,
        creditLimit: creditLimit ? Number(creditLimit) : null,
        note: note ? note.trim() : null,
        managedBy: managedBy || null,
    });

    res.status(201).json({
        success: true,
        message: 'Tạo khách hàng thành công!',
        data: newCustomer,
    });
});

/**
 * @desc    Lấy thông tin customer theo ID
 * @route   GET /api/customers/:id
 * @access  Private (Admin, Seller)
 * @param   {string} id - Customer ID
 * @return  {object} - Customer object
 * Note: Seller chỉ có thể xem khách hàng do mình quản lý
 */
const getCustomerById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const currentUser = req.user; // Từ middleware auth

    const customer = await Customer.findById(id);
    if (!customer) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy khách hàng!',
        });
    }
    // Kiểm tra quyền: phải là admin hoặc seller
    if (currentUser.role !== 'admin' && currentUser.role !== 'seller') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập thông tin khách hàng',
        });
    }
    // Kiểm tra quyền: Seller chỉ được xem khách hàng do mình quản lý
    if (currentUser.role === 'seller' && customer.managedBy !== currentUser.id) {
        return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể xem khách hàng do mình quản lý',
        });
    }

    res.status(200).json({
        success: true,
        data: customer,
    });
});

/**
 * @desc    Lấy customer theo code
 * @route   GET /api/customers/code/:code
 * @access  Private (Admin, Seller)
 * @param   {string} code - Customer code
 * @return  {object} - Customer object
 * Note: Seller chỉ có thể xem khách hàng do mình quản lý
 */
const getCustomerByCode = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const currentUser = req.user; // Từ middleware auth

    const customer = await Customer.findByCode(code);
    if (!customer) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy khách hàng!',
        });
    }
    // Kiểm tra quyền: phải là admin hoặc seller
    if (currentUser.role !== 'admin' && currentUser.role !== 'seller') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập thông tin khách hàng',
        });
    }
    // Kiểm tra quyền: Seller chỉ được xem khách hàng do mình quản lý
    if (currentUser.role === 'seller' && customer.managedBy !== currentUser.id) {
        return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể xem khách hàng do mình quản lý',
        });
    }
    //

    res.status(200).json({
        success: true,
        data: customer,
    });
});

/**
 * @desc    Lấy danh sách customers (có tìm kiếm, KHÔNG phân trang) (dành cho Select/Autocomplete)
 * @route   GET /api/customers/all
 * @access  Private (Admin, Seller, Accountant)
 * @query   {string} q - Từ khóa tìm kiếm (tìm trong id, code, name)
 * @return  {object} - Danh sách customers (chỉ id, code, name)
 */
const listCustomers = asyncHandler(async (req, res) => {
    const { q } = req.query;

    const customers = await Customer.getCustomersForSelect({
        q: q ? q.trim() : undefined,
    });

    res.status(200).json({
        success: true,
        total: customers.length,
        data: customers,
    });
});

/**
 * @desc    Cập nhật thông tin customer
 * @route   PUT /api/customers/:id
 * @access  Private (Admin, Seller)
 * @param   {string} id - Customer ID
 * @body    {string} code - Mã khách hàng
 * @body    {string} name - Tên khách hàng
 * @body    {string} phone - Số điện thoại
 * @body    {string} email - Email
 * @body    {string} address - Địa chỉ
 * @body    {string} taxCode - Mã số thuế
 * @body    {number} creditLimit - Hạn mức tín dụng
 * @body    {string} note - Ghi chú
 * @body    {string} managedBy - ID user quản lý (chỉ chấp nhận id của seller hoặc admin)
 * @return  {object} - Customer đã được cập nhật
 * Note: Seller chỉ được cập nhật khách hàng do mình quản lý, admin thì có thể cập nhật được tất cả
 *       Seller không được phép thay đổi managedBy
 */
const updateCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const { code, phone, email } = req.body;
    const currentUser = req.user;

    // 1. Kiểm tra customer tồn tại
    const customer = await Customer.findById(id);
    if (!customer) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy khách hàng',
        });
    }

    // 2. Kiểm tra quyền truy cập
    if (!['admin', 'seller'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền cập nhật thông tin khách hàng',
        });
    }

    // 3. Kiểm tra quyền seller chỉ update khách hàng của mình
    if (currentUser.role === 'seller' && customer.managedBy !== currentUser.id) {
        return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể cập nhật khách hàng do mình quản lý',
        });
    }

    // 4. Validate format
    if (phone && !validatePhoneFormat(phone)) {
        return res.status(400).json({
            success: false,
            message: 'Số điện thoại không hợp lệ!',
        });
    }

    if (email && !validateEmailFormat(email)) {
        return res.status(400).json({
            success: false,
            message: 'Email không hợp lệ!',
        });
    }

    // 5. Validate unique constraints
    try {
        const validations = [];
        if (phone && phone !== customer.phone) {
            validations.push(validateUniquePhone(phone, id));
        }
        if (email && email !== customer.email) {
            validations.push(validateUniqueEmail(email, id));
        }
        await Promise.all(validations);
    } catch (error) {
        return res.status(409).json({
            success: false,
            message: error.message,
        });
    }

    // 6. Kiểm tra quyền thay đổi managedBy (seller không được phép)
    if (
        currentUser.role === 'seller' &&
        payload.managedBy !== undefined &&
        payload.managedBy !== customer.managedBy
    ) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền thay đổi người quản lý khách hàng',
        });
    }

    // Nếu có managedBy thì kiểm tra xem user đó có tồn tại và có role là seller hoặc admin không
    if (payload.managedBy) {
        const user = await User.findById(payload.managedBy);
        if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
            return res.status(400).json({
                success: false,
                message: 'Người quản lý không hợp lệ! Phải là Seller hoặc Admin',
            });
        }
    }

    try {
        // 7. Chuẩn bị payload cho update
        const updatePayload = {};
        const fieldMappings = [
            { field: 'name', trim: true },
            { field: 'phone', trim: true },
            { field: 'email', trim: true, nullable: true },
            { field: 'address', trim: true, nullable: true },
            { field: 'taxCode', trim: true, nullable: true },
            { field: 'creditLimit', type: 'number', nullable: true },
            { field: 'note', trim: true, nullable: true },
            { field: 'managedBy', nullable: true },
        ];

        fieldMappings.forEach(({ field, trim, type, nullable }) => {
            if (payload[field] !== undefined) {
                let value = payload[field];

                if (nullable && !value) {
                    updatePayload[field] = null;
                } else if (trim && value) {
                    updatePayload[field] = value.trim();
                } else if (type === 'number' && value) {
                    updatePayload[field] = Number(value);
                } else {
                    updatePayload[field] = value;
                }
            }
        });

        // 8. Thực hiện update
        const updated = await Customer.updateCustomer(id, updatePayload);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khách hàng',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Cập nhật thành công',
            data: updated,
        });
    } catch (err) {
        // 9. Xử lý lỗi database
        const errorMessages = {
            23505: 'Dữ liệu đã tồn tại',
            23502: 'Thiếu dữ liệu bắt buộc',
        };
        return res.status(err.code === '23505' ? 400 : 500).json({
            success: false,
            message: errorMessages[err.code] || 'Lỗi server',
        });
    }
});

/**
 * @desc    Xóa customer
 * @route   DELETE /api/customers/:id
 * @access  Private (Admin only)
 * @param   {string} id - Customer ID
 */
const deleteCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const currentUser = req.user; // Từ middleware auth
    // Kiểm tra quyền: phải là admin
    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xóa khách hàng',
        });
    }
    const customer = await Customer.findById(id);
    if (!customer) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy khách hàng để xóa!',
        });
    }

    try {
        await Customer.deleteCustomer(id);
        res.status(200).json({
            success: true,
            message: 'Xóa khách hàng thành công!',
        });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa khách hàng vì còn dữ liệu liên quan đến khách hàng này!',
            });
        }
        throw error;
    }
});

/**
 * @desc    Tìm kiếm nâng cao customers
 * @route   GET /api/customers/search
 * @access  Private (Admin only)
 * @query   {string} code - Tìm theo mã
 * @query   {string} name - Tìm theo tên
 * @query   {string} phone - Tìm theo số điện thoại
 * @query   {string} email - Tìm theo email
 * @query   {string} address - Tìm theo địa chỉ
 * @query   {string} taxCode - Tìm theo mã số thuế
 * @query   {string} managedBy - Tìm theo user quản lý
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 */
const searchCustomers = asyncHandler(async (req, res) => {
    const { code, name, phone, email, address, taxCode, managedBy, limit, offset } = req.query;
    const currentUser = req.user; // Từ middleware auth

    // Kiểm tra quyền: phải là admin
    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập danh sách khách hàng',
        });
    }

    const customers = await Customer.searchCustomers({
        code,
        name,
        phone,
        email,
        address,
        taxCode,
        managedBy,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
    });

    res.status(200).json({
        success: true,
        data: customers,
    });
});

/**
 * @desc    Lấy customers được tạo gần đây
 * @route   GET /api/customers/recent
 * @access  Private (Admin)
 * @query   {number} limit - Số lượng item (default: 10)
 */
const getRecentCustomers = asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const currentUser = req.user; // Từ middleware auth

    // Kiểm tra quyền: phải là admin
    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập danh sách khách hàng',
        });
    }
    const customers = await Customer.getRecentCustomers(parseInt(limit) || 10);

    res.status(200).json({
        success: true,
        data: customers,
    });
});

/**
 * @desc    Lấy thống kê customers theo tháng tạo
 * @route   GET /api/customers/stats/creation
 * @access  Private (Admin)
 */
const getCustomerCreationStats = asyncHandler(async (req, res) => {
    const stats = await Customer.getCustomerCreationStats();

    res.status(200).json({
        success: true,
        data: stats,
    });
});

/**
 * @desc    Xóa nhiều customers cùng lúc
 * @route   DELETE /api/customers/bulk
 * @access  Private (Admin only)
 * @body    {string[]} ids - Danh sách Customer IDs
 */
const deleteBulkCustomers = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const currentUser = req.user; // Từ middleware auth
    // Kiểm tra quyền: phải là admin
    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xóa khách hàng',
        });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Danh sách IDs không hợp lệ!',
        });
    }

    try {
        const deletedCount = await Customer.deleteMany(ids);
        res.status(200).json({
            success: true,
            message: `Đã xóa ${deletedCount} khách hàng thành công!`,
            deletedCount,
        });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa một số khách hàng vì còn dữ liệu liên quan!',
            });
        }
        throw error;
    }
});

/**
 * @desc    Lấy tổng hợp tài chính khách hàng
 * @route   GET /api/customers/financial-summary
 * @access  Private (Admin, Seller, Accountant)
 * @query   {string} managedBy - ID người quản lý (tùy chọn)
 * @return  {object} - Tổng hợp tài chính { totalOutstandingBalance, totalSalesAmount, netSalesAmount }
 * Note:
 * - Nếu có managedBy: Tính tổng theo người quản lý đó
 * - Nếu không có managedBy: Tính tổng của TẤT CẢ khách hàng
 * - Seller chỉ có thể xem tổng hợp của khách hàng do mình quản lý
 */
const getCustomerFinancialSummary = asyncHandler(async (req, res) => {
    const { managedBy } = req.query;
    const currentUser = req.user; // Từ middleware auth

    // Kiểm tra quyền: phải là admin, seller hoặc accountant
    if (!['admin', 'seller', 'accountant'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập thông tin tài chính khách hàng',
        });
    }

    // Xử lý logic phân quyền cho managedBy
    let filterManagedBy = managedBy;

    // Nếu là seller: bắt buộc phải lọc theo chính mình
    if (currentUser.role === 'seller') {
        if (managedBy && managedBy !== currentUser.id) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể xem tổng hợp tài chính của khách hàng do mình quản lý',
            });
        }
        filterManagedBy = currentUser.id; // Bắt buộc filter theo seller hiện tại
    }

    // Validate managedBy UUID format nếu có
    if (filterManagedBy) {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(filterManagedBy)) {
            return res.status(400).json({
                success: false,
                message: 'ID người quản lý không hợp lệ',
            });
        }

        // Kiểm tra user có tồn tại không (tùy chọn - để đảm bảo dữ liệu chính xác)
        const user = await User.findById(filterManagedBy);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người quản lý',
            });
        }
    }

    try {
        // Gọi hàm từ model
        const financialSummary = await Customer.getCustomerFinancialSummary(filterManagedBy);

        // Thêm thông tin context để frontend hiểu được dữ liệu
        const responseData = {
            ...financialSummary,
            // Metadata về phạm vi dữ liệu
            scope: filterManagedBy ? 'specific_manager' : 'all_customers',
            managedBy: filterManagedBy || null,
            // Thêm thông tin người quản lý nếu có
            managerInfo: filterManagedBy
                ? {
                      id: filterManagedBy,
                      name: filterManagedBy === currentUser.id ? currentUser.fullName : null,
                  }
                : null,
        };

        res.status(200).json({
            success: true,
            data: responseData,
            message: filterManagedBy
                ? 'Tổng hợp tài chính theo người quản lý'
                : 'Tổng hợp tài chính toàn bộ khách hàng',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy tổng hợp tài chính khách hàng',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy danh sách customers với thống kê số lượng invoices theo trạng thái
 * @route   GET /api/customers/with-invoice-stats
 * @access  Private (Admin, Seller, Accountant)
 * @query   {string} q - Từ khóa tìm kiếm
 * @query   {string} managedBy - Lọc theo người quản lý (optional)
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 20, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Danh sách customers kèm thống kê invoices và phân trang
 * Note: Seller chỉ được xem khách hàng do mình quản lý
 */
const listCustomersWithInvoiceStats = asyncHandler(async (req, res) => {
    const { q, managedBy, limit, offset } = req.query;
    const currentUser = req.user; // Từ middleware auth

    // Kiểm tra quyền: phải là admin, seller hoặc accountant
    if (!['admin', 'seller', 'accountant'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập danh sách khách hàng',
        });
    }

    // Nếu là seller thì chỉ được xem khách hàng do mình quản lý
    let filterManagedBy = managedBy;
    if (currentUser.role === 'seller') {
        if (managedBy && managedBy !== currentUser.id) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể xem khách hàng do mình quản lý',
            });
        }
        filterManagedBy = currentUser.id;
    }

    // Validate và parse các tham số
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const maxLimit = 100;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giới hạn và vị trí phải là số không âm',
        });
    }

    const finalLimit = Math.min(parsedLimit, maxLimit);

    try {
        // Gọi hàm từ model để lấy cả danh sách và tổng số
        const { items: customers, total } = await Customer.listCustomersWithInvoiceStats({
            q: q ? q.trim() : undefined,
            managedBy: filterManagedBy,
            limit: finalLimit,
            offset: parsedOffset,
        });

        res.status(200).json({
            success: true,
            data: customers,
            pagination: {
                total,
                limit: finalLimit,
                offset: parsedOffset,
                hasMore: parsedOffset + finalLimit < total,
            },
            message: 'Danh sách customers với thống kê invoices',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách customers với thống kê invoices',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy tổng hợp thống kê invoices của tất cả customers
 * @route   GET /api/customers/invoice-stats-summary
 * @access  Private (Admin, Manager, Accountant)
 * @query   {string} managedBy - Lọc theo người quản lý (optional)
 * @return  {object} - Tổng hợp thống kê invoices
 * Note: Seller chỉ được xem thống kê của khách hàng do mình quản lý
 */
const getInvoiceStatsSummary = asyncHandler(async (req, res) => {
    const { managedBy } = req.query;
    const currentUser = req.user; // Từ middleware auth

    // Kiểm tra quyền: phải là admin, seller hoặc accountant
    if (!['admin', 'seller', 'accountant'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập thống kê invoices',
        });
    }

    // Xử lý logic phân quyền cho managedBy
    let filterManagedBy = managedBy;

    // Nếu là seller: bắt buộc phải lọc theo chính mình
    if (currentUser.role === 'seller') {
        if (managedBy && managedBy !== currentUser.id) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể xem thống kê invoices của khách hàng do mình quản lý',
            });
        }
        filterManagedBy = currentUser.id; // Bắt buộc filter theo seller hiện tại
    }

    // Validate managedBy UUID format nếu có
    if (filterManagedBy) {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(filterManagedBy)) {
            return res.status(400).json({
                success: false,
                message: 'ID người quản lý không hợp lệ',
            });
        }

        // Kiểm tra user có tồn tại không
        const user = await User.findById(filterManagedBy);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người quản lý',
            });
        }
    }

    try {
        // Gọi hàm từ model
        const invoiceStats = await Customer.getInvoiceStatsSummary(filterManagedBy);

        // Thêm thông tin context để frontend hiểu được dữ liệu
        const responseData = {
            ...invoiceStats,
            // Metadata về phạm vi dữ liệu
            scope: filterManagedBy ? 'specific_manager' : 'all_customers',
            managedBy: filterManagedBy || null,
            // Thêm thông tin người quản lý nếu có
            managerInfo: filterManagedBy
                ? {
                      id: filterManagedBy,
                      name: filterManagedBy === currentUser.id ? currentUser.fullName : null,
                  }
                : null,
        };

        res.status(200).json({
            success: true,
            data: responseData,
            message: filterManagedBy
                ? 'Tổng hợp thống kê invoices theo người quản lý'
                : 'Tổng hợp thống kê invoices toàn bộ khách hàng',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy tổng hợp thống kê invoices',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy chi tiết invoices của một customer cụ thể
 * @route   GET /api/customers/:customerId/invoice-details
 * @access  Private (Admin, Seller, Accountant)
 * @param   {string} customerId - Customer ID
 * @query   {string} status - Lọc theo trạng thái invoice (open/paid/cancelled)
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 10, max: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Chi tiết invoices của customer kèm thống kê và phân trang
 * Note: Seller chỉ được xem invoices của khách hàng do mình quản lý
 */
const getCustomerInvoiceDetails = asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { status, limit, offset } = req.query;
    const currentUser = req.user; // Từ middleware auth

    // Kiểm tra quyền: phải là admin, seller hoặc accountant
    if (!['admin', 'seller', 'accountant'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập chi tiết invoices',
        });
    }

    // Validate customerId UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(customerId)) {
        return res.status(400).json({
            success: false,
            message: 'ID khách hàng không hợp lệ',
        });
    }

    // Kiểm tra customer có tồn tại không
    const customer = await Customer.findById(customerId);
    if (!customer) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy khách hàng',
        });
    }

    // Kiểm tra quyền: Seller chỉ được xem invoices của khách hàng do mình quản lý
    if (currentUser.role === 'seller' && customer.managedBy !== currentUser.id) {
        return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể xem invoices của khách hàng do mình quản lý',
        });
    }

    // Validate status nếu có
    if (status && !['open', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Trạng thái invoice không hợp lệ. Phải là: open, paid, hoặc cancelled',
        });
    }

    // Validate và parse các tham số phân trang
    const parsedLimit = parseInt(limit) || 10;
    const parsedOffset = parseInt(offset) || 0;
    const maxLimit = 50;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giới hạn và vị trí phải là số không âm',
        });
    }

    const finalLimit = Math.min(parsedLimit, maxLimit);

    try {
        // Gọi hàm từ model
        const invoiceDetails = await Customer.getCustomerInvoiceDetails(customerId, {
            status,
            limit: finalLimit,
            offset: parsedOffset,
        });

        res.status(200).json({
            success: true,
            data: {
                customer: {
                    id: customer.id,
                    code: customer.code,
                    name: customer.name,
                },
                invoices: invoiceDetails.invoices,
                stats: invoiceDetails.stats,
            },
            pagination: {
                total: invoiceDetails.total,
                limit: finalLimit,
                offset: parsedOffset,
                hasMore: parsedOffset + finalLimit < invoiceDetails.total,
            },
            message: `Chi tiết invoices của khách hàng ${customer.name}`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy chi tiết invoices của khách hàng',
            error: error.message,
        });
    }
});

// Export tất cả các controller functions
module.exports = {
    // Basic CRUD
    getCustomers,
    listCustomers, // Lấy tất cả customers không phân trang
    getCustomersByManagedBy, // Lấy customers theo managedBy với phân trang
    createCustomer,
    updateCustomer,
    deleteCustomer,

    // Extended features
    listCustomersWithMoney, // Lấy danh sách customers kèm tổng doanh số & công nợ
    // ✅ Financial summary
    getCustomerFinancialSummary,

    // Get by identifier
    getCustomerById,
    getCustomerByCode,
    searchCustomers,
    getRecentCustomers,
    getCustomerCreationStats,
    // Bulk operations
    deleteBulkCustomers,

    // ✅ NEW: Invoice Statistics Features
    listCustomersWithInvoiceStats, // Lấy danh sách customers kèm thống kê invoices theo trạng thái
    getInvoiceStatsSummary, // Tổng hợp thống kê invoices của tất cả customers
    getCustomerInvoiceDetails, // Chi tiết invoices của một customer cụ thể
};
