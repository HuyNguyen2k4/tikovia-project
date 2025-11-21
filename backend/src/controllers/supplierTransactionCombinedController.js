const asyncHandler = require('express-async-handler');
const SupplierTransactionCombined = require('@src/models/SupplierTransactionCombined');
const Supplier = require('@src/models/Suppliers');
const Department = require('@src/models/Departments');
const Product = require('@src/models/Products');
const UnitConversion = require('@src/models/UnitConversions');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { query } = require('@src/config/dbconnect');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

/* -------------------- Helpers -------------------- */

/**
 * @desc    Helper mới để validate và xử lý danh sách items
 * @param   {Array} items - Mảng items từ request body
 * @param   {string} transactionType - Loại giao dịch ('in' hoặc 'out')
 * @returns {object} - Trả về { validatedItems, productIds }
 * @throws  {Error} - Ném lỗi nếu có validation không thành công
 */
const validateAndProcessItems = (items, transactionType) => {
    const validatedItems = [];
    const productIds = [];

    for (const [index, item] of items.entries()) {
        const {
            productId,
            packQty,
            mainQty,
            unitPrice,
            expiryDate,
            lotId,
            packUnit,
            mainUnit,
            conversionRate,
        } = item;

        // --- Validate các trường chung ---
        if (!productId || unitPrice === undefined) {
            throw new Error(`Item ${index + 1}: productId và unitPrice là bắt buộc`);
        }
        if (!validateUuidFormat(productId)) {
            throw new Error(`Item ${index + 1}: productId không hợp lệ`);
        }

        // --- ✅ FIXED: Logic tính toán số lượng theo model mới ---
        let finalQty = 0;
        let conversionInfo = null;

        const parsedPackQty = parseFloat(packQty) || 0;
        const parsedMainQty = parseFloat(mainQty) || 0;
        const parsedConversionRate = parseFloat(conversionRate) || 0;

        // Kiểm tra ít nhất 1 trong 2 qty phải > 0
        if (parsedPackQty <= 0 && parsedMainQty <= 0) {
            throw new Error(`Item ${index + 1}: Phải có ít nhất packQty hoặc mainQty > 0`);
        }

        if (parsedPackQty > 0) {
            // ✅ Ưu tiên packQty: cần đầy đủ thông tin conversion
            if (!packUnit || !mainUnit || parsedConversionRate <= 0) {
                throw new Error(
                    `Item ${index + 1}: Khi dùng packQty, phải cung cấp packUnit, mainUnit và conversionRate > 0`
                );
            }

            // ✅ FIXED: Thực sự tính qty từ packQty * conversionRate
            finalQty = parsedPackQty * parsedConversionRate;

            console.log(
                `📊 Item ${index + 1}: packQty=${parsedPackQty} * conversionRate=${parsedConversionRate} = finalQty=${finalQty}`
            );

            // Chuẩn bị data cho unit conversion
            conversionInfo = {
                packUnit: packUnit.trim(),
                mainUnit: mainUnit.trim(),
                conversionRate: parsedConversionRate,
            };

            // Cảnh báo nếu có cả mainQty
            if (parsedMainQty > 0) {
                console.warn(`⚠️ Item ${index + 1}: Có cả packQty và mainQty, ưu tiên packQty`);
            }
        } else {
            // Chỉ có mainQty: sử dụng trực tiếp
            finalQty = parsedMainQty;
            conversionInfo = null;
        }

        if (finalQty <= 0) {
            throw new Error(`Item ${index + 1}: Số lượng cuối cùng phải > 0`);
        }

        // --- Validate theo loại giao dịch ---
        if (transactionType === 'in') {
            if (!expiryDate) {
                throw new Error(`Item ${index + 1}: expiryDate là bắt buộc cho nhập kho`);
            }
            validateDate(expiryDate, `Item ${index + 1} expiryDate`);
        } else if (transactionType === 'out') {
            if (lotId && !validateUuidFormat(lotId)) {
                throw new Error(`Item ${index + 1}: lotId không hợp lệ`);
            }
        }

        // --- ✅ FIXED: Xây dựng validated item với qty đã tính sẵn
        const validatedItem = {
            productId,
            qty: finalQty, // ✅ Luôn là số lượng đã quy đổi về mainUnit
            unitPrice: validateNonNegativeNumber(unitPrice, `Item ${index + 1} unitPrice`),
        };

        // Thêm các trường theo type
        if (transactionType === 'in') {
            validatedItem.expiryDate = expiryDate;
            if (conversionInfo) {
                validatedItem.conversionInfo = conversionInfo;
            }
            // ✅ THÊM: Truyền lotId nếu có (cho logic nhập vào lot cụ thể)
            if (lotId && validateUuidFormat(lotId)) {
                validatedItem.lotId = lotId;
            }
        } else if (transactionType === 'out' && lotId) {
            validatedItem.lotId = lotId;
        }

        console.log(`✅ Validated item ${index + 1}:`, {
            productId: validatedItem.productId,
            qty: validatedItem.qty,
            unitPrice: validatedItem.unitPrice,
            conversionInfo: validatedItem.conversionInfo,
        });

        validatedItems.push(validatedItem);
        productIds.push(productId);
    }

    return { validatedItems, productIds };
};

