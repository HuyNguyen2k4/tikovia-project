const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const PUBLIC_FIELDS = `
  id, trans_id, amount, paid_at, paid_by, created_by, evd_url, note, created_at, updated_at
`;

const PUBLIC_FIELDS_WITH_JOIN = `
  stp.id, stp.trans_id, stp.amount, stp.paid_at, stp.paid_by, stp.created_by, 
  stp.evd_url, stp.note, stp.created_at, stp.updated_at,
  st.doc_no,
  paid_user.full_name as paid_by_name,
  created_user.full_name as created_by_name
`;

// Map row -> object JS
function toSupplierTransactionPayment(row) {
    if (!row) return null;

    // Helper function để chuyển đổi UTC sang giờ Việt Nam
    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        transId: row.trans_id,
        amount: parseFloat(row.amount) || 0,
        paidAt: formatToVietnamTime(row.paid_at), // ✅ Thay đổi
        paidBy: row.paid_by,
        createdBy: row.created_by,
        evdUrl: row.evd_url,
        note: row.note,
        createdAt: formatToVietnamTime(row.created_at), // ✅ Thay đổi
        updatedAt: formatToVietnamTime(row.updated_at), // ✅ Thay đổi
        // Join fields
        docNo: row.doc_no || null,
        paidByName: row.paid_by_name || null,
        createdByName: row.created_by_name || null,
    };
}

/* -------------------- BASIC CRUD -------------------- */

// Tạo supplier transaction payment mới
async function createSupplierTransactionPayment({
    transId,
    amount,
    paidAt,
    paidBy,
    createdBy,
    evdUrl,
    note,
}) {
    const sql = `
        INSERT INTO supplier_transactions_payments (trans_id, amount, paid_at, paid_by, created_by, evd_url, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `;
    const params = [transId, amount, paidAt, paidBy, createdBy, evdUrl, note];
    const { rows } = await query(sql, params);

    // Sau khi tạo xong, gọi findById để lấy đầy đủ thông tin có join
    const newId = rows[0].id;
    return await findById(newId);
}

// Tìm supplier transaction payment theo ID
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_JOIN}
        FROM supplier_transactions_payments stp
        LEFT JOIN supplier_transactions st ON stp.trans_id = st.id
        LEFT JOIN users paid_user ON stp.paid_by = paid_user.id
        LEFT JOIN users created_user ON stp.created_by = created_user.id
        WHERE stp.id = $1
    `;
    const { rows } = await query(sql, [id]);
    return toSupplierTransactionPayment(rows[0]);
}

// Lấy tất cả payments của một transaction
async function getPaymentsByTransactionId(transId) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_JOIN}
        FROM supplier_transactions_payments stp
        LEFT JOIN supplier_transactions st ON stp.trans_id = st.id
        LEFT JOIN users paid_user ON stp.paid_by = paid_user.id
        LEFT JOIN users created_user ON stp.created_by = created_user.id
        WHERE stp.trans_id = $1
        ORDER BY stp.paid_at DESC, stp.created_at DESC
    `;
    const { rows } = await query(sql, [transId]);
    return rows.map(toSupplierTransactionPayment);
}

// Lấy payments theo user (người thanh toán)
async function getPaymentsByPaidBy(paidBy, { limit = 50, offset = 0 } = {}) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_JOIN}
        FROM supplier_transactions_payments stp
        LEFT JOIN supplier_transactions st ON stp.trans_id = st.id
        LEFT JOIN users paid_user ON stp.paid_by = paid_user.id
        LEFT JOIN users created_user ON stp.created_by = created_user.id
        WHERE stp.paid_by = $1
        ORDER BY stp.paid_at DESC
        LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [paidBy, limit, offset]);
    return rows.map(toSupplierTransactionPayment);
}

// Lấy payments theo người tạo
async function getPaymentsByCreatedBy(createdBy, { limit = 50, offset = 0 } = {}) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_JOIN}
        FROM supplier_transactions_payments stp
        LEFT JOIN supplier_transactions st ON stp.trans_id = st.id
        LEFT JOIN users paid_user ON stp.paid_by = paid_user.id
        LEFT JOIN users created_user ON stp.created_by = created_user.id
        WHERE stp.created_by = $1
        ORDER BY stp.created_at DESC
        LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [createdBy, limit, offset]);
    return rows.map(toSupplierTransactionPayment);
}

