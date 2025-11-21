const cron = require('node-cron');
const InventoryLot = require('@src/models/InventoryLots');
const User = require('@src/models/Users');
const { createAndSendToMany } = require('@src/controllers/notificationsController');
const dayjs = require('dayjs');

// Hàm quét và gửi notification
async function scanAndNotify(req, res) {
    try {
        // 1. Lấy danh sách user có role admin, manager
        const adminUsers = await User.getAllUsersByRoles(['admin', 'manager']);
        const recipientIds = adminUsers.map((u) => u.id);
        if (recipientIds.length === 0) return;

        // 2. Lấy các lô hàng tồn kho thấp (theo từng product)
        const lowStockLots = await InventoryLot.getLowStockLotsByProduct();

        // 3. Lấy các lô hàng sắp hết hạn (theo từng product)
        const expiringLots = await InventoryLot.getExpiringLotsByProduct();

        // 4. Gửi notification cho từng loại cảnh báo
        for (const lot of lowStockLots) {
            const title = 'Cảnh báo tồn kho thấp';
            const body = `Lô hàng ${lot.lot_no} (${lot.product_name}) ở ${lot.department_name} có số lượng tồn kho thấp: ${lot.qty_on_hand} (Ngưỡng: ${lot.low_stock_threshold})`;
            const link = `/inventory-lot?lotId=${lot.id}`;
            await createAndSendToMany(
                {
                    body: { recipientIds, title, body, link },
                },
                { status: () => ({ json: () => {} }) }
            );
        }

        for (const lot of expiringLots) {
            const daysToExpire = dayjs(lot.expiry_date).diff(dayjs(), 'day');
            const title = 'Cảnh báo gần hết hạn';
            const body = `Lô hàng ${lot.lot_no} (${lot.product_name}) ở ${lot.department_name} sẽ hết hạn trong ${daysToExpire} ngày (Ngưỡng: ${lot.near_expiry_days} ngày)`;
            const link = `/inventory-lot?lotId=${lot.id}`;
            await createAndSendToMany(
                {
                    body: { recipientIds, title, body, link },
                },
                { status: () => ({ json: () => {} }) }
            );
        }

        console.log(
            `[InventoryLotAlertJob] Notifications sent to admin/manager at ${new Date().toISOString()}`
        );
        return res.status(200).json({ message: 'Notifications sent successfully' });
    } catch (error) {
        console.error('[InventoryLotAlertJob] Error:', error);
    }
}
// ┌───────────── minute (0 - 59)
// │ ┌───────────── hour (0 - 23)
// │ │ ┌───────────── day of month (1 - 31)
// │ │ │ ┌───────────── month (1 - 12)
// │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday=0)
// │ │ │ │ │
// │ │ │ │ │
// * * * * *
// Lên lịch chạy job mỗi ngày lúc 10h51 sáng
function startInventoryLotAlertJob() {
    cron.schedule('22 11 * * *', scanAndNotify, { timezone: 'Asia/Ho_Chi_Minh' });
    // console.log('[InventoryLotAlertJob] Scheduled to run every day at 10:51 AM');
}

module.exports = { startInventoryLotAlertJob, scanAndNotify };
