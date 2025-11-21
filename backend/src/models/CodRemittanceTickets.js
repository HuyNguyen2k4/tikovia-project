const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const crypto = require('crypto');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

/* ========== FIELDS DEFINITIONS ========== */

const PUBLIC_FIELDS = `
    crt.id, crt.ticket_no, crt.shipper_id, crt.delivery_run_id,
    crt.expected_amount, crt.received_amount, crt.status, crt.note,
    crt.created_by, crt.created_at, crt.updated_by, crt.updated_at,
    u_shipper.full_name AS shipper_name,
    u_creator.full_name AS creator_name,
    u_updater.full_name AS updater_name,
    dr.delivery_no,
    dr.status AS delivery_run_status,
    dr.completed_at AS delivery_run_completed_at
`;

const PUBLIC_FIELDS_WITH_DETAILS = `
    ${PUBLIC_FIELDS},
    (
        SELECT COALESCE(json_agg(row_to_json(orders)), '[]'::json)
        FROM (
            SELECT
                dro.id,
                dro.order_id,
                dro.route_seq,
                dro.cod_amount,
                dro.actual_pay,
                dro.status,
                so.order_no,
                c.name AS customer_name,
                c.code AS customer_code
            FROM delivery_run_orders dro
            LEFT JOIN sales_orders so ON dro.order_id = so.id
            LEFT JOIN customers c ON so.customer_id = c.id
            WHERE dro.run_id = crt.delivery_run_id
            ORDER BY dro.route_seq
        ) orders
    ) AS orders
`;

/* ========== HELPER FUNCTIONS ========== */

/**
 * Helper function để generate ticket_no tự động
 * Format: COD-DDMMYY-XXXXXX (6 ký tự hex ngẫu nhiên)
 * Ví dụ: COD-301024-A1B2C3
 */
