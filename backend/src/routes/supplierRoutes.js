const router = require('express').Router();
const ctrls = require('@controllers/supplierController');
const tokenUtils = require('@middlewares/jwt');

// ============================================================
// SPECIALIZED QUERIES - ĐẶT TRƯỚC CÁC ROUTE CÓ PARAMS
// ============================================================

/**
 * [GET] /suppliers/search - Tìm kiếm nâng cao suppliers
 * Query params: code, name, phone, email, address, taxCode, limit, offset
 * Access: All authenticated users
 * Ít dùng hơn getSuppliers
 * returns: Mảng các suppliers
 */
router.get('/search', [tokenUtils.verifyAccessToken], ctrls.searchSuppliers);

/**
 * [GET] /suppliers/recent - Lấy suppliers được tạo gần đây
 * Query params: limit
 * Access: Admin và Manager
 * Ít dùng hơn getSuppliers
 * returns: Mảng các suppliers
 */
router.get(
    '/recent',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.getRecentSuppliers
);

/**
 * [GET] /suppliers/code/:code - Lấy supplier theo code
 * Params: code (string)
 * Access: All authenticated users
 * Ít dùng hơn getSuppliers
 * returns: Supplier hoặc null nếu không tìm thấy
 */
router.get('/code/:code', [tokenUtils.verifyAccessToken], ctrls.getSupplierByCode);

// ============================================================
// STATISTICS & ANALYTICS
// ============================================================

/**
 * [GET] /suppliers/stats/creation - Lấy thống kê suppliers theo tháng tạo
 * Access: Admin và Manager
 * Ít dùng hơn getSuppliers
 * returns: Mảng các object { month: 'YYYY-MM', count: number }
 */
router.get(
    '/stats/creation',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.getSupplierCreationStats
);

// ============================================================
// BULK OPERATIONS
// ============================================================

/**
 * [DELETE] /suppliers/bulk - Xóa nhiều suppliers cùng lúc
 * Body: { ids: string[] }
 * Access: Chỉ Admin
 * Ít dùng hơn xóa từng supplier
 */
router.delete(
    '/bulk',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteBulkSuppliers
);

// ============================================================
// BASIC CRUD OPERATIONS
// ============================================================

/**
 * [GET] /suppliers - Lấy danh sách suppliers với phân trang và tìm kiếm
 * Query params: q, limit, offset
 * Access: All authenticated users
 * returns: Mảng các suppliers
 */
router.get('/', [tokenUtils.verifyAccessToken], ctrls.getSuppliers);

/**
 * [POST] /suppliers - Tạo supplier mới
 * Body: code, name, phone, email, address, taxCode, note
 * Access: Admin và Manager
 * returns: Supplier vừa tạo
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.createSupplier
);

/**
 * [GET] /suppliers/:id - Lấy thông tin supplier theo ID
 * Params: id (UUID)
 * Access: All authenticated users
 * returns: Supplier hoặc null nếu không tìm thấy
 */
router.get('/:id', [tokenUtils.verifyAccessToken], ctrls.getSupplierById);

/**
 * [PUT] /suppliers/:id - Cập nhật thông tin supplier
 * Params: id (UUID)
 * Body: code, name, phone, email, address, taxCode, note
 * Access: Admin và Manager
 * returns: Supplier sau khi update hoặc null nếu không tìm thấy
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.updateSupplier
);

/**
 * [DELETE] /suppliers/:id - Xóa supplier
 * Params: id (UUID)
 * Access: Chỉ Admin
 * returns: Supplier vừa xóa hoặc null nếu không tìm thấy
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteSupplier
);

module.exports = router;
