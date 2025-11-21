require('dotenv').config();
const User = require('@src/models/Users');
const asyncHandler = require('express-async-handler');
const tokenUtils = require('@middlewares/jwt');
const jwt = require('jsonwebtoken');
const { mailResetPassword } = require('@templates/resetPasswordEmail');
const sendMail = require('@utils/sendMail');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function để log activity với timezone
const logActivity = (action, userId = null) => {
    const timestamp = dayjs().tz('Asia/Ho_Chi_Minh').format();
    console.log(`[${timestamp}] ${action} - User: ${userId || 'Unknown'}`);
};

// [POST] register user
const register = asyncHandler(async (req, res) => {
    const { email, password, username, fullName, phone, departmentId } = req.body;

    // Validate input
    const errors = [];
    if (!email || !password || !username || !fullName || !departmentId) {
        errors.push('Vui lòng nhập đầy đủ email, mật khẩu, tên đăng nhập, mã cơ sở và họ tên!');
    }

    const emailExists = await User.findByEmail(email);
    if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email này đã được sử dụng!' });
    }

    const newUser = await User.createUser({
        email,
        password,
        username,
        fullName,
        phone: phone || '',
        departmentId,
    });

    // Log activity with timezone, để debug
    logActivity('User registration successful', newUser.id);

    return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công!',
        user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            fullName: newUser.fullName,
            phone: newUser.phone,
            role: newUser.role,
            avatar: newUser.avatar,
            departmentId: newUser.departmentId,
            registeredAt: dayjs().tz('Asia/Ho_Chi_Minh').format(), // ✅ Thêm timezone info
        },
    });
});

// [POST] auth/login Login user
const login = asyncHandler(async (req, res) => {
    const { emailOrUsername, password } = req.body;

    const loginResult = await User.login({
        email: emailOrUsername.includes('@') ? emailOrUsername : null,
        username: !emailOrUsername.includes('@') ? emailOrUsername : null,
        password,
    });

    if (!loginResult.ok) {
        const message =
            loginResult.reason === 'not_found'
                ? 'Email hoặc username chưa được đăng ký!'
                : 'Mật khẩu không đúng!';
        return res.status(401).json({ success: false, message });
    }

    const user = loginResult.user;

    const accessToken = tokenUtils.generateAccessToken(user.id, user.role);
    const refreshToken = tokenUtils.generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1 * 60 * 60 * 1000, // 1 giờ
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });

    // Log activity with timezone, để debug
    // logActivity('User login successful', user.id);

    return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công!',
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            loginTime: dayjs().tz('Asia/Ho_Chi_Minh').format(), // ✅ Thêm timezone info nếu cần
        },
        accessToken,
    });
});

// [POST] forgot password
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập email!' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
        return res
            .status(404)
            .json({ success: false, message: 'Email không tồn tại trong hệ thống!' });
    }

    // Kiểm tra xem user có bị disable không
    if (user.status === 'disable') {
        return res.status(403).json({
            success: false,
            message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!',
        });
    }

    // console.log('Generating password reset token for', user);
    const resetToken = await User.generatePasswordReset(user.id);

    // Gửi email reset password
    const content = {
        subject: 'Thông báo đặt lại mật khẩu tài khoản Tikovia',
        html: mailResetPassword(resetToken),
        text: `Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng liên kết sau để đặt lại: ${process.env.CLIENT_URL}/reset-password?token=${resetToken}`,
    };

    await sendMail(email, content);

    return res.status(200).json({
        success: true,
        message: 'Yêu cầu đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn!',
    });
});

// [GET] verify reset password token
const verifyResetToken = asyncHandler(async (req, res) => {
    const { token } = req.params;

    // Kiểm tra token
    const user = await User.verifyPasswordResetToken(token);
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn!',
            valid: false,
        });
    }

    // Token hợp lệ
    return res.status(200).json({
        success: true,
        message: 'Token hợp lệ!',
        valid: true,
    });
});

// [POST] reset password
const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu mới phải có ít nhất 6 ký tự!',
        });
    }

    const user = await User.verifyPasswordResetToken(token);
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn!',
        });
    }

    await User.updatePassword(user.id, newPassword);
    await User.clearPasswordReset(user.id);
    // update lại status của user thành active
    await User.updateUser(user.id, { status: 'active' });

    // Log activity with timezone, để debug
    // logActivity('Password reset successful', user.id);

    return res.status(200).json({
        success: true,
        message: 'Mật khẩu của bạn đã được cập nhật thành công!',
    });
});

