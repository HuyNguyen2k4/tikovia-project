const asyncHandler = require('express-async-handler');

// In-memory user status store
const userStatusMap = new Map(); // userId -> { online: bool, lastOnline: Date, lastOffline: Date }

// API: Get status of a single user
const getUserStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const status = userStatusMap.get(userId);
    if (!status) {
        return res.status(404).json({ success: false, message: 'User not found or never online' });
    }
    res.status(200).json({
        success: true,
        data: {
            userId,
            online: status.online,
            lastOnline: status.lastOnline,
            lastOffline: status.lastOffline,
        },
    });
});

// API: Get status of all users
const getAllUserStatuses = asyncHandler(async (req, res) => {
    const data = Array.from(userStatusMap.entries()).map(([userId, info]) => ({
        userId,
        online: info.online,
        lastOnline: info.lastOnline,
        lastOffline: info.lastOffline,
    }));
    res.status(200).json({ success: true, data });
});

// Export userStatusMap for socket usage
module.exports = {
    getUserStatus,
    getAllUserStatuses,
    userStatusMap,
};
