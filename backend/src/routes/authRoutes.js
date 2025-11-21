const router = require('express').Router();
const ctrls = require('@controllers/authController');
const tokenUtils = require('@middlewares/jwt');

// [POST] /auth/register - Đăng ký tài khoản
router.post('/register', ctrls.register);

// [POST] /auth/login - Đăng nhập
router.post('/login', ctrls.login);

// [POST] /auth/logout - Đăng xuất
router.post('/logout', tokenUtils.verifyAccessToken, ctrls.logout);

// [POST] /auth/forgot-password - Gửi email đặt lại mật khẩu
router.post('/forgot-password', ctrls.forgotPassword);

// [GET] /check-reset-token/:token - Kiểm tra token đặt lại mật khẩu
router.get('/check-reset-token/:token', ctrls.verifyResetToken);

// [POST] /auth/reset-password/:token - Đặt lại mật khẩu
router.post('/reset-password/:token', ctrls.resetPassword);

// [POST] /auth/refresh-token - Làm mới access token
router.post('/refresh-token', ctrls.refreshAccessToken);

// [POST] auth/google Redirect to Google for authentication
router.post('/google', ctrls.googleLogin);

module.exports = router;

// // [POST] auth/login Login user
// router.post('/login', ctrls.login);
// // [POST] auth/logout Logout user
// router.post('/logout', tokenUtils.verifyAccessToken, ctrls.logout);
// // [POST] auth/register Register user
// router.post('/register', ctrls.register);
// // [POST] auth/forgot-password Send reset password email
// router.post('/forgot-password', ctrls.forgotPassword);
// // [POST] auth/reset-password/:token Reset user password
// router.post('/reset-password/:token', ctrls.resetPassword);

// module.exports = router;
