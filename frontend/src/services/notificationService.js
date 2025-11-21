import apiClient from "./apiClient";

/** Lấy danh sách notifications của user hiện tại
 * @param {Object} params
 *   - status: 'read' | 'unread' (tùy chọn)
 *   - limit: số lượng tối đa (mặc định 20)
 *   - offset: số bản ghi bỏ qua (mặc định 0)
 */
export const getNotifications = (params) => {
  return apiClient.get("/notifications", { params });
};

// Đánh dấu notification là đã đọc
export const markNotificationAsRead = (notificationId) => {
  return apiClient.put(`/notifications/${notificationId}/read`);
};

// Đánh dấu tất cả notifications là đã đọc
export const markAllNotificationsAsRead = () => {
  return apiClient.put("/notifications/read-all");
};

// Xóa notification
export const deleteNotification = (notificationId) => {
  return apiClient.delete(`/notifications/${notificationId}`);
};

// Tạo notification mới
export const createNotification = (notificationData) => {
  return apiClient.post("/notifications", notificationData);
};
