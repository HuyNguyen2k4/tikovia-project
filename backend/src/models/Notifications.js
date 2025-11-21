const { query } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

function toNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    recipientId: row.recipient_id,
    title: row.title,
    body: row.body,
    link: row.link,
    status: row.status,
    createdAt: dayjs.utc(row.created_at).tz('Asia/Ho_Chi_Minh').format(),
    updatedAt: dayjs.utc(row.updated_at).tz('Asia/Ho_Chi_Minh').format(),
  };
}

const Notifications = {
  /**
   * Tạo notification mới
   */
  async create({ recipientId, title, body, link, status = 'unread' }) {
    const sql = `
      INSERT INTO notifications (recipient_id, title, body, link, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [recipientId, title, body, link, status];
    const { rows } = await query(sql, params);
    return toNotification(rows[0]);
  },

  /**
   * Lấy danh sách notifications của user (phân trang, lọc status)
   */
  async findByUserId(userId, { status, limit = 20, offset = 0 } = {}) {
    let sql = `SELECT * FROM notifications WHERE recipient_id = $1`;
    const params = [userId];
    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const { rows } = await query(sql, params);
    return rows.map(toNotification);
  },

  /**
   * Đếm tổng số notifications của user (có thể lọc status)
   */
  async countTotal(userId, status) {
    let sql = `SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = $1`;
    const params = [userId];
    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }
    const { rows } = await query(sql, params);
    return parseInt(rows[0].count, 10);
  },

  /**
   * Đếm số lượng notifications chưa đọc
   */
  async countUnread(userId) {
    const sql = `SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = $1 AND status = 'unread'`;
    const { rows } = await query(sql, [userId]);
    return parseInt(rows[0].count, 10);
  },

  /**
   * Đánh dấu notification là đã đọc
   */
  async markAsRead(id) {
    const sql = `UPDATE notifications SET status = 'read' WHERE id = $1 RETURNING *`;
    const { rows } = await query(sql, [id]);
    return toNotification(rows[0]);
  },

  /**
   * Đánh dấu tất cả notifications của user là đã đọc
   */
  async markAllAsRead(userId) {
    const sql = `UPDATE notifications SET status = 'read' WHERE recipient_id = $1 AND status = 'unread'`;
    const { rowCount } = await query(sql, [userId]);
    return rowCount;
  },

  /**
   * Xóa notification
   */
  async delete(id) {
    const sql = `DELETE FROM notifications WHERE id = $1`;
    const { rowCount } = await query(sql, [id]);
    return rowCount > 0;
  },
};

module.exports = Notifications;