const router = require('express').Router();
const ctrls = require('@controllers/supplierTransactionCombinedController');
const tokenUtils = require('@middlewares/jwt');

/* -------------------- ✅ FIXED: Analytics Routes (đặt TRƯỚC dynamic routes) -------------------- */

/**
 * @desc Lấy thống kê transactions theo tháng
 * @route GET /api/supplier-transactions-combined/stats/overview
 * @query months
 */
router.get(
    '/stats/overview',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getTransactionStats
);

/**
 * @desc Lấy top suppliers theo value
 * @route GET /api/supplier-transactions-combined/stats/top-suppliers
 * @query limit
 */
router.get(
    '/stats/top-suppliers',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getTopSuppliers
);

/* -------------------- ✅ FIXED: Inventory Management Routes (đặt TRƯỚC dynamic routes) -------------------- */

/**
 * @desc Lấy danh sách lots có sẵn cho xuất kho
 * @route GET /api/supplier-transactions-combined/available-lots/:productId/:departmentId
 * @query requiredQty? (optional - nếu có sẽ return lots theo FEFO logic)
 */
router.get(
    '/available-lots/:productId/:departmentId',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getAvailableLotsForProduct
);

/**
 * @desc Validate stock availability trước khi tạo transaction xuất kho
 * @route POST /api/supplier-transactions-combined/validate-stock
 * @body { departmentId, items: [{ productId, qty, lotId (optional) }] }
 * @note items[] structure: { productId, qty, lotId? }
 */
router.post(
    '/validate-stock',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.validateStockAvailability
);

/**
 * @desc Test timezone conversion
 * @route GET /api/supplier-transactions-combined/test-timezone
 */
router.get('/test-timezone', [tokenUtils.verifyAccessToken], ctrls.getTimezoneTest);

/* -------------------- Main CRUD Routes -------------------- */

/**
 * @desc Lấy danh sách transactions với phân trang và filter
 * @route GET /api/supplier-transactions-combined
 * @query q, supplierId, departmentId, type, status, fromDate, toDate, limit, offset
 */
router.get(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getTransactions
);

/**
 * @desc Tạo transaction với items (tự động tạo inventory lots cho "in" hoặc giảm lots cho "out")
 * @route POST /api/supplier-transactions-combined
 * @body supplierId, departmentId, transDate?, type?, dueDate?, note?, items[]
 * @note items[] structure:
 *   - type "in": { productId, qty, unitPrice, expiryDate }
 *   - type "out": { productId, qty, unitPrice, lotId? }
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant'])],
    ctrls.createTransactionWithItems
);

/**
 * @desc Lấy chi tiết transaction với items
 * @route GET /api/supplier-transactions-combined/:id
 * @note Dynamic route - phải đặt SAU các static routes
 */
router.get(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getTransactionById
);

/**
 * @desc Cập nhật transaction với items
 * @route PUT /api/supplier-transactions-combined/:id
 * @body supplierId?, departmentId?, transDate?, type?, dueDate?, note?, status?, items[]?
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant'])],
    ctrls.updateTransactionWithItems
);

/**
 * @desc Cập nhật giá nhập của các items trong transaction (Dành cho Accountant)
 * @route PUT /api/supplier-transactions-combined/:id/item-prices
 * @param {string} id - ID của transaction cần cập nhật
 * @body { items: [{ productId, unitPrice }] }
 * @note Chỉ cho phép thay đổi `unitPrice` của các items đã có trong transaction.
 */
router.put(
    '/:id/item-prices',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['accountant'])],
    ctrls.updateTransactionWithItemsForAccountant
);

/**
 * @desc Tạo transaction với items không chứa giá (Dành cho Manager)
 * @route POST /api/supplier-transactions-combined/manager
 * @body supplierId, departmentId, transDate?, type?, dueDate?, note?, items[]
 * @note Giá (unitPrice) sẽ do Accountant cập nhật sau. Trường unitPrice trong items sẽ bị bỏ qua.
 */
router.post(
    '/manager',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['manager'])],
    ctrls.createTransactionWithItemsForManager
);

/**
 * @desc Cập nhật transaction với items không chứa giá (Dành cho Manager)
 * @route PUT /api/supplier-transactions-combined/manager/:id
 * @param {string} id - ID của transaction cần cập nhật
 * @body supplierId?, departmentId?, transDate?, type?, dueDate?, note?, status?, items[]?
 * @note Trường unitPrice trong items sẽ bị bỏ qua.
 */
router.put(
    '/manager/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['manager'])],
    ctrls.updateTransactionWithItemsForManager
);

/**
 * @desc Xóa transaction với items (revert inventory changes)
 * @route DELETE /api/supplier-transactions-combined/:id
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'accountant'])],
    ctrls.deleteTransactionWithItems
);

/**
 * @desc Cập nhật trường adminLocked của transaction
 * @route PATCH /api/supplier-transactions-combined/:id/admin-lock
 * @body { adminLocked: boolean }
 * @access Private (Admin only)
 */
router.patch(
    '/:id/admin-lock',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])], // Middleware kiểm tra quyền truy cập
    ctrls.updateAdminLocked
);

module.exports = router;