// TẠO HÀM HELPER MỚI ĐỂ DÙNG CHUNG
function _buildPaymentFilters(filters = {}) {
    const clauses = [];
    const params = [];

    const { q, transId, supplierId, departmentId, paidBy, createdBy, fromDate, toDate } = filters;

    if (q && q.trim()) {
        params.push(`%${q.trim()}%`);
        clauses.push(
            `(st.doc_no ILIKE $${params.length} OR stp.note ILIKE $${params.length} OR paid_user.full_name ILIKE $${params.length})`
        );
    }

    if (transId) {
        params.push(transId);
        clauses.push(`stp.trans_id = $${params.length}`);
    }

    // ✅ THÊM LOGIC LỌC MỚI
    if (supplierId) {
        params.push(supplierId);
        // Lọc trên bảng supplier_transactions (bí danh st) đã được JOIN
        clauses.push(`st.supplier_id = $${params.length}`);
    }

    if (departmentId) {
        params.push(departmentId);
        // Lọc trên bảng supplier_transactions (bí danh st) đã được JOIN
        clauses.push(`st.department_id = $${params.length}`);
    }

    if (paidBy) {
        params.push(paidBy);
        clauses.push(`stp.paid_by = $${params.length}`);
    }

    if (createdBy) {
        params.push(createdBy);
        clauses.push(`stp.created_by = $${params.length}`);
    }

    if (fromDate) {
        params.push(fromDate);
        clauses.push(`stp.paid_at >= $${params.length}`);
    }

    if (toDate) {
        params.push(toDate);
        clauses.push(`stp.paid_at <= $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return { whereClause: where, params };
}

// CẬP NHẬT LẠI HÀM listSupplierTransactionPayments
async function listSupplierTransactionPayments(filters = {}) {
    try {
        const { limit = 20, offset = 0 } = filters;

        // Sử dụng hàm helper
        const { whereClause, params } = _buildPaymentFilters(filters);

        params.push(limit, offset);

        const sql = `
            SELECT ${PUBLIC_FIELDS_WITH_JOIN}
            FROM supplier_transactions_payments stp
            LEFT JOIN supplier_transactions st ON stp.trans_id = st.id
            LEFT JOIN users paid_user ON stp.paid_by = paid_user.id
            LEFT JOIN users created_user ON stp.created_by = created_user.id
            ${whereClause}
            ORDER BY stp.paid_at DESC, stp.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toSupplierTransactionPayment);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách thanh toán:', error.message);
        throw new Error('Không thể lấy danh sách thanh toán');
    }
}

// CẬP NHẬT LẠI HÀM countSupplierTransactionPayments
async function countSupplierTransactionPayments(filters = {}) {
    try {
        // Sử dụng hàm helper
        const { whereClause, params } = _buildPaymentFilters(filters);

        const sql = `
            SELECT COUNT(*) AS count
            FROM supplier_transactions_payments stp
            LEFT JOIN supplier_transactions st ON stp.trans_id = st.id
            LEFT JOIN users paid_user ON stp.paid_by = paid_user.id
            LEFT JOIN users created_user ON stp.created_by = created_user.id
            ${whereClause}
        `.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm thanh toán:', error.message);
        throw new Error('Không thể lấy tổng số thanh toán');
    }
}

// Cập nhật supplier transaction payment
async function updateSupplierTransactionPayment(id, payload = {}) {
    const fields = [];
    const params = [];
    const map = {
        transId: 'trans_id',
        amount: 'amount',
        paidAt: 'paid_at',
        paidBy: 'paid_by',
        createdBy: 'created_by',
        evdUrl: 'evd_url',
        note: 'note',
    };

    Object.entries(map).forEach(([kSrc, kDb]) => {
        if (payload[kSrc] !== undefined) {
            params.push(payload[kSrc]);
            fields.push(`${kDb} = $${params.length}`);
        }
    });

    if (fields.length === 0) return findById(id);

    params.push(id);
    const sql = `
        UPDATE supplier_transactions_payments SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING id
    `;
    const { rows } = await query(sql, params);

    // Sau khi update xong, gọi findById để lấy đầy đủ thông tin có join
    return await findById(rows[0].id);
}

