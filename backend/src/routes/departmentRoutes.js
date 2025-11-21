const router = require('express').Router();
const ctrls = require('@controllers/departmentController');
const tokenUtils = require('@middlewares/jwt');

// [GET] /departments - Lấy danh sách departments (có tìm kiếm và phân trang)
router.get(
    '/',
    [tokenUtils.verifyAccessToken], // tokenUtils.checkRole(['admin', 'manager'])
    ctrls.getDepartments
);

// [GET] /departments/all - Lấy tất cả departments (không phân trang, dùng cho dropdown)
router.get(
    '/all',
    [tokenUtils.verifyAccessToken], // tokenUtils.checkRole(['admin', 'manager'])
    ctrls.listDepartments
);

// [GET] /departments/:id - Lấy thông tin department theo ID
router.get(
    '/:id',
    [tokenUtils.verifyAccessToken], // tokenUtils.checkRole(['admin', 'manager'])
    ctrls.getDepartmentById
);

// [POST] /departments - Tạo department mới
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.createDepartment
);

// [PUT] /departments/:id - Cập nhật thông tin department
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.updateDepartment
);

// [DELETE] /departments/:id - Xóa department
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.deleteDepartment
);

module.exports = router;