// Helper function để validate UUID format
const validateUuidFormat = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

// Helper function để validate số dương
const validatePositiveNumber = (value, fieldName) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
        throw new Error(`${fieldName} phải là số dương`);
    }
    return num;
};

// Helper function để validate số không âm
const validateNonNegativeNumber = (value, fieldName) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
        throw new Error(`${fieldName} phải là số không âm (>= 0)`);
    }
    return num;
};

// Helper function để validate date
const validateDate = (dateString, fieldName) => {
    if (!dateString) return null;
    const date = dayjs(dateString);
    if (!date.isValid()) {
        throw new Error(`${fieldName} không hợp lệ`);
    }
    return date.toDate();
};

// Helper function để format date sang Vietnam timezone
const formatToVietnamTime = (date) => {
    if (!date) return null;
    return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
};

// Helper function để validate entities exist
const validateEntitiesExist = async (supplierId, departmentId, productIds = []) => {
    // Check supplier
    if (supplierId) {
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            throw new Error('Không tìm thấy supplier');
        }
    }

    // Check department
    if (departmentId) {
        const department = await Department.findById(departmentId);
        if (!department) {
            throw new Error('Không tìm thấy department');
        }
    }

    // Check products
    for (const productId of productIds) {
        const product = await Product.findById(productId);
        if (!product) {
            throw new Error(`Không tìm thấy product với ID: ${productId}`);
        }
    }
};

/* -------------------- Main Controllers -------------------- */

/**
 * @desc    Lấy danh sách transactions với items
 * @route   GET /api/supplier-transactions-combined
 * @access  Private
 */
const getTransactions = asyncHandler(async (req, res) => {
    const {
        q,
        supplierId,
        departmentId,
        type,
        status,
        fromDate,
        toDate,
        limit,
        offset,
        includeItems,
        hasStock, // ✅ Đã có sẵn
    } = req.query;

    // Validate parameters
    const parsedLimit = Math.min(parseInt(limit) || 50, 200);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // Validate UUIDs
    if (supplierId && !validateUuidFormat(supplierId)) {
        return res.status(400).json({
            success: false,
            message: 'supplierId không hợp lệ',
        });
    }

    if (departmentId && !validateUuidFormat(departmentId)) {
        return res.status(400).json({
            success: false,
            message: 'departmentId không hợp lệ',
        });
    }

    // Validate type và status
    if (type && !['in', 'out'].includes(type)) {
        return res.status(400).json({
            success: false,
            message: 'type phải là "in" hoặc "out"',
        });
    }

    if (status && !['draft', 'pending', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'status không hợp lệ',
        });
    }

    // ✅ FIXED: Build filter object với hasStock được convert đúng
    const filters = {
        q: q ? q.trim() : undefined,
        supplierId,
        departmentId,
        type,
        status,
        fromDate,
        toDate,
        limit: parsedLimit,
        offset: parsedOffset,
        hasStock: hasStock === 'true' || hasStock === true, // ✅ Convert boolean đúng cách
    };

    try {
        // Fetch data
        const [transactions, total] = await Promise.all([
            SupplierTransactionCombined.listTransactions(filters),
            SupplierTransactionCombined.countTransactions(filters),
        ]);

        // Nếu includeItems=true thì lấy items cho từng transaction
        let transactionsWithItems = transactions;
        if (includeItems === 'true') {
            transactionsWithItems = await Promise.all(
                transactions.map(async (transaction) => {
                    const fullTransaction =
                        await SupplierTransactionCombined.findTransactionWithItemsById(
                            transaction.id
                        );
                    return fullTransaction || transaction;
                })
            );
        }

        res.status(200).json({
            success: true,
            data: transactionsWithItems,
            pagination: {
                total,
                limit: parsedLimit,
                offset: parsedOffset,
                hasMore: parsedOffset + parsedLimit < total,
            },
            filters: {
                applied: Object.keys(filters).filter((key) => filters[key] !== undefined),
                values: filters,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách transactions',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy chi tiết transaction với items
 * @route   GET /api/supplier-transactions-combined/:id
 * @access  Private
 */
const getTransactionById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!validateUuidFormat(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID không hợp lệ',
        });
    }

    const transaction = await SupplierTransactionCombined.findTransactionWithItemsById(id);
    if (!transaction) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy transaction',
        });
    }

    res.status(200).json({
        success: true,
        data: transaction,
    });
});

