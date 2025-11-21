/* src/controllers/paymentsController.js */
const asyncHandler = require('express-async-handler');
const PaymentsCombined = require('@src/models/PaymentsCombined');
const SalesInvoice = require('@src/models/SalesInvoices');
const Customer = require('@src/models/Customers');

// Helper function để validate customer_id
const validateCustomerId = async (customerId) => {
    if (!customerId) throw new Error('Cần cung cấp Customer ID');

    const customer = await Customer.findById(customerId);
    if (!customer) {
        throw new Error('Customer không tồn tại');
    }
};

/**
 * Helper function để validate mảng allocations
 * @param {Array<object>} allocations - Mảng allocation từ body
 * @param {string} customerId - ID của khách hàng
 * @param {string} direction - Hướng thanh toán ('in' hoặc 'out')
 */
const validateAllocations = async (allocations, customerId, direction) => {
    if (!Array.isArray(allocations)) throw new Error('Allocations phải là một mảng');

    const seenInvoiceIds = new Set();

    for (const [index, allocation] of allocations.entries()) {
        if (!allocation.invoiceId || allocation.amount === undefined) {
            throw new Error(`Allocation thứ ${index + 1} phải có invoiceId và amount`);
        }

        const amountNum = parseFloat(allocation.amount);

        if (isNaN(amountNum) || amountNum <= 0) {
            throw new Error(`Số tiền (amount) của allocation thứ ${index + 1} phải là số dương`);
        }

        if (seenInvoiceIds.has(allocation.invoiceId)) {
            throw new Error(
                `Invoice ${allocation.invoiceId} ở allocation thứ ${index + 1} bị lặp lại trong danh sách`
            );
        }
        seenInvoiceIds.add(allocation.invoiceId);

        // Kiểm tra invoice tồn tại và thuộc về customer này
        const invoice = await SalesInvoice.findById(allocation.invoiceId);
        if (!invoice) {
            throw new Error(
                `Invoice ${allocation.invoiceId} ở allocation thứ ${index + 1} không tồn tại`
            );
        }

        if (invoice.customerId !== customerId) {
            throw new Error(
                `Invoice ${allocation.invoiceId} ở allocation thứ ${index + 1} không thuộc về customer này`
            );
        }

        if (invoice.status === 'cancelled') {
            throw new Error(
                `Invoice ${allocation.invoiceId} ở allocation thứ ${index + 1} đã bị hủy`
            );
        }

        // ✅ PHÂN BIỆT DIRECTION: 'in' vs 'out'
        if (direction === 'in') {
            // Payment IN: Kiểm tra remaining_receivables (thu tiền)
            const currentRemaining = parseFloat(invoice.remainingReceivables) || 0;

            console.log(`📊 Invoice ${invoice.invoiceNo} (CREATE - IN):`);
            console.log(`  - Current remaining receivables: ${currentRemaining}`);
            console.log(`  - New allocation: ${amountNum}`);

            if (amountNum > currentRemaining) {
                throw new Error(
                    `Số tiền thu (${amountNum}) cho invoice ${invoice.invoiceNo} vượt quá số tiền còn lại cần thu. ` +
                        `Số tiền tối đa có thể thu: ${currentRemaining}. ` +
                        `Công nợ còn lại hiện tại: ${currentRemaining}.`
                );
            }
        } else if (direction === 'out') {
            // Payment OUT: Kiểm tra refunded_out không vượt quá approved_returns (hoàn tiền)
            const approvedReturns = parseFloat(invoice.approvedReturns) || 0;
            const currentRefunded = parseFloat(invoice.refundedOut) || 0;
            const maxRefundAllowed = approvedReturns - currentRefunded;

            console.log(`📊 Invoice ${invoice.invoiceNo} (CREATE - OUT):`);
            console.log(`  - Approved returns: ${approvedReturns}`);
            console.log(`  - Already refunded: ${currentRefunded}`);
            console.log(`  - Max refund allowed: ${maxRefundAllowed}`);
            console.log(`  - New refund allocation: ${amountNum}`);

            if (amountNum > maxRefundAllowed) {
                throw new Error(
                    `Số tiền hoàn (${amountNum}) cho invoice ${invoice.invoiceNo} vượt quá số tiền được phép hoàn. ` +
                        `Số tiền tối đa có thể hoàn: ${maxRefundAllowed}. ` +
                        `Đã duyệt trả hàng: ${approvedReturns}, đã hoàn: ${currentRefunded}.`
                );
            }

            if (approvedReturns === 0) {
                throw new Error(
                    `Invoice ${invoice.invoiceNo} chưa có đơn trả hàng được duyệt nên không thể hoàn tiền.`
                );
            }
        } else {
            throw new Error(`Direction không hợp lệ: ${direction}`);
        }
    }
};

