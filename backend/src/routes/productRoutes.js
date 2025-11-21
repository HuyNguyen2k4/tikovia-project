const router = require('express').Router();
const ctrls = require('@controllers/productController');
const tokenUtils = require('@middlewares/jwt');

// ============================================================
// UTILITY & LIST ENDPOINTS
// ============================================================

/**
 * [GET] /products/all - Lấy tất cả products (không phân trang, dùng cho dropdown)
 * Query params: q, categoryId
 * Access: All authenticated users
 * Note: Chỉ trả về products có status = 'active'
 */
router.get('/all', [tokenUtils.verifyAccessToken], ctrls.listProducts);

// ✅ NEW: Unit-related endpoints - ĐẶT TRƯỚC dynamic routes
/**
 * [GET] /products/units - Lấy products theo pack_unit hoặc main_unit
 * Query params: packUnit, mainUnit, limit, offset
 * Access: All authenticated users
 */
// router.get('/units', [tokenUtils.verifyAccessToken], ctrls.getProductsByUnits);

/**
 * [GET] /products/units/list - Lấy danh sách các đơn vị được sử dụng trong hệ thống
 * Access: All authenticated users
 * Returns: { packUnits: string[], mainUnits: string[], combinations: object[] }
 */
// router.get('/units/list', [tokenUtils.verifyAccessToken], ctrls.getUsedUnits);

/**
 * [GET] /products/stats/units - Lấy thống kê sản phẩm theo đơn vị
 * Access: Manager và Admin
 * Returns: Số lượng sản phẩm theo từng combination đơn vị
 */
// router.get(
//     '/stats/units',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
//     ctrls.getProductUnitStats
// );

// ============================================================
// CHATBOT / AUTOMATION HELPERS
// ============================================================

/**
 * [POST] /products/prefill-link - Sinh link auto fill form tạo sản phẩm
 * Body: skuCode, name, categoryId/categoryName, units, thresholds, ...
 * Access: chatbot/n8n
 */
router.post('/prefill-link', [tokenUtils.verifyChatbotCaller], ctrls.generateProductPrefillLink);

// ============================================================
// BASIC CRUD OPERATIONS
// ============================================================

/**
 * [GET] /products - Lấy danh sách products với phân trang và tìm kiếm
 * Query params: q, categoryId, status, adminLocked, packUnit, mainUnit, limit, offset
 * Access: All authenticated users
 */
router.get('/', [tokenUtils.verifyAccessToken], ctrls.getProducts);

/**
 * [GET] /products/:id - Lấy thông tin product theo ID
 * Params: id (UUID)
 * Access: All authenticated users
 */
router.get('/:id', [tokenUtils.verifyAccessToken], ctrls.getProductById);

/**
 * [POST] /products - Tạo product mới
 * Body: skuCode, name, categoryId, packUnit, mainUnit, storageRule, status, adminLocked, lowStockThreshold, nearExpiryDays, imgUrl
 * Access: Admin và Manager
 * Note: packUnit và mainUnit là bắt buộc
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.createProduct
);

/**
 * [PUT] /products/:id - Cập nhật thông tin product
 * Params: id (UUID)
 * Body: skuCode, name, categoryId, packUnit, mainUnit, storageRule, status, adminLocked, lowStockThreshold, nearExpiryDays, imgUrl
 * Access: Admin và Manager
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.updateProduct
);

/**
 * [DELETE] /products/:id - Xóa product
 * Params: id (UUID)
 * Access: Chỉ Admin
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteProduct
);

// ============================================================
// SEARCH & FILTER ENDPOINTS
// ============================================================

/**
 * [GET] /products/sku/:skuCode - Tìm kiếm product theo SKU code
 * Params: skuCode (string)
 * Access: All authenticated users
 */
router.get('/sku/:skuCode', [tokenUtils.verifyAccessToken], ctrls.getProductBySkuCode);

/**
 * [GET] /products/status/:status - Lấy products theo status
 * Params: status (active|warning|disable)
 * Query params: limit, offset
 * Access: All authenticated users
 */
router.get('/status/:status', [tokenUtils.verifyAccessToken], ctrls.getProductsByStatus);

/**
 * [GET] /products/category/:categoryId - Lấy products theo category ID
 * Params: categoryId (UUID)
 * Query params: limit, offset
 * Access: All authenticated users
 * Note: Chỉ trả về products có status = 'active'
 */
router.get('/category/:categoryId', [tokenUtils.verifyAccessToken], ctrls.getProductsByCategory);

/**
 * [GET] /products/warnings - Lấy products có cảnh báo (status = warning hoặc disable)
 * Query params: limit, offset
 * Access: Manager và Admin
 */
router.get(
    '/warnings',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.getWarningProducts
);

// ============================================================
// BULK OPERATIONS
// ============================================================

/**
 * [PUT] /products/bulk-admin-lock - Cập nhật trạng thái admin lock hàng loạt
 * Body: { ids: string[], adminLocked: boolean }
 * Access: Chỉ Admin
 */
router.put(
    '/bulk-admin-lock',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.updateBulkAdminLock
);

// ============================================================
// STATISTICS & ANALYTICS
// ============================================================

/**
 * [GET] /products/stats/status - Lấy thống kê sản phẩm theo status
 * Access: Manager và Admin
 * Returns: Số lượng và phần trăm products theo từng status
 */
router.get(
    '/stats/status',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.getProductStatusStats
);

// ============================================================
// STATUS MANAGEMENT
// ============================================================

/**
 * [POST] /products/:id/refresh-status - Refresh status của một product
 * Params: id (UUID)
 * Access: Manager và Admin
 * Note: Gọi stored procedure để tính lại status dựa trên inventory
 */
router.post(
    '/:id/refresh-status',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.refreshProductStatus
);

/**
 * [POST] /products/refresh-all-status - Refresh status của tất cả products
 * Access: Chỉ Admin
 * Note: Gọi stored procedure để tính lại status cho tất cả products
 */
router.post(
    '/refresh-all-status',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.refreshAllProductsStatus
);

module.exports = router;
