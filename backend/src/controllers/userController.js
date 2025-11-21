const asyncHandler = require('express-async-handler');
const User = require('@src/models/Users');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { query } = require('@src/config/dbconnect');
const { mailResetPassNewUser, mailEmailChanged } = require('@templates/resetPasswordEmail');
const sendMail = require('@utils/sendMail');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { userStatusMap } = require('@src/controllers/userStatusController');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to validate unique fields
const validateUniqueFields = async (payload, existingUser) => {
    const { username, email, phone } = payload;
    const [userByUsername, userByEmail, userByPhone] = await Promise.all([
        username && username !== existingUser.username ? User.findByUsername(username) : null,
        email && email !== existingUser.email ? User.findByEmail(email) : null,
        phone && phone !== existingUser.phone ? User.findByPhone(phone) : null, // ✅ Sửa lại
    ]);

    if (userByUsername) {
        throw new Error(`Username already taken by: ${userByUsername.username}`);
    }
    if (userByEmail) {
        throw new Error(`Email already taken by: ${userByEmail.username}`);
    }
    if (userByPhone) {
        throw new Error(`Phone number already taken by: ${userByPhone.username}`);
    }
};

// Helper function to validate department_id
const validateDepartmentId = async (department_id) => {
    if (department_id) {
        const dept = await query('SELECT id FROM departments WHERE id = $1', [department_id]);
        if (dept.rowCount === 0) {
            throw new Error('Invalid department_id');
        }
    }
};

// ✅ Helper function để parse và validate date từ frontend
const parseAndValidateDate = (dateString, fieldName) => {
    if (!dateString) return null;

    try {
        // Parse date với dayjs, tự động nhận diện timezone
        const parsed = dayjs(dateString);

        if (!parsed.isValid()) {
            throw new Error(`Invalid ${fieldName} format`);
        }

        // Chuyển về UTC Date object cho PostgreSQL
        return parsed.utc().toDate();
    } catch (error) {
        throw new Error(`Invalid ${fieldName}: ${error.message}`);
    }
};

// Lấy danh sách users (GET /users) với phân trang và tìm kiếm (Antd Table)
// const listUsers = asyncHandler(async (req, res) => {
//     const { q, role, limit, offset } = req.query;

//     // Kiểm tra và xử lý tham số
//     const parsedLimit = parseInt(limit) || 20;
//     const parsedOffset = parseInt(offset) || 0;
//     const maxLimit = 100;

//     if (parsedLimit <= 0 || parsedOffset < 0) {
//         return res.status(400).json({
//             success: false,
//             message: 'Giới hạn và vị trí phải là số không âm',
//         });
//     }

//     const finalLimit = Math.min(parsedLimit, maxLimit);

//     // ✅ Parse role parameter
//     let roleFilter = null;
//     if (role) {
//         if (typeof role === 'string') {
//             roleFilter = role
//                 .split(',')
//                 .map((r) => r.trim())
//                 .filter(Boolean);
//         } else if (Array.isArray(role)) {
//             roleFilter = role;
//         }
//     }

//     // Gọi listUsers và countUsers song song
//     const [users, total] = await Promise.all([
//         User.listUsers({
//             q: q ? q.trim() : undefined,
//             role: roleFilter,
//             limit: finalLimit,
//             offset: parsedOffset,
//         }),
//         User.countUsers({
//             q: q ? q.trim() : undefined,
//             role: roleFilter,
//         }),
//     ]);

