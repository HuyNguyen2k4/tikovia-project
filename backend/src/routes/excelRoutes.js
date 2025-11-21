const router = require('express').Router();
const multer = require('multer');
const inventoryController = require('@src/controllers/excel/inventoryController');
const productExcelController = require('@src/controllers/excel/importProductController');
const tokenUtils = require('@middlewares/jwt');

// ✅ THÊM: Multer config
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

/**
 * @route   POST /api/excel/inventory/export
 * @desc    Export inventory data (products and lots) to Excel
 * @access  Private (admin, manager, accountant)
 * @body    { productIds?: [uuid], departmentId?: uuid }
 * @note    Nếu productIds không được cung cấp hoặc rỗng, xuất toàn bộ sản phẩm và lô hàng (theo departmentId nếu có)
 */
router.post(
    '/inventory/export',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    inventoryController.exportInventoryExcel
);

/**
 * @route   POST /api/excel/products/import
 * @desc    Import (create/update) products via Excel file
 * @access  Private (admin, manager)
 * @body    multipart/form-data với field "file"
 */
router.post(
    '/products/import',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager']),
        upload.single('file'),
    ],
    productExcelController.importProductsFromExcel
);

module.exports = router;
