const router = require("express").Router();
const ctrls = require("@src/controllers/notificationsController");
const tokenUtils = require("@src/middlewares/jwt");
const alertInventoryLots = require("@src/jobs/inventoryLotAlertJob");

// Tất cả routes đều cần verify token
router.use(tokenUtils.verifyAccessToken);

/** Lấy danh sách notifications của user hiện tại
 * Query params:
 *   - status: 'read' | 'unread' (tùy chọn)
 *   - limit: số lượng tối đa (mặc định 20)
 *   - offset: số bản ghi bỏ qua (mặc định 0)
 */
router.get("/", ctrls.getMyNotifications);

// Đánh dấu notification là đã đọc
router.put("/:id/read", ctrls.markAsRead);

// Đánh dấu tất cả notifications là đã đọc
router.put("/read-all", ctrls.markAllAsRead);

// Xóa notification
router.delete("/:id", ctrls.deleteNotification);

/** Tạo notification mới 
 * Body params:
 *   - recipient_id: ID của user nhận notification
 *   - title: tiêu đề notification
 *   - body: nội dung notification
 *   - link: liên kết (tùy chọn)
 */
router.post("/", ctrls.createNotification);

// Tạo notification mới cho nhiều user
router.post('/multi', ctrls.createAndSendToMany);


// Quét và gửi notification cảnh báo tồn kho thấp, sắp hết hạn
router.get('/scanAndNotify', alertInventoryLots.scanAndNotify);

module.exports = router;
