const router = require('express').Router();
const ctrls = require('@controllers/inventoryLotController');
const tokenUtils = require('@middlewares/jwt');

/**
 * @route   GET /inventory-lots/find-products-in-department/:departmentId
 * @desc    Lấy danh sách các sản phẩm (đã gom nhóm) có tồn kho trong một phòng ban.
 * Hàm này hữu ích để hiển thị tổng quan những mặt hàng nào đang có trong kho.
 * @access  Private (All authenticated users)
 * @params  departmentId (UUID)
 * @query   q, limit, offset
 * @returns { items, pagination }
 */
router.get(
    '/find-products-in-department/:departmentId',
    [tokenUtils.verifyAccessToken],
    ctrls.getProductsInDepartmentInventory
);

/**
 * @route   GET /inventory-lots/find-with-department-product/:departmentId/:productId
 * @desc    Lấy chi tiết các lô hàng (inventory lots) của một sản phẩm cụ thể
 * trong một phòng ban cụ thể. Dùng để xem chi tiết hạn sử dụng, số lô...
 * @access  Private (All authenticated users)
 * @params  departmentId (UUID), productId (UUID)
 * @query   q, limit, offset
 * @returns { items, pagination }
 */
router.get(
    '/find-with-department-product/:departmentId/:productId',
    [tokenUtils.verifyAccessToken],
    ctrls.getInventoryLotsByProductInDepartment
);

/**
 * ✅ NEW: Cập nhật qty với conversion support
 * @route PUT /inventory-lots/:id/quantity-with-conversion
 */
router.put(
    '/:id/quantity-with-conversion',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.updateQuantityWithConversion
);

// ============================================================
// SPECIALIZED QUERIES - ĐẶT TRƯỚC CÁC ROUTE CÓ PARAMS
// ============================================================

/**
 * [GET] /inventory-lots/expiring - Lấy inventory lots sắp hết hạn
 * Query params: days, limit, offset
 * Access: All authenticated users
 * Ít dùng hơn getInventoryLots
 */
router.get('/expiring', [tokenUtils.verifyAccessToken], ctrls.getExpiringInventoryLots);

/**
 * [GET] /inventory-lots/expired - Lấy inventory lots đã hết hạn
 * Query params: limit, offset
 * Access: All authenticated users
 * Ít dùng hơn getInventoryLots
 */
router.get('/expired', [tokenUtils.verifyAccessToken], ctrls.getExpiredInventoryLots);

/**
 * [GET] /inventory-lots/low-stock - Lấy inventory lots có số lượng thấp
 * Query params: threshold, limit, offset
 * Access: All authenticated users
 * Ít dùng hơn getInventoryLots
 */
router.get('/low-stock', [tokenUtils.verifyAccessToken], ctrls.getLowStockInventoryLots);

/**
 * [GET] /inventory-lots/lot/:lotNo - Tìm kiếm inventory lot theo lot number
 * Params: lotNo (string)
 * Access: All authenticated users
 * Ít dùng hơn getInventoryLots
 */
router.get('/lot/:lotNo', [tokenUtils.verifyAccessToken], ctrls.getInventoryLotByLotNo);

/**
 * [GET] /inventory-lots/product/:productId - Lấy inventory lots theo product ID
 * Params: productId (UUID)
 * Query params: limit, offset
 * Access: All authenticated users
 * Sẽ được dùng trong detail product để xem các lot của sản phẩm đó
 */
router.get('/product/:productId', [tokenUtils.verifyAccessToken], ctrls.getInventoryLotsByProduct);

/**
 * [GET] /inventory-lots/department/:departmentId - Lấy inventory lots theo department ID
 * Params: departmentId (UUID)
 * Query params: limit, offset
 * Access: All authenticated users
 * Ít dùng hơn getInventoryLots
 */
router.get(
    '/department/:departmentId',
    [tokenUtils.verifyAccessToken],
    ctrls.getInventoryLotsByDepartment
);

// ============================================================
// STATISTICS & ANALYTICS
// ============================================================

/**
 * [GET] /inventory-lots/stats/by-product - Lấy thống kê inventory theo product
 * Access: Manager và Admin, Accountant
 * Returns: productId, productName, totalLots (count lô hàng) , totalQtyOnHand, expiredQtyOnHand, expiringQtyOnHand
 */
router.get(
    '/stats/by-product',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getInventoryStatsByProduct
);

// ============================================================
// BULK OPERATIONS
// ============================================================

/**
 * [DELETE] /inventory-lots/bulk - Xóa nhiều inventory lots cùng lúc
 * Body: { ids: string[] }
 * Access: Chỉ Admin
 * Maybe sẽ làm bên FE
 */
router.delete(
    '/bulk',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteBulkInventoryLots
);

// ============================================================
// BASIC CRUD OPERATIONS
// ============================================================

/**
 * [GET] /inventory-lots - Lấy danh sách inventory lots với phân trang và tìm kiếm
 * Query params: q, productId, departmentId, expiredOnly, lowStockOnly, limit, offset
 * Access: All authenticated users
 */
router.get('/', [tokenUtils.verifyAccessToken], ctrls.getInventoryLots);

/**
 * [POST] /inventory-lots - Tạo inventory lot mới
 * Body: lotNo, productId, departmentId, expiryDate, qtyOnHand
 * Access: Admin, Manager
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.createInventoryLot
);

/**
 * [GET] /inventory-lots/:id - Lấy thông tin inventory lot theo ID
 * Params: id (UUID)
 * Access: All authenticated users
 */
router.get('/:id', [tokenUtils.verifyAccessToken], ctrls.getInventoryLotById);

/**
 * [PUT] /inventory-lots/:id - Cập nhật thông tin inventory lot
 * Params: id (UUID)
 * Body: lotNo, productId, departmentId, expiryDate, qtyOnHand
 * Access: Admin, Manager
 * returns: inventoryLot sau khi cập nhật
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.updateInventoryLot
);

/**
 * [DELETE] /inventory-lots/:id - Xóa inventory lot
 * Params: id (UUID)
 * Access: Admin và Manager
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
    ctrls.deleteInventoryLot
);

// ============================================================
// QUANTITY MANAGEMENT
// ============================================================

/**
 * [PUT] /inventory-lots/:id/quantity - Cập nhật số lượng tồn kho
 * Params: id (UUID)
 * Body: { qtyOnHand: number }
 * Access: Admin, Manager, Picker, Sup_Picker
 * Dùng khi có đơn hàng (Picker, Sup_Picker) hoặc điều chỉnh kho (Admin, Manager)
 * returns: inventoryLot sau khi cập nhật
 * Maybe sẽ làm bên FE (chưa chắc vì có thể cập nhật số lượng trong PUT /:id rồi)
 */
router.put(
    '/:id/quantity',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'picker', 'sup_picker']),
    ],
    ctrls.updateInventoryLotQuantity
);

module.exports = router;
