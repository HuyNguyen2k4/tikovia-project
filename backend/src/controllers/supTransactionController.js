const asyncHandler = require('express-async-handler');
const SupplierTransactionItem = require('@src/models/SupplierTransactionItems');
const SupplierTransaction = require('@src/models/SupplierTransactions');
const Product = require('@src/models/Products');
const InventoryLot = require('@src/models/InventoryLots');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

/* -------------------- Helpers -------------------- */

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

// Helper function để validate transaction exists và không bị lock
const validateTransactionForEdit = async (transId) => {
    const transaction = await SupplierTransaction.findById(transId);
    if (!transaction) {
        throw new Error('Không tìm thấy supplier transaction');
    }

    if (transaction.adminLocked) {
        throw new Error('Transaction đã bị khóa bởi admin, không thể chỉnh sửa');
    }

    if (transaction.status === 'completed') {
        throw new Error('Transaction đã hoàn thành, không thể chỉnh sửa');
    }

    return transaction;
};

/* -------------------- Main Controllers -------------------- */

/**
 * @desc    Lấy danh sách supplier transaction items (có unit conversion)
 * @route   GET /api/supplier-transaction-items
 * @access  Private
 * @query   q, transId, productId, lotId, limit, offset
 */
const getSupplierTransactionItems = asyncHandler(async (req, res) => {
    const { q, transId, productId, lotId, limit, offset } = req.query;

    // Validate parameters
    const parsedLimit = parseInt(limit) || 50;
    const parsedOffset = parseInt(offset) || 0;
    const maxLimit = 200;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Limit và offset phải là số không âm',
        });
    }

    const finalLimit = Math.min(parsedLimit, maxLimit);

    // Validate UUIDs if provided
    if (transId && !validateUuidFormat(transId)) {
        return res.status(400).json({
            success: false,
            message: 'transId không hợp lệ',
        });
    }

    if (productId && !validateUuidFormat(productId)) {
        return res.status(400).json({
            success: false,
            message: 'productId không hợp lệ',
        });
    }

    if (lotId && !validateUuidFormat(lotId)) {
        return res.status(400).json({
            success: false,
            message: 'lotId không hợp lệ',
        });
    }

    // Fetch data
    const [items, total] = await Promise.all([
        SupplierTransactionItem.listSupplierTransactionItems({
            q: q ? q.trim() : undefined,
            transId,
            productId,
            lotId,
            limit: finalLimit,
            offset: parsedOffset,
        }),
        SupplierTransactionItem.countSupplierTransactionItems({
            q: q ? q.trim() : undefined,
            transId,
            productId,
            lotId,
        }),
    ]);

    res.status(200).json({
        success: true,
        data: items,
        pagination: {
            total,
            limit: finalLimit,
            offset: parsedOffset,
            hasMore: parsedOffset + finalLimit < total,
        },
    });
});

/**
 * @desc    Lấy chi tiết 1 supplier transaction item (có unit conversion)
 * @route   GET /api/supplier-transaction-items/:id
 * @access  Private
 */
const getSupplierTransactionItemById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!validateUuidFormat(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID không hợp lệ',
        });
    }

    const item = await SupplierTransactionItem.findById(id);
    if (!item) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy supplier transaction item',
        });
    }

    res.status(200).json({
        success: true,
        data: item,
    });
});

/**
 * @desc    Lấy items theo transaction ID (có unit conversion)
 * @route   GET /api/supplier-transaction-items/transaction/:transId
 * @access  Private
 */
const getItemsByTransactionId = asyncHandler(async (req, res) => {
    const { transId } = req.params;

    if (!validateUuidFormat(transId)) {
        return res.status(400).json({
            success: false,
            message: 'Transaction ID không hợp lệ',
        });
    }

    // Kiểm tra transaction có tồn tại không
    const transaction = await SupplierTransaction.findById(transId);
    if (!transaction) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy supplier transaction',
        });
    }

    const items = await SupplierTransactionItem.getItemsByTransactionId(transId);

    // Tính toán summary với unit conversion
    const summary = {
        itemCount: items.length,
        totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0),
        hasUnitConversions: items.some((item) => item.unitConversion !== null),
        conversionSummary: items
            .filter((item) => item.unitConversion !== null)
            .map((item) => ({
                itemId: item.id,
                productName: item.productName,
                qty: item.qty,
                packUnit: item.unitConversion.packUnit,
                convertedQty: item.unitConversion.convertedQty,
                mainUnit: item.unitConversion.mainUnit,
                conversionRate: item.unitConversion.conversionRate,
            })),
    };

    res.status(200).json({
        success: true,
        data: items,
        transaction: {
            id: transaction.id,
            docNo: transaction.docNo,
            supplierName: transaction.supplierName,
            transDate: transaction.transDate,
            status: transaction.status,
        },
        summary,
    });
});

/**
 * @desc    Tạo supplier transaction item mới
 * @route   POST /api/supplier-transaction-items
 * @access  Private
 */