// Xóa supplier transaction payment
async function deleteSupplierTransactionPayment(id) {
    const sql = `DELETE FROM supplier_transactions_payments WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

// Xóa tất cả payments của một transaction
async function deletePaymentsByTransactionId(transId) {
    const sql = `DELETE FROM supplier_transactions_payments WHERE trans_id = $1`;
    const { rowCount } = await query(sql, [transId]);
    return rowCount;
}

// ========== EXTRA HELPERS ========== //

// Tính tổng số tiền đã thanh toán cho một transaction
async function calculateTotalPaidAmount(transId) {
    const sql = `
        SELECT SUM(amount) as total_paid
        FROM supplier_transactions_payments
        WHERE trans_id = $1
    `;
    const { rows } = await query(sql, [transId]);
    return parseFloat(rows[0].total_paid) || 0;
}

// Lấy thống kê thanh toán theo user (người thanh toán) (có thể theo khoảng thời gian và theo bucket period)
// period: null | 'day' | 'week' | 'month' | 'year'
// from, to: ISO string hoặc Date (optional) – nếu chỉ có from thì lọc >= from; chỉ có to thì lọc < to
// timezone: tên IANA TZ để truncate theo giờ địa phương (vd: 'Asia/Ho_Chi_Minh')
// return: nếu period=null → giống hàm gốc (theo user); nếu period có giá trị → thêm trường periodBucket
async function getPaymentStatsByUser({
    from,
    to,
    period = null,
    timezone = 'Asia/Ho_Chi_Minh',
} = {}) {
    // 1) Whitelist period để bảo mật khi interpolate vào DATE_TRUNC
    const validPeriods = [null, 'day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period)) {
        throw new Error('period không hợp lệ (chỉ nhận: day | week | month | year hoặc null)');
    }

    const whereClauses = [];
    const params = [];
    let p = 1;

    // 2) Lọc khoảng thời gian
    if (from) {
        whereClauses.push(`stp.paid_at >= $${p++}`);
        params.push(new Date(from));
    }
    if (to) {
        whereClauses.push(`stp.paid_at < $${p++}`);
        params.push(new Date(to));
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 3) Xây SQL theo 2 nhánh: có period (gom theo bucket) hoặc không
    let sql;
    if (period) {
        // Chỉ push timezone parameter khi cần dùng
        const tzParamIndex = p++;
        params.push(timezone);

        sql = `
      SELECT 
        stp.paid_by,
        u.full_name,
        DATE_TRUNC('${period}', (stp.paid_at AT TIME ZONE $${tzParamIndex})) AS period_bucket,
        COUNT(*) AS total_payments,
        SUM(stp.amount) AS total_amount
      FROM supplier_transactions_payments stp
      LEFT JOIN users u ON stp.paid_by = u.id
      ${whereSQL}
      GROUP BY stp.paid_by, u.full_name, DATE_TRUNC('${period}', (stp.paid_at AT TIME ZONE $${tzParamIndex}))
      ORDER BY period_bucket DESC, total_amount DESC
    `;
    } else {
        // Không push timezone parameter khi không cần
        sql = `
      SELECT 
        stp.paid_by,
        u.full_name,
        COUNT(*) AS total_payments,
        SUM(stp.amount) AS total_amount
      FROM supplier_transactions_payments stp
      LEFT JOIN users u ON stp.paid_by = u.id
      ${whereSQL}
      GROUP BY stp.paid_by, u.full_name
      ORDER BY total_amount DESC
    `;
    }

    const { rows } = await query(sql, params);

    // 4) Map kết quả
    return rows.map((row) => ({
        paidBy: row.paid_by,
        fullName: row.full_name,
        ...(period ? { periodBucket: row.period_bucket } : {}),
        totalPayments: parseInt(row.total_payments, 10),
        totalAmount: parseFloat(row.total_amount) || 0,
    }));
}

// Lấy thống kê thanh toán theo tháng
async function getPaymentStatsByMonth() {
    const sql = `
        SELECT 
            DATE_TRUNC('month', paid_at) as month,
            COUNT(*) as total_payments,
            SUM(amount) as total_amount
        FROM supplier_transactions_payments
        WHERE paid_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', paid_at)
        ORDER BY month DESC
    `;
    const { rows } = await query(sql);
    return rows.map((row) => ({
        month: row.month,
        totalPayments: parseInt(row.total_payments, 10),
        totalAmount: parseFloat(row.total_amount) || 0,
    }));
}

// Xóa nhiều payments
async function deleteMany(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `DELETE FROM supplier_transactions_payments WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

// Tìm theo danh sách IDs
async function findByIds(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_JOIN}
        FROM supplier_transactions_payments stp
        LEFT JOIN supplier_transactions st ON stp.trans_id = st.id
        LEFT JOIN users paid_user ON stp.paid_by = paid_user.id
        LEFT JOIN users created_user ON stp.created_by = created_user.id
        WHERE stp.id IN (${placeholders})
        ORDER BY stp.paid_at DESC
    `;
    const { rows } = await query(sql, ids);
    return rows.map(toSupplierTransactionPayment);
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    // Basic CRUD
    createSupplierTransactionPayment,
    findById,
    getPaymentsByTransactionId,
    getPaymentsByPaidBy,
    getPaymentsByCreatedBy,
    listSupplierTransactionPayments,
    updateSupplierTransactionPayment,
    deleteSupplierTransactionPayment,
    deletePaymentsByTransactionId,
    countSupplierTransactionPayments,

    // Helper functions
    calculateTotalPaidAmount,
    getPaymentStatsByUser,
    getPaymentStatsByMonth,
    deleteMany,
    findByIds,
};
