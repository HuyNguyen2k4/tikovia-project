/* src/models/PaymentsCombined.js */
const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const crypto = require('crypto');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

/* ========== FIELDS DEFINITIONS ========== */

const PAYMENT_FIELDS = `
    p.id, p.customer_id, p.method, p.direction, p.amount,
    p.received_at, p.received_by, p.note, p.evd_url, p.created_at, p.updated_at,
    c.name AS customer_name, c.code AS customer_code,
    u.full_name AS received_by_name
`;

// Sử dụng json_agg để lấy allocations
const PAYMENT_FIELDS_WITH_ALLOCATIONS = `
    ${PAYMENT_FIELDS},
    (
        SELECT COALESCE(json_agg(row_to_json(allocations)), '[]'::json)
        FROM (
            SELECT
                pa.id,
                pa.invoice_id,
                pa.amount,
                pa.note,
                pa.created_at,
                si.invoice_no,
                si.total AS invoice_total,
                si.status AS invoice_status
            FROM payment_allocations pa
            LEFT JOIN sales_invoices si ON pa.invoice_id = si.id
            WHERE pa.payment_id = p.id
            ORDER BY pa.created_at
        ) allocations
    ) AS allocations
`;

const PAYMENT_FIELDS_ONLY = `
    id, customer_id, method, direction, amount, received_at, 
    received_by, note, evd_url, created_at, updated_at
`;

/* ========== HELPER FUNCTIONS ========== */

/**
 * Helper function để generate payment reference số tự động
 * Ví dụ: PAY-091025-C8F23A
 */
const generatePaymentRef = () => {
    const prefix = 'PAY';
    const today = dayjs().format('DDMMYY');
    // Dùng 3 bytes để tạo 6 ký tự hex
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${today}-${randomSuffix}`;
};

/**
 * Chuyển đổi một hàng từ database thành một đối tượng Payment JS.
 * @param {object} row - Hàng dữ liệu từ database.
 * @returns {object|null}
 */
function toPayment(row) {
    if (!row) return null;

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customer_name || null,
        customerCode: row.customer_code || null,
        method: row.method,
        direction: row.direction,
        amount: parseFloat(row.amount) || 0,
        receivedAt: formatToVietnamTime(row.received_at),
        receivedBy: row.received_by,
        receivedByName: row.received_by_name || null,
        note: row.note,
        evdUrl: row.evd_url, // ✅ THÊM: Evidence URL
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),

        // Allocations (nếu có)
        allocations: row.allocations
            ? row.allocations.map((allocation) => ({
                  id: allocation.id,
                  invoiceId: allocation.invoice_id,
                  amount: parseFloat(allocation.amount) || 0,
                  note: allocation.note,
                  createdAt: formatToVietnamTime(allocation.created_at),
                  invoiceNo: allocation.invoice_no,
                  invoiceTotal: parseFloat(allocation.invoice_total) || 0,
                  invoiceStatus: allocation.invoice_status,
              }))
            : [],
    };
}

/**
 * Chuyển đổi allocation row thành object
 */
function toPaymentAllocation(row) {
    if (!row) return null;

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        paymentId: row.payment_id,
        invoiceId: row.invoice_id,
        amount: parseFloat(row.amount) || 0,
        note: row.note,
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),
    };
}

/* ========== CRUD OPERATIONS - PAYMENTS ========== */

/**
 * Tạo một payment mới cùng với các allocations.
 * @param {object} data - Dữ liệu cho payment mới, bao gồm một mảng 'allocations'.
 * @returns {Promise<object>} Đối tượng payment vừa được tạo.
 */
async function createPayment({ allocations = [], ...paymentData }) {
    return withTransaction(async () => {
        const {
            customerId,
            method = 'cash',
            direction = 'in',
            amount,
            receivedAt = new Date(),
            receivedBy,
            note,
            evdUrl, // ✅ THÊM: Evidence URL
        } = paymentData;

        // ✅ UPDATED: Validate required fields including evdUrl
        if (!customerId || !amount || !receivedBy || !evdUrl) {
            throw new Error('customerId, amount, receivedBy và evdUrl là bắt buộc');
        }

        // ✅ UPDATED: Thêm evd_url vào SQL
        const sqlPayment = `
            INSERT INTO payments (
                customer_id, method, direction, amount, received_at, received_by, note, evd_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
        `;
        const paramsPayment = [
            customerId,
            method,
            direction,
            amount,
            receivedAt,
            receivedBy,
            note,
            evdUrl,
        ];
        const { rows } = await query(sqlPayment, paramsPayment);
        const paymentId = rows[0].id;

        // 2. Tạo các allocations nếu có
        if (allocations.length > 0) {
            await createAllocations(paymentId, allocations);
        }

        // 3. Lấy lại toàn bộ payment để trả về
        return findPaymentById(paymentId);
    });
}

/**
 * Tìm payment theo ID (có join với allocations, customer, user).
 * @param {string} id - UUID của payment.
 * @returns {Promise<object|null>} Đối tượng payment hoặc null.
 */
async function findPaymentById(id) {
    const sql = `
        SELECT ${PAYMENT_FIELDS_WITH_ALLOCATIONS}
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN users u ON p.received_by = u.id
        WHERE p.id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [id]);
    return toPayment(rows[0]);
}

