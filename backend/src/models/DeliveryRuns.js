const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const DeliveryRunOrder = require('./DeliveryRunOrders');
const crypto = require('crypto');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const PUBLIC_FIELDS = `
  dr.id, dr.delivery_no, dr.supervisor_id, dr.shipper_id, dr.vehicle_no, 
  dr.status, dr.created_at, dr.updated_at, dr.started_at, dr.completed_at,
  u.full_name AS supervisor_name,
  s.full_name AS shipper_name
`;
// Helper function để generate delivery_no tự động
// Ví dụ: DER-091025-C8F23A
const generateOrderNo = () => {
    const prefix = 'DER';
    const today = dayjs().format('DDMMYY');
    // Dùng 3 bytes để tạo 6 ký tự hex
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${today}-${randomSuffix}`;
};
// Sử dụng json_agg để lấy orders hiệu quả hơn
const PUBLIC_FIELDS_WITH_ORDERS = `
    ${PUBLIC_FIELDS},
    (
        SELECT COALESCE(json_agg(row_to_json(orders)), '[]'::json)
        FROM (
            SELECT
                dro.id,
                dro.run_id,
                dro.order_id,
                dro.route_seq,
                dro.cod_amount,
                dro.status,
                dro.actual_pay,
                dro.evd_url,
                dro.note,
                dro.created_at,
                dro.updated_at,
                dro.started_at,
                dro.completed_at,
                so.order_no,
                c.id AS customer_id,
                c.code AS customer_code,
                c.name AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                c.address AS customer_address,
                c.tax_code AS customer_tax_code,
                c.credit_limit AS customer_credit_limit,
                c.note AS customer_note,
                c.managed_by AS customer_managed_by,
                c.created_at AS customer_created_at,
                c.updated_at AS customer_updated_at
            FROM delivery_run_orders dro
            LEFT JOIN sales_orders so ON dro.order_id = so.id
            LEFT JOIN customers c ON so.customer_id = c.id
            WHERE dro.run_id = dr.id
            ORDER BY dro.route_seq, dro.created_at
        ) orders
    ) AS orders
`;

/**
 * Chuyển đổi một hàng từ database thành một đối tượng DeliveryRun JS.
 * @param {object} row - Hàng dữ liệu từ database.
 * @returns {object|null} Đối tượng DeliveryRun hoặc null nếu không có row.
 */
function toDeliveryRun(row) {
    if (!row) return null;

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        deliveryNo: row.delivery_no,
        supervisorId: row.supervisor_id,
        supervisorName: row.supervisor_name || null,
        shipperId: row.shipper_id,
        shipperName: row.shipper_name || null,
        vehicleNo: row.vehicle_no,
        status: row.status,
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),
        startedAt: formatToVietnamTime(row.started_at),
        completedAt: formatToVietnamTime(row.completed_at),
        orders: row.orders
            ? row.orders.map((order) => ({
                  id: order.id,
                  runId: order.run_id,
                  orderId: order.order_id,
                  orderNo: order.order_no,
                  routeSeq: order.route_seq,
                  codAmount: parseFloat(order.cod_amount),
                  status: order.status,
                  actualPay: parseFloat(order.actual_pay),
                  evdUrl: order.evd_url,
                  note: order.note,
                  createdAt: formatToVietnamTime(order.created_at),
                  updatedAt: formatToVietnamTime(order.updated_at),
                  startedAt: formatToVietnamTime(order.started_at),
                  completedAt: formatToVietnamTime(order.completed_at),
                  // Thông tin customer
                  customer: {
                      id: order.customer_id,
                      code: order.customer_code,
                      name: order.customer_name,
                      phone: order.customer_phone,
                      email: order.customer_email,
                      address: order.customer_address,
                      taxCode: order.customer_tax_code,
                      creditLimit: order.customer_credit_limit,
                      note: order.customer_note,
                      managedBy: order.customer_managed_by,
                      createdAt: formatToVietnamTime(order.customer_created_at),
                      updatedAt: formatToVietnamTime(order.customer_updated_at),
                  },
              }))
            : [],
    };
}

/* -------------------- CRUD OPERATIONS -------------------- */

/**
 * Tạo một delivery run mới.
 * @param {object} data - Dữ liệu cho delivery run mới.
 * @returns {Promise<object>} Đối tượng delivery run vừa được tạo.
 */
async function createDeliveryRun(data) {
    const {
        // deliveryNo,
        supervisorId,
        shipperId,
        vehicleNo,
        status = 'assigned',
    } = data;

    const sql = `
        INSERT INTO delivery_runs (
            delivery_no, supervisor_id, shipper_id, vehicle_no, status
        ) VALUES ($1, $2, $3, $4, $5) RETURNING id
    `;
    const params = [generateOrderNo(), supervisorId, shipperId, vehicleNo, status];
    const { rows } = await query(sql, params);
    const runId = rows[0].id;

    return findById(runId);
}

/**
 * Tìm delivery run theo ID (có join với orders, supervisor, shipper).
 * @param {string} id - UUID của delivery run.
 * @returns {Promise<object|null>} Đối tượng delivery run hoặc null.
 */
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_ORDERS}
        FROM delivery_runs dr
        LEFT JOIN users u ON dr.supervisor_id = u.id
        LEFT JOIN users s ON dr.shipper_id = s.id
        WHERE dr.id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [id]);
    return toDeliveryRun(rows[0]);
}

/**
 * Tìm delivery run theo delivery number
 * @param {string} deliveryNo - Mã delivery run.
 * @returns {Promise<object|null>} Đối tượng delivery run hoặc null.
 */
async function findByDeliveryNo(deliveryNo) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM delivery_runs dr
        LEFT JOIN users u ON dr.supervisor_id = u.id
        LEFT JOIN users s ON dr.shipper_id = s.id
        WHERE dr.delivery_no = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [deliveryNo]);
    return toDeliveryRun(rows[0]);
}

/**
 * Cập nhật một delivery run.
 * @param {string} id - UUID của delivery run.
 * @param {object} payload - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Đối tượng delivery run sau khi cập nhật.
 */
async function updateDeliveryRun(id, payload) {
    const fields = [];
    const params = [];
    const map = {
        // deliveryNo: 'delivery_no',
        supervisorId: 'supervisor_id',
        shipperId: 'shipper_id',
        vehicleNo: 'vehicle_no',
        status: 'status',
        startedAt: 'started_at',
        completedAt: 'completed_at',
    };

    Object.entries(map).forEach(([kSrc, kDb]) => {
        if (payload[kSrc] !== undefined) {
            params.push(payload[kSrc]);
            fields.push(`${kDb} = $${params.length}`);
        }
    });

    if (fields.length > 0) {
        params.push(id);
        const sqlUpdate = `UPDATE delivery_runs SET ${fields.join(', ')} WHERE id = $${params.length}`;
        await query(sqlUpdate, params);
    }

    return findById(id);
}

/**
 * Liệt kê các delivery runs (có hỗ trợ tìm kiếm, lọc và phân trang).
 * @param {object} options - Tùy chọn lọc và phân trang.
 * @returns {Promise<Array<object>>} Mảng các đối tượng delivery run.
 */
async function listDeliveryRuns({
    q,
    supervisorId,
    shipperId,
    status,
    limit = 20,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                dr.delivery_no ILIKE $${params.length}
                OR dr.vehicle_no ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
                OR s.full_name ILIKE $${params.length}
            )`);
        }
        if (supervisorId) {
            params.push(supervisorId);
            clauses.push(`dr.supervisor_id = $${params.length}`);
        }
        if (shipperId) {
            params.push(shipperId);
            clauses.push(`dr.shipper_id = $${params.length}`);
        }
        if (status) {
            params.push(status);
            clauses.push(`dr.status = $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS_WITH_ORDERS}
            FROM delivery_runs dr
            LEFT JOIN users u ON dr.supervisor_id = u.id
            LEFT JOIN users s ON dr.shipper_id = s.id
            ${where}
            ORDER BY dr.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toDeliveryRun);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách delivery runs:', error.message);
        throw new Error('Không thể lấy danh sách delivery runs');
    }
}

/**
 * Đếm tổng số delivery runs, có thể kèm theo bộ lọc tìm kiếm.
 * @param {object} options - Tùy chọn lọc.
 * @returns {Promise<number>} Tổng số delivery runs.
 */
async function countDeliveryRuns({ q, supervisorId, shipperId, status } = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                dr.delivery_no ILIKE $${params.length}
                OR dr.vehicle_no ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
                OR s.full_name ILIKE $${params.length}
            )`);
        }
        if (supervisorId) {
            params.push(supervisorId);
            clauses.push(`dr.supervisor_id = $${params.length}`);
        }
        if (shipperId) {
            params.push(shipperId);
            clauses.push(`dr.shipper_id = $${params.length}`);
        }
        if (status) {
            params.push(status);
            clauses.push(`dr.status = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM delivery_runs dr
            LEFT JOIN users u ON dr.supervisor_id = u.id
            LEFT JOIN users s ON dr.shipper_id = s.id
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm delivery runs:', error.message);
        throw new Error('Không thể đếm tổng số delivery runs');
    }
}

/**
 * Xóa một delivery run.
 * @param {string} id - UUID của delivery run.
 * @returns {Promise<boolean>} Trả về true nếu xóa thành công.
 */
async function deleteDeliveryRun(id) {
    const sql = `DELETE FROM delivery_runs WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

/**
 * Cập nhật trạng thái delivery run.
 * @param {string} id - UUID của delivery run.
 * @param {string} status - Trạng thái mới.
 * @param {string} timestamp - Thời gian cập nhật (started_at hoặc completed_at).
 * @returns {Promise<object>} Đối tượng delivery run sau khi cập nhật.
 */
async function updateStatus(id, status, timestamp = null) {
    const updateFields = ['status = $1'];
    const params = [status];

    if (timestamp) {
        if (status === 'in_progress') {
            updateFields.push('started_at = $2');
            params.push(timestamp);
        } else if (status === 'completed') {
            updateFields.push('completed_at = $2');
            params.push(timestamp);
        }
    }

    params.push(id);
    const sql = `
        UPDATE delivery_runs 
        SET ${updateFields.join(', ')} 
        WHERE id = $${params.length}
    `;

    await query(sql, params);
    return findById(id);
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    createDeliveryRun,
    findById,
    findByDeliveryNo,
    listDeliveryRuns,
    countDeliveryRuns,
    updateDeliveryRun,
    deleteDeliveryRun,
    updateStatus,
};