/**
 * @desc    Tạo một giao dịch nhập/xuất kho mới với logic qty mới
 * @route   POST /api/supplier-transactions-combined
 * @access  Private
 *
 * @body
 * @param {string} supplierId - (Bắt buộc) ID của nhà cung cấp
 * @param {string} departmentId - (Bắt buộc) ID của kho/phòng ban
 * @param {string} [type='in'] - Loại giao dịch: 'in' hoặc 'out'
 * @param {string} [transDate] - Ngày giao dịch (ISO 8601)
 * @param {string} [dueDate] - Ngày đáo hạn
 * @param {string} [note] - Ghi chú
 * @param {Array<object>} items - (Bắt buộc) Danh sách sản phẩm
 *
 * @item_structure - Cấu trúc item:
 * @param {string} productId - (Bắt buộc) ID sản phẩm
 * @param {number} [packQty] - Số lượng theo đơn vị đóng gói
 * @param {number} [mainQty] - Số lượng theo đơn vị cơ bản
 * @param {number} unitPrice - (Bắt buộc) Đơn giá cho 1 main_unit
 * @param {string} [packUnit] - Tên đơn vị đóng gói (bắt buộc nếu có packQty)
 * @param {string} [mainUnit] - Tên đơn vị cơ bản (bắt buộc nếu có packQty)
 * @param {number} [conversionRate] - Tỷ lệ quy đổi (bắt buộc nếu có packQty)
 * @param {string} expiryDate - Hạn sử dụng (bắt buộc cho type='in')
 * @param {string} [lotId] - ID lot cụ thể (cho type='in': nhập vào lot cụ thể, cho type='out': xuất từ lot cụ thể)
 *
 * @note
 * - **Logic qty**: Ưu tiên packQty nếu có, nếu không thì dùng mainQty
 * - **Logic nhập kho**: Nếu có lotId sẽ kiểm tra và nhập vào lot đó (productId, departmentId, expiryDate phải khớp)
 * - **Logic xuất kho**: Nếu có lotId xuất từ lot đó, nếu không thì auto FEFO
 * - **Unit conversion**: Chỉ tạo cho lot mới và khi có đầy đủ thông tin conversion
 */
