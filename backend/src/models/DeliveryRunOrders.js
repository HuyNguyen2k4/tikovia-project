const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const PUBLIC_FIELDS = `
    dro.id, dro.run_id, dro.order_id, dro.route_seq, dro.cod_amount, 
    dro.status, dro.actual_pay, dro.evd_url, dro.note, 
    dro.created_at, dro.updated_at, dro.started_at, dro.completed_at,
    so.order_no, c.name AS customer_name, c.phone AS customer_phone,
    so.address AS delivery_address, dr.delivery_no
`;

/**
 * Chuyển đổi một hàng từ database thành một đối tượng DeliveryRunOrder JS.
 * @param {object} row - Hàng dữ liệu từ database.
 * @returns {object|null} Đối tượng DeliveryRunOrder hoặc null nếu không có row.
 */
function toDeliveryRunOrder(row) {
    if (!row) return null;

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        runId: row.run_id,
        orderId: row.order_id,
        orderNo: row.order_no,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        deliveryAddress: row.delivery_address,
        deliveryNo: row.delivery_no,
        routeSeq: row.route_seq,
        codAmount: parseFloat(row.cod_amount),
        status: row.status,
        actualPay: parseFloat(row.actual_pay),
        evdUrl: row.evd_url,
        note: row.note,
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),
        startedAt: formatToVietnamTime(row.started_at),
        completedAt: formatToVietnamTime(row.completed_at),
    };
}

/* -------------------- CRUD OPERATIONS -------------------- */

/**
 * Tạo một delivery run order mới.
 * @param {object} data - Dữ liệu cho delivery run order mới.
 * @returns {Promise<object>} Đối tượng delivery run order vừa được tạo.
 */
async function createDeliveryRunOrder(data) {
    const {
        runId,
        orderId,
        routeSeq,
        codAmount = 0,
        status = 'pending',
        actualPay = 0,
        evdUrl = null,
        note = null,
    } = data;

    const sql = `
        INSERT INTO delivery_run_orders (
            run_id, order_id, route_seq, cod_amount, status, actual_pay, evd_url, note
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;
    const params = [
        runId,
        orderId,
        routeSeq,
        codAmount,
        status,
        actualPay,
        evdUrl,
        note,
    ];
    const { rows } = await query(sql, params);
    const newOrderId = rows[0].id;

    return findById(newOrderId);
}

/**
 * Tìm delivery run order theo ID.
 * @param {string} id - UUID của delivery run order.
 * @returns {Promise<object|null>} Đối tượng delivery run order hoặc null.
 */
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM delivery_run_orders dro
        LEFT JOIN sales_orders so ON dro.order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN delivery_runs dr ON dro.run_id = dr.id
        WHERE dro.id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [id]);
    return toDeliveryRunOrder(rows[0]);
}

/**
 * Lấy tất cả orders của một delivery run.
 * @param {string} runId - ID của delivery run.
 * @returns {Promise<Array<object>>} Mảng các delivery run orders.
 */
async function findByRunId(runId) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM delivery_run_orders dro
        LEFT JOIN sales_orders so ON dro.order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN delivery_runs dr ON dro.run_id = dr.id
        WHERE dro.run_id = $1
        ORDER BY dro.route_seq, dro.created_at
    `;
    const { rows } = await query(sql, [runId]);
    return rows.map(toDeliveryRunOrder);
}

/**
 * Lấy tất cả orders của một sales order.
 * @param {string} orderId - ID của sales order.
 * @returns {Promise<Array<object>>} Mảng các delivery run orders.
 */
async function findByOrderId(orderId) {
    const sql = `
        SELECT ${PUBLIC_FIELDS}
        FROM delivery_run_orders dro
        LEFT JOIN sales_orders so ON dro.order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN delivery_runs dr ON dro.run_id = dr.id
        WHERE dro.order_id = $1
        ORDER BY dro.created_at DESC
    `;
    const { rows } = await query(sql, [orderId]);
    return rows.map(toDeliveryRunOrder);
}

/**
 * Cập nhật một delivery run order.
 * @param {string} id - UUID của delivery run order.
 * @param {object} payload - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Đối tượng delivery run order sau khi cập nhật.
 */
async function updateDeliveryRunOrder(id, payload) {
    const fields = [];
    const params = [];
    const map = {
        runId: 'run_id',
        orderId: 'order_id',
        routeSeq: 'route_seq',
        codAmount: 'cod_amount',
        status: 'status',
        actualPay: 'actual_pay',
        evdUrl: 'evd_url',
        note: 'note',
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
        const sqlUpdate = `UPDATE delivery_run_orders SET ${fields.join(', ')} WHERE id = $${params.length}`;
        await query(sqlUpdate, params);
    }

    return findById(id);
}

/**
 * Liệt kê các delivery run orders (có hỗ trợ tìm kiếm, lọc và phân trang).
 * @param {object} options - Tùy chọn lọc và phân trang.
 * @returns {Promise<Array<object>>} Mảng các đối tượng delivery run order.
 */