//     res.status(200).json({
//         success: true,
//         data: users,
//         pagination: {
//             total,
//             limit: finalLimit,
//             offset: parsedOffset,
//             hasMore: parsedOffset + finalLimit < total,
//         },
//     });
// });
/////////////////////////////////////////////////////
const listUsers = asyncHandler(async (req, res) => {
    const { q, role, limit, offset } = req.query;

    // Kiểm tra và xử lý tham số
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const maxLimit = 100;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giới hạn và vị trí phải là số không âm',
        });
    }

    const finalLimit = Math.min(parsedLimit, maxLimit);

    // ✅ Parse role parameter
    let roleFilter = null;
    if (role) {
        if (typeof role === 'string') {
            roleFilter = role
                .split(',')
                .map((r) => r.trim())
                .filter(Boolean);
        } else if (Array.isArray(role)) {
            roleFilter = role;
        }
    }

    // Gọi listUsers và countUsers song song
    const [users, total] = await Promise.all([
        User.listUsers({
            q: q ? q.trim() : undefined,
            role: roleFilter,
            limit: finalLimit,
            offset: parsedOffset,
        }),
        User.countUsers({
            q: q ? q.trim() : undefined,
            role: roleFilter,
        }),
    ]);

    // ✅ Merge trạng thái hoạt động vào từng user
    const usersWithStatus = users.map(user => {
        const status = userStatusMap.get(user.id);
        return {
            ...user,
            online: status ? status.online : false,
            lastOnline: status ? status.lastOnline : null,
            lastOffline: status ? status.lastOffline : null,
        };
    });

    res.status(200).json({
        success: true,
        data: usersWithStatus,
        pagination: {
            total,
            limit: finalLimit,
            offset: parsedOffset,
            hasMore: parsedOffset + finalLimit < total,
        },
    });
});

// Lấy toàn bộ thông tin user hiện tại (GET /users/current)
const getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
});

// Lấy thông tin user theo ID (GET /users/:id)
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
});

// Tạo user mới (POST /users)
const createUser = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { email, username, fullName, phone, role, departmentId, birthDate } = req.body;

    // ✅ Validate và parse birthDate nếu có
    let parsedBirthDate = null;
    if (birthDate) {
        try {
            parsedBirthDate = parseAndValidateDate(birthDate, 'birth date');
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // Validate department_id
    try {
        await validateDepartmentId(departmentId);
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }

    // Kiểm tra email hoặc username đã tồn tại chưa
    const existingByUsername = await User.findByUsername(username);
    if (existingByUsername) {
        return res.status(400).json({ success: false, message: 'Username already in use' });
    }
    const existingByEmail = await User.findByEmail(email);
    if (existingByEmail) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // ✅ Kiểm tra phone đã tồn tại chưa
    const existingByPhone = await User.findByPhone(phone);
    if (existingByPhone) {
        return res.status(400).json({ success: false, message: 'Phone already in use' });
    }

    // Kiểm tra role có hợp lệ không
    const validRoles = [
        'admin',
        'manager',
        'accountant',
        'picker',
        'sup_picker',
        'shipper',
        'sup_shipper',
        'seller',
    ];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Tạo user mới với password random (ko cho ai biết)
    const newUser = await User.createUser({
        email,
        username,
        // 🔑 Tạo mật khẩu random 8 ký tự
        password: Math.random().toString(36).slice(-8),
        fullName,
        phone,
        role,
        departmentId,
        birthDate: parsedBirthDate, // ✅ Thêm birthDate
        status: 'disable', // Mặc định tạo xong là khóa, chờ kích hoạt
    });

    // TH nếu tài khoản có email thì gửi mail kích hoạt
    const resetToken = await User.generatePasswordResetForNewUser(newUser.id);
    // Gửi email chào mừng + link thiết lập mật khẩu (hạn 7 ngày)
    const content = {
        subject: 'Kích hoạt tài khoản Tikovia của bạn',
        html: mailResetPassNewUser(resetToken, fullName),
        text: `Chào mừng bạn đến với Tikovia! Vui lòng kích hoạt tài khoản của bạn bằng cách nhấp vào liên kết sau: ${process.env.CLIENT_URL}/reset-password?token=${resetToken}`,
    };
    await sendMail(email, content);

    res.status(201).json({ success: true, data: newUser });
});

