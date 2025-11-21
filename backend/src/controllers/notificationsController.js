const Notifications = require('@src/models/Notifications');
const { sendNotificationToMultipleUsers } = require('@src/socket/notificationSocket');
const { sendNotificationToUser } = require('@src/socket/notificationSocket');

/**
 * Lấy danh sách notifications của user hiện tại
 * Có thể lọc theo trạng thái (đã đọc/chưa đọc) và phân trang
 * Query params:
 *   - status: 'read' | 'unread' (tùy chọn)
 *   - limit: số lượng tối đa (mặc định 20)
 *   - offset: số bản ghi bỏ qua (mặc định 0)
 */
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit, offset } = req.query;
        const parsedLimit = limit ? parseInt(limit) : 20;
        const parsedOffset = offset ? parseInt(offset) : 0;

        const notifications = await Notifications.findByUserId(userId, {
            status,
            limit: parsedLimit,
            offset: parsedOffset,
        });
        const unreadCount = await Notifications.countUnread(userId);
        const total = await Notifications.countTotal(userId, status);

        return res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                total,
                limit: parsedLimit,
                offset: parsedOffset,
                unreadCount,
            },
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách thông báo',
        });
    }
};

/**
 * Đánh dấu notification là đã đọc
 */
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notifications.markAsRead(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo',
            });
        }
        return res.status(200).json({
            success: true,
            data: notification,
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi đánh dấu đã đọc',
        });
    }
};

/**
 * Đánh dấu tất cả notifications là đã đọc
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await Notifications.markAllAsRead(userId);
        return res.status(200).json({
            success: true,
            message: `Đã đánh dấu ${count} thông báo là đã đọc`,
        });
    } catch (error) {
        console.error('Error marking all as read:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi đánh dấu tất cả đã đọc',
        });
    }
};

/**
 * Xóa notification
 */
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Notifications.delete(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Đã xóa thông báo',
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa thông báo',
        });
    }
};

/**
 * Tạo notification mới và gửi realtime
 * Body params:
 *   - recipient_id: ID của user nhận notification
 *   - title: tiêu đề notification
 *   - body: nội dung notification
 *   - link: liên kết (tùy chọn)
 */
const createNotification = async (req, res) => {
    try {
        const { recipientId, title, body, link } = req.body;
        if (!recipientId || !title || !body) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: recipientId, title, body',
            });
        }
        const notification = await Notifications.create({
            recipientId,
            title,
            body,
            link,
        });
        sendNotificationToUser(recipientId, notification);
        return res.status(201).json({
            success: true,
            data: notification,
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo thông báo',
        });
    }
};

const createAndSendToMany = async (req, res) => {
  try {
    const { recipientIds, title, body, link } = req.body;
    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ success: false, message: "Thiếu danh sách recipientIds" });
    }
    const notifications = [];
    for (const userId of recipientIds) {
      const notification = await Notifications.create({ recipientId: userId, title, body, link });
      notifications.push(notification);
    //   console.log('Created notification for user:', userId);
      sendNotificationToUser(userId, notification);
    }
    // sendNotificationToMultipleUsers(recipientIds, { title, body, link });
    return res.status(201).json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi khi gửi thông báo" });
  }
}

module.exports = {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    createAndSendToMany,
};