const validateAllocationsForUpdate = async (allocations, customerId, oldAllocations, direction) => {
    if (!Array.isArray(allocations)) throw new Error('Allocations phải là một mảng');

    const seenInvoiceIds = new Set();

    for (const [index, allocation] of allocations.entries()) {
        if (!allocation.invoiceId || allocation.amount === undefined) {
            throw new Error(`Allocation thứ ${index + 1} phải có invoiceId và amount`);
        }

        const amountNum = parseFloat(allocation.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new Error(`Số tiền (amount) của allocation thứ ${index + 1} phải là số dương`);
        }

        if (seenInvoiceIds.has(allocation.invoiceId)) {
            throw new Error(
                `Invoice ${allocation.invoiceId} ở allocation thứ ${index + 1} bị lặp lại trong danh sách`
            );
        }
        seenInvoiceIds.add(allocation.invoiceId);

        // Kiểm tra invoice tồn tại và thuộc về customer này
        const invoice = await SalesInvoice.findById(allocation.invoiceId);
        if (!invoice) {
            throw new Error(
                `Invoice ${allocation.invoiceId} ở allocation thứ ${index + 1} không tồn tại`
            );
        }

        if (invoice.customerId !== customerId) {
            throw new Error(
                `Invoice ${allocation.invoiceId} ở allocation thứ ${index + 1} không thuộc về customer này`
            );
        }

        if (invoice.status === 'cancelled') {
            throw new Error(
                `Invoice ${allocation.invoiceId} ở allocation thứ ${index + 1} đã bị hủy`
            );
        }

        // Tìm allocation cũ cho invoice này (nếu có)
        const oldAlloc = oldAllocations.find((oa) => oa.invoiceId === allocation.invoiceId);
        const oldAllocAmount = oldAlloc ? parseFloat(oldAlloc.amount) : 0;

        // ✅ PHÂN BIỆT DIRECTION: 'in' vs 'out'
        if (direction === 'in') {
            // Payment IN: Kiểm tra remaining_receivables
            const currentRemaining = parseFloat(invoice.remainingReceivables) || 0;
            const newRemainingReceivables = currentRemaining + oldAllocAmount - amountNum;

            console.log(`📊 Invoice ${invoice.invoiceNo} (UPDATE - IN):`);
            console.log(`  - Current remaining: ${currentRemaining}`);
            console.log(`  - Old allocation: ${oldAllocAmount}`);
            console.log(`  - New allocation: ${amountNum}`);
            console.log(`  - New remaining would be: ${newRemainingReceivables}`);

            if (newRemainingReceivables < 0) {
                const maxAllowedAmount = currentRemaining + oldAllocAmount;
                throw new Error(
                    `Số tiền thu (${amountNum}) cho invoice ${invoice.invoiceNo} vượt quá số tiền còn lại cần thu. ` +
                        `Số tiền tối đa có thể thu: ${maxAllowedAmount}. ` +
                        `Công nợ còn lại hiện tại: ${currentRemaining}.`
                );
            }
        } else if (direction === 'out') {
            // Payment OUT: Kiểm tra refunded_out không vượt quá approved_returns
            const approvedReturns = parseFloat(invoice.approvedReturns) || 0;
            const currentRefunded = parseFloat(invoice.refundedOut) || 0;
            const newRefundedOut = currentRefunded - oldAllocAmount + amountNum;

            console.log(`📊 Invoice ${invoice.invoiceNo} (UPDATE - OUT):`);
            console.log(`  - Approved returns: ${approvedReturns}`);
            console.log(`  - Current refunded: ${currentRefunded}`);
            console.log(`  - Old allocation: ${oldAllocAmount}`);
            console.log(`  - New allocation: ${amountNum}`);
            console.log(`  - New refunded would be: ${newRefundedOut}`);

            if (newRefundedOut > approvedReturns) {
                const maxAllowedAmount = approvedReturns - currentRefunded + oldAllocAmount;
                throw new Error(
                    `Số tiền hoàn (${amountNum}) cho invoice ${invoice.invoiceNo} vượt quá số tiền được phép hoàn. ` +
                        `Số tiền tối đa có thể hoàn: ${maxAllowedAmount}. ` +
                        `Đã duyệt trả hàng: ${approvedReturns}, đã hoàn: ${currentRefunded}.`
                );
            }

            if (approvedReturns === 0) {
                throw new Error(
                    `Invoice ${invoice.invoiceNo} chưa có đơn trả hàng được duyệt nên không thể hoàn tiền.`
                );
            }
        } else {
            throw new Error(`Direction không hợp lệ: ${direction}`);
        }
    }
};

