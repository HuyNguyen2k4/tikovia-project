const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

/* ========== HELPER FUNCTIONS ========== */

// Public fields cho SELECT queries
const PUBLIC_FIELDS = `
  id, sepay_trans_id, gateway, account_number, transaction_date,
  transfer_type, transfer_amount, accumulated, content, reference_code,
  description, status, transaction_prefix, order_code, error_message,
  evd_url, raw_payload, created_at, updated_at
`;

// Map row -> object JS
function toLogSepay(row) {
    if (!row) return null;

    // Helper function để chuyển đổi UTC sang giờ Việt Nam
    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        sepayTransId: row.sepay_trans_id,
        gateway: row.gateway,
        accountNumber: row.account_number,
        transactionDate: formatToVietnamTime(row.transaction_date),
        transferType: row.transfer_type,
        transferAmount: parseFloat(row.transfer_amount) || 0,
        accumulated: parseFloat(row.accumulated) || 0,
        content: row.content,
        referenceCode: row.reference_code,
        description: row.description,
        status: row.status,
        transactionPrefix: row.transaction_prefix,
        orderCode: row.order_code,
        errorMessage: row.error_message,
        evdUrl: row.evd_url,
        rawPayload: row.raw_payload, // JSON object
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),
    };
}

/* ========== BASIC CRUD ========== */

/**
 * Tạo log mới từ webhook SePay
 * @param {Object} sepayPayload - Payload từ SePay webhook
 * @param {string} evidenceUrl - URL ảnh chứng từ (optional)
 * @returns {Promise<Object>} - Log record đã được tạo
 */
async function create(sepayPayload, evidenceUrl = null) {
    try {
        const sql = `
            INSERT INTO log_sepay (
                sepay_trans_id, gateway, account_number, transaction_date,
                transfer_type, transfer_amount, accumulated, content,
                reference_code, description, status, evd_url, raw_payload
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `;

        const params = [
            sepayPayload.id,
            sepayPayload.gateway || '',
            sepayPayload.accountNumber || '',
            sepayPayload.transactionDate || new Date(),
            sepayPayload.transferType || 'in',
            parseFloat(sepayPayload.transferAmount) || 0,
            parseFloat(sepayPayload.accumulated) || 0,
            sepayPayload.content || '',
            sepayPayload.referenceCode || null,
            sepayPayload.description || '',
            'received', // Trạng thái ban đầu
            evidenceUrl,
            JSON.stringify(sepayPayload), // Raw payload as JSON
        ];

        const { rows } = await query(sql, params);
        const newId = rows[0].id;

        // Trả về record vừa tạo
        return await findById(newId);
    } catch (error) {
        console.error('Lỗi khi tạo log SePay:', error.message);
        throw new Error('Không thể tạo log SePay');
    }
}

/**
 * Tìm log theo ID
 * @param {string} id - UUID của log record
 * @returns {Promise<Object|null>} - Log record hoặc null
 */
async function findById(id) {
    try {
        const sql = `SELECT ${PUBLIC_FIELDS} FROM log_sepay WHERE id = $1`;
        const { rows } = await query(sql, [id]);
        return toLogSepay(rows[0]);
    } catch (error) {
        console.error('Lỗi khi tìm log SePay theo ID:', error.message);
        throw new Error('Không thể tìm log SePay');
    }
}

/**
 * Tìm log theo SePay transaction ID
 * @param {string} sepayTransId - ID giao dịch từ SePay
 * @returns {Promise<Object|null>} - Log record hoặc null
 */
async function findBySepayTransId(sepayTransId) {
    try {
        const sql = `SELECT ${PUBLIC_FIELDS} FROM log_sepay WHERE sepay_trans_id = $1`;
        const { rows } = await query(sql, [sepayTransId]);
        return toLogSepay(rows[0]);
    } catch (error) {
        console.error('Lỗi khi tìm log SePay theo transaction ID:', error.message);
        throw new Error('Không thể tìm log SePay');
    }
}

/**
 * Cập nhật trạng thái của log
 * @param {string} sepayTransId - ID giao dịch từ SePay
 * @param {string} status - Trạng thái mới
 * @param {string} errorMessage - Thông báo lỗi (optional)
 * @param {string} transactionPrefix - Tiền tố transaction (optional)
 * @param {string} orderCode - Mã đơn hàng (optional)
 * @returns {Promise<Object>} - Log record đã cập nhật
 */