// [POST] refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Không tìm thấy refresh token!' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
        return res.status(401).json({ success: false, message: 'User không tồn tại!' });
    }

    const newAccessToken = tokenUtils.generateAccessToken(user.id, user.role);

    res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1 * 60 * 60 * 1000, // 1 giờ
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });

    return res.status(200).json({
        success: true,
        message: 'Refresh token thành công!',
        accessToken: newAccessToken,
    });
});

// [POST] logout user
const logout = asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    // Log activity with timezone, để debug
    logActivity('User logout', req.user?.id);

    return res.status(200).json({ success: true, message: 'Đăng xuất thành công!' });
});

const verifyTokenGoogle = asyncHandler(async (token) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        // Lấy thông tin tài khoản (payload) từ token đã xác thực
        const payload = ticket.getPayload();
        return payload;
    } catch (error) {
        console.error('Error verifying Google ID token:', error);
        return null;
    }
});

// [POST] auth/google Login with Google OAuth
const googleLogin = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ success: false, message: 'ID token không được để trống!' });
    }
    const googleUser = await verifyTokenGoogle(token);
    if (!googleUser) {
        return res.status(401).json({ success: false, message: 'Xác thực Google thất bại!' });
    }
    // Tìm user theo email
    const existingUser = await User.findByEmail(googleUser.email);
    if (!existingUser) {
        return res.status(404).json({
            success: false,
            message:
                'Tài khoản chưa được đăng ký. Vui lòng đăng ký trước khi đăng nhập bằng Google.',
        });
    }
    // Kiểm tra block
    if (existingUser.isBlocked) {
        return res.status(403).json({
            success: false,
            message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!',
        });
    }
    // Nếu user chưa có googleId hoặc user có googleId khác, liên kết lại tài khoản Google mới
    if (!existingUser.googleId || existingUser.googleId !== googleUser.sub) {
        await User.updateUser(existingUser.id, {
            googleId: googleUser.sub,
            avatar: googleUser.picture || existingUser.avatar,
        });
    }
    // Trả về thông tin user và token
    const accessToken = tokenUtils.generateAccessToken(existingUser.id, existingUser.role);
    const refreshToken = tokenUtils.generateRefreshToken(existingUser.id);
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });
    return res.status(200).json({
        success: true,
        message: 'Đăng nhập Google thành công!',
        user: {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            fullName: existingUser.fullName,
            role: existingUser.role,
            avatar: existingUser.avatar,
            loginTime: dayjs().tz('Asia/Ho_Chi_Minh').format(), // ✅ Thêm timezone info nếu cần
        },
        accessToken,
    });
});

// // [GET] auth/google Initiate Google OAuth
// const googleLogin = asyncHandler(async (req, res, next) => {
//     // Passport sẽ xử lý việc chuyển hướng đến Google OAuth
//     next(); // Chuyển tiếp cho passport.authenticate
// });

// // [GET] auth/google/callback Handle OAuth callback
// const googleCallback = asyncHandler(async (req, res) => {
//     // req.user được Passport gán sau khi xác thực thành công
//     if (!req.user) {
//         return res.status(401).json({
//             success: false,
//             message: 'Xác thực Google thất bại. Vui lòng thử lại!',
//         });
//     }

//     // Kiểm tra block
//     const userDb = await User.findById(req.user.id);
//     if (!userDb) {
//         return res.status(404).json({
//             success: false,
//             message: 'Tài khoản không tồn tại!',
//         });
//     }

//     if (userDb.isBlocked) {
//         return res.status(403).json({
//             success: false,
//             message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!',
//         });
//     }

//     // Trả về thông tin user và token
//     const accessToken = tokenUtils.generateAccessToken(userDb.id, userDb.role);
//     const refreshToken = tokenUtils.generateRefreshToken(userDb.id);

//     res.cookie('refreshToken', refreshToken, {
//         httpOnly: true,
//         sameSite: 'lax',
//         maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
//         secure: process.env.NODE_ENV === 'production',
//         path: '/',
//     });

//     return res.status(200).json({
//         success: true,
//         message: 'Đăng nhập Google thành công!',
//         user: {
//             id: userDb.id,
//             email: userDb.email,
//             username: userDb.username,
//             fullName: userDb.fullName,
//             role: userDb.role,
//             avatar: userDb.avatar,
//         },
//         accessToken,
//     });
// });

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
    refreshAccessToken,
    logout,
    verifyResetToken,
    googleLogin,
    verifyTokenGoogle,
};