/**
 * Cập nhật một payment, bao gồm cả các allocations.
 * @param {string} id - UUID của payment.
 * @param {object} payload - Dữ liệu cần cập nhật, có thể chứa mảng 'allocations'.
 * @returns {Promise<object>} Đối tượng payment sau khi cập nhật.
 */
async function updatePayment(id, { allocations, ...payload }) {
    return withTransaction(async () => {
        // 1. Cập nhật các trường của payments
        const fields = [],
            params = [];
        const map = {
            method: 'method',
            direction: 'direction',
            amount: 'amount',
            receivedAt: 'received_at',
            receivedBy: 'received_by',
            note: 'note',
            evdUrl: 'evd_url', // ✅ THÊM: Evidence URL mapping
        };

        Object.entries(map).forEach(([kSrc, kDb]) => {
            if (payload[kSrc] !== undefined) {
                params.push(payload[kSrc]);
                fields.push(`${kDb} = $${params.length}`);
            }
        });

        if (fields.length > 0) {
            params.push(id);
            const sqlUpdatePayment = `UPDATE payments SET ${fields.join(', ')} WHERE id = $${params.length}`;
            await query(sqlUpdatePayment, params);
        }

        // 2. Xử lý các allocations nếu được cung cấp
        if (allocations !== undefined) {
            const existingAllocations = await findAllocationsByPaymentId(id);
            const existingAllocationsMap = new Map(existingAllocations.map((a) => [a.id, a]));
            const incomingAllocationsMap = new Map(
                allocations.filter((a) => a.id).map((a) => [a.id, a])
            );

            const toCreate = allocations.filter((a) => !a.id); // Allocation mới phải có { invoiceId, amount }
            const toUpdate = allocations.filter((a) => a.id && existingAllocationsMap.has(a.id)); // Allocation cũ { id, amount, note }
            const toDeleteIds = existingAllocations
                .filter((a) => !incomingAllocationsMap.has(a.id))
                .map((a) => a.id);

            if (toDeleteIds.length > 0) {
                await deleteAllocations(toDeleteIds);
            }
            if (toUpdate.length > 0) {
                await updateAllocations(toUpdate);
            }
            if (toCreate.length > 0) {
                await createAllocations(id, toCreate);
            }
        }

        // 3. Lấy lại dữ liệu
        return findPaymentById(id);
    });
}

/**
 * Liệt kê các payments (có hỗ trợ tìm kiếm, lọc và phân trang).
 * @param {object} options - Tùy chọn lọc và phân trang.
 * @returns {Promise<Array<object>>} Mảng các đối tượng payment.
 */
async function listPayments({
    q,
    customerId,
    method,
    direction,
    receivedBy,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    managedBy, // ✅ THÊM parameter mới
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
                p.note ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR c.code ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
            )`);
        }

        // Lọc theo customer
        if (customerId) {
            params.push(customerId);
            clauses.push(`p.customer_id = $${params.length}`);
        }

        // Lọc theo phương thức thanh toán
        if (method) {
            params.push(method);
            clauses.push(`p.method = $${params.length}`);
        }

        // Lọc theo hướng thanh toán
        if (direction) {
            params.push(direction);
            clauses.push(`p.direction = $${params.length}`);
        }

        // Lọc theo người nhận
        if (receivedBy) {
            params.push(receivedBy);
            clauses.push(`p.received_by = $${params.length}`);
        }

        // ✅ THÊM: Lọc theo người quản lý khách hàng (cho seller)
        if (managedBy) {
            params.push(managedBy);
            clauses.push(`c.managed_by = $${params.length}`);
        }

        // Lọc theo khoảng thời gian
        if (fromDate) {
            params.push(fromDate);
            clauses.push(`p.received_at >= $${params.length}`);
        }
        if (toDate) {
            params.push(toDate);
            clauses.push(`p.received_at <= $${params.length}`);
        }

        // Lọc theo khoảng số tiền
        if (minAmount !== undefined) {
            params.push(parseFloat(minAmount));
            clauses.push(`p.amount >= $${params.length}`);
        }
        if (maxAmount !== undefined) {
            params.push(parseFloat(maxAmount));
            clauses.push(`p.amount <= $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PAYMENT_FIELDS_WITH_ALLOCATIONS}
            FROM payments p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN users u ON p.received_by = u.id
            ${where}
            ORDER BY p.received_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toPayment);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách payments:', error.message);
        throw new Error('Không thể lấy danh sách payments');
    }
}

