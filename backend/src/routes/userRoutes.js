const router = require('express').Router();
const ctrls = require('@controllers/userController');
const tokenUtils = require('@middlewares/jwt');

// [GET] /users/by-role - Lấy danh sách users theo vai trò
router.get(
    '/by-role',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager', 'accountant'])],
    ctrls.getAllUsersByRole
);

// [GET] /users - Lấy danh sách users
router.get(
    '/',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'accountant', 'sup_picker', 'sup_shipper']),
    ],
    ctrls.listUsers
);

// [GET] /users/current - Lấy toàn bộ thông tin user hiện tại
router.get('/current', tokenUtils.verifyAccessToken, ctrls.getCurrentUser);

// [GET] /users/:id - Lấy thông tin user theo ID
router.get(
    '/:id',
    [
        tokenUtils.verifyAccessToken,
        tokenUtils.checkRole(['admin', 'manager', 'accountant', 'sup_picker', 'sup_shipper']),
    ],
    ctrls.getUserById
);

// [POST] /users - Tạo user mới
router.post('/', [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])], ctrls.createUser);

// [PUT] /users/current - Cập nhật thông tin cho user hiện tại
router.put('/current', tokenUtils.verifyAccessToken, ctrls.updateCurrentUser);

// [PUT] /users/:id - Cập nhật thông tin user (for admin)
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    ctrls.updateUser
);

// [DELETE] /users/:id - Xóa user
// router.delete(
//     '/:id',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
//     ctrls.deleteUser
// );

// [PUT] /users/current/password - Đổi mật khẩu user hiện tại
router.put('/current/password', tokenUtils.verifyAccessToken, ctrls.changePassword);

module.exports = router;
