const asyncHandler = require('express-async-handler');
const SupplierTransactionPayment = require('@src/models/SupplierTransactionPayments');
const SupplierTransaction = require('@src/models/SupplierTransactions');
const User = require('@src/models/Users');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

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

// Helper function để validate UUID format
const validateUuidFormat = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

// Helper function để validate date format
const validateDateFormat = (date) => {
    if (!date) return true;
    return !isNaN(Date.parse(date));
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

// Helper function để validate transaction exists
const validateTransactionExists = async (transId) => {
    const transaction = await SupplierTransaction.findById(transId);
    if (!transaction) {
        throw new Error('Giao dịch không tồn tại');
    }
};

// Helper function để validate user exists
const validateUserExists = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('Người dùng không tồn tại');
    }
};

/**
 * @desc    Lấy danh sách payments với phân trang và tìm kiếm
 * @route   GET /api/supplier-transaction-payments
 * @access  Private (Admin, Manager, Accountant)
 * @query   {string} q - Từ khóa tìm kiếm
 * @query   {string} transId - Lọc theo transaction ID
 * @query   {string} supplierId - Lọc theo nhà cung cấp  // ✅ Thêm dòng này
 * @query   {string} departmentId - Lọc theo phòng ban   // ✅ Thêm dòng này
 * @query   {string} paidBy - Lọc theo người thanh toán
 * @query   {string} createdBy - Lọc theo người tạo
 * @query   {string} fromDate - Từ ngày
 * @query   {string} toDate - Đến ngày
 * @query   {number} limit - Số lượng item (default: 20, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 */
const getSupplierTransactionPayments = asyncHandler(async (req, res) => {
    // ✅ Thêm supplierId và departmentId vào destructuring
    const {
        q,
        transId,
        supplierId,
        departmentId,
        paidBy,
        createdBy,
        fromDate,
        toDate,
        limit,
        offset,
    } = req.query;

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

    // ✅ Thêm validation cho các ID mới (tùy chọn nhưng khuyến khích)
    if (supplierId && !validateUuidFormat(supplierId)) {
        return res.status(400).json({ success: false, message: 'ID nhà cung cấp không hợp lệ' });
    }
    if (departmentId && !validateUuidFormat(departmentId)) {
        return res.status(400).json({ success: false, message: 'ID phòng ban không hợp lệ' });
    }

    // Validate dates
    if (fromDate && !validateDateFormat(fromDate)) {
        return res.status(400).json({
            success: false,
            message: 'Định dạng từ ngày không hợp lệ',
        });
    }

    if (toDate && !validateDateFormat(toDate)) {
        return res.status(400).json({
            success: false,
            message: 'Định dạng đến ngày không hợp lệ',
        });
    }

    const finalLimit = Math.min(parsedLimit, maxLimit);

    try {
        const filters = {
            q: q ? q.trim() : undefined,
            transId,
            supplierId, // ✅ Truyền vào
            departmentId, // ✅ Truyền vào
            paidBy,
            createdBy,
            fromDate,
            toDate,
        };

        const [payments, total] = await Promise.all([
            SupplierTransactionPayment.listSupplierTransactionPayments({
                ...filters,
                limit: finalLimit,
                offset: parsedOffset,
            }),
            SupplierTransactionPayment.countSupplierTransactionPayments(filters),
        ]);

        res.status(200).json({
            success: true,
            data: payments,
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
            message: 'Lỗi khi lấy danh sách thanh toán',
            error: error.message,
        });
    }
});

/**
 * @desc    Tạo payment mới
 * @route   POST /api/supplier-transaction-payments
 * @access  Private (Admin, Manager, Accountant)
 * @body    {string} transId - Transaction ID (bắt buộc)
 * @body    {number} amount - Số tiền (bắt buộc)
 * @body    {string} paidAt - Ngày thanh toán (có thể không truyền, mặc định là ngày hiện tại)
 * @body    {string} paidBy - Người thanh toán (có thể không truyền, mặc định là người hiện tại) (Chỉ Admin/Manager mới được ghi đè)
 * @body    {string} createdBy - Luôn mặc định là người hiện tại
 * @body    {string} evdUrl - Link ảnh (bắt buộc)
 * @body    {string} note - Ghi chú (tùy chọn)
 */