/**
 * Đếm tổng số payments, có thể kèm theo bộ lọc tìm kiếm.
 * @param {object} options - Tùy chọn lọc.
 * @returns {Promise<number>} Tổng số payments.
 */
async function countPayments({
    q,
    customerId,
    method,
    direction,
    receivedBy,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    managedBy, // ✅ THÊM parameter mới
} = {}) {
    try {
        const clauses = [];
        const params = [];

        // Same filter logic as listPayments
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                p.note ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR c.code ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
            )`);
        }

        if (customerId) {
            params.push(customerId);
            clauses.push(`p.customer_id = $${params.length}`);
        }

        if (method) {
            params.push(method);
            clauses.push(`p.method = $${params.length}`);
        }

        if (direction) {
            params.push(direction);
            clauses.push(`p.direction = $${params.length}`);
        }

        if (receivedBy) {
            params.push(receivedBy);
            clauses.push(`p.received_by = $${params.length}`);
        }

        // ✅ THÊM: Lọc theo người quản lý khách hàng (cho seller)
        if (managedBy) {
            params.push(managedBy);
            clauses.push(`c.managed_by = $${params.length}`);
        }

        if (fromDate) {
            params.push(fromDate);
            clauses.push(`p.received_at >= $${params.length}`);
        }
        if (toDate) {
            params.push(toDate);
            clauses.push(`p.received_at <= $${params.length}`);
        }

        if (minAmount !== undefined) {
            params.push(parseFloat(minAmount));
            clauses.push(`p.amount >= $${params.length}`);
        }
        if (maxAmount !== undefined) {
            params.push(parseFloat(maxAmount));
            clauses.push(`p.amount <= $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT COUNT(DISTINCT p.id) AS count
            FROM payments p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN users u ON p.received_by = u.id
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm payments:', error.message);
        throw new Error('Không thể đếm tổng số payments');
    }
}

/**
 * Xóa một payment.
 * @param {string} id - UUID của payment.
 * @returns {Promise<boolean>} Trả về true nếu xóa thành công.
 */
async function deletePayment(id) {
    // Xóa payment sẽ tự động xóa các allocations (CASCADE)
    const sql = `DELETE FROM payments WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

/* ========== CRUD OPERATIONS - PAYMENT ALLOCATIONS ========== */

/**
 * Tạo nhiều allocations cho một payment
 * @param {string} paymentId - UUID của payment
 * @param {Array} allocations - Mảng các allocation { invoiceId, amount, note }
 * @returns {Promise<Array>} - Mảng các allocation vừa tạo
 */
async function createAllocations(paymentId, allocations) {
    if (!allocations || allocations.length === 0) {
        return [];
    }

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    allocations.forEach((allocation) => {
        const { invoiceId, amount, note } = allocation;
        values.push(paymentId, invoiceId, amount, note || null);
        placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`
        );
        paramIndex += 4;
    });

    const sql = `
        INSERT INTO payment_allocations (payment_id, invoice_id, amount, note)
        VALUES ${placeholders.join(', ')}
        RETURNING id
    `;

    const { rows } = await query(sql, values);
    return rows.map((row) => row.id);
}

/**
 * Cập nhật nhiều allocations
 * @param {Array} allocations - Mảng các allocation { id, amount, note }
 * @returns {Promise<void>}
 */
async function updateAllocations(allocations) {
    const promises = allocations.map(async (allocation) => {
        const { id, amount, note } = allocation;
        const sql = `
            UPDATE payment_allocations 
            SET amount = $1, note = $2, updated_at = NOW()
            WHERE id = $3
        `;
        return query(sql, [amount, note, id]);
    });

    await Promise.all(promises);
}

/**
 * Xóa nhiều allocations
 * @param {Array} allocationIds - Mảng các allocation ID
 * @returns {Promise<void>}
 */
async function deleteAllocations(allocationIds) {
    if (!allocationIds || allocationIds.length === 0) {
        return;
    }

    const placeholders = allocationIds.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `DELETE FROM payment_allocations WHERE id IN (${placeholders})`;
    await query(sql, allocationIds);
}

