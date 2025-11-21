const asyncHandler = require('express-async-handler');
const sepayConfig = require('@config/sepayConfig');
const LogSepay = require('@src/models/LogSepay');
const SupplierTransactionCombined = require('@src/models/SupplierTransactionCombined');
const SupplierTransactionPayments = require('@src/models/SupplierTransactionPayments');
const SalesInvoice = require('@src/models/SalesInvoices');
const SalesInvoiceItem = require('@src/models/SalesInvoiceItems');
const PaymentsCombined = require('@src/models/PaymentsCombined');
const Customers = require('@src/models/Customers');

// Import 2 service mới
const { generateReceiptImage } = require('@src/services/imageGeneratorService');
const { uploadBufferToR2 } = require('@src/services/r2UploadService');

// SePay sẽ gửi một request với phương thức là POST, với nội dung gửi như sau:
// {
//     "id": 92704,                              // ID giao dịch trên SePay
//     "gateway":"Vietcombank",                  // Brand name của ngân hàng
//     "transactionDate":"2023-03-25 14:02:37",  // Thời gian xảy ra giao dịch phía ngân hàng
//     "accountNumber":"0123499999",              // Số tài khoản ngân hàng
//     "code":null,                               // Mã code thanh toán (sepay tự nhận diện dựa vào cấu hình tại Công ty -> Cấu hình chung)
//     "content":"chuyen tien mua iphone",        // Nội dung chuyển khoản
//     "transferType":"in",                       // Loại giao dịch. in là tiền vào, out là tiền ra
//     "transferAmount":2277000,                  // Số tiền giao dịch
//     "accumulated":19077000,                    // Số dư tài khoản (lũy kế)
//     "subAccount":null,                         // Tài khoản ngân hàng phụ (tài khoản định danh),
//     "referenceCode":"MBVCB.3278907687",         // Mã tham chiếu của tin nhắn sms
//     "description":""                           // Toàn bộ nội dung tin nhắn sms
// }

// =================================================================
// CONTROLLER CHÍNH (Entry Point)
// =================================================================

/**
 * @desc    Xử lý webhook từ SePay
 * @route   POST /api/payments/sepay-webhook
 */