const createSupplierTransactionPayment = asyncHandler(async (req, res) => {
    const { transId, amount, paidAt, paidBy, evdUrl, note } = req.body;

    // 1) Validate input cơ bản
    if (!transId || !validateUuidFormat(transId)) {
        return res.status(400).json({ success: false, message: 'ID giao dịch không hợp lệ' });
    }

    // Tiền tệ: chỉ nhận số hữu hạn > 0 và tối đa 2 chữ số thập phân
    const amt = Number(amount);
    const isFiniteNumber = Number.isFinite(amt);
    const hasMax2Decimals = /^\d+(\.\d{1,2})?$/.test(String(amount));
    if (!isFiniteNumber || amt <= 0 || !hasMax2Decimals) {
        return res.status(400).json({
            success: false,
            message: 'Số tiền không hợp lệ (số dương, tối đa 2 chữ số thập phân)',
        });
    }

    // let paidAtDate = paidAt ? new Date(paidAt) : new Date();
    let paidAtDate = paidAt ? parseDate(paidAt) : dayjs().utc().toDate();
    if (paidAt && !paidAtDate) {
        return res.status(400).json({ success: false, message: 'Ngày thanh toán không hợp lệ' });
    }
    // Optional: chặn tương lai
    if (paidAtDate.getTime() > Date.now()) {
        return res.status(400).json({
            success: false,
            message: 'Ngày thanh toán không được là tương lai (lớn hơn ngày hiện tại)',
        });
    }
    // Optional: chặn quá khứ quá 1 tuần
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    if (paidAtDate < oneWeekAgo) {
        return res.status(400).json({
            success: false,
            message: 'Ngày thanh toán không được nhỏ hơn ngày hiện tại quá 7 ngày',
        });
    }

    if (!evdUrl || !evdUrl.trim()) {
        return res.status(400).json({ success: false, message: 'Link ảnh là bắt buộc' });
    }
    if (!validateUrlFormat(evdUrl.trim())) {
        return res.status(400).json({ success: false, message: 'Link ảnh không hợp lệ' });
    }

    // 2) Chuẩn hóa user thực thi & phân quyền
    if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    const currentUserId = req.user.id;

    // Nếu không phải Admin/Manager thì không cho ghi đè paidBy/createdBy (tránh lừa đảo)
    const canAssignOthers = req.user.role && ['admin', 'manager'].includes(req.user.role);
    const paidByEffective = canAssignOthers ? (paidBy ?? currentUserId) : currentUserId;
    const createdByEffective = currentUserId; // luôn là người đang thao tác

    if (!validateUuidFormat(paidByEffective) || !validateUuidFormat(createdByEffective)) {
        return res.status(400).json({ success: false, message: 'User ID không hợp lệ' });
    }

    try {
        // 3) Validate tồn tại
        await validateTransactionExists(transId);
        await validateUserExists(paidByEffective);
        await validateUserExists(createdByEffective);

        // 4) Transaction DB để đảm bảo nhất quán (giả sử model hỗ trợ)
        const newPayment = await SupplierTransactionPayment.createSupplierTransactionPayment({
            transId,
            amount: amt, // lưu numeric(18,2) trong DB
            paidAt: paidAtDate,
            paidBy: paidByEffective,
            createdBy: createdByEffective,
            evdUrl: evdUrl.trim(),
            note: note ? note.trim() : null,
        });

        // (tuỳ business) cập nhật số tiền đã thanh toán của transaction trong cùng 1 db tx ở trên

        return res.status(201).json({
            success: true,
            message: 'Tạo thanh toán thành công',
            data: newPayment,
        });
    } catch (error) {
        // Bắt một số mã lỗi phổ biến của Postgres
        if (error.code === '23503') {
            return res
                .status(400)
                .json({ success: false, message: 'Giao dịch hoặc người dùng không hợp lệ' });
        }
        if (error.code === '23514') {
            return res.status(400).json({ success: false, message: 'Vi phạm ràng buộc dữ liệu' });
        }
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: 'Bản ghi trùng lặp' });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo thanh toán',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thông tin payment theo ID
 * @route   GET /api/supplier-transaction-payments/:id
 * @access  Private (Admin, Manager, Accountant)
 * @param   {string} id - Payment ID
 */
const getSupplierTransactionPaymentById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!validateUuidFormat(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID thanh toán không hợp lệ',
        });
    }

    const payment = await SupplierTransactionPayment.findById(id);
    if (!payment) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy thanh toán',
        });
    }

    res.status(200).json({
        success: true,
        data: payment,
    });
});