/**
 * Tìm tất cả allocations của một payment
 * @param {string} paymentId - UUID của payment
 * @returns {Promise<Array>} - Mảng các allocation
 */
async function findAllocationsByPaymentId(paymentId) {
    const sql = `
        SELECT 
            pa.id, pa.payment_id, pa.invoice_id, pa.amount, pa.note,
            pa.created_at
        FROM payment_allocations pa
        WHERE pa.payment_id = $1
        ORDER BY pa.created_at
    `;
    const { rows } = await query(sql, [paymentId]);
    return rows.map(toPaymentAllocation);
}

/**
 * Tìm tất cả allocations của một invoice
 * @param {string} invoiceId - UUID của invoice
 * @returns {Promise<Array>} - Mảng các allocation
 */
async function findAllocationsByInvoiceId(invoiceId) {
    const sql = `
        SELECT 
            pa.id, pa.payment_id, pa.invoice_id, pa.amount, pa.note,
            pa.created_at,
            p.method, p.direction, p.received_at,
            c.name AS customer_name
        FROM payment_allocations pa
        LEFT JOIN payments p ON pa.payment_id = p.id
        LEFT JOIN customers c ON p.customer_id = c.id
        WHERE pa.invoice_id = $1
        ORDER BY pa.created_at
    `;
    const { rows } = await query(sql, [invoiceId]);
    return rows.map((row) => ({
        ...toPaymentAllocation(row),
        paymentMethod: row.method,
        paymentDirection: row.direction,
        paymentReceivedAt: row.received_at,
        customerName: row.customer_name,
    }));
}

/* ========== SPECIAL FUNCTIONS ========== */

/**
 * Tính tổng số tiền đã nhận cho một invoice
 * @param {string} invoiceId - UUID của invoice
 * @returns {Promise<number>} - Tổng số tiền đã nhận
 */
async function calculateTotalReceivedForInvoice(invoiceId) {
    const sql = `
        SELECT COALESCE(SUM(amount), 0) AS total_received
        FROM payment_allocations
        WHERE invoice_id = $1
    `;
    const { rows } = await query(sql, [invoiceId]);
    return parseFloat(rows[0].total_received) || 0;
}

/**
 * Tính tổng số tiền allocations cho một payment
 * @param {string} paymentId - UUID của payment
 * @returns {Promise<number>} - Tổng số tiền đã phân bổ
 */
async function calculateTotalAllocatedForPayment(paymentId) {
    const sql = `
        SELECT COALESCE(SUM(amount), 0) AS total_allocated
        FROM payment_allocations
        WHERE payment_id = $1
    `;
    const { rows } = await query(sql, [paymentId]);
    return parseFloat(rows[0].total_allocated) || 0;
}

/**
 * Lấy thống kê payments theo phương thức thanh toán
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} - Thống kê theo method
 */