/**
 * @desc     Lấy danh sách payments
 * @route    GET /api/payments
 * @query    {string} q - Từ khóa tìm kiếm (customer name, note)
 * @query    {string} customerId - Lọc theo khách hàng
 * @query    {string} method - Lọc theo phương thức thanh toán
 * @query    {string} direction - Lọc theo hướng thanh toán
 * @query    {string} receivedBy - Lọc theo người nhận
 * @query    {string} fromDate - Từ ngày
 * @query    {string} toDate - Đến ngày
 * @query    {number} minAmount - Số tiền tối thiểu
 * @query    {number} maxAmount - Số tiền tối đa
 * @query    {number} limit - (default: 20)
 * @query    {number} offset - (default: 0)
 * @return   {object} - Danh sách payments và phân trang
 */
const getPayments = asyncHandler(async (req, res) => {
    const {
        q,
        customerId,
        method,
        direction,
        receivedBy,
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

    // Validate method nếu có
    if (method && !['cash', 'bank', 'cod'].includes(method)) {
        return res
            .status(400)
            .json({ success: false, message: 'Method phải là cash, bank hoặc cod' });
    }

    // Validate direction nếu có
    if (direction && !['in', 'out'].includes(direction)) {
        return res.status(400).json({ success: false, message: 'Direction phải là in hoặc out' });
    }

    try {
        const filterOptions = {
            q: q ? q.trim() : undefined,
            customerId,
            method,
            direction,
            receivedBy,
            fromDate,
            toDate,
            minAmount,
            maxAmount,
        };

        // ✅ THÊM: Kiểm tra role và áp dụng filter theo managedBy
        const userRole = req.user.role;
        const userId = req.user.id;

        // Nếu là seller, chỉ xem payments của khách hàng do họ quản lý
        if (userRole === 'seller') {
            // Thêm filter managedBy để chỉ lấy payments của customers được quản lý bởi seller này
            filterOptions.managedBy = userId;
        }
        // Admin, manager, accountant có thể xem tất cả payments
        // Không cần thêm filter gì thêm

        const [payments, total] = await Promise.all([
            PaymentsCombined.listPayments({
                ...filterOptions,
                limit: parsedLimit,
                offset: parsedOffset,
            }),
            PaymentsCombined.countPayments(filterOptions),
        ]);

        res.status(200).json({
            success: true,
            data: payments,
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
 * @desc     Lấy thông tin payment theo ID
 * @route    GET /api/payments/:id
 * @param    {string} id - Payment ID
 * @return   {object} - Payment
 */
const getPaymentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
        return res.status(400).json({ success: false, message: 'ID payment không hợp lệ' });
    }

    try {
        const payment = await PaymentsCombined.findPaymentById(id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy payment' });
        }

        // ✅ THÊM: Kiểm tra quyền truy cập cho seller
        const userRole = req.user.role;
        const userId = req.user.id;

        if (userRole === 'seller') {
            // Kiểm tra customer có được quản lý bởi seller này không
            const customer = await Customer.findById(payment.customerId);
            if (!customer || customer.managedBy !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập payment này',
                });
            }
        }

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy payment',
            error: error.message,
        });
    }
});