const handleSepayWebhook = asyncHandler(async (req, res) => {
    const payload = req.body;
    const secureToken = req.headers['authorization']
        ? req.headers['authorization'].split(' ')[1]
        : null;

    // === BƯỚC 1: XÁC THỰC WEBHOOK ===
    if (secureToken !== sepayConfig.apiKey) {
        return res.status(401).json({ success: false, message: 'Invalid secure token' });
    }

    // === BƯỚC 2: PHẢN HỒI 200 OK NGAY LẬP TỨC ===
    res.status(200).json({ success: true, message: 'Webhook received' });

    // === BƯỚC 3: XỬ LÝ DỮ LIỆU (BẤT ĐỒNG BỘ) ===
    try {
        console.log(
            '=========================== XỬ LÝ WEBHOOK SEPAY MỚI ==========================='
        );
        console.log('Đã nhận và xác thực webhook thành công. Bắt đầu xử lý dữ liệu...');

        // === BƯỚC 3.1: TẠO ẢNH CHỨNG TỪ VÀ UPLOAD LÊN R2 ===
        let evidenceUrl = null;
        try {
            console.log('🔄 Bắt đầu tạo ảnh chứng từ...');
            const imageBuffer = await generateReceiptImage(payload);
            evidenceUrl = await uploadBufferToR2(imageBuffer, 'image/png', 'png', 'sepay-evidence');
            console.log(`✅ Đã tạo và upload ảnh chứng từ thành công: ${evidenceUrl}`);
        } catch (imgError) {
            console.error('❌ Lỗi khi tạo hoặc upload ảnh chứng từ:', imgError.message);
        }

        // === BƯỚC 3.2: LƯU GIAO DỊCH VÀO DB (Ghi log mọi giao dịch) ===
        await LogSepay.create(payload, evidenceUrl);

        // === BƯỚC 3.3: BÓC TÁCH NỘI DUNG & TIỀN TỐ ===
        // Nội dung mẫu MỚI: "IMP091025C8F23A THANH TOAN HOA DON"
        const description = (payload.content || '').toUpperCase();

        // === THAY ĐỔI: ĐÃ XÓA ===
        // 1. Đã XÓA bỏ bước kiểm tra ký tự '#' ở ĐẦU TIÊN
        // if (!description.startsWith('#')) { ... }

        // 2. Tìm khoảng trắng ĐẦU TIÊN để tách Mã code ra khỏi Nội dung
        const firstSpaceIndex = description.indexOf(' ');

        if (firstSpaceIndex === -1) {
            // Không tìm thấy khoảng trắng (vd: "IMP12345") -> Nội dung không hợp lệ
            console.log(`Giao dịch bị bỏ qua do thiếu nội dung sau Mã code: "${description}"`);
            await LogSepay.updateStatus(payload.id, 'ignored_invalid_content');
            return; // Dừng xử lý
        }

        // === THAY ĐỔI: ĐÃ SỬA ===
        // 3. Bóc tách Mã code (lấy từ index 0 thay vì 1) và Nội dung
        const fullOrderCode = description.substring(0, firstSpaceIndex).trim(); // Sửa từ substring(1, ...)
        const remainingContent = description.substring(firstSpaceIndex).trim();

        // 4. Kiểm tra Mã code
        if (!fullOrderCode || fullOrderCode.length < 3) {
            console.log(
                `Giao dịch bị bỏ qua do Mã code không hợp lệ (trước khoảng trắng): "${description}"`
            );
            await LogSepay.updateStatus(payload.id, 'ignored_invalid_code');
            return; // Dừng xử lý
        }

        // 5. Kiểm tra Nội dung
        const contentPrefix = (
            sepayConfig.transferContentPrefix || 'THANH TOAN HOA DON'
        ).toUpperCase();

        if (remainingContent !== contentPrefix) {
            console.log(
                `Giao dịch bị bỏ qua do nội dung không khớp. Nhận: [${remainingContent}] | Mong đợi: [${contentPrefix}]`
            );
            await LogSepay.updateStatus(payload.id, 'ignored_invalid_content');
            return; // Dừng xử lý
        }

        // 6. Bóc tách tiền tố: "IMP" (Logic này vẫn đúng)
        const transactionPrefix = fullOrderCode.substring(0, 3);
        // Chuyển đổi fullOrderCode "IMP091025C8F23A" -> fullOrderCode "IMP-091025-C8F23A"
        const fullOrderCodeFormatted = `${transactionPrefix}-${fullOrderCode.substring(3, 9)}-${fullOrderCode.substring(9)}`;

        // ✅ UPDATED: Cập nhật thông tin đã bóc tách vào log
        await LogSepay.updateStatus(
            payload.id,
            'received', // Keep current status
            null, // No error
            transactionPrefix,
            fullOrderCodeFormatted
        );

        // === BƯỚC 3.4: GỌI HÀM ĐIỀN PHỐI ===
        // Chuyển giao logic xử lý nghiệp vụ cho router
        await routeTransaction(transactionPrefix, fullOrderCodeFormatted, payload, evidenceUrl);
    } catch (error) {
        // Lỗi nghiêm trọng (vd: sập DB ở BƯỚC 3.2)
        console.error('Lỗi nghiêm trọng khi xử lý webhook (trước khi điều phối):', error);
        if (payload && payload.id) {
            // ✅ UPDATED: Cập nhật lỗi vào log
            await LogSepay.updateStatus(payload.id, 'system_error', error.message);
        }
    }
});

// =================================================================
// HÀM ĐIỀU PHỐI (ROUTER)
// =================================================================

/**
 * Hàm điều phối, gọi hàm xử lý tương ứng dựa trên tiền tố
 * @param {string} prefix 3 chữ cái đầu của mã code (vd: "IMP")
 * @param {string} fullOrderCode Toàn bộ mã code (vd: "IMP-091025-C8F23A")
 * @param {object} payload Toàn bộ payload từ SePay
 * @param {string|null} evidenceUrl URL ảnh chứng từ trên R2 (nếu có)
 */
