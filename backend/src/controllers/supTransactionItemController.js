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

// Helper function để validate UUID format
const validateUuidFormat = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

// Helper function để validate transaction exists
const validateTransactionExists = async (transId) => {
    const transaction = await SupplierTransaction.findById(transId);
    if (!transaction) {
        throw new Error('Giao dịch không tồn tại');
    }
};

// Helper function để validate product exists
const validateProductExists = async (productId) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error('Sản phẩm không tồn tại');
    }
};

// Helper function để validate lot exists
const validateLotExists = async (lotId) => {
    const lot = await InventoryLot.findById(lotId);
    if (!lot) {
        throw new Error('Lô hàng không tồn tại');
    }
};

/**
 * @desc    Lấy thông tin transaction item theo ID
 * @route   GET /api/supplier-transaction-items/:id
 * @access  Private
 * @param   {string} id - Item ID
 */
const getSupplierTransactionItemById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!validateUuidFormat(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID item không hợp lệ',
        });
    }

    const item = await SupplierTransactionItem.findById(id);
    if (!item) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy item',
        });
    }

    res.status(200).json({
        success: true,
        data: item,
    });
});

/**
 * @desc    Lấy tất cả items của một transaction
 * @route   GET /api/supplier-transaction-items/transaction/:transId
 * @access  Private Admin, Manager, Accountant
 * @param   {string} transId - Transaction ID
 */