const createTransactionWithItems = asyncHandler(async (req, res) => {
    const {
        supplierId,
        departmentId,
        transDate,
        type = 'in',
        dueDate,
        note,
        items = [],
    } = req.body;

    try {
        // Validate các trường chính
        if (!supplierId || !departmentId || !items.length) {
            return res
                .status(400)
                .json({ success: false, message: 'supplierId, departmentId và items là bắt buộc' });
        }
        if (!validateUuidFormat(supplierId) || !validateUuidFormat(departmentId)) {
            return res
                .status(400)
                .json({ success: false, message: 'supplierId hoặc departmentId không hợp lệ' });
        }
        if (!['in', 'out'].includes(type)) {
            return res
                .status(400)
                .json({ success: false, message: 'type phải là "in" hoặc "out"' });
        }

        // ✅ SỬ DỤNG HELPER MỚI ĐỂ VALIDATE ITEMS
        const { validatedItems, productIds } = validateAndProcessItems(items, type);

        // Validate các entities (supplier, department, products) có tồn tại không
        await validateEntitiesExist(supplierId, departmentId, productIds);

        // Gọi xuống Model để tạo transaction
        const newTransaction = await SupplierTransactionCombined.createTransactionWithItems({
            supplierId,
            departmentId,
            transDate,
            type,
            dueDate,
            note,
            items: validatedItems,
        });

        res.status(201).json({
            success: true,
            message: `Tạo transaction ${type === 'in' ? 'nhập kho' : 'xuất kho'} thành công`,
            data: newTransaction,
        });
    } catch (error) {
        console.error('Error in createTransactionWithItems:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Cập nhật một giao dịch nhập/xuất kho đã có.
 * Hỗ trợ cập nhật thông tin chính (nhà cung cấp, ngày tháng,...) và/hoặc toàn bộ danh sách chi tiết (items).
 * * @route   PUT /api/supplier-transactions-combined/:id
 * @access  Private
 * * @param {string} id - (Bắt buộc) ID của transaction cần cập nhật, lấy từ URL params.
 * * @body
 * @param {string} [supplierId] - ID mới của nhà cung cấp.
 * @param {string} [departmentId] - ID mới của kho/phòng ban.
 * @param {string} [type] - Loại giao dịch mới: 'in' hoặc 'out'.
 * @param {string} [transDate] - Ngày giao dịch mới.
 * @param {string} [dueDate] - Ngày đáo hạn mới.
 * @param {string} [note] - Ghi chú mới.
 * @param {string} [status] - Trạng thái mới ('draft', 'pending', 'paid', 'cancelled').
 * @param {Array<object>} [items] - Mảng các sản phẩm mới. **Nếu được cung cấp, danh sách items cũ sẽ bị xóa và thay thế hoàn toàn**.
 * * @item_structure - Cấu trúc của một object trong mảng `items` tương tự như khi tạo mới.
 * * @note
 * - **Logic cập nhật `items`**: Khi `items` được gửi lên, hàm sẽ thực hiện quy trình "hoàn tác và làm lại":
 * 1. Hoàn tác (revert) tất cả các thay đổi tồn kho mà giao dịch cũ đã gây ra.
 * 2. Xóa toàn bộ các `transaction_items` cũ.
 * 3. Xử lý danh sách `items` mới và tạo các bản ghi `transaction_items` và `unit_conversions` (nếu cần) giống hệt như logic của hàm tạo mới.
 * - **Không thể cập nhật**: Giao dịch sẽ không thể cập nhật nếu đã bị khóa bởi quản trị viên (`adminLocked: true`).
 * - Các lưu ý về logic số lượng (`packQty`/`mainQty`), `type: 'in'`, `type: 'out'` và `unitPrice` tương tự như khi tạo mới.
 * - **Tính toàn vẹn**: Toàn bộ hoạt động cập nhật được thực hiện trong một transaction của database.
 * * @returns {object} - Trả về một object JSON với `success: true` và `data` là thông tin chi tiết của transaction sau khi đã cập nhật.
 * @throws {400 - Bad Request} - Nếu dữ liệu đầu vào không hợp lệ hoặc giao dịch đã bị khóa.
 * @throws {404 - Not Found} - Nếu `id` của transaction không tồn tại.
 */
const updateTransactionWithItems = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { supplierId, departmentId, transDate, type, dueDate, note, status, items } = req.body;
    console.log('Received update request for transaction ID:', id, 'with body:', req.body);

    if (!validateUuidFormat(id)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }

    try {
        const existingTransaction = await SupplierTransactionCombined.findTransactionById(id);
        if (!existingTransaction) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy transaction' });
        }

        // Validate các trường chính (nếu có)
        if (supplierId && !validateUuidFormat(supplierId)) {
            return res.status(400).json({ success: false, message: 'supplierId không hợp lệ' });
        }
        // ... (thêm các validate khác cho departmentId, type, status nếu cần)

        let validatedItems = [];
        let productIds = [];

        // Chỉ validate items nếu chúng được gửi lên trong request body
        if (items && Array.isArray(items)) {
            const targetType = type || existingTransaction.type;
            // ✅ SỬ DỤNG HELPER MỚI ĐỂ VALIDATE ITEMS, SỬA LỖI VÀ LOẠI BỎ CODE LẶP
            const processedData = validateAndProcessItems(items, targetType);
            validatedItems = processedData.validatedItems;
            productIds = processedData.productIds;
        }

        await validateEntitiesExist(supplierId, departmentId, productIds);

        // Xây dựng payload để gửi xuống Model
        const updatePayload = {
            supplierId,
            departmentId,
            transDate,
            type,
            dueDate,
            note,
            status,
        };
        // Chỉ thêm `items` vào payload nếu nó đã được xử lý
        if (items && Array.isArray(items)) {
            updatePayload.items = validatedItems;
        }

        const updatedTransaction = await SupplierTransactionCombined.updateTransactionWithItems(
            id,
            updatePayload
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật transaction thành công',
            data: updatedTransaction,
        });
    } catch (error) {
        console.error('Error in updateTransactionWithItems:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Dán vào file: supplierTransactionCombinedController.js

/**
 * @desc    [MANAGER] Tạo một giao dịch nhập/xuất kho.
 * @note    Đây là phiên bản giới hạn của hàm tạo transaction chính.
 * Hàm này SẼ BỎ QUA bất kỳ `unitPrice` nào được gửi lên và TỰ ĐỘNG gán `unitPrice = 0` cho tất cả items.
 * Việc cập nhật giá sẽ do Accountant thực hiện sau.
 * @route   POST /api/supplier-transactions-combined/manager
 * @access  Private (Manager only)
 * @body
 * @param {string} supplierId - (Bắt buộc) ID của nhà cung cấp.
 * @param {string} departmentId - (Bắt buộc) ID của kho/phòng ban.
 * @param {Array<object>} items - (Bắt buộc) Mảng các sản phẩm trong giao dịch.
 * @item_structure {object} - Cấu trúc của một object trong mảng `items`:
 * @param {string} productId - (Bắt buộc) ID của sản phẩm.
 * @param {number} [packQty] - Số lượng theo đơn vị đóng gói (ví dụ: 2 thùng).
 * @param {number} [mainQty] - Số lượng theo đơn vị cơ bản (ví dụ: 48 lon).
 * @param {string} [packUnit] - Tên đơn vị đóng gói (VD: 'Thùng'). **Bắt buộc nếu dùng `packQty`**.
 * @param {string} [mainUnit] - Tên đơn vị cơ bản (VD: 'Lon'). **Bắt buộc nếu dùng `packQty`**.
 * @param {number} [conversionRate] - Tỷ lệ quy đổi (VD: 24). **Bắt buộc nếu dùng `packQty`**.
 * @param {string} expiryDate - Hạn sử dụng. **Bắt buộc cho `type: 'in'`**.
 *
 * @returns {object} - Trả về transaction vừa tạo với `total_amount = 0`.
 */
const createTransactionWithItemsForManager = asyncHandler(async (req, res) => {
    // Lấy các trường cần thiết từ body. Bỏ qua unitPrice từ input.
    const { supplierId, departmentId, transDate, type, dueDate, note, items } = req.body;

    try {
        // --- BƯỚC 1: XỬ LÝ VÀ LÀM SẠCH DỮ LIỆU ---

        // Lọc và chuẩn hóa items, đảm bảo unitPrice = 0
        const filteredItems = (items || []).map((item) => {
            const {
                productId,
                packQty,
                mainQty,
                expiryDate,
                lotId,
                packUnit,
                mainUnit,
                conversionRate,
            } = item;
            return {
                productId,
                packQty,
                mainQty,
                expiryDate,
                lotId,
                packUnit,
                mainUnit,
                conversionRate,
                unitPrice: 0, // Cố định unitPrice = 0
            };
        });

        // --- BƯỚC 2: VALIDATE DỮ LIỆU ĐÃ LÀM SẠCH ---

        // (Code validation giống hệt như trong hàm createTransactionWithItems của admin)
        // Gọi hàm helper đã tạo ở các bước trước
        const { validatedItems, productIds } = validateAndProcessItems(filteredItems, type || 'in');
        await validateEntitiesExist(supplierId, departmentId, productIds);

        // --- BƯỚC 3: GỌI XUỐNG MODEL ---

        const newTransaction = await SupplierTransactionCombined.createTransactionWithItems({
            supplierId,
            departmentId,
            transDate,
            type,
            dueDate,
            note,
            items: validatedItems,
        });

        // --- BƯỚC 4: TRẢ VỀ RESPONSE ---
        res.status(201).json({
            success: true,
            message: `Manager đã tạo transaction thành công`,
            data: newTransaction,
        });
    } catch (error) {
        console.error('Error in createTransactionWithItemsForManager:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc    [MANAGER] Cập nhật thông tin và danh sách items của một giao dịch.
 * @note    Phiên bản giới hạn này KHÔNG cho phép Manager thay đổi `unitPrice` của các items.
 * - Nếu một item trong danh sách mới đã tồn tại, `unitPrice` cũ của nó sẽ được giữ nguyên.
 * - Nếu một item được thêm mới vào giao dịch, `unitPrice` của nó sẽ được mặc định là 0.
 * - Manager cũng không được phép thay đổi `type` của giao dịch (in/out).
 * @route   PUT /api/supplier-transactions-combined/manager/:id
 * @access  Private (Manager only)
 * @param {string} id - (Bắt buộc) ID của transaction cần cập nhật, lấy từ URL params.
 * @body
 * @param {string} [supplierId] - ID mới của nhà cung cấp.
 * @param {string} [departmentId] - ID mới của kho/phòng ban.
 * @param {string} [note] - Ghi chú mới.
 * @param {string} [status] - Trạng thái mới.
 * @param {Array<object>} [items] - Danh sách items mới để thay thế hoàn toàn danh sách cũ. Cấu trúc item tương tự như khi tạo mới.
 *
 * @returns {object} - Trả về transaction sau khi đã cập nhật.
 */
const updateTransactionWithItemsForManager = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { supplierId, departmentId, transDate, dueDate, note, status, items } = req.body;

    try {
        // --- BƯỚC 1: LẤY DỮ LIỆU CŨ ĐỂ THAM CHIẾU ---
        const existingTransaction =
            await SupplierTransactionCombined.findTransactionWithItemsById(id);
        if (!existingTransaction) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy transaction' });
        }

        // Tạo một map để tra cứu unitPrice cũ của các item
        const oldPricesMap = new Map();
        existingTransaction.items.forEach((item) => {
            oldPricesMap.set(item.productId, item.unitPrice);
        });

        // --- BƯỚC 2: XỬ LÝ VÀ LÀM SẠCH DỮ LIỆU ---
        let itemsForUpdate = items;
        if (items && Array.isArray(items)) {
            itemsForUpdate = items.map((item) => ({
                ...item,
                // Giữ lại unitPrice cũ nếu item đã tồn tại, nếu là item mới thì giá là 0
                unitPrice: oldPricesMap.get(item.productId) || 0,
            }));
        }

        // --- BƯỚC 3: VALIDATE DỮ LIỆU ĐÃ LÀM SẠCH ---
        let validatedItems = [];
        let productIds = [];
        if (itemsForUpdate && Array.isArray(itemsForUpdate)) {
            const processedData = validateAndProcessItems(itemsForUpdate, existingTransaction.type);
            validatedItems = processedData.validatedItems;
            productIds = processedData.productIds;
        }
        await validateEntitiesExist(supplierId, departmentId, productIds);

        // --- BƯỚC 4: GỌI XUỐNG MODEL ---
        const updatePayload = { supplierId, departmentId, transDate, dueDate, note, status };
        if (itemsForUpdate && Array.isArray(itemsForUpdate)) {
            updatePayload.items = validatedItems;
        }

        const updatedTransaction = await SupplierTransactionCombined.updateTransactionWithItems(
            id,
            updatePayload
        );

        // --- BƯỚC 5: TRẢ VỀ RESPONSE ---
        res.status(200).json({
            success: true,
            message: 'Manager đã cập nhật transaction thành công',
            data: updatedTransaction,
        });
    } catch (error) {
        console.error('Error in updateTransactionWithItemsForManager:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc    [ACCOUNTANT] Cập nhật chỉ riêng `unitPrice` cho các items của một transaction.
 * @note    Đây là một nghiệp vụ chuyên biệt, chỉ thay đổi giá và tự động tính toán lại `total_amount` của transaction.
 * Hàm này KHÔNG xử lý tồn kho, không thêm/xóa items.
 * @route   PUT /api/supplier-transactions-combined/accountant/prices/:id
 * @access  Private (Accountant only)
 * @param {string} id - (Bắt buộc) ID của transaction cần cập nhật giá, lấy từ URL params.
 * @body
 * @param {Array<object>} items - (Bắt buộc) Mảng các item cần cập nhật giá.
 * @item_structure {object} - Cấu trúc của một object trong mảng `items` cho nghiệp vụ này:
 * @param {string} id - (Bắt buộc) ID của **supplier_transaction_item**, KHÔNG phải ID sản phẩm.
 * @param {number} unitPrice - (Bắt buộc) Đơn giá mới (là một số không âm).
 * @returns {object} - Trả về transaction với `total_amount` đã được tính toán lại.
 */
const updateTransactionWithItemsForAccountant = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { items } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res
            .status(400)
            .json({ success: false, message: 'Request body phải chứa mảng "items" không rỗng.' });
    }

    try {
        const sanitizedItems = items.map((item, index) => {
            const { productId: itemId, unitPrice } = item;
            if (
                !itemId ||
                !validateUuidFormat(itemId) ||
                unitPrice === undefined ||
                typeof unitPrice !== 'number' ||
                unitPrice < 0
            ) {
                throw new Error(
                    `Dữ liệu không hợp lệ ở item thứ ${index + 1}. Mỗi item phải có 'id' (UUID) và 'unitPrice' (số không âm).`
                );
            }
            return { productId: itemId, unitPrice };
        });

        // Gọi hàm model mới, chuyên dụng
        const updatedTransaction = await SupplierTransactionCombined.updateItemPrices(
            id,
            sanitizedItems
        );

        res.status(200).json({
            success: true,
            message: 'Accountant đã cập nhật giá thành công',
            data: updatedTransaction,
        });
    } catch (error) {
        console.error('Error in updateTransactionWithItemsForAccountant:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Xóa transaction với items
 * @route   DELETE /api/supplier-transactions-combined/:id
 * @access  Private
 */
const deleteTransactionWithItems = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!validateUuidFormat(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID không hợp lệ',
        });
    }

    try {
        const success = await SupplierTransactionCombined.deleteTransactionWithItems(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Xóa transaction và items thành công',
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Không thể xóa transaction',
            });
        }
    } catch (error) {
        console.error('Error in deleteTransactionWithItems:', error.message);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
});

/* -------------------- Analytics Controllers -------------------- */

/**
 * @desc    Lấy thống kê transactions
 * @route   GET /api/supplier-transactions-combined/stats/overview
 * @access  Private
 */
const getTransactionStats = asyncHandler(async (req, res) => {
    const { months } = req.query;
    const parsedMonths = Math.min(parseInt(months) || 12, 24);

    const stats = await SupplierTransactionCombined.getTransactionStats({
        months: parsedMonths,
    });

    res.status(200).json({
        success: true,
        data: stats,
        metadata: {
            months: parsedMonths,
            generatedAt: dayjs().tz('Asia/Ho_Chi_Minh').format(),
        },
    });
});

/**
 * @desc    Lấy top suppliers
 * @route   GET /api/supplier-transactions-combined/stats/top-suppliers
 * @access  Private
 */
const getTopSuppliers = asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 10, 50);

    const topSuppliers = await SupplierTransactionCombined.getTopSuppliers({
        limit: parsedLimit,
    });

    res.status(200).json({
        success: true,
        data: topSuppliers,
        metadata: {
            limit: parsedLimit,
            generatedAt: dayjs().tz('Asia/Ho_Chi_Minh').format(),
        },
    });
});

/**
 * @desc    Test timezone
 * @route   GET /api/supplier-transactions-combined/test-timezone
 * @access  Private
 */
const getTimezoneTest = asyncHandler(async (req, res) => {
    const now = new Date();

    res.status(200).json({
        success: true,
        data: {
            server_utc: now.toISOString(),
            server_vietnam: dayjs.utc(now).tz('Asia/Ho_Chi_Minh').format(),
            dayjs_vietnam: dayjs().tz('Asia/Ho_Chi_Minh').format(),
            sample_transaction: {
                docNo: await SupplierTransactionCombined.generateDocNo('in'),
                createdAt: dayjs().tz('Asia/Ho_Chi_Minh').format(),
            },
            timezone_info: {
                current_offset: dayjs().tz('Asia/Ho_Chi_Minh').format('Z'),
                timezone_name: 'Asia/Ho_Chi_Minh',
            },
        },
    });
});

/**
 * @desc Lấy danh sách lots có sẵn cho xuất kho
 * @route   GET /api/supplier-transactions-combined/available-lots/:productId/:departmentId
 * @access  Private
 * @query   requiredQty (optional) - nếu có thì lấy lots theo FEFO đủ cho số lượng này
 */
const getAvailableLotsForProduct = asyncHandler(async (req, res) => {
    const { productId, departmentId } = req.params;
    const { requiredQty } = req.query;

    // Validate UUIDs
    if (!validateUuidFormat(productId) || !validateUuidFormat(departmentId)) {
        return res.status(400).json({
            success: false,
            message: 'productId hoặc departmentId không hợp lệ',
        });
    }

    try {
        let availableLots;

        if (requiredQty) {
            // Lấy lots theo FEFO cho số lượng cụ thể
            const parsedQty = validatePositiveNumber(requiredQty, 'requiredQty');
            availableLots = await SupplierTransactionCombined.findAvailableLotsForOut(
                productId,
                departmentId,
                parsedQty
            );

            // ✅ FIXED: Format response cho FEFO selection
            availableLots = availableLots.map((lot) => ({
                lotId: lot.lotId,
                lotNo: lot.lotNo,
                expiryDate: formatToVietnamTime(lot.expiryDate),
                availableQty: lot.availableQty,
                useQty: lot.useQty, // Số lượng sẽ được sử dụng từ lot này
            }));
        } else {
            // ✅ UPDATED: Lấy tất cả lots có sẵn (loại bỏ join với unit_conversions)
            const sql = `
                SELECT 
                    il.id, il.lot_no, il.expiry_date, il.qty_on_hand, il.conversion_rate,
                    p.sku_code, p.name AS product_name, p.pack_unit, p.main_unit
                FROM inventory_lots il
                LEFT JOIN products p ON il.product_id = p.id
                WHERE il.product_id = $1 AND il.department_id = $2 AND il.qty_on_hand > 0
                ORDER BY il.expiry_date ASC, il.lot_no ASC
            `;
            const { rows } = await query(sql, [productId, departmentId]);

            availableLots = rows.map((row) => ({
                lotId: row.id,
                lotNo: row.lot_no,
                expiryDate: formatToVietnamTime(row.expiry_date),
                availableQty: parseFloat(row.qty_on_hand),
                skuCode: row.sku_code,
                productName: row.product_name,
                // ✅ UPDATED: Sử dụng conversion_rate từ inventory_lots và units từ products
                unitConversion:
                    row.conversion_rate > 1
                        ? {
                              packUnit: row.pack_unit,
                              mainUnit: row.main_unit,
                              conversionRate: parseFloat(row.conversion_rate) || 1,
                              // ✅ NEW: Tính số lượng theo pack unit
                              qtyInPackUnit:
                                  Math.round(
                                      (parseFloat(row.qty_on_hand) /
                                          parseFloat(row.conversion_rate)) *
                                          1000
                                  ) / 1000,
                          }
                        : null,
            }));
        }

        res.status(200).json({
            success: true,
            data: availableLots,
            metadata: {
                productId,
                departmentId,
                requestedQty: requiredQty ? parseFloat(requiredQty) : null,
                totalLots: availableLots.length,
                isFEFO: !!requiredQty,
            },
        });
    } catch (error) {
        console.error('Error in getAvailableLotsForProduct:', error.message);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * @desc Validate stock availability trước khi xuất kho
 * @route   POST /api/supplier-transactions-combined/validate-stock
 * @access  Private
 * @body   { departmentId, items: [{ productId, qty, lotId (optional) }] }
 */
const validateStockAvailability = asyncHandler(async (req, res) => {
    const { departmentId, items = [] } = req.body;

    if (!validateUuidFormat(departmentId)) {
        return res.status(400).json({
            success: false,
            message: 'departmentId không hợp lệ',
        });
    }

    try {
        const validationResults = [];

        for (const item of items) {
            const { productId, qty, lotId } = item;

            if (!productId || !qty) {
                continue; // Skip invalid items
            }

            const parsedQty = parseFloat(qty);
            if (parsedQty <= 0) continue;

            try {
                if (lotId) {
                    // Validate specific lot
                    const checkLotSql = `
                        SELECT il.lot_no, il.qty_on_hand, p.name AS product_name
                        FROM inventory_lots il
                        LEFT JOIN products p ON il.product_id = p.id
                        WHERE il.id = $1 AND il.product_id = $2 AND il.department_id = $3
                    `;
                    const { rows } = await query(checkLotSql, [lotId, productId, departmentId]);

                    if (!rows.length) {
                        validationResults.push({
                            productId,
                            lotId,
                            valid: false,
                            message: 'Lot không tồn tại',
                            availableQty: 0,
                        });
                    } else {
                        const lot = rows[0];
                        const availableQty = parseFloat(lot.qty_on_hand);

                        validationResults.push({
                            productId,
                            lotId,
                            lotNo: lot.lot_no,
                            productName: lot.product_name,
                            requestedQty: parsedQty,
                            availableQty,
                            valid: availableQty >= parsedQty,
                            message:
                                availableQty >= parsedQty
                                    ? 'OK'
                                    : `Chỉ có ${availableQty}, cần ${parsedQty}`,
                        });
                    }
                } else {
                    // Validate using FEFO logic
                    try {
                        const availableLots =
                            await SupplierTransactionCombined.findAvailableLotsForOut(
                                productId,
                                departmentId,
                                parsedQty
                            );

                        validationResults.push({
                            productId,
                            requestedQty: parsedQty,
                            valid: true,
                            message: 'OK - sử dụng FEFO',
                            availableLots: availableLots.map((lot) => ({
                                lotId: lot.lotId,
                                lotNo: lot.lotNo,
                                useQty: lot.useQty,
                            })),
                        });
                    } catch (stockError) {
                        validationResults.push({
                            productId,
                            requestedQty: parsedQty,
                            valid: false,
                            message: stockError.message,
                        });
                    }
                }
            } catch (error) {
                validationResults.push({
                    productId,
                    valid: false,
                    message: `Lỗi validate: ${error.message}`,
                });
            }
        }

        const allValid = validationResults.every((result) => result.valid);

        res.status(200).json({
            success: true,
            data: {
                allValid,
                results: validationResults,
                summary: {
                    totalItems: validationResults.length,
                    validItems: validationResults.filter((r) => r.valid).length,
                    invalidItems: validationResults.filter((r) => !r.valid).length,
                },
            },
        });
    } catch (error) {
        console.error('Error in validateStockAvailability:', error.message);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * @desc Cập nhật trường adminLocked của transaction
 * @route PATCH /api/supplier-transactions-combined/:id/admin-lock
 * @access Private (Admin only)
 */
const updateAdminLocked = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { adminLocked } = req.body;

    // Validate adminLocked (phải là boolean)
    if (typeof adminLocked !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: 'adminLocked phải là kiểu boolean (true/false)',
        });
    }

    // Cập nhật adminLocked
    const success = await SupplierTransactionCombined.updateAdminLocked(id, adminLocked);

    if (!success) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy transaction hoặc không thể cập nhật',
        });
    }

    res.status(200).json({
        success: true,
        message: `Cập nhật adminLocked thành công: ${adminLocked}`,
    });
});

/* -------------------- Exports -------------------- */
module.exports = {
    // Main CRUD
    getTransactions,
    getTransactionById,
    createTransactionWithItems,
    updateTransactionWithItems,
    deleteTransactionWithItems,

    // Role-specific operations
    createTransactionWithItemsForManager,
    updateTransactionWithItemsForManager,
    updateTransactionWithItemsForAccountant,

    // Analytics
    getTransactionStats,
    getTopSuppliers,

    // Inventory helpers
    getAvailableLotsForProduct, // Lấy lots có sẵn cho xuất kho
    validateStockAvailability, // Validate tồn kho trước khi xuất kho

    // Utilities
    getTimezoneTest,
    updateAdminLocked, // Cập nhật adminLocked
};