/**
 * @desc     Tạo payment mới
 * @route    POST /api/payments
 * @body     {string} customerId - ID khách hàng (bắt buộc)
 * @body     {string} method - Phương thức thanh toán (cash/bank/cod)
 * @body     {string} direction - Hướng thanh toán (in/out)
 * @body     {number} amount - Số tiền (bắt buộc)
 * @body     {string} receivedAt - Thời gian nhận (optional)
 * @body     {string} note - Ghi chú (optional)
 * @body     {string} evdUrl - URL ảnh chứng từ (bắt buộc) ✅ THÊM
 * @body     {array} allocations - Mảng phân bổ thanh toán
 * Mỗi allocation: { invoiceId: string, amount: number, note: string }
 * @return   {object} - Payment vừa tạo
 */
const createPayment = asyncHandler(async (req, res) => {
    const {
        customerId,
        method = 'cash',
        direction = 'in',
        amount,
        receivedAt,
        note,
        evdUrl, // ✅ THÊM: Evidence URL
        allocations = [],
    } = req.body;
    console.log(req.body);
    const receivedBy = req.user.id; // Từ middleware authentication

    if (!customerId) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp customerId' });
    }

    if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Số tiền phải lớn hơn 0' });
    }

    // ✅ THÊM: Validate evdUrl
    if (!evdUrl || typeof evdUrl !== 'string' || evdUrl.trim() === '') {
        return res
            .status(400)
            .json({ success: false, message: 'Vui lòng cung cấp URL ảnh chứng từ (evdUrl)' });
    }

    // Validate method
    if (!['cash', 'bank', 'cod'].includes(method)) {
        return res
            .status(400)
            .json({ success: false, message: 'Method phải là cash, bank hoặc cod' });
    }

    // Validate direction
    if (!['in', 'out'].includes(direction)) {
        return res.status(400).json({ success: false, message: 'Direction phải là in hoặc out' });
    }

    try {
        // Validate song song
        await Promise.all([
            validateCustomerId(customerId), // Kiểm tra customer tồn tại
            allocations.length > 0
                ? validateAllocations(allocations, customerId, direction)
                : Promise.resolve(), // Kiểm tra allocations nếu có
        ]);

        // Kiểm tra tổng allocation không vượt quá số tiền payment
        if (allocations.length > 0) {
            const totalAllocation = allocations.reduce(
                (sum, alloc) => sum + parseFloat(alloc.amount),
                0
            );
            if (totalAllocation > parseFloat(amount)) {
                throw new Error(
                    `Tổng số tiền allocation (${totalAllocation}) vượt quá số tiền payment (${amount})`
                );
            }
        }

        const newPayment = await PaymentsCombined.createPayment({
            customerId,
            method,
            direction,
            amount: parseFloat(amount),
            receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
            receivedBy,
            note,
            evdUrl: evdUrl.trim(), // ✅ THÊM: Evidence URL
            allocations,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo payment thành công',
            data: newPayment,
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
            if (constraint?.includes('payment_allocations') && constraint?.includes('payment_id')) {
                return res.status(400).json({
                    success: false,
                    message: 'Allocation bị trùng lặp cho cùng một invoice',
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Lỗi trùng lặp dữ liệu',
                detail: error.detail,
            });
        }
        if (error.code === '23503') {
            // foreign_key_violation
            return res.status(400).json({
                success: false,
                message:
                    'Dữ liệu không hợp lệ: Customer ID, Invoice ID, hoặc User ID không tồn tại',
            });
        }
        if (error.code === '23514') {
            console.log('💥 Constraint violation:', error);
            // check_constraint_violation
            return res.status(400).json({
                success: false,
                message: error.message || 'Lỗi kiểm tra dữ liệu từ database',
                detail: error.detail,
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo payment',
            error: error.message,
        });
    }
});

/**
 * @desc     Cập nhật thông tin payment
 * @route    PUT /api/payments/:id
 * @param    {string} id - Payment ID
 * @body     {string} method - Phương thức thanh toán
 * @body     {string} direction - Hướng thanh toán
 * @body     {number} amount - Số tiền
 * @body     {string} receivedAt - Thời gian nhận
 * @body     {string} note - Ghi chú
 * @body     {string} evdUrl - URL ảnh chứng từ ✅ THÊM
 * @body     {array} allocations - Mảng allocations (cập nhật hoàn toàn)
 * @return   {object} - Payment đã cập nhật
 */
const updatePayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { method, direction, amount, receivedAt, note, evdUrl, allocations } = req.body; // ✅ THÊM: evdUrl

    try {
        const existingPayment = await PaymentsCombined.findPaymentById(id);
        if (!existingPayment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy payment' });
        }

        const updatePayload = {};

        if (method !== undefined) {
            if (!['cash', 'bank', 'cod'].includes(method)) {
                throw new Error('Method phải là cash, bank hoặc cod');
            }
            updatePayload.method = method;
        }

        if (direction !== undefined) {
            if (!['in', 'out'].includes(direction)) {
                throw new Error('Direction phải là in hoặc out');
            }
            updatePayload.direction = direction;
        }

        if (amount !== undefined) {
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error('Số tiền phải lớn hơn 0');
            }
            updatePayload.amount = amountNum;
        }

        if (receivedAt !== undefined) {
            updatePayload.receivedAt = new Date(receivedAt);
        }

        if (note !== undefined) {
            updatePayload.note = note;
        }

        // ✅ THÊM: Validate và cập nhật evdUrl
        if (evdUrl !== undefined) {
            if (typeof evdUrl !== 'string' || evdUrl.trim() === '') {
                throw new Error('URL ảnh chứng từ không hợp lệ');
            }
            updatePayload.evdUrl = evdUrl.trim();
        }

        // Nếu 'allocations' được cung cấp, validate và xử lý chúng
        if (allocations !== undefined) {
            // Lấy allocations cũ từ DB
            const oldAllocations = await PaymentsCombined.findAllocationsByPaymentId(id);

            // ✅ FIXED: Validate toàn bộ allocations mới (không chỉ allocationsToUpdate)
            await validateAllocationsForUpdate(
                allocations,
                existingPayment.customerId,
                oldAllocations,
                existingPayment.direction
            );

            // Kiểm tra tổng allocation không vượt quá số tiền payment
            const finalAmount = amount !== undefined ? parseFloat(amount) : existingPayment.amount;
            const totalAllocation = allocations.reduce(
                (sum, alloc) => sum + parseFloat(alloc.amount),
                0
            );

            if (totalAllocation > finalAmount) {
                throw new Error(
                    `Tổng số tiền allocation (${totalAllocation}) vượt quá số tiền payment (${finalAmount})`
                );
            }

            // ✅ FIXED: So sánh để xác định có thay đổi thực sự không
            const hasChanges =
                JSON.stringify(
                    allocations
                        .map((a) => ({
                            invoiceId: a.invoiceId,
                            amount: parseFloat(a.amount),
                            note: a.note || '',
                        }))
                        .sort((a, b) => a.invoiceId.localeCompare(b.invoiceId))
                ) !==
                JSON.stringify(
                    oldAllocations
                        .map((a) => ({
                            invoiceId: a.invoiceId,
                            amount: parseFloat(a.amount),
                            note: a.note || '',
                        }))
                        .sort((a, b) => a.invoiceId.localeCompare(b.invoiceId))
                );

            // ✅ FIXED: Chỉ update allocations nếu thực sự có thay đổi
            if (hasChanges) {
                console.log('🔄 Allocations have changes, will update');
                updatePayload.allocations = allocations;
            } else {
                console.log('✅ No allocation changes detected, skipping allocation update');
            }
        }

        const updatedPayment = await PaymentsCombined.updatePayment(id, updatePayload);

        res.status(200).json({
            success: true,
            message: 'Cập nhật payment thành công',
            data: updatedPayment,
        });
    } catch (error) {
        if (error.code === '23514') {
            // Check constraint violation (ví dụ: số tiền allocation vượt quá công nợ)
            return res.status(400).json({
                success: false,
                code: error.code,
                message: error.message || 'Lỗi kiểm tra dữ liệu từ database',
                detail: error.detail,
            });
        }
        if (!error.code) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật payment',
            error: error.message,
        });
    }
});