const getItemsByTransactionId = asyncHandler(async (req, res) => {
    const { transId } = req.params;

    if (!validateUuidFormat(transId)) {
        return res.status(400).json({
            success: false,
            message: 'ID giao dịch không hợp lệ',
        });
    }

    try {
        const items = await SupplierTransactionItem.getItemsByTransactionId(transId);

        res.status(200).json({
            success: true,
            data: items,
            message: 'Danh sách items của giao dịch',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy items của giao dịch',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy items theo product ID
 * @route   GET /api/supplier-transaction-items/product/:productId
 * @access  Private Admin, Manager, Accountant
 * @param   {string} productId - Product ID
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 */
const getItemsByProductId = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { limit, offset } = req.query;

    if (!validateUuidFormat(productId)) {
        return res.status(400).json({
            success: false,
            message: 'ID sản phẩm không hợp lệ',
        });
    }

    try {
        const items = await SupplierTransactionItem.getItemsByProductId(productId, {
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
        });

        res.status(200).json({
            success: true,
            data: items,
            message: 'Danh sách items theo sản phẩm',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy items theo sản phẩm',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy items theo lot ID
 * @route   GET /api/supplier-transaction-items/lot/:lotId
 * @access  Private
 * @param   {string} lotId - Lot ID
 */
const getItemsByLotId = asyncHandler(async (req, res) => {
    const { lotId } = req.params;

    if (!validateUuidFormat(lotId)) {
        return res.status(400).json({
            success: false,
            message: 'ID lô hàng không hợp lệ',
        });
    }

    try {
        const items = await SupplierTransactionItem.getItemsByLotId(lotId);

        res.status(200).json({
            success: true,
            data: items,
            message: 'Danh sách items theo lô hàng',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy items theo lô hàng',
            error: error.message,
        });
    }
});

/**
 * @desc    Tạo transaction item mới
 * @route   POST /api/supplier-transaction-items
 * @access  Private (Admin, Manager, Sup_Picker)
 * @body    {string} transId - Transaction ID (bắt buộc)
 * @body    {string} productId - Product ID (bắt buộc)
 * @body    {string} lotId - Lot ID (bắt buộc)
 * @body    {number} qty - Số lượng (bắt buộc)
 * @body    {number} unitPrice - Đơn giá (bắt buộc)
 */
const createSupplierTransactionItem = asyncHandler(async (req, res) => {
    const { transId, productId, lotId, qty, unitPrice } = req.body;

    // Validate các trường bắt buộc
    if (!transId || !validateUuidFormat(transId)) {
        return res.status(400).json({
            success: false,
            message: 'ID giao dịch không hợp lệ',
        });
    }

    if (!productId || !validateUuidFormat(productId)) {
        return res.status(400).json({
            success: false,
            message: 'ID sản phẩm không hợp lệ',
        });
    }

    if (!lotId || !validateUuidFormat(lotId)) {
        return res.status(400).json({
            success: false,
            message: 'ID lô hàng không hợp lệ',
        });
    }

    if (qty === undefined || isNaN(qty) || qty <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Số lượng phải là số dương',
        });
    }

    if (unitPrice === undefined || isNaN(unitPrice) || unitPrice < 0) {
        return res.status(400).json({
            success: false,
            message: 'Đơn giá phải là số không âm',
        });
    }

    try {
        // Validate các entity tồn tại
        await validateTransactionExists(transId);
        await validateProductExists(productId);
        await validateLotExists(lotId);

        // Tạo item mới
        const newItem = await SupplierTransactionItem.createSupplierTransactionItem({
            transId,
            productId,
            lotId,
            qty: parseFloat(qty),
            unitPrice: parseFloat(unitPrice),
        });

        res.status(201).json({
            success: true,
            message: 'Tạo item giao dịch thành công',
            data: newItem,
        });
    } catch (error) {
        if (error.message.includes('không tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Giao dịch, sản phẩm hoặc lô hàng không hợp lệ',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo item giao dịch',
            error: error.message,
        });
    }
});

/**
 * @desc    Cập nhật thông tin transaction item
 * @route   PUT /api/supplier-transaction-items/:id
 * @access  Private (Admin, Manager, Sup_Picker)
 * @param   {string} id - Item ID
 * @body    Các trường cần cập nhật
 */
const updateSupplierTransactionItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { transId, productId, lotId, qty, unitPrice } = req.body;

    // Kiểm tra item tồn tại
    const existingItem = await SupplierTransactionItem.findById(id);
    if (!existingItem) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy item',
        });
    }

    // Validate dữ liệu đầu vào
    if (transId !== undefined && (!transId || !validateUuidFormat(transId))) {
        return res.status(400).json({
            success: false,
            message: 'ID giao dịch không hợp lệ',
        });
    }

    if (productId !== undefined && (!productId || !validateUuidFormat(productId))) {
        return res.status(400).json({
            success: false,
            message: 'ID sản phẩm không hợp lệ',
        });
    }

    if (lotId !== undefined && (!lotId || !validateUuidFormat(lotId))) {
        return res.status(400).json({
            success: false,
            message: 'ID lô hàng không hợp lệ',
        });
    }

    if (qty !== undefined && (isNaN(qty) || qty <= 0)) {
        return res.status(400).json({
            success: false,
            message: 'Số lượng phải là số dương',
        });
    }

    if (unitPrice !== undefined && (isNaN(unitPrice) || unitPrice < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Đơn giá phải là số không âm',
        });
    }

    try {
        // Validate các entity tồn tại nếu có thay đổi
        if (transId && transId !== existingItem.transId) {
            await validateTransactionExists(transId);
        }

        if (productId && productId !== existingItem.productId) {
            await validateProductExists(productId);
        }

        if (lotId && lotId !== existingItem.lotId) {
            await validateLotExists(lotId);
        }

        // Chuẩn bị payload cho update
        const updatePayload = {};
        if (transId !== undefined) updatePayload.transId = transId;
        if (productId !== undefined) updatePayload.productId = productId;
        if (lotId !== undefined) updatePayload.lotId = lotId;
        if (qty !== undefined) updatePayload.qty = parseFloat(qty);
        if (unitPrice !== undefined) updatePayload.unitPrice = parseFloat(unitPrice);

        // Kiểm tra có dữ liệu để update không
        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu để cập nhật',
            });
        }

        const updatedItem = await SupplierTransactionItem.updateSupplierTransactionItem(
            id,
            updatePayload
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật item thành công',
            data: updatedItem,
        });
    } catch (error) {
        if (error.message.includes('không tồn tại')) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: 'Giao dịch, sản phẩm hoặc lô hàng không hợp lệ',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật item',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa transaction item
 * @route   DELETE /api/supplier-transaction-items/:id
 * @access  Private (Admin, Manager, Sup_Picker)
 * @param   {string} id - Item ID
 */
const deleteSupplierTransactionItem = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const item = await SupplierTransactionItem.findById(id);
    if (!item) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy item để xóa',
        });
    }

    try {
        await SupplierTransactionItem.deleteSupplierTransactionItem(id);
        res.status(200).json({
            success: true,
            message: 'Xóa item thành công',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa item',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa tất cả items của một transaction
 * @route   DELETE /api/supplier-transaction-items/transaction/:transId
 * @access  Private (Admin, Manager)
 * @param   {string} transId - Transaction ID
 */
const deleteItemsByTransactionId = asyncHandler(async (req, res) => {
    const { transId } = req.params;

    if (!validateUuidFormat(transId)) {
        return res.status(400).json({
            success: false,
            message: 'ID giao dịch không hợp lệ',
        });
    }

    try {
        const deletedCount = await SupplierTransactionItem.deleteItemsByTransactionId(transId);

        res.status(200).json({
            success: true,
            message: `Đã xóa ${deletedCount} items của giao dịch`,
            data: { deletedCount },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa items của giao dịch',
            error: error.message,
        });
    }
});

/**
 * @desc    Tính tổng giá trị của một transaction
 * @route   GET /api/supplier-transaction-items/transaction/:transId/total
 * @access  Private
 * @param   {string} transId - Transaction ID
 */
const calculateTransactionTotal = asyncHandler(async (req, res) => {
    const { transId } = req.params;

    if (!validateUuidFormat(transId)) {
        return res.status(400).json({
            success: false,
            message: 'ID giao dịch không hợp lệ',
        });
    }

    try {
        const total = await SupplierTransactionItem.calculateTransactionTotal(transId);

        res.status(200).json({
            success: true,
            data: { total },
            message: 'Tổng giá trị giao dịch',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tính tổng giá trị',
            error: error.message,
        });
    }
});

/**
 * @desc    Lấy thống kê items theo sản phẩm
 * @route   GET /api/supplier-transaction-items/stats/by-product
 * @access  Private (Admin, Manager)
 */
const getItemStatsByProduct = asyncHandler(async (req, res) => {
    try {
        const stats = await SupplierTransactionItem.getItemStatsByProduct();

        res.status(200).json({
            success: true,
            data: stats,
            message: 'Thống kê items theo sản phẩm',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê',
            error: error.message,
        });
    }
});

/**
 * @desc    Xóa nhiều items cùng lúc
 * @route   DELETE /api/supplier-transaction-items/bulk
 * @access  Private (Admin, Manager)
 * @body    {string[]} ids - Danh sách Item IDs
 */
const deleteBulkSupplierTransactionItems = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Danh sách ID items không hợp lệ',
        });
    }

    try {
        const deletedCount = await SupplierTransactionItem.deleteMany(ids);

        res.status(200).json({
            success: true,
            message: `Đã xóa ${deletedCount} items`,
            data: {
                deletedCount,
                totalRequested: ids.length,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa hàng loạt items',
            error: error.message,
        });
    }
});

module.exports = {
    // Basic CRUD
    getSupplierTransactionItemById,
    createSupplierTransactionItem,
    updateSupplierTransactionItem,
    deleteSupplierTransactionItem,

    // Specialized queries
    getItemsByTransactionId,
    getItemsByProductId,
    getItemsByLotId,
    deleteItemsByTransactionId,

    // Business logic
    calculateTransactionTotal,
    getItemStatsByProduct,

    // Bulk operations
    deleteBulkSupplierTransactionItems,
};
