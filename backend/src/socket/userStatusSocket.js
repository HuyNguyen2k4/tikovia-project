const { userStatusMap } = require('@src/controllers/userStatusController');

function setupUserStatusSocket(io) {
    io.on('connection', (socket) => {
        // Khi client gửi userId để báo online
        socket.on('user:online', (userId) => {
            if (!userId) return;
            userStatusMap.set(userId, {
                online: true,
                lastOnline: new Date(),
                lastOffline: userStatusMap.get(userId)?.lastOffline || null,
                socketId: socket.id,
            });
            // console.log(`User ${userId} is now online`);
            io.emit(
                'users:status',
                Array.from(userStatusMap.entries()).map(([userId, info]) => ({
                    id: userId,
                    ...info,
                }))
            );
        });

        // Khi client disconnect
        socket.on('disconnect', () => {
            for (const [userId, info] of userStatusMap.entries()) {
                if (info.socketId === socket.id) {
                    userStatusMap.set(userId, {
                        ...info,
                        online: false,
                        lastOffline: new Date(),
                    });
                    break;
                }
            }
            io.emit(
                'users:status',
                Array.from(userStatusMap.entries()).map(([userId, info]) => ({
                    id: userId,
                    ...info,
                }))
            );
        });
    });
}

module.exports = setupUserStatusSocket;