async function listDeliveryRunOrders({
    q,
    runId,
    orderId,
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
                dro.id::text ILIKE $${params.length}
                OR so.order_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR dr.delivery_no ILIKE $${params.length}
            )`);
        }
        if (runId) {
            params.push(runId);
            clauses.push(`dro.run_id = $${params.length}`);
        }
        if (orderId) {
            params.push(orderId);
            clauses.push(`dro.order_id = $${params.length}`);
        }
        if (status) {
            params.push(status);
            clauses.push(`dro.status = $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS}
            FROM delivery_run_orders dro
            LEFT JOIN sales_orders so ON dro.order_id = so.id
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN delivery_runs dr ON dro.run_id = dr.id
            ${where}
            ORDER BY dro.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toDeliveryRunOrder);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách delivery run orders:', error.message);
        throw new Error('Không thể lấy danh sách delivery run orders');
    }
}

/**
 * Đếm tổng số delivery run orders, có thể kèm theo bộ lọc tìm kiếm.
 * @param {object} options - Tùy chọn lọc.
 * @returns {Promise<number>} Tổng số delivery run orders.
 */
async function countDeliveryRunOrders({ q, runId, orderId, status } = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                dro.id::text ILIKE $${params.length}
                OR so.order_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR dr.delivery_no ILIKE $${params.length}
            )`);
        }
        if (runId) {
            params.push(runId);
            clauses.push(`dro.run_id = $${params.length}`);
        }
        if (orderId) {
            params.push(orderId);
            clauses.push(`dro.order_id = $${params.length}`);
        }
        if (status) {
            params.push(status);
            clauses.push(`dro.status = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM delivery_run_orders dro
            LEFT JOIN sales_orders so ON dro.order_id = so.id
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN delivery_runs dr ON dro.run_id = dr.id
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm delivery run orders:', error.message);
        throw new Error('Không thể đếm tổng số delivery run orders');
    }
}

/**
 * Xóa một delivery run order.
 * @param {string} id - UUID của delivery run order.
 * @returns {Promise<boolean>} Trả về true nếu xóa thành công.
 */
async function deleteDeliveryRunOrder(id) {
    const sql = `DELETE FROM delivery_run_orders WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

/**
 * Xóa nhiều delivery run orders.
 * @param {Array<string>} ids - Mảng các UUID cần xóa.
 * @returns {Promise<number>} Số lượng bản ghi đã xóa.
 */
async function deleteMany(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const sql = `DELETE FROM delivery_run_orders WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

/**
 * Tạo nhiều delivery run orders mới cho một delivery run.
 * @param {string} runId - ID của delivery run.
 * @param {Array<object>} orders - Mảng orders cần tạo.
 * @returns {Promise<Array<object>>} Mảng các delivery run orders đã tạo.
 */
async function createMany(runId, orders) {
    if (!Array.isArray(orders) || orders.length === 0) return [];

    return withTransaction(async () => {
        const createdOrders = [];
        for (const order of orders) {
            const { orderId, routeSeq, codAmount = 0, status = 'pending', actualPay = 0, evdUrl = null, note = null } = order;
            const sql = `
                INSERT INTO delivery_run_orders (
                    run_id, order_id, route_seq, cod_amount, status, actual_pay, evd_url, note
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
            `;
            const params = [runId, orderId, routeSeq, codAmount, status, actualPay, evdUrl, note];
            const { rows } = await query(sql, params);
            const createdOrder = await findById(rows[0].id);
            createdOrders.push(createdOrder);
        }
        return createdOrders;
    });
}

/**
 * Cập nhật trạng thái delivery run order.
 * @param {string} id - UUID của delivery run order.
 * @param {string} status - Trạng thái mới.
 * @param {string} timestamp - Thời gian cập nhật (started_at hoặc completed_at).
 * @param {object} additionalData - Dữ liệu bổ sung (actual_pay, evd_url, note).
 * @returns {Promise<object>} Đối tượng delivery run order sau khi cập nhật.
 */
async function updateStatus(id, status, timestamp = null, additionalData = {}) {
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
    
    // Thêm các trường bổ sung
    if (additionalData.actualPay !== undefined) {
        updateFields.push(`actual_pay = $${params.length + 1}`);
        params.push(additionalData.actualPay);
    }
    if (additionalData.evdUrl !== undefined) {
        updateFields.push(`evd_url = $${params.length + 1}`);
        params.push(additionalData.evdUrl);
    }
    if (additionalData.note !== undefined) {
        updateFields.push(`note = $${params.length + 1}`);
        params.push(additionalData.note);
    }
    
    params.push(id);
    const sql = `
        UPDATE delivery_run_orders 
        SET ${updateFields.join(', ')} 
        WHERE id = $${params.length}
    `;
    
    await query(sql, params);
    return findById(id);
}

/**
 * Cập nhật nhiều delivery run orders.
 * @param {Array<object>} orders - Mảng orders cần cập nhật, mỗi order phải có 'id'.
 * @returns {Promise<void>}
 */
async function updateMany(orders) {
    if (!Array.isArray(orders) || orders.length === 0) return;
    
    const promises = orders.map(order => {
        const { id, ...updateData } = order;
        return updateDeliveryRunOrder(id, updateData);
    });
    
    await Promise.all(promises);
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    createDeliveryRunOrder,
    findById,
    findByRunId,
    findByOrderId,
    listDeliveryRunOrders,
    countDeliveryRunOrders,
    updateDeliveryRunOrder,
    deleteDeliveryRunOrder,
    deleteMany,
    createMany,
    updateStatus,
    updateMany,
};
