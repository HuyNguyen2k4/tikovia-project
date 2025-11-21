let io;

/**
 * Khởi tạo socket.io cho notifications
 * @param {Object} socketIO - Instance của socket.io
 */
const initNotificationSocket = (socketIO) => {
    io = socketIO;

    io.on('connection', (socket) => {
        // console.log(`[Notification Socket] User connected: ${socket.id}`);

        // User join room riêng của họ (dựa trên userId)
        socket.on('notification:join', (userId) => {
            socket.join(`user:${userId}`);
            // console.log(`[Notification Socket] User ${userId} joined their notification room`);
        });

        socket.on('disconnect', () => {
            //   console.log(`[Notification Socket] User disconnected: ${socket.id}`);
        });
    });
};

/**
 * Gửi notification đến user cụ thể
 * @param {String} userId - ID của user nhận
 * @param {Object} notification - Notification data
 */
const sendNotificationToUser = (userId, notification) => {
    if (!io) {
        console.error('[Notification Socket] Socket.IO chưa được khởi tạo');
        return;
    }
    io.to(`user:${userId}`).emit('notification:new', notification);
    //   console.log(`[Notification Socket] Sent notification to user ${userId}`);
};

/**
 * Gửi notification đến nhiều users
 * @param {Array} userIds - Danh sách user IDs
 * @param {Object} notification - Notification data
 */
const sendNotificationToMultipleUsers = (userIds, notification) => {
    if (!io) {
        console.error('[Notification Socket] Socket.IO chưa được khởi tạo');
        return;
    }
    userIds.forEach((userId) => {
        io.to(`user:${userId}`).emit('notification:new', notification);
    });
    //   console.log(`[Notification Socket] Sent notification to ${userIds.length} users`);
};

/**
 * Broadcast notification đến tất cả users
 * @param {Object} notification - Notification data
 */
const broadcastNotification = (notification) => {
    if (!io) {
        console.error('[Notification Socket] Socket.IO chưa được khởi tạo');
        return;
    }
    io.emit('notification:new', notification);
    //   console.log("[Notification Socket] Broadcast notification to all users");
};

// ✅ CommonJS export
module.exports = {
    initNotificationSocket,
    sendNotificationToUser,
    sendNotificationToMultipleUsers,
    broadcastNotification,
};