const createSupplierTransactionItem = asyncHandler(async (req, res) => {
    const { transId, productId, lotId, qty, unitPrice } = req.body;

    // Validate required fields
    if (!transId || !productId || !lotId) {
        return res.status(400).json({
            success: false,
            message: 'transId, productId và lotId là bắt buộc',
        });
    }

    // Validate UUIDs
    if (
        !validateUuidFormat(transId) ||
        !validateUuidFormat(productId) ||
        !validateUuidFormat(lotId)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Các ID không hợp lệ',
        });
    }

    // Validate transaction
    await validateTransactionForEdit(transId);

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy product',
        });
    }

    // Validate lot exists và thuộc về product này
    const lot = await InventoryLot.findById(lotId);
    if (!lot) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy inventory lot',
        });
    }

    if (lot.productId !== productId) {
        return res.status(400).json({
            success: false,
            message: 'Lot không thuộc về product này',
        });
    }

    // Validate numbers
    try {
        const validQty = validatePositiveNumber(qty, 'Số lượng');
        const validUnitPrice = validatePositiveNumber(unitPrice, 'Đơn giá');

        const newItem = await SupplierTransactionItem.createSupplierTransactionItem({
            transId,
            productId,
            lotId,
            qty: validQty,
            unitPrice: validUnitPrice,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo supplier transaction item thành công',
            data: newItem,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * @desc    Cập nhật supplier transaction item
 * @route   PUT /api/supplier-transaction-items/:id
 * @access  Private
 */
const updateSupplierTransactionItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { transId, productId, lotId, qty, unitPrice } = req.body;

    if (!validateUuidFormat(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID không hợp lệ',
        });
    }

    // Kiểm tra item có tồn tại không
    const existingItem = await SupplierTransactionItem.findById(id);
    if (!existingItem) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy supplier transaction item',
        });
    }

    // Validate transaction (dùng transId hiện tại nếu không update)
    const currentTransId = transId || existingItem.transId;
    await validateTransactionForEdit(currentTransId);

    // Build update payload
    const payload = {};

    if (transId && transId !== existingItem.transId) {
        if (!validateUuidFormat(transId)) {
            return res.status(400).json({
                success: false,
                message: 'transId không hợp lệ',
            });
        }
        await validateTransactionForEdit(transId);
        payload.transId = transId;
    }

    if (productId && productId !== existingItem.productId) {
        if (!validateUuidFormat(productId)) {
            return res.status(400).json({
                success: false,
                message: 'productId không hợp lệ',
            });
        }
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy product',
            });
        }
        payload.productId = productId;
    }

    if (lotId && lotId !== existingItem.lotId) {
        if (!validateUuidFormat(lotId)) {
            return res.status(400).json({
                success: false,
                message: 'lotId không hợp lệ',
            });
        }
        const lot = await InventoryLot.findById(lotId);
        if (!lot) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy inventory lot',
            });
        }
        // Kiểm tra lot có thuộc về product không (dùng productId mới hoặc cũ)
        const targetProductId = payload.productId || existingItem.productId;
        if (lot.productId !== targetProductId) {
            return res.status(400).json({
                success: false,
                message: 'Lot không thuộc về product này',
            });
        }
        payload.lotId = lotId;
    }

    // Validate numbers
    try {
        if (qty !== undefined) {
            payload.qty = validatePositiveNumber(qty, 'Số lượng');
        }
        if (unitPrice !== undefined) {
            payload.unitPrice = validatePositiveNumber(unitPrice, 'Đơn giá');
        }

        if (Object.keys(payload).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có thông tin nào để cập nhật',
            });
        }

        const updatedItem = await SupplierTransactionItem.updateSupplierTransactionItem(
            id,
            payload
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật supplier transaction item thành công',
            data: updatedItem,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * @desc    Xóa supplier transaction item
 * @route   DELETE /api/supplier-transaction-items/:id
 * @access  Private
 */
const deleteSupplierTransactionItem = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!validateUuidFormat(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID không hợp lệ',
        });
    }

    const item = await SupplierTransactionItem.findById(id);
    if (!item) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy supplier transaction item',
        });
    }

    // Validate transaction không bị lock
    await validateTransactionForEdit(item.transId);

    await SupplierTransactionItem.deleteSupplierTransactionItem(id);

    res.status(200).json({
        success: true,
        message: 'Xóa supplier transaction item thành công',
    });
});

/**
 * @desc    Lấy thống kê items với unit conversion
 * @route   GET /api/supplier-transaction-items/stats/conversion
 * @access  Private
 */
const getItemsStatsWithConversion = asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const parsedLimit = parseInt(limit) || 10;

    if (parsedLimit <= 0 || parsedLimit > 50) {
        return res.status(400).json({
            success: false,
            message: 'Limit phải từ 1 đến 50',
        });
    }

    const stats = await SupplierTransactionItem.getItemsStatsWithConversion({
        limit: parsedLimit,
    });

    res.status(200).json({
        success: true,
        data: stats,
        metadata: {
            generatedAt: dayjs().tz('Asia/Ho_Chi_Minh').format(),
            limit: parsedLimit,
        },
    });
});

/**
 * @desc    Test timezone conversion cho supplier transaction items
 * @route   GET /api/supplier-transaction-items/test-timezone
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
            sample_conversion: {
                qty: 10,
                packUnit: 'thùng',
                conversionRate: 12.5,
                convertedQty: 125,
                mainUnit: 'kg',
                display: '10 thùng = 125 kg',
            },
            timezone_info: {
                current_offset: dayjs().tz('Asia/Ho_Chi_Minh').format('Z'),
                timezone_name: 'Asia/Ho_Chi_Minh',
            },
        },
    });
});

/* -------------------- Exports -------------------- */
module.exports = {
    getSupplierTransactionItems,
    getSupplierTransactionItemById,
    getItemsByTransactionId,
    createSupplierTransactionItem,
    updateSupplierTransactionItem,
    deleteSupplierTransactionItem,
    getItemsStatsWithConversion,
    getTimezoneTest,
};