/**
 * @desc    Cập nhật thông tin payment của giao dịch với NCC (chỉ sửa một số trường cho phép)
 * @route   PUT /api/supplier-transaction-payments/:id
 * @access  Private (Admin, Manager, Accountant)
 * @param   {string} id - Payment ID (UUID) - bắt buộc ở params
 * @body    {number} [amount]   - Số tiền > 0, tối đa 2 chữ số thập phân (numeric); khi đổi có thể ảnh hưởng số dư giao dịch (nên gói trong DB transaction)
 * @body    {string} [paidAt]   - Ngày thanh toán (ISO datetime hợp lệ), KHÔNG được ở tương lai và KHÔNG nhỏ hơn hiện tại quá 7 ngày
 * @body    {string} [paidBy]   - ID người thanh toán (UUID) — chỉ Admin/Manager được phép thay đổi; Accountant không được đổi
 * @body    {string} [evdUrl]   - Link ảnh/bằng chứng; nếu truyền phải là URL hợp lệ (http/https) và không rỗng
 * @body    {string} [note]     - Ghi chú; nếu truyền chuỗi rỗng sẽ lưu null
 * @note    Không cho phép thay đổi:
 *          - transId (ID giao dịch)
 *          - createdBy (người tạo)
 */
const updateSupplierTransactionPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { transId, amount, paidAt, paidBy, createdBy, evdUrl, note } = req.body;

    // 0) Tìm payment
    const existingPayment = await SupplierTransactionPayment.findById(id);
    if (!existingPayment) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thanh toán' });
    }

    // 1) Quyền & người hiện tại
    if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    const currentUserId = req.user.id;
    const canAssignOthers = req.user.role && ['admin', 'manager'].includes(req.user.role);

    // 2) Validate input theo từng field (chỉ khi client gửi lên)
    if (transId !== undefined) {
        // Khuyến nghị: không cho đổi transId; nếu bắt buộc cho đổi thì validate & cập nhật số dư bằng DB transaction
        return res
            .status(400)
            .json({ success: false, message: 'Không cho phép thay đổi ID giao dịch của payment' });
        // Nếu vẫn muốn cho đổi:
        // if (!validateUuidFormat(transId)) return res.status(400)...
    }

    let amt;
    if (amount !== undefined) {
        const n = Number(amount);
        const isFiniteNumber = Number.isFinite(n);
        const hasMax2Decimals = /^\d+(\.\d{1,2})?$/.test(String(amount));
        if (!isFiniteNumber || n <= 0 || !hasMax2Decimals) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền không hợp lệ (số dương, tối đa 2 chữ số thập phân)',
            });
        }
        amt = n;
    }

    let paidAtDate;
    if (paidAt !== undefined) {
        paidAtDate = parseDate(paidAt);
        if (!paidAtDate) {
            return res
                .status(400)
                .json({ success: false, message: 'Ngày thanh toán không hợp lệ' });
        }
        // Optional: chặn tương lai
        const now = new Date();
        if (paidAtDate > now) {
            return res.status(400).json({
                success: false,
                message: 'Ngày thanh toán không được là tương lai (vượt quá hiện tại)',
            });
        }
        // Optional: chặn quá khứ > 7 ngày
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        if (paidAtDate < oneWeekAgo) {
            return res.status(400).json({
                success: false,
                message: 'Ngày thanh toán không được nhỏ hơn ngày hiện tại quá 7 ngày',
            });
        }
    }

    // createdBy: thường không cho phép sửa
    if (createdBy !== undefined) {
        return res
            .status(400)
            .json({ success: false, message: 'Không cho phép thay đổi người tạo' });
    }

    // paidBy: chỉ Admin/Manager mới được đổi; nếu FE gửi giá trị trống → bỏ qua
    let paidByEffective;
    if (paidBy !== undefined) {
        if (!canAssignOthers) {
            return res
                .status(403)
                .json({ success: false, message: 'Bạn không có quyền thay đổi người thanh toán' });
        }
        if (!validateUuidFormat(paidBy)) {
            return res
                .status(400)
                .json({ success: false, message: 'ID người thanh toán không hợp lệ' });
        }
        paidByEffective = paidBy;
    }

    if (evdUrl !== undefined) {
        if (!evdUrl || !evdUrl.trim()) {
            return res
                .status(400)
                .json({ success: false, message: 'Link ảnh không được để trống' });
        }
        if (!validateUrlFormat(evdUrl.trim())) {
            return res.status(400).json({ success: false, message: 'Link ảnh không hợp lệ' });
        }
    }

    // 3) Validate tồn tại khi đổi paidBy (và transId nếu bạn cho phép sửa)
    try {
        if (paidByEffective && paidByEffective !== existingPayment.paidBy) {
            await validateUserExists(paidByEffective);
        }
        // Nếu cho phép đổi transId:
        // if (transId && transId !== existingPayment.transId) await validateTransactionExists(transId);
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }

    // 4) Build payload chỉ gồm field thay đổi
    const updatePayload = {};
    if (amount !== undefined) updatePayload.amount = amt;
    if (paidAt !== undefined) updatePayload.paidAt = paidAtDate;
    if (paidByEffective !== undefined) updatePayload.paidBy = paidByEffective;
    if (evdUrl !== undefined) updatePayload.evdUrl = evdUrl.trim();
    if (note !== undefined) updatePayload.note = note ? note.trim() : null;

    if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật' });
    }

    // 5) Thực thi (khuyến nghị: gói trong DB transaction nếu đổi số tiền/ảnh hưởng số dư giao dịch)
    try {
        const updatedPayment = await SupplierTransactionPayment.updateSupplierTransactionPayment(
            id,
            updatePayload
        );

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thanh toán thành công',
            data: updatedPayment,
        });
    } catch (error) {
        if (error.code === '23503') {
            return res
                .status(400)
                .json({ success: false, message: 'Giao dịch hoặc người dùng không hợp lệ' });
        }
        if (error.code === '23514') {
            return res.status(400).json({ success: false, message: 'Vi phạm ràng buộc dữ liệu' });
        }
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: 'Bản ghi trùng lặp' });
        }
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật thanh toán',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa payment
 * @route   DELETE /api/supplier-transaction-payments/:id
 * @access  Private (Admin, Manager)
 * @param   {string} id - Payment ID
 */
const deleteSupplierTransactionPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const payment = await SupplierTransactionPayment.findById(id);
    if (!payment) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy thanh toán để xóa',
        });
    }

    try {
        await SupplierTransactionPayment.deleteSupplierTransactionPayment(id);
        res.status(200).json({
            success: true,
            message: 'Xóa thanh toán thành công',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa thanh toán',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy tất cả payments của một transaction
 * @route   GET /api/supplier-transaction-payments/transaction/:transId
 * @access  Private (Admin, Manager, Accountant)
 * @param   {string} transId - Transaction ID
 */
const getPaymentsByTransactionId = asyncHandler(async (req, res) => {
    const { transId } = req.params;

    if (!validateUuidFormat(transId)) {
        return res.status(400).json({
            success: false,
            message: 'ID giao dịch không hợp lệ',
        });
    }

    try {
        const payments = await SupplierTransactionPayment.getPaymentsByTransactionId(transId);

        res.status(200).json({
            success: true,
            data: payments,
            message: 'Danh sách thanh toán của giao dịch',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thanh toán của giao dịch',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy payments theo người thanh toán
 * @route   GET /api/supplier-transaction-payments/paid-by/:paidBy
 * @access  Private (Admin, Manager, Accountant)
 * @param   {string} paidBy - User ID
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 */
const getPaymentsByPaidBy = asyncHandler(async (req, res) => {
    const { paidBy } = req.params;
    const { limit, offset } = req.query;

    if (!validateUuidFormat(paidBy)) {
        return res.status(400).json({
            success: false,
            message: 'ID người thanh toán không hợp lệ',
        });
    }

    try {
        const payments = await SupplierTransactionPayment.getPaymentsByPaidBy(paidBy, {
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
        });

        res.status(200).json({
            success: true,
            data: payments,
            message: 'Danh sách thanh toán theo người thanh toán',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thanh toán theo người thanh toán',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy payments theo người tạo
 * @route   GET /api/supplier-transaction-payments/created-by/:createdBy
 * @access  Private (Admin, Manager, Accountant)
 * @param   {string} createdBy - User ID
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 */
const getPaymentsByCreatedBy = asyncHandler(async (req, res) => {
    const { createdBy } = req.params;
    const { limit, offset } = req.query;

    if (!validateUuidFormat(createdBy)) {
        return res.status(400).json({
            success: false,
            message: 'ID người tạo không hợp lệ',
        });
    }

    try {
        const payments = await SupplierTransactionPayment.getPaymentsByCreatedBy(createdBy, {
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
        });

        res.status(200).json({
            success: true,
            data: payments,
            message: 'Danh sách thanh toán theo người tạo',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thanh toán theo người tạo',
            error: error.message,
        });
    }
});

/**
 * @desc    Tính tổng số tiền đã thanh toán cho một transaction
 * @route   GET /api/supplier-transaction-payments/transaction/:transId/total
 * @access  Private (Admin, Manager, Accountant)
 * @param   {string} transId - Transaction ID
 */
const calculateTotalPaidAmount = asyncHandler(async (req, res) => {
    const { transId } = req.params;

    if (!validateUuidFormat(transId)) {
        return res.status(400).json({
            success: false,
            message: 'ID giao dịch không hợp lệ',
        });
    }

    try {
        const totalPaid = await SupplierTransactionPayment.calculateTotalPaidAmount(transId);

        res.status(200).json({
            success: true,
            data: { totalPaid },
            message: 'Tổng số tiền đã thanh toán',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tính tổng số tiền đã thanh toán',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thống kê thanh toán theo user (người thanh toán), có thể lọc theo thời gian và gom nhóm theo period
 * @route   GET /api/supplier-transaction-payments/stats/by-user
 * @access  Private (Admin, Manager, Accountant)
 * @query   {string} [from]     - ISO datetime hoặc yyyy-mm-dd (lọc >= from)
 * @query   {string} [to]       - ISO datetime hoặc yyyy-mm-dd (lọc <  to)
 * @query   {string} [period]   - one of: day | week | month | year | (bỏ trống = không gom nhóm)
 * @query   {string} [timezone] - IANA timezone (mặc định: Asia/Ho_Chi_Minh), chỉ áp dụng khi có period
 * @returns {Array} Nếu không có period: [{ paidBy, fullName, totalPayments, totalAmount }]
 *                  Nếu có period:      [{ paidBy, fullName, periodBucket, totalPayments, totalAmount }]
 */
const getPaymentStatsByUser = asyncHandler(async (req, res) => {
    try {
        const { from, to, period, timezone } = req.query;

        // Whitelist period để tránh SQL injection khi interpolate vào DATE_TRUNC
        const validPeriods = [undefined, null, '', 'day', 'week', 'month', 'year'];
        if (!validPeriods.includes(period)) {
            return res.status(400).json({
                success: false,
                message: 'period không hợp lệ (chấp nhận: day | week | month | year hoặc bỏ trống)',
            });
        }

        // Parse ngày an toàn (nếu có)
        const parseDate = (v) => {
            if (v === undefined || v === null || v === '') return undefined;
            const d = new Date(v);
            return Number.isNaN(d.getTime()) ? null : d;
        };

        const fromDate = parseDate(from);
        const toDate = parseDate(to);

        if (from !== undefined && fromDate === null) {
            return res
                .status(400)
                .json({ success: false, message: 'Tham số from không phải datetime hợp lệ' });
        }
        if (to !== undefined && toDate === null) {
            return res
                .status(400)
                .json({ success: false, message: 'Tham số to không phải datetime hợp lệ' });
        }
        if (fromDate && toDate && fromDate >= toDate) {
            return res.status(400).json({
                success: false,
                message: 'Khoảng thời gian không hợp lệ: from phải nhỏ hơn to',
            });
        }

        const stats = await SupplierTransactionPayment.getPaymentStatsByUser({
            from: fromDate,
            to: toDate,
            period: period || null, // chuẩn hoá rỗng -> null
            timezone: timezone || 'Asia/Ho_Chi_Minh',
        });

        return res.status(200).json({
            success: true,
            data: stats,
            message: 'Thống kê thanh toán theo người dùng',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê thanh toán theo user',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thống kê thanh toán theo tháng
 * @route   GET /api/supplier-transaction-payments/stats/by-month
 * @access  Private (Admin, Manager, Accountant)
 * @return  {Array} Mảng các đối tượng { month: 'YYYY-MM', totalPaid: number, paymentCount: number }
 */
const getPaymentStatsByMonth = asyncHandler(async (req, res) => {
    try {
        const stats = await SupplierTransactionPayment.getPaymentStatsByMonth();

        res.status(200).json({
            success: true,
            data: stats,
            message: 'Thống kê thanh toán theo tháng',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê thanh toán theo tháng',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa tất cả payments của một transaction
 * @route   DELETE /api/supplier-transaction-payments/transaction/:transId
 * @access  Private (Admin, Manager)
 * @param   {string} transId - Transaction ID
 */
const deletePaymentsByTransactionId = asyncHandler(async (req, res) => {
    const { transId } = req.params;

    if (!validateUuidFormat(transId)) {
        return res.status(400).json({
            success: false,
            message: 'ID giao dịch không hợp lệ',
        });
    }

    try {
        const deletedCount =
            await SupplierTransactionPayment.deletePaymentsByTransactionId(transId);

        res.status(200).json({
            success: true,
            message: `Đã xóa ${deletedCount} thanh toán của giao dịch`,
            data: { deletedCount },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa thanh toán của giao dịch',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa nhiều payments cùng lúc
 * @route   DELETE /api/supplier-transaction-payments/bulk
 * @access  Private Admin only
 * @body    {string[]} ids - Danh sách Payment IDs
 */
const deleteBulkSupplierTransactionPayments = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Danh sách ID thanh toán không hợp lệ',
        });
    }

    try {
        const deletedCount = await SupplierTransactionPayment.deleteMany(ids);

        res.status(200).json({
            success: true,
            message: `Đã xóa ${deletedCount} thanh toán`,
            data: {
                deletedCount,
                totalRequested: ids.length,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa hàng loạt thanh toán',
            error: error.message,
        });
    }
});

module.exports = {
    // Basic CRUD
    getSupplierTransactionPayments,
    createSupplierTransactionPayment,
    getSupplierTransactionPaymentById,
    updateSupplierTransactionPayment,
    deleteSupplierTransactionPayment,

    // Specialized queries
    getPaymentsByTransactionId,
    getPaymentsByPaidBy,
    getPaymentsByCreatedBy,
    deletePaymentsByTransactionId,

    // Business logic
    calculateTotalPaidAmount,
    getPaymentStatsByUser,
    getPaymentStatsByMonth,

    // Bulk operations
    deleteBulkSupplierTransactionPayments,
};