async function routeTransaction(prefix, fullOrderCode, payload, evidenceUrl) {
    try {
        let result;

        // Dùng switch để gọi hàm tương ứng
        switch (prefix) {
            case 'EXP': // Trường hợp: Thanh toán Hóa đơn Trả hàng cho Supplier
                result = await handleExportPaymentForSupplier(fullOrderCode, payload, evidenceUrl);
                break;

            case 'INV': // Trường hợp: Thanh toán Hóa đơn Bán hàng
                result = await handleSalesPayment(fullOrderCode, payload, evidenceUrl);
                break;

            case 'CUS': // Trường hợp: Thanh toán hóa đơn do khách hàng tự chuyển khoản (số tiền do khách tự quyết định)
                result = await handleCustomersPayment(fullOrderCode, payload, evidenceUrl);
                break;
            case 'ORD': // Trường hợp: Thanh toán Đơn hàng (số tiền do khách tự quyết định)
                result = await handleOrderPayment(fullOrderCode, payload, evidenceUrl);
                break;

            default:
                result = await handleUnknownTransaction(prefix, fullOrderCode, evidenceUrl);
        }

        // ✅ UPDATED: Cập nhật trạng thái cuối cùng sau khi xử lý nghiệp vụ
        if (result.success) {
            console.log(
                `Xử lý thành công cho [${prefix}] code: ${fullOrderCode}, Số tiền: ${payload.transferAmount}`
            );
            console.log(
                '================================= END OF LOG =================================='
            );
            await LogSepay.updateStatus(payload.id, 'processed_success');
        } else {
            console.error(
                `Lỗi khi xử lý [${prefix}] code: ${fullOrderCode}. Lỗi: ${result.message}`
            );
            await LogSepay.updateStatus(payload.id, 'processed_failed', result.message);
        }
    } catch (error) {
        // ✅ UPDATED: Lỗi nghiêm trọng trong quá trình điều phối hoặc xử lý
        console.error(`Lỗi hệ thống khi định tuyến giao dịch [${prefix}]: ${error.message}`);
        await LogSepay.updateStatus(payload.id, 'router_system_error', error.message);
    }
}

// =================================================================
// ✅ NEW: API ENDPOINTS CHO QUẢN LÝ LOGS
// =================================================================

/**
 * @desc    Lấy danh sách logs SePay với filter và phân trang
 * @route   GET /api/payments/sepay-logs
 * @access  Private (Admin, Manager, Accountant)
 */