// Cập nhật thông tin cho user hiện tại (PUT /users/current)
const updateCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { phone, avatar, birthDate } = req.body;
    if (!phone && !avatar && !birthDate) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    // ✅ Validate và parse birthDate nếu có
    let parsedBirthDate = undefined;
    if (birthDate !== undefined) {
        if (birthDate === null || birthDate === '') {
            parsedBirthDate = null; // Cho phép set null
        } else {
            try {
                parsedBirthDate = parseAndValidateDate(birthDate, 'birth date');
            } catch (error) {
                return res.status(400).json({ success: false, message: error.message });
            }
        }
    }

    try {
        const updatedUser = await User.updateUser(userId, {
            phone,
            avatar,
            birthDate: parsedBirthDate,
        });
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, data: updatedUser });
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint?.includes('users_phone_key'))
                return res.status(400).json({ success: false, message: 'Phone already in use' });
        }
        console.error('Update user error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Cập nhật thông tin user (PUT /users/:id) (for admin)
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const { email, username, fullName, phone, role, departmentId, status, birthDate } = payload;

    const validRoles = [
        'admin',
        'manager',
        'accountant',
        'picker',
        'sup_picker',
        'shipper',
        'sup_shipper',
        'seller',
    ];
    const validStatuses = ['active', 'disable'];

    try {
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        // ✅ Validate và parse birthDate nếu có
        let parsedBirthDate = undefined;
        if (birthDate !== undefined) {
            if (birthDate === null || birthDate === '') {
                parsedBirthDate = null;
            } else {
                parsedBirthDate = parseAndValidateDate(birthDate, 'birth date');
            }
        }

        await validateDepartmentId(departmentId);
        await validateUniqueFields(payload, existingUser);

        const updatedUser = await User.updateUser(id, {
            email,
            username,
            fullName,
            phone,
            role,
            departmentId,
            status,
            birthDate: parsedBirthDate, // ✅ Thêm birthDate
        });
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Kiểm tra có thay đổi email không để gửi thông báo
        if (email && email !== existingUser.email) {
            // Nếu đổi email thì reset mật khẩu luôn
            await User.updatePassword(id, Math.random().toString(36).slice(-8));

            // Đổi status thành disable
            await User.updateUser(id, { status: 'disable' });

            // Gửi email thông báo thay đổi email
            const resetToken = await User.generatePasswordResetForNewUser(updatedUser.id);
            const content = {
                subject: 'Email tài khoản Tikovia của bạn đã được thay đổi',
                html: mailEmailChanged(resetToken, fullName || existingUser.fullName),
                text: `Email tài khoản Tikovia của bạn đã được thay đổi. Tài khoản của bạn hiện đang bị vô hiệu hóa. Vui lòng thiết lập mật khẩu mới để kích hoạt lại tài khoản: ${process.env.CLIENT_URL}/reset-password?token=${resetToken}`,
            };
            await sendMail(email, content);
        }
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error.message);
        const statusCode =
            error.message.includes('Invalid') || error.message.includes('taken') ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
});

// Đăng nhập user (POST /users/login)
const login = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    const result = await User.login({ email, username, password });

    if (!result.ok) {
        const message = result.reason === 'not_found' ? 'User not found' : 'Invalid password';
        return res.status(401).json({ success: false, message });
    }

    res.status(200).json({ success: true, data: result.user });
});

const changePassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Missing password fields' });
    }

    // Lấy user kèm password
    const userRow = await User.findByIdWithPassword(userId);
    if (!userRow) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!userRow.password) {
        return res.status(400).json({
            success: false,
            message: 'This account has no password set',
        });
    }

    // So sánh mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, userRow.password);
    if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Old password is incorrect' });
    }

    // Hash mật khẩu mới và cập nhật
    await User.updatePassword(userId, newPassword);

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
});

// ✅ Thêm endpoint để test timezone conversion
const getTimezoneTest = asyncHandler(async (req, res) => {
    const now = new Date();

    res.status(200).json({
        success: true,
        data: {
            server_utc: now.toISOString(),
            server_vietnam: dayjs.utc(now).tz('Asia/Ho_Chi_Minh').format(),
            dayjs_vietnam: dayjs().tz('Asia/Ho_Chi_Minh').format(),
            timezone_info: {
                current_offset: dayjs().tz('Asia/Ho_Chi_Minh').format('Z'),
                timezone_name: 'Asia/Ho_Chi_Minh',
            },
        },
    });
});

// Lấy tất cả user theo role (dùng cho các dropdown chọn user)
// [GET] /api/users/by-role?role=seller,admin
const getAllUsersByRole = asyncHandler(async (req, res) => {
    const { role } = req.query;
    if (!role) {
        return res.status(400).json({ success: false, message: 'Role parameter is required' });
    }
    const users = await User.getAllUsersByRole(role);
    res.status(200).json({ success: true, data: users });
});

module.exports = {
    listUsers,
    getCurrentUser,
    getUserById,
    createUser,
    updateUser,
    login,
    updateCurrentUser,
    changePassword,
    getTimezoneTest, // ✅ Export test endpoint
    getAllUsersByRole,
};