const generateTicketNo = () => {
    const prefix = 'COD';
    const today = dayjs().format('DDMMYY');
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${today}-${randomSuffix}`;
};

/**
 * Chuyển đổi một hàng từ database thành một đối tượng CodRemittanceTicket JS.
 * @param {object} row - Hàng dữ liệu từ database.
 * @returns {object|null}
 */
function toCodRemittanceTicket(row) {
    if (!row) return null;

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        ticketNo: row.ticket_no,
        shipperId: row.shipper_id,
        shipperName: row.shipper_name || null,
        deliveryRunId: row.delivery_run_id,
        deliveryNo: row.delivery_no || null,
        deliveryRunStatus: row.delivery_run_status || null,
        deliveryRunCompletedAt: formatToVietnamTime(row.delivery_run_completed_at),
        expectedAmount: parseFloat(row.expected_amount) || 0,
        receivedAmount: parseFloat(row.received_amount) || 0,
        status: row.status,
        note: row.note,
        createdBy: row.created_by,
        creatorName: row.creator_name || null,
        createdAt: formatToVietnamTime(row.created_at),
        updatedBy: row.updated_by || null, // ✅ THÊM
        updaterName: row.updater_name || null, // ✅ THÊM
        updatedAt: formatToVietnamTime(row.updated_at), // ✅ THÊM
        // Orders nếu có
        orders: row.orders
            ? row.orders.map((order) => ({
                  id: order.id,
                  orderId: order.order_id,
                  orderNo: order.order_no,
                  routeSeq: order.route_seq,
                  codAmount: parseFloat(order.cod_amount) || 0,
                  actualPay: parseFloat(order.actual_pay) || 0,
                  status: order.status,
                  customerName: order.customer_name,
                  customerCode: order.customer_code,
              }))
            : [],
    };
}

/* ========== CRUD OPERATIONS ========== */

/**
 * Tạo một COD remittance ticket mới.
 * @param {object} data - Dữ liệu cho ticket mới.
 * @returns {Promise<object>} Đối tượng ticket vừa được tạo.
 */
async function createCodRemittanceTicket(data) {
    return withTransaction(async () => {
        const {
            shipperId,
            deliveryRunId,
            receivedAmount,
            status = 'unbalanced',
            note,
            createdBy,
        } = data;

        // ✅ UPDATED: Validate required fields (bỏ expectedAmount)
        if (!shipperId || !deliveryRunId || receivedAmount === undefined || !createdBy) {
            throw new Error('shipperId, deliveryRunId, receivedAmount và createdBy là bắt buộc');
        }

        // ✅ UPDATED: Insert ticket với expected_amount = 0 (sẽ được trigger tính tự động)
        const sql = `
            INSERT INTO cod_remittance_tickets (
                ticket_no, shipper_id, delivery_run_id, expected_amount, 
                received_amount, status, note, created_by
            ) VALUES ($1, $2, $3, 0, $4, $5, $6, $7) RETURNING id
        `;
        const params = [
            generateTicketNo(),
            shipperId,
            deliveryRunId,
            receivedAmount,
            status,
            note,
            createdBy,
        ];

        const { rows } = await query(sql, params);
        const ticketId = rows[0].id;

        // ✅ THÊM: Gọi hàm trigger để tính expected_amount
        await query('SELECT refresh_cod_expected_amount($1)', [deliveryRunId]);

        // Lấy lại ticket với expected_amount đã được cập nhật
        return findById(ticketId);
    });
}

/**
 * Tìm COD remittance ticket theo ID.
 * @param {string} id - UUID của ticket.
 * @returns {Promise<object|null>} Đối tượng ticket hoặc null.
 */
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_DETAILS}
        FROM cod_remittance_tickets crt
        LEFT JOIN users u_shipper ON crt.shipper_id = u_shipper.id
        LEFT JOIN users u_creator ON crt.created_by = u_creator.id
        LEFT JOIN users u_updater ON crt.updated_by = u_updater.id
        LEFT JOIN delivery_runs dr ON crt.delivery_run_id = dr.id
        WHERE crt.id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [id]);
    return toCodRemittanceTicket(rows[0]);
}

/**
 * Tìm COD remittance ticket theo ticket number.
 * @param {string} ticketNo - Mã ticket.
 * @returns {Promise<object|null>} Đối tượng ticket hoặc null.
 */
async function findByTicketNo(ticketNo) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_DETAILS}
        FROM cod_remittance_tickets crt
        LEFT JOIN users u_shipper ON crt.shipper_id = u_shipper.id
        LEFT JOIN users u_creator ON crt.created_by = u_creator.id
        LEFT JOIN users u_updater ON crt.updated_by = u_updater.id
        LEFT JOIN delivery_runs dr ON crt.delivery_run_id = dr.id
        WHERE crt.ticket_no = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [ticketNo]);
    return toCodRemittanceTicket(rows[0]);
}

/**
 * Tìm COD remittance ticket theo delivery run ID.
 * @param {string} deliveryRunId - UUID của delivery run.
 * @returns {Promise<object|null>} Đối tượng ticket hoặc null.
 */
async function findByDeliveryRunId(deliveryRunId) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_DETAILS}
        FROM cod_remittance_tickets crt
        LEFT JOIN users u_shipper ON crt.shipper_id = u_shipper.id
        LEFT JOIN users u_creator ON crt.created_by = u_creator.id
        LEFT JOIN users u_updater ON crt.updated_by = u_updater.id
        LEFT JOIN delivery_runs dr ON crt.delivery_run_id = dr.id
        WHERE crt.delivery_run_id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [deliveryRunId]);
    return toCodRemittanceTicket(rows[0]);
}

/**
 * Liệt kê các COD remittance tickets (có hỗ trợ tìm kiếm, lọc và phân trang).
 * @param {object} options - Tùy chọn lọc và phân trang.
 * @returns {Promise<Array<object>>} Mảng các đối tượng ticket.
 */
async function listCodRemittanceTickets({
    q,
    shipperId,
    deliveryRunId,
    status,
    createdBy,
    fromDate,
    toDate,
    limit = 20,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                crt.ticket_no ILIKE $${params.length}
                OR dr.delivery_no ILIKE $${params.length}
                OR u_shipper.full_name ILIKE $${params.length}
                OR u_creator.full_name ILIKE $${params.length}
            )`);
        }

        // Lọc theo shipper
        if (shipperId) {
            params.push(shipperId);
            clauses.push(`crt.shipper_id = $${params.length}`);
        }

        // Lọc theo delivery run
        if (deliveryRunId) {
            params.push(deliveryRunId);
            clauses.push(`crt.delivery_run_id = $${params.length}`);
        }

        // Lọc theo trạng thái
        if (status) {
            params.push(status);
            clauses.push(`crt.status = $${params.length}`);
        }

        // Lọc theo người tạo
        if (createdBy) {
            params.push(createdBy);
            clauses.push(`crt.created_by = $${params.length}`);
        }

        // Lọc theo khoảng thời gian
        if (fromDate) {
            params.push(fromDate);
            clauses.push(`crt.created_at >= $${params.length}`);
        }
        if (toDate) {
            params.push(toDate);
            clauses.push(`crt.created_at <= $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS_WITH_DETAILS}
            FROM cod_remittance_tickets crt
            LEFT JOIN users u_shipper ON crt.shipper_id = u_shipper.id
            LEFT JOIN users u_creator ON crt.created_by = u_creator.id
            LEFT JOIN users u_updater ON crt.updated_by = u_updater.id
            LEFT JOIN delivery_runs dr ON crt.delivery_run_id = dr.id
            ${where}
            ORDER BY crt.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toCodRemittanceTicket);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách COD remittance tickets:', error.message);
        throw new Error('Không thể lấy danh sách COD remittance tickets');
    }
}

/**
 * Đếm tổng số COD remittance tickets, có thể kèm theo bộ lọc tìm kiếm.
 * @param {object} options - Tùy chọn lọc.
 * @returns {Promise<number>} Tổng số tickets.
 */
async function countCodRemittanceTickets({
    q,
    shipperId,
    deliveryRunId,
    status,
    createdBy,
    fromDate,
    toDate,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                crt.ticket_no ILIKE $${params.length}
                OR dr.delivery_no ILIKE $${params.length}
                OR u_shipper.full_name ILIKE $${params.length}
                OR u_creator.full_name ILIKE $${params.length}
            )`);
        }

        if (shipperId) {
            params.push(shipperId);
            clauses.push(`crt.shipper_id = $${params.length}`);
        }

        if (deliveryRunId) {
            params.push(deliveryRunId);
            clauses.push(`crt.delivery_run_id = $${params.length}`);
        }

        if (status) {
            params.push(status);
            clauses.push(`crt.status = $${params.length}`);
        }

        if (createdBy) {
            params.push(createdBy);
            clauses.push(`crt.created_by = $${params.length}`);
        }

        if (fromDate) {
            params.push(fromDate);
            clauses.push(`crt.created_at >= $${params.length}`);
        }
        if (toDate) {
            params.push(toDate);
            clauses.push(`crt.created_at <= $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM cod_remittance_tickets crt
            LEFT JOIN users u_shipper ON crt.shipper_id = u_shipper.id
            LEFT JOIN users u_creator ON crt.created_by = u_creator.id
            LEFT JOIN users u_updater ON crt.updated_by = u_updater.id
            LEFT JOIN delivery_runs dr ON crt.delivery_run_id = dr.id
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm COD remittance tickets:', error.message);
        throw new Error('Không thể đếm tổng số COD remittance tickets');
    }
}

/**
 * Cập nhật một COD remittance ticket.
 * @param {string} id - UUID của ticket.
 * @param {object} payload - Dữ liệu cần cập nhật.
 * @param {string} updatedBy - UUID của user thực hiện update. ✅ THÊM
 * @returns {Promise<object>} Đối tượng ticket sau khi cập nhật.
 */
async function updateCodRemittanceTicket(id, payload, updatedBy) {
    const fields = [];
    const params = [];
    const map = {
        receivedAmount: 'received_amount',
        status: 'status',
        note: 'note',
    };

    Object.entries(map).forEach(([kSrc, kDb]) => {
        if (payload[kSrc] !== undefined) {
            params.push(payload[kSrc]);
            fields.push(`${kDb} = $${params.length}`);
        }
    });

    // ✅ THÊM: Tự động cập nhật updated_by
    if (updatedBy) {
        params.push(updatedBy);
        fields.push(`updated_by = $${params.length}`);
    }

    if (fields.length > 0) {
        params.push(id);
        const sqlUpdate = `UPDATE cod_remittance_tickets SET ${fields.join(', ')} WHERE id = $${params.length}`;
        await query(sqlUpdate, params);
    }

    return findById(id);
}

/**
 * Xóa một COD remittance ticket.
 * @param {string} id - UUID của ticket.
 * @returns {Promise<boolean>} Trả về true nếu xóa thành công.
 */
async function deleteCodRemittanceTicket(id) {
    const sql = `DELETE FROM cod_remittance_tickets WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

/**
 * Lấy danh sách delivery runs đã hoàn thành và chưa có COD remittance ticket.
 * @param {object} options - Tùy chọn lọc.
 * @returns {Promise<Array<object>>} Mảng các đối tượng delivery run.
 */
async function getAvailableDeliveryRuns({ shipperId, limit = 50, offset = 0 } = {}) {
    try {
        const params = [];
        const clauses = [];

        // Chỉ lấy delivery runs đã completed
        clauses.push(`dr.status = 'completed'`);

        // Lọc theo shipper nếu có
        if (shipperId) {
            params.push(shipperId);
            clauses.push(`dr.shipper_id = $${params.length}`);
        }

        // Chỉ lấy những delivery runs chưa có COD remittance ticket
        clauses.push(`NOT EXISTS (
            SELECT 1 FROM cod_remittance_tickets crt 
            WHERE crt.delivery_run_id = dr.id
        )`);

        params.push(limit, offset);
        const where = `WHERE ${clauses.join(' AND ')}`;

        // ✅ UPDATED: Tính expected_amount từ actual_pay thay vì cod_amount
        const sql = `
            SELECT 
                dr.id,
                dr.delivery_no,
                dr.shipper_id,
                dr.completed_at,
                u.full_name AS shipper_name,
                COALESCE(SUM(dro.cod_amount), 0) AS total_cod_amount,
                COALESCE(SUM(COALESCE(NULLIF(dro.actual_pay, 'NaN'::numeric), 0)), 0) AS expected_amount,
                COUNT(dro.id) AS order_count
            FROM delivery_runs dr
            LEFT JOIN users u ON dr.shipper_id = u.id
            LEFT JOIN delivery_run_orders dro ON dr.id = dro.run_id
            ${where}
            GROUP BY dr.id, dr.delivery_no, dr.shipper_id, dr.completed_at, u.full_name
            ORDER BY dr.completed_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);

        return rows.map((row) => ({
            id: row.id,
            deliveryNo: row.delivery_no,
            shipperId: row.shipper_id,
            shipperName: row.shipper_name,
            completedAt: dayjs.utc(row.completed_at).tz('Asia/Ho_Chi_Minh').format(),
            totalCodAmount: parseFloat(row.total_cod_amount) || 0,
            expectedAmount: parseFloat(row.expected_amount) || 0, // ✅ UPDATED: Đổi từ totalActualPay -> expectedAmount
            orderCount: parseInt(row.order_count, 10),
        }));
    } catch (error) {
        console.error('Lỗi khi lấy danh sách delivery runs khả dụng:', error.message);
        throw new Error('Không thể lấy danh sách delivery runs khả dụng');
    }
}

/**
 * Đếm số delivery runs khả dụng.
 * @param {object} options - Tùy chọn lọc.
 * @returns {Promise<number>} Tổng số delivery runs khả dụng.
 */
async function countAvailableDeliveryRuns({ shipperId } = {}) {
    try {
        const params = [];
        const clauses = [];

        clauses.push(`dr.status = 'completed'`);

        if (shipperId) {
            params.push(shipperId);
            clauses.push(`dr.shipper_id = $${params.length}`);
        }

        clauses.push(`NOT EXISTS (
            SELECT 1 FROM cod_remittance_tickets crt 
            WHERE crt.delivery_run_id = dr.id
        )`);

        const where = `WHERE ${clauses.join(' AND ')}`;

        const sql = `
            SELECT COUNT(DISTINCT dr.id) AS count
            FROM delivery_runs dr
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm delivery runs khả dụng:', error.message);
        throw new Error('Không thể đếm delivery runs khả dụng');
    }
}

/**
 * Tìm COD remittance ticket theo ID với đầy đủ thông tin chi tiết.
 * @param {string} id - UUID của ticket.
 * @returns {Promise<object|null>} Đối tượng ticket với đầy đủ thông tin hoặc null.
 */
async function getById(ticketId) {
    const sql = `
        SELECT 
            crt.id,
            crt.ticket_no,
            crt.delivery_run_id,
            crt.expected_amount,
            crt.received_amount,
            crt.status,
            crt.note,
            crt.shipper_id,
            crt.created_by,
            crt.created_at,
            crt.updated_by,
            crt.updated_at,
            
            -- Thông tin delivery run
            dr.delivery_no,
            dr.status AS delivery_run_status,
            dr.completed_at AS delivery_run_completed_at,
            dr.vehicle_no,
            dr.started_at AS delivery_run_started_at,
            dr.supervisor_id,
            
            -- Thông tin shipper
            shipper.full_name AS shipper_name,
            shipper.phone AS shipper_phone,
            shipper.email AS shipper_email,
            
            -- Thông tin supervisor
            supervisor.full_name AS supervisor_name,
            
            -- Thông tin người tạo ticket
            creator.full_name AS creator_name,
            creator.email AS creator_email,
            
            -- THÊM: Thông tin người cập nhật
            updater.full_name AS updater_name,
            updater.email AS updater_email
            
        FROM cod_remittance_tickets crt
        
        -- JOIN với delivery_runs
        LEFT JOIN delivery_runs dr ON crt.delivery_run_id = dr.id
        
        -- JOIN với shipper (users table)
        LEFT JOIN users shipper ON crt.shipper_id = shipper.id
        
        -- JOIN với supervisor
        LEFT JOIN users supervisor ON dr.supervisor_id = supervisor.id
        
        -- JOIN với người tạo ticket
        LEFT JOIN users creator ON crt.created_by = creator.id
        
        -- THÊM: JOIN với người cập nhật ticket
        LEFT JOIN users updater ON crt.updated_by = updater.id
        
        WHERE crt.id = $1
    `;

    const result = await query(sql, [ticketId]);

    if (result.rows.length === 0) {
        return null;
    }

    const ticket = result.rows[0];

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    // Cấu trúc lại data với nested objects
    const formattedTicket = {
        id: ticket.id,
        ticketNo: ticket.ticket_no,
        deliveryRunId: ticket.delivery_run_id,
        shipperId: ticket.shipper_id,
        expectedAmount: parseFloat(ticket.expected_amount || 0),
        receivedAmount: parseFloat(ticket.received_amount || 0),
        status: ticket.status,
        note: ticket.note,
        createdBy: ticket.created_by,
        createdAt: formatToVietnamTime(ticket.created_at),
        updatedBy: ticket.updated_by || null, // ✅ THÊM
        updatedAt: formatToVietnamTime(ticket.updated_at), // ✅ THÊM

        // Nested deliveryRun object
        deliveryRun: {
            id: ticket.delivery_run_id,
            deliveryNo: ticket.delivery_no,
            status: ticket.delivery_run_status,
            vehicleNo: ticket.vehicle_no,
            completedAt: formatToVietnamTime(ticket.delivery_run_completed_at),
            startedAt: formatToVietnamTime(ticket.delivery_run_started_at),
            supervisorId: ticket.supervisor_id,
            supervisorName: ticket.supervisor_name,
        },

        // Nested shipper object
        shipper: {
            id: ticket.shipper_id,
            name: ticket.shipper_name,
            phone: ticket.shipper_phone,
            email: ticket.shipper_email,
        },

        // Nested creator
        creator: {
            id: ticket.created_by,
            name: ticket.creator_name,
            email: ticket.creator_email,
        },

        // ✅ THÊM: Nested updater
        updater: ticket.updated_by
            ? {
                  id: ticket.updated_by,
                  name: ticket.updater_name,
                  email: ticket.updater_email,
              }
            : null,
    };

    // Lấy danh sách orders của delivery run
    const ordersSql = `
        SELECT 
            dro.id,
            dro.order_id,
            dro.route_seq,
            dro.cod_amount,
            dro.actual_pay,
            dro.status,
            dro.evd_url,
            dro.note,
            dro.completed_at,
            so.order_no,
            c.name AS customer_name,
            c.code AS customer_code,
            c.phone AS customer_phone,
            c.address AS customer_address
        FROM delivery_run_orders dro
        INNER JOIN sales_orders so ON dro.order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE dro.run_id = $1
        ORDER BY dro.route_seq ASC
    `;

    const ordersResult = await query(ordersSql, [ticket.delivery_run_id]);

    formattedTicket.orders = ordersResult.rows.map((order) => ({
        id: order.id,
        orderId: order.order_id,
        orderNo: order.order_no,
        routeSeq: order.route_seq,
        codAmount: parseFloat(order.cod_amount || 0),
        actualPay: parseFloat(order.actual_pay || 0),
        status: order.status,
        evdUrl: order.evd_url,
        note: order.note,
        completedAt: formatToVietnamTime(order.completed_at),
        customer: {
            name: order.customer_name,
            code: order.customer_code,
            phone: order.customer_phone,
            address: order.customer_address,
        },
    }));

    // Tính tổng statistics
    formattedTicket.statistics = {
        totalOrders: formattedTicket.orders.length,
        completedOrders: formattedTicket.orders.filter((o) => o.status === 'completed').length,
        totalCodAmount: formattedTicket.orders.reduce((sum, o) => sum + o.codAmount, 0),
        totalActualPay: formattedTicket.orders.reduce((sum, o) => sum + o.actualPay, 0),
        difference:
            parseFloat(ticket.expected_amount || 0) - parseFloat(ticket.received_amount || 0),
    };

    return formattedTicket;
}

/* ========== EXPORT ========== */

module.exports = {
    createCodRemittanceTicket,
    findById, // Hàm lấy chi tiết cơ bản
    getById, // Hàm lấy chi tiết với đầy đủ thông tin
    findByTicketNo,
    findByDeliveryRunId,
    listCodRemittanceTickets,
    countCodRemittanceTickets,
    updateCodRemittanceTicket,
    deleteCodRemittanceTicket,
    getAvailableDeliveryRuns,
    countAvailableDeliveryRuns,
};