/**
 * @desc     Xóa payment
 * @route    DELETE /api/payments/:id
 * @param    {string} id - Payment ID
 * @return   {object} - Message thành công
 */
const deletePayment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const payment = await PaymentsCombined.findPaymentById(id);
        if (!payment) {
            return res
                .status(404)
                .json({ success: false, message: 'Không tìm thấy payment để xóa' });
        }

        // Kiểm tra an toàn - có thể thêm logic nghiệp vụ ở đây
        // Ví dụ: chỉ cho phép xóa nếu payment chưa có allocations hoặc trong khoảng thời gian nhất định

        await PaymentsCombined.deletePayment(id);
        res.status(200).json({ success: true, message: 'Xóa payment thành công' });
    } catch (error) {
        if (error.code === '23503') {
            // foreign_key_violation
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa payment vì còn dữ liệu liên quan',
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa payment',
            error: error.message,
        });
    }
});

/**
 * @desc     Lấy thống kê payments theo phương thức thanh toán
 * @route    GET /api/payments/stats/by-method
 * @query    {string} customerId - Lọc theo khách hàng
 * @query    {string} fromDate - Từ ngày
 * @query    {string} toDate - Đến ngày
 * @return   {object} - Thống kê theo phương thức
 */
const getPaymentStatsByMethod = asyncHandler(async (req, res) => {
    const { customerId, fromDate, toDate } = req.query;

    try {
        const stats = await PaymentsCombined.getPaymentStatsByMethod({
            customerId,
            fromDate,
            toDate,
        });

        res.status(200).json({
            success: true,
            data: stats,
            message: 'Thống kê payments theo phương thức thanh toán',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê payments',
            error: error.message,
        });
    }
});

