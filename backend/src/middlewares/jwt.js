require('dotenv').config();
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

const VALID_ROLES = [
    'admin',
    'manager',
    'accountant',
    'picker',
    'sup_picker',
    'shipper',
    'sup_shipper',
    'seller',
];

const generateAccessToken = (id, role) => {
    // console.log('Generating access token for user:', { _id, role, fullName, avatar });
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '5h', // Token will expire in 5 hours
    });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d', // Token will expire in 7 days
    });
};

/**
 * Middleware để kiểm tra user đã đăng nhập chưa (không bắt buộc)
 * Dùng cho các route có thể truy cập mà không cần đăng nhập
 * Nếu có token thì gán thông tin user, không có thì để null
 */
const verifyLogedin = asyncHandler(async (req, res, next) => {
    let token = null;
    if (req?.headers?.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token && req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    }

    console.log('Verifying login with token:', token);

    if (!token) {
        req.user = null; // Không có token thì xóa thông tin user
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            req.user = null; // Token sai thì xóa thông tin user
            console.log('JWT verify error:', err);
            return next();
        }
        req.user = decoded; // Token đúng thì gán thông tin user
        next();
    });
});

/**
 * Middleware để xác thực access token (bắt buộc phải đăng nhập)
 * Dùng cho các API cần authentication
 * Trả về JSON response thay vì redirect
 */
const verifyAccessToken = asyncHandler(async (req, res, next) => {
    let token = null;

    // Lấy token từ Authorization header
    if (req?.headers?.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Fallback: lấy từ cookie (nếu có)
    if (!token && req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    }

    // Kiểm tra token có tồn tại không
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token is required. Please login to continue.',
            code: 'MISSING_TOKEN',
        });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            let message = 'Token không hợp lệ hoặc đã hết hạn!';
            let code = 'INVALID_TOKEN';

            // Chi tiết hóa lỗi cho frontend
            if (err.name === 'TokenExpiredError') {
                message = 'Access token đã hết hạn. Vui lòng đăng nhập lại!';
                code = 'TOKEN_EXPIRED';
            } else if (err.name === 'JsonWebTokenError') {
                message = 'Access token không hợp lệ!';
                code = 'MALFORMED_TOKEN';
            }

            return res.status(401).json({
                success: false,
                message,
                code,
            });
        }

        // Token hợp lệ, gán thông tin user vào request
        req.user = decoded;
        next();
    });
});

/**
 * Middleware kiểm tra quyền admin (chỉ dành cho API)
 * Trả về JSON response thay vì render view
 */
const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ admin mới có quyền truy cập tài nguyên này!',
            code: 'ADMIN_REQUIRED',
        });
    }
    next();
};

/**
 * Middleware kiểm tra role theo danh sách cho phép
 * @param {string[]} roles - Danh sách các role được phép truy cập
 * @returns {Function} Middleware function
 */
const checkRole = (roles) => {
    // Validate roles input
    if (!Array.isArray(roles) || roles.length === 0) {
        throw new Error('Roles must be a non-empty array');
    }

    // Kiểm tra roles truyền vào có hợp lệ không
    const invalidRoles = roles.filter((r) => !VALID_ROLES.includes(r));
    if (invalidRoles.length > 0) {
        throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
    }

    return (req, res, next) => {
        // Kiểm tra user có tồn tại không
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User information not found. Please login again.',
                code: 'USER_NOT_FOUND',
            });
        }

        // Kiểm tra role của user
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Bạn không có quyền truy cập. Quyền yêu cầu: ${roles.join(', ')}`,
                code: 'INSUFFICIENT_PERMISSIONS',
                required_roles: roles,
                user_role: req.user.role,
            });
        }

        next();
    };
};

/**
 * Middleware kiểm tra quyền hoặc chủ sở hữu resource
 * Cho phép user truy cập resource của chính họ hoặc admin/manager truy cập tất cả
 * @param {string[]} adminRoles - Các role có quyền admin (default: ['admin', 'manager'])
 * @param {string} userIdField - Tên field chứa user ID trong params (default: 'userId')
 */
const checkOwnerOrRole = (adminRoles = ['admin', 'manager'], userIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTHENTICATION_REQUIRED',
            });
        }

        const targetUserId = req.params[userIdField];
        const currentUserId = req.user.id;
        const currentUserRole = req.user.role;

        // Cho phép nếu là chủ sở hữu hoặc có quyền admin
        if (currentUserId === targetUserId || adminRoles.includes(currentUserRole)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể truy cập tài nguyên của chính mình!',
            code: 'ACCESS_DENIED',
        });
    };
};

/**
 * Utility function để tạo response cho lỗi authentication
 * @param {string} message - Thông báo lỗi
 * @param {string} code - Mã lỗi
 * @param {number} status - HTTP status code
 */
const createAuthErrorResponse = (message, code, status = 401) => {
    return {
        success: false,
        message,
        code,
        timestamp: new Date().toISOString(),
    };
};

// tạo hàm để verify chatbot n8n
const verifyChatbotCaller = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.CHATBOT_API_KEY) {
        return res
            .status(401)
            .json(createAuthErrorResponse('Unauthorized caller', 'UNAUTHORIZED_CALLER'));
    }
    next();
};

const tokenUtils = {
    generateAccessToken,
    generateRefreshToken,
    verifyLogedin,
    verifyAccessToken,
    isAdmin,
    checkRole,
    checkOwnerOrRole,
    createAuthErrorResponse,
    verifyChatbotCaller, // Middleware để xác thực caller là chatbot n8n
    VALID_ROLES, // Export danh sách roles để sử dụng ở nơi khác
};

module.exports = tokenUtils;
