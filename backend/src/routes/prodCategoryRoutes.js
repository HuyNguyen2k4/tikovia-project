const router = require('express').Router();
const ctrls = require('@controllers/prodCategoryController');
const tokenUtils = require('@middlewares/jwt');

// [GET] /product-categories - Lấy danh sách product categories (có tìm kiếm và phân trang)
router.get(
    '/',
    [tokenUtils.verifyAccessToken], // tokenUtils.checkRole(['admin', 'manager'])
    ctrls.getProductCategories
);

// [GET] /product-categories/all - Lấy tất cả danh mục sản phẩm không phân trang
router.get(
    '/all',
    [tokenUtils.verifyAccessToken], // tokenUtils.checkRole(['admin', 'manager'])
    ctrls.listProductCategories
);

// [GET] /product-categories/:id - Lấy thông tin product category theo ID
router.get(
    '/:id',
    [tokenUtils.verifyAccessToken], // tokenUtils.checkRole(['admin', 'manager'])
    ctrls.getProductCategoryById
);

// [POST] /product-categories - Tạo product category mới
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.createProductCategory
);

// [PUT] /product-categories/:id - Cập nhật thông tin product category
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.updateProductCategory
);

// [DELETE] /product-categories/:id - Xóa product category
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteProductCategory
);

module.exports = router;