/**
 * @desc     Lấy tổng số tiền đã nhận cho một invoice
 * @route    GET /api/payments/invoice/:invoiceId/total-received
 * @param    {string} invoiceId - Invoice ID
 * @return   {object} - Tổng số tiền đã nhận
 */
const getTotalReceivedForInvoice = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    try {
        const totalReceived = await PaymentsCombined.calculateTotalReceivedForInvoice(invoiceId);

        res.status(200).json({
            success: true,
            data: {
                invoiceId,
                totalReceived,
            },
            message: 'Tổng số tiền đã nhận cho invoice',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tính tổng số tiền đã nhận',
            error: error.message,
        });
    }
});

/**
 * @desc     Lấy allocations của một invoice
 * @route    GET /api/payments/invoice/:invoiceId/allocations
 * @param    {string} invoiceId - Invoice ID
 * @return   {object} - Danh sách allocations
 */
const getAllocationsByInvoiceId = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    try {
        const allocations = await PaymentsCombined.findAllocationsByInvoiceId(invoiceId);

        res.status(200).json({
            success: true,
            data: allocations,
            message: 'Danh sách allocations của invoice',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy allocations của invoice',
            error: error.message,
        });
    }
});

module.exports = {
    getPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment,
    getPaymentStatsByMethod,
    getTotalReceivedForInvoice,
    getAllocationsByInvoiceId,
};