async function updateStatus(
    sepayTransId,
    status,
    errorMessage = null,
    transactionPrefix = null,
    orderCode = null
) {
    try {
        const sql = `
            UPDATE log_sepay 
            SET status = $1, 
                error_message = $2,
                transaction_prefix = $3,
                order_code = $4,
                updated_at = NOW()
            WHERE sepay_trans_id = $5
            RETURNING id
        `;

        const params = [status, errorMessage, transactionPrefix, orderCode, sepayTransId];
        const { rows } = await query(sql, params);

        if (rows.length === 0) {
            throw new Error(`Không tìm thấy log với SePay transaction ID: ${sepayTransId}`);
        }

        return await findById(rows[0].id);
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái log SePay:', error.message);
        throw new Error('Không thể cập nhật trạng thái log SePay');
    }
}

/**
 * Lấy danh sách logs với filter và phân trang
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} - Danh sách logs
 */
async function listLogs({
    q,
    status,
    transactionPrefix,
    transferType,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    limit = 20,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(content ILIKE $${params.length} OR order_code ILIKE $${params.length} 
                  OR reference_code ILIKE $${params.length} OR gateway ILIKE $${params.length})`
            );
        }

        // Lọc theo trạng thái
        if (status) {
            params.push(status);
            clauses.push(`status = $${params.length}`);
        }

        // Lọc theo transaction prefix
        if (transactionPrefix) {
            params.push(transactionPrefix);
            clauses.push(`transaction_prefix = $${params.length}`);
        }

        // Lọc theo loại giao dịch
        if (transferType) {
            params.push(transferType);
            clauses.push(`transfer_type = $${params.length}`);
        }

        // Lọc theo khoảng thời gian
        if (fromDate) {
            params.push(fromDate);
            clauses.push(`transaction_date >= $${params.length}`);
        }
        if (toDate) {
            params.push(toDate);
            clauses.push(`transaction_date <= $${params.length}`);
        }

        // Lọc theo khoảng số tiền
        if (minAmount !== undefined) {
            params.push(parseFloat(minAmount));
            clauses.push(`transfer_amount >= $${params.length}`);
        }
        if (maxAmount !== undefined) {
            params.push(parseFloat(maxAmount));
            clauses.push(`transfer_amount <= $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM log_sepay
            ${where}
            ORDER BY created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toLogSepay);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách logs SePay:', error.message);
        throw new Error('Không thể lấy danh sách logs SePay');
    }
}

/**
 * Đếm tổng số logs với filter
 * @param {Object} options - Filter options (same as listLogs)
 * @returns {Promise<number>} - Tổng số records
 */
async function countLogs({
    q,
    status,
    transactionPrefix,
    transferType,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        // Same filter logic as listLogs
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(content ILIKE $${params.length} OR order_code ILIKE $${params.length} 
                  OR reference_code ILIKE $${params.length} OR gateway ILIKE $${params.length})`
            );
        }

        if (status) {
            params.push(status);
            clauses.push(`status = $${params.length}`);
        }

        if (transactionPrefix) {
            params.push(transactionPrefix);
            clauses.push(`transaction_prefix = $${params.length}`);
        }

        if (transferType) {
            params.push(transferType);
            clauses.push(`transfer_type = $${params.length}`);
        }

        if (fromDate) {
            params.push(fromDate);
            clauses.push(`transaction_date >= $${params.length}`);
        }
        if (toDate) {
            params.push(toDate);
            clauses.push(`transaction_date <= $${params.length}`);
        }

        if (minAmount !== undefined) {
            params.push(parseFloat(minAmount));
            clauses.push(`transfer_amount >= $${params.length}`);
        }
        if (maxAmount !== undefined) {
            params.push(parseFloat(maxAmount));
            clauses.push(`transfer_amount <= $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `SELECT COUNT(*) AS count FROM log_sepay ${where}`.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm logs SePay:', error.message);
        throw new Error('Không thể đếm logs SePay');
    }
}

/**
 * Lấy thống kê logs theo trạng thái
 * @returns {Promise<Array>} - Thống kê theo status
 */
async function getStatsByStatus() {
    try {
        const sql = `
            SELECT 
                status,
                COUNT(*) as count,
                SUM(transfer_amount) as total_amount
            FROM log_sepay
            GROUP BY status
            ORDER BY count DESC
        `;

        const { rows } = await query(sql);
        return rows.map((row) => ({
            status: row.status,
            count: parseInt(row.count, 10),
            totalAmount: parseFloat(row.total_amount) || 0,
        }));
    } catch (error) {
        console.error('Lỗi khi lấy thống kê logs SePay:', error.message);
        throw new Error('Không thể lấy thống kê logs SePay');
    }
}

/* ========== EXPORTS ========== */

module.exports = {
    // Basic CRUD
    create,
    findById,
    findBySepayTransId,
    updateStatus,

    // List & Search
    listLogs,
    countLogs,

    // Statistics
    getStatsByStatus,

    // Helper
    toLogSepay,
};