const getSepayLogs = asyncHandler(async (req, res) => {
    const {
        q,
        status,
        transactionPrefix,
        transferType,
        fromDate,
        toDate,
        minAmount,
        maxAmount,
        limit,
        offset,
    } = req.query;

    const currentUser = req.user;

    // Kiểm tra quyền
    if (!['admin', 'manager', 'accountant'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem logs SePay',
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

    try {
        // Gọi song song để tối ưu hiệu suất
        const [logs, total] = await Promise.all([
            LogSepay.listLogs({
                q: q ? q.trim() : undefined,
                status,
                transactionPrefix,
                transferType,
                fromDate,
                toDate,
                minAmount,
                maxAmount,
                limit: finalLimit,
                offset: parsedOffset,
            }),
            LogSepay.countLogs({
                q: q ? q.trim() : undefined,
                status,
                transactionPrefix,
                transferType,
                fromDate,
                toDate,
                minAmount,
                maxAmount,
            }),
        ]);

        res.status(200).json({
            success: true,
            data: logs,
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
            message: 'Lỗi khi lấy danh sách logs SePay',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thống kê logs SePay theo trạng thái
 * @route   GET /api/payments/sepay-logs/stats
 * @access  Private (Admin, Manager, Accountant)
 */
const getSepayLogsStats = asyncHandler(async (req, res) => {
    const currentUser = req.user;

    // Kiểm tra quyền
    if (!['admin', 'manager', 'accountant'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem thống kê logs SePay',
        });
    }

    try {
        const stats = await LogSepay.getStatsByStatus();

        res.status(200).json({
            success: true,
            data: stats,
            message: 'Thống kê logs SePay theo trạng thái',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê logs SePay',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy chi tiết log SePay theo ID
 * @route   GET /api/payments/sepay-logs/:id
 * @access  Private (Admin, Manager, Accountant)
 */
const getSepayLogById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const currentUser = req.user;

    // Kiểm tra quyền
    if (!['admin', 'manager', 'accountant'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem chi tiết logs SePay',
        });
    }

    try {
        const log = await LogSepay.findById(id);

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy log SePay',
            });
        }

        res.status(200).json({
            success: true,
            data: log,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết log SePay',
            error: error.message,
        });
    }
});

// =================================================================
// CÁC HÀM XỬ LÝ NGHIỆP VỤ CHUYÊN BIỆT
// =================================================================

/**
 * Xử lý thanh toán Hóa đơn Trả hàng cho Supplier (Tiền tố: EXP)
 * @param {string} orderCode Mã hóa đơn (vd: "EXP-091025-C8F23A")
 * @param {object} payload Toàn bộ payload từ SePay
 * @param {string|null} evidenceUrl URL ảnh chứng từ trên R2 (nếu có)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function handleExportPaymentForSupplier(orderCode, payload, evidenceUrl) {
    console.log(`Đang xử lý thanh toán cho hóa đơn xuất hàng(supplier): ${orderCode}`);

    try {
        // === BƯỚC 1: Tìm giao dịch nhà cung cấp theo mã hóa đơn ===
        const transaction = await SupplierTransactionCombined.findTransactionByDocNo(orderCode);
        if (!transaction) {
            return {
                success: false,
                message: `Không tìm thấy giao dịch nhà cung cấp với mã ${orderCode}`,
            };
        }

        // Kiểm tra trạng thái giao dịch
        if (transaction.status === 'paid') {
            return {
                success: false,
                message: `Hóa đơn ${orderCode} đã được thanh toán trước đó`,
            };
        }

        // === BƯỚC 2: Tạo bản ghi thanh toán mới ===
        const paymentData = {
            transId: transaction.id, // ID của giao dịch
            amount: payload.transferAmount, // Số tiền thanh toán
            paidAt: payload.transactionDate || new Date(), // Thời gian thanh toán
            paidBy: '00000000-0000-0000-0000-000000000001', // Không có thông tin người thanh toán (do thanh toán qua ngân hàng)
            createdBy: '00000000-0000-0000-0000-000000000001', // Không có thông tin người tạo (do webhook tự động)
            evdUrl: evidenceUrl, // URL ảnh chứng từ (nếu có)
            note: `Thanh toán tự động qua SePay - Mã giao dịch: ${payload.id}`,
        };

        const paymentRecord =
            await SupplierTransactionPayments.createSupplierTransactionPayment(paymentData);

        console.log(`Đã tạo bản ghi thanh toán: ${paymentRecord.id}`);

        // === BƯỚC 3: (Đã có trigger câp nhật paid_amount và total_amount)
        // === Lấy thông tin giao dịch sau khi cập nhật ===
        const transactionUpdated =
            await SupplierTransactionCombined.findTransactionByDocNo(orderCode);
        const totalPaidAmount = transactionUpdated.paidAmount;
        const totalAmount = transactionUpdated.totalAmount;
        const updatedStatus = transactionUpdated.status;
        const remainingAmount = totalAmount - totalPaidAmount;

        console.log(
            `Cập nhật giao dịch ${orderCode} - Số tiền: ${payload.transferAmount}: Trạng thái - ${updatedStatus}, Tổng đã thanh toán - ${totalPaidAmount}, Còn lại - ${remainingAmount}`
        );
        return {
            success: true,
            message: `Thanh toán thành công cho hóa đơn ${orderCode} - Số tiền: ${payload.transferAmount} - Trạng thái hiện tại: ${updatedStatus} - Tổng đã thanh toán: ${totalPaidAmount} - Còn lại: ${remainingAmount}`,
        };
    } catch (error) {
        console.error(`Lỗi khi xử lý thanh toán cho hóa đơn ${orderCode}:`, error.message);
        console.log(
            '================================= END OF LOG =================================='
        );
        return {
            success: false,
            message: `Lỗi khi xử lý thanh toán cho hóa đơn ${orderCode}: ${error.message}`,
        };
    }
}

/**
 * Xử lý thanh toán Hóa đơn Bán hàng (Tiền tố: INV) (Sales Invoice)
 * @param {string} orderCode Mã hóa đơn (vd: "INV-091025-C8F23A")
 * @param {object} payload Toàn bộ payload từ SePay
 * @param {string|null} evidenceUrl URL ảnh chứng từ trên R2 (nếu có)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function handleSalesPayment(orderCode, payload, evidenceUrl) {
    console.log(`Đang xử lý thanh toán cho hóa đơn bán hàng(customer): ${orderCode}`);

    try {
        // === BƯỚC 1: Tìm giao dịch khách hàng theo mã hóa đơn ===
        const invoice = await SalesInvoice.findInvoiceWithCustomerByInvoiceNo(orderCode);
        if (!invoice) {
            return {
                success: false,
                message: `Không tìm thấy hóa đơn bán hàng với mã ${orderCode}`,
            };
        }

        // Kiểm tra trạng thái hóa đơn
        if (invoice.status === 'paid') {
            return {
                success: false,
                message: `Hóa đơn bán hàng ${orderCode} đã được thanh toán trước đó`,
            };
        }

        console.log(
            `Tìm thấy hóa đơn bán hàng ${orderCode} - Số tiền cần thanh toán: ${invoice.remainingReceivables}`
        );
        // === BƯỚC 2: Cập nhật thanh toán cho hóa đơn ===
        // Tạo payment với allocations
        const webhookPayment = await PaymentsCombined.createPaymentFromWebhook({
            customerId: invoice.customerId, // ID khách hàng
            amount: payload.transferAmount, // Số tiền thanh toán
            transactionDate: payload.transactionDate, // Thời gian giao dịch
            evdUrl: evidenceUrl, // ✅ UPDATED: Evidence URL từ R2
            transactionId: payload.id, // ID giao dịch từ SePay
            invoiceId: invoice.id, // Mã id hóa đơn (tìm từ orderCode)
            receivedBy: '00000000-0000-0000-0000-000000000001', // Không có thông tin người nhận (do thanh toán qua ngân hàng)
        });
        console.log(`Đã tạo bản ghi thanh toán cho hóa đơn bán hàng: ${webhookPayment.id}`);

        // === BƯỚC 3: Lấy thông tin hóa đơn sau khi cập nhật ===
        const updatedInvoice = await SalesInvoice.findInvoiceWithCustomerByInvoiceNo(orderCode);
        const totalPaidAmount = updatedInvoice.actualReceivables;
        const updatedStatus = updatedInvoice.status;
        const remainingAmount = updatedInvoice.remainingReceivables;
        console.log(
            `Cập nhật hóa đơn bán hàng ${orderCode} - Số tiền: ${payload.transferAmount}: Trạng thái - ${updatedStatus}, Tổng đã thanh toán - ${totalPaidAmount}, Còn lại - ${remainingAmount}`
        );
        return {
            success: true,
            message: `Thanh toán thành công cho hóa đơn bán hàng ${orderCode} - Số tiền: ${payload.transferAmount} - Trạng thái hiện tại: ${updatedStatus} - Tổng đã thanh toán: ${totalPaidAmount} - Còn lại: ${remainingAmount}`,
        };
    } catch (error) {
        console.error(`Lỗi khi xử lý thanh toán cho hóa đơn bán hàng ${orderCode}:`, error.message);
        console.log(
            '================================= END OF LOG =================================='
        );
        return {
            success: false,
            message: `Lỗi khi xử lý thanh toán cho hóa đơn bán hàng ${orderCode}: ${error.message}`,
        };
    }
}

/**
 * Xử lý Thanh toán do khách hàng tự chuyển khoản (số tiền do khách tự quyết định) (Tiền tố: CUS)
 * @param {string} orderCode Mã tham chiếu (vd: "CUS-KH1234-567890")
 * @param {object} payload Toàn bộ payload từ SePay
 * @param {string|null} evidenceUrl URL ảnh chứng từ trên R2 (nếu có)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function handleCustomersPayment(orderCode, payload, evidenceUrl) {
    console.log(`Đang xử lý thanh toán do khách hàng tự chuyển khoản: ${orderCode}`);
    try {
        // === BƯỚC 1: Tìm khách hàng theo mã tham chiếu ===
        const customer = await Customers.findByCode(orderCode);
        if (!customer) {
            return {
                success: false,
                message: `Không tìm thấy khách hàng với mã tham chiếu ${orderCode}`,
            };
        }
        const customerId = customer.id;
        console.log(`Tìm thấy khách hàng với mã tham chiếu ${orderCode} - ID: ${customerId}`);
        // === BƯỚC 2: Tạo bản ghi thanh toán mới cho khách hàng ===
        const paymentData = {
            customerId, // ID khách hàng
            amount: payload.transferAmount, // Số tiền thanh toán
            transactionDate: payload.transactionDate || new Date(), // Thời gian giao dịch
            evdUrl: evidenceUrl, // ✅ UPDATED: Evidence URL từ R2
            transactionId: payload.id, // ID giao dịch từ SePay
            receivedBy: '00000000-0000-0000-0000-000000000001', // Không có thông tin người nhận (do thanh toán qua ngân hàng)
        };
        const paymentRecord =
            await PaymentsCombined.createPaymentFromWebhookNoAllocation(paymentData);
        console.log(`Đã tạo bản ghi thanh toán cho khách hàng: ${orderCode}`);
        return {
            success: true,
            message: `Thanh toán thành công cho khách hàng ${orderCode} - Số tiền: ${payload.transferAmount}`,
        };
    } catch (error) {
        console.error(`Lỗi khi xử lý thanh toán cho khách hàng ${orderCode}:`, error.message);
        console.log(
            '================================= END OF LOG =================================='
        );
        return {
            success: false,
            message: `Lỗi khi xử lý thanh toán cho khách hàng ${orderCode}: ${error.message}`,
        };
    }
}

async function handleOrderPayment(orderCode, payload, evidenceUrl) {
    console.log(`Đang xử lý thanh toán đơn hàng: ${orderCode}`);
    try {
        // === BƯỚC 1: Tìm đơn hàng theo mã đơn hàng ===
        const invoice = await SalesInvoice.findInvoiceWithCustomerByOrderNo(orderCode);
        if (!invoice) {
            return {
                success: false,
                message: `Không tìm thấy đơn hàng với mã ${orderCode}`,
            };
        }
        const customerId = invoice.customerId;
        console.log(`Tìm thấy đơn hàng với mã ${orderCode} - ID Invoice: ${invoice.id}`);
        // === BƯỚC 2: Tạo bản ghi thanh toán mới cho đơn hàng ===
        const paymentData = {
            customerId, // ID khách hàng
            amount: payload.transferAmount, // Số tiền thanh toán
            transactionDate: payload.transactionDate || new Date(), // Thời gian giao dịch
            evdUrl: evidenceUrl, // ✅ UPDATED: Evidence URL từ R2
            transactionId: payload.id, // ID giao dịch từ SePay
            invoiceId: invoice.id, // Mã id hóa đơn (tìm từ orderCode)
            receivedBy: '00000000-0000-0000-0000-000000000001', // Không có thông tin người nhận (do thanh toán qua ngân hàng)
        };
        const paymentRecord = await PaymentsCombined.createPaymentFromWebhook(paymentData);
        console.log(`Đã tạo bản ghi thanh toán cho đơn hàng: ${orderCode}`);
        return {
            success: true,
            message: `Thanh toán thành công cho đơn hàng ${orderCode} - Số tiền: ${payload.transferAmount}`,
        };
    } catch (error) {
        console.error(`Lỗi khi xử lý thanh toán cho đơn hàng ${orderCode}:`, error.message);
        console.log(
            '================================= END OF LOG =================================='
        );
        return {
            success: false,
            message: `Lỗi khi xử lý thanh toán cho đơn hàng ${orderCode}: ${error.message}`,
        };
    }
}

/**
 * Xử lý các giao dịch không nhận diện được tiền tố
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function handleUnknownTransaction(prefix, orderCode) {
    console.warn(`Không nhận diện được tiền tố [${prefix}] cho code: ${orderCode}`);
    return { success: false, message: `Unknown transaction prefix: ${prefix}` };
}

module.exports = {
    // ✅ EXISTING: Webhook handler
    handleSepayWebhook,

    // ✅ NEW: Log management endpoints
    getSepayLogs,
    getSepayLogsStats,
    getSepayLogById,
};