async function getPaymentStatsByMethod({ customerId, fromDate, toDate } = {}) {
    try {
        const clauses = [];
        const params = [];

        if (customerId) {
            params.push(customerId);
            clauses.push(`customer_id = $${params.length}`);
        }

        if (fromDate) {
            params.push(fromDate);
            clauses.push(`received_at >= $${params.length}`);
        }

        if (toDate) {
            params.push(toDate);
            clauses.push(`received_at <= $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT 
                method,
                direction,
                COUNT(*) as count,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount
            FROM payments
            ${where}
            GROUP BY method, direction
            ORDER BY total_amount DESC
        `;

        const { rows } = await query(sql, params);
        return rows.map((row) => ({
            method: row.method,
            direction: row.direction,
            count: parseInt(row.count, 10),
            totalAmount: parseFloat(row.total_amount) || 0,
            avgAmount: parseFloat(row.avg_amount) || 0,
        }));
    } catch (error) {
        console.error('Lỗi khi lấy thống kê payments:', error.message);
        throw new Error('Không thể lấy thống kê payments');
    }
}

/**
 * Lấy thống kê revenue cho payments direction = 'in' theo tuần/tháng/năm dựa vào received_at.
 */
async function getRevenueStats({
    filter = 'week',
    referenceDate = new Date(),
    startDate,
    endDate,
} = {}) {
    const allowedFilters = ['week', 'month', 'year'];
    const normalizedFilter = allowedFilters.includes(filter) ? filter : 'week';

    const baseDate = dayjs(referenceDate).tz('Asia/Ho_Chi_Minh');
    const rangeStart = startDate
        ? dayjs(startDate).tz('Asia/Ho_Chi_Minh')
        : baseDate.startOf(normalizedFilter);
    const rangeEnd = endDate
        ? dayjs(endDate).tz('Asia/Ho_Chi_Minh')
        : baseDate.endOf(normalizedFilter);

    const bucketExpr =
        normalizedFilter === 'year'
            ? `DATE_TRUNC('month', received_at)`
            : `DATE_TRUNC('day', received_at)`;

    const sql = `
        SELECT
            ${bucketExpr} AS bucket,
            SUM(amount) AS total_amount,
            COUNT(*) AS payments_count
        FROM payments
        WHERE direction = 'in'
          AND received_at BETWEEN $1 AND $2
        GROUP BY bucket
        ORDER BY bucket
    `;

    const params = [rangeStart.utc().toDate(), rangeEnd.utc().toDate()];
    const { rows } = await query(sql, params);

    const formatBucket = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return rows.map((row) => ({
        bucket: formatBucket(row.bucket),
        totalAmount: parseFloat(row.total_amount) || 0,
        paymentsCount: parseInt(row.payments_count, 10),
    }));
}

/**
 * Tạo payment từ webhook SePay với allocation tự động
 * @param {Object} webhookData - Dữ liệu từ SePay webhook
 * @param {string} invoiceId - UUID của invoice cần thanh toán
 * @param {string} receivedBy - UUID của user (có thể là null cho auto payment)
 * @returns {Promise<Object>} - Payment đã tạo
 */
async function createPaymentFromWebhook({
    customerId,
    amount,
    transactionDate,
    transactionId,
    note,
    invoiceId,
    receivedBy = null,
    evdUrl = null, // ✅ THÊM: Evidence URL từ webhook
}) {
    return withTransaction(async () => {
        // 1. Tạo payment với method = 'bank' (từ SePay)
        const paymentData = {
            customerId,
            method: 'bank',
            direction: 'in',
            amount,
            receivedAt: transactionDate || new Date(),
            receivedBy: receivedBy || '00000000-0000-0000-0000-000000000001', // User hệ thống
            note: note || `Thanh toán tự động qua SePay - Transaction: ${transactionId}`,
            evdUrl: evdUrl || `https://default-evidence-url.com/transaction-${transactionId}`, // ✅ THÊM: Evidence URL
        };

        const payment = await createPayment({
            ...paymentData,
            allocations: [
                {
                    invoiceId,
                    amount, // Toàn bộ số tiền vào invoice này
                    note: `Auto allocation từ SePay transaction: ${transactionId}`,
                },
            ],
        });

        return payment;
    });
}

async function deleteAllocationsByPaymentId(paymentId) {
    console.log('Deleting allocations for paymentId:', paymentId);
    const sql = `DELETE FROM payment_allocations WHERE payment_id = $1`;
    await query(sql, [paymentId]);
}
async function deleteAllocation(paymentId, invoiceId) {
    const sql = `DELETE FROM payment_allocations WHERE payment_id = $1 AND invoice_id = $2`;
    await query(sql, [paymentId, invoiceId]);
}

// Tạo payment từ webhook SePay không cần allocation
async function createPaymentFromWebhookNoAllocation({
    customerId,
    amount,
    transactionDate,
    transactionId,
    note,
    receivedBy = null,
    evdUrl = null, // ✅ THÊM: Evidence URL từ webhook
}) {
    return withTransaction(async () => {
        // Tạo payment với method = 'bank' (từ SePay)
        const paymentData = {
            customerId,
            method: 'bank',
            direction: 'in',
            amount,
            receivedAt: transactionDate || new Date(),
            receivedBy: receivedBy || '00000000-0000-0000-0000-000000000001', // User hệ thống
            note: note || `Thanh toán tự động qua SePay - Transaction: ${transactionId}`,
            evdUrl: evdUrl || `https://default-evidence-url.com/transaction-${transactionId}`, // ✅ THÊM: Evidence URL
        };
        const payment = await createPayment(paymentData);
        return payment;
    });
}

/* ========== EXPORTS ========== */

module.exports = {
    // Payment CRUD
    createPayment,
    findPaymentById,
    updatePayment,
    listPayments,
    countPayments,
    deletePayment,

    // Payment Allocation CRUD
    createAllocations,
    updateAllocations,
    deleteAllocations,
    findAllocationsByPaymentId,
    findAllocationsByInvoiceId,

    // Calculations
    calculateTotalReceivedForInvoice,
    calculateTotalAllocatedForPayment,

    // Statistics
    getPaymentStatsByMethod,
    getRevenueStats,

    // Special functions
    createPaymentFromWebhook,
    createPaymentFromWebhookNoAllocation,

    // Utilities
    generatePaymentRef,
    toPayment,
    toPaymentAllocation,
    deleteAllocationsByPaymentId,
    deleteAllocation,
};
