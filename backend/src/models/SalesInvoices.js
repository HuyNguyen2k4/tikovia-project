/* src/models/SalesInvoices.js */
const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const SalesInvoiceItem = require('./SalesInvoiceItems'); // Import model item
const crypto = require('crypto');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const PUBLIC_FIELDS = `
  si.id, si.invoice_no, si.order_id, si.customer_id,
  si.subtotal, si.tax_amount, si.discount_amount, si.total,
  si.status, si.created_at, si.updated_at,
  si.approved_returns, si.expected_receivables, si.received_in,
  si.refunded_out, si.actual_receivables, si.remaining_receivables,
  si.last_payment_at, si.last_payment_id, si.surcharge,
  c.name AS customer_name, c.code AS customer_code,
  so.order_no AS order_no
`;

// Sử dụng json_agg để lấy items
const PUBLIC_FIELDS_WITH_ITEMS = `
    ${PUBLIC_FIELDS},
    (
        SELECT COALESCE(json_agg(row_to_json(items)), '[]'::json)
        FROM (
            SELECT
                sii.id,
                sii.order_item_id,
                sii.unit_price,
                soi.product_id,
                soi.qty,
                p.name AS product_name,
                p.sku_code,
                p.img_url,
                COALESCE(pi.total_post_qty, 0) AS post_qty
            FROM sales_invoice_items sii
            JOIN sales_order_items soi ON sii.order_item_id = soi.id
            JOIN products p ON soi.product_id = p.id
            LEFT JOIN (
                SELECT order_item_id, SUM(post_qty) AS total_post_qty
                FROM preparation_items
                GROUP BY order_item_id
            ) pi ON soi.id = pi.order_item_id
            WHERE sii.invoice_id = si.id
            GROUP BY
                sii.id,
                sii.order_item_id,
                sii.unit_price,
                soi.product_id,
                soi.qty,
                p.name,
                p.sku_code,
                p.img_url,
                pi.total_post_qty
            ORDER BY p.name
        ) items
    ) AS items
`;

const PUBLIC_FIELDS_ONLY = `
  id, invoice_no, order_id, customer_id, subtotal, tax_amount, 
  discount_amount, total, status, created_at, updated_at, surcharge
`;
// Helper function để generate invoice_no tự động
// Ví dụ: INV-091025-C8F23A
const generateInvoiceNo = () => {
    const prefix = 'INV';
    const today = dayjs().format('DDMMYY');
    // Dùng 3 bytes để tạo 6 ký tự hex
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${today}-${randomSuffix}`;
};
/**
 * Chuyển đổi một hàng từ database thành một đối tượng SalesInvoice JS.
 * @param {object} row - Hàng dữ liệu từ database.
 * @returns {object|null}
 */
function toSalesInvoice(row) {
    if (!row) return null;

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        invoiceNo: row.invoice_no,
        orderId: row.order_id,
        orderNo: row.order_no || null,
        customerId: row.customer_id,
        customerName: row.customer_name || null,
        customerCode: row.customer_code || null,
        status: row.status,

        // Financials - Các trường này được tính toán/cache bởi DB triggers
        subtotal: parseFloat(row.subtotal),
        taxAmount: parseFloat(row.tax_amount),
        discountAmount: parseFloat(row.discount_amount),
        total: parseFloat(row.total),

        // Payment Cache - Các trường này được tính toán/cache bởi DB triggers
        approvedReturns: parseFloat(row.approved_returns),
        expectedReceivables: parseFloat(row.expected_receivables),
        receivedIn: parseFloat(row.received_in),
        refundedOut: parseFloat(row.refunded_out),
        actualReceivables: parseFloat(row.actual_receivables),
        remainingReceivables: parseFloat(row.remaining_receivables),
        lastPaymentAt: formatToVietnamTime(row.last_payment_at),
        lastPaymentId: row.last_payment_id,

        // Timestamps
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),
        surcharge: parseFloat(row.surcharge),

        // Items
        items: row.items
            ? row.items.map((item) => ({
                  id: item.id,
                  orderItemId: item.order_item_id,
                  unitPrice: parseFloat(item.unit_price),
                  productId: item.product_id,
                  qty: parseFloat(item.qty),
                  productName: item.product_name,
                  skuCode: item.sku_code,
                  imgUrl: item.img_url,
                  postQty: item.post_qty !== undefined ? parseFloat(item.post_qty) : null,
              }))
            : [],
    };
}

/* -------------------- CRUD OPERATIONS -------------------- */

/**
 * Tạo một hóa đơn mới cùng với các chi tiết.
 * @param {object} data - Dữ liệu cho hóa đơn mới, bao gồm một mảng 'items'.
 * @returns {Promise<object>} Đối tượng hóa đơn vừa được tạo.
 */
async function createSalesInvoice({ items = [], ...invoiceData }) {
    return withTransaction(async () => {
        const {
            invoiceNo = generateInvoiceNo(),
            orderId,
            taxAmount = 0,
            discountAmount = 0,
            surcharge = 0,
            status = 'open',
        } = invoiceData;

        // 1. Lấy customer_id từ sales_order
        const orderSql = 'SELECT customer_id FROM sales_orders WHERE id = $1';
        const orderRes = await query(orderSql, [orderId]);
        if (orderRes.rows.length === 0) {
            throw new Error('Sales Order ID không tồn tại');
        }
        const customerId = orderRes.rows[0].customer_id;

        // 2. Tạo hóa đơn
        const sqlInvoice = `
            INSERT INTO sales_invoices (
                invoice_no, order_id, customer_id, tax_amount, discount_amount, surcharge, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `;
        const paramsInvoice = [
            invoiceNo,
            orderId,
            customerId,
            taxAmount,
            discountAmount,
            surcharge,
            status,
        ];
        const { rows } = await query(sqlInvoice, paramsInvoice);
        const invoiceId = rows[0].id;

        // 3. Tạo các item liên quan
        if (items.length > 0) {
            await SalesInvoiceItem.createMany(invoiceId, items);
        }

        // 4. Lấy lại toàn bộ hóa đơn để trả về
        // DB triggers sẽ tự động tính toán subtotal, total...
        return findById(invoiceId);
    });
}

/**
 * Tìm hóa đơn theo ID (có join với items, customer, order).
 * @param {string} id - UUID của hóa đơn.
 * @returns {Promise<object|null>} Đối tượng hóa đơn hoặc null.
 */
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_ITEMS}
        FROM sales_invoices si
        LEFT JOIN customers c ON si.customer_id = c.id
        LEFT JOIN sales_orders so ON si.order_id = so.id
        WHERE si.id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [id]);
    return toSalesInvoice(rows[0]);
}

/**
 * Tìm hóa đơn theo InvoiceNo
 * @param {string} invoiceNo - Mã hóa đơn.
 * @returns {Promise<object|null>} Đối tượng hóa đơn hoặc null.
 */
async function findByInvoiceNo(invoiceNo) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_ONLY}
        FROM sales_invoices
        WHERE invoice_no = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [invoiceNo]);
    return toSalesInvoice(rows[0]);
}

/**
 * Tìm hóa đơn theo OrderId
 * @param {string} orderId - Mã đơn hàng.
 * @returns {Promise<object|null>} Đối tượng hóa đơn hoặc null.
 */
async function findByOrderId(orderId) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_ITEMS}
        FROM sales_invoices si
        LEFT JOIN customers c ON si.customer_id = c.id
        LEFT JOIN sales_orders so ON si.order_id = so.id
        WHERE si.order_id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [orderId]);
    return toSalesInvoice(rows[0]);
}

/**
 * Cập nhật một hóa đơn, bao gồm cả các chi tiết sản phẩm.
 * @param {string} id - UUID của hóa đơn.
 * @param {object} payload - Dữ liệu cần cập nhật, có thể chứa mảng 'items'.
 * @returns {Promise<object>} Đối tượng hóa đơn sau khi cập nhật.
 */
async function updateSalesInvoice(id, { items, ...payload }) {
    return withTransaction(async () => {
        // 1. Cập nhật các trường của sales_invoices
        const fields = [],
            params = [];
        const map = {
            taxAmount: 'tax_amount',
            discountAmount: 'discount_amount',
            surcharge: 'surcharge',
            status: 'status',
        };
        // Không cho phép đổi order_id, customer_id sau khi tạo
        Object.entries(map).forEach(([kSrc, kDb]) => {
            if (payload[kSrc] !== undefined) {
                params.push(payload[kSrc]);
                fields.push(`${kDb} = $${params.length}`);
            }
        });
        if (fields.length > 0) {
            params.push(id);
            const sqlUpdateInvoice = `UPDATE sales_invoices SET ${fields.join(', ')} WHERE id = $${params.length}`;
            await query(sqlUpdateInvoice, params);
        }

        // 2. Xử lý các items nếu được cung cấp
        if (items !== undefined) {
            const existingItems = await SalesInvoiceItem.findByInvoiceId(id);
            const existingItemsMap = new Map(existingItems.map((i) => [i.id, i]));
            const incomingItemsMap = new Map(items.filter((i) => i.id).map((i) => [i.id, i]));

            const toCreate = items.filter((i) => !i.id); // Item mới phải có { orderItemId, unitPrice }
            const toUpdate = items.filter((i) => i.id && existingItemsMap.has(i.id)); // Item cũ { id, unitPrice }
            const toDeleteIds = existingItems
                .filter((i) => !incomingItemsMap.has(i.id))
                .map((i) => i.id);

            if (toDeleteIds.length > 0) {
                await SalesInvoiceItem.deleteMany(toDeleteIds);
            }
            if (toUpdate.length > 0) {
                await SalesInvoiceItem.updateMany(toUpdate);
            }
            if (toCreate.length > 0) {
                await SalesInvoiceItem.createMany(id, toCreate);
            }
        }

        // 3. Lấy lại dữ liệu
        // DB triggers sẽ tự động tính toán lại subtotal, total... sau khi item thay đổi
        return findById(id);
    });
}

/**
 * Liệt kê các hóa đơn (có hỗ trợ tìm kiếm, lọc và phân trang).
 * @param {object} options - Tùy chọn lọc và phân trang.
 * @returns {Promise<Array<object>>} Mảng các đối tượng hóa đơn.
 */
async function listSalesInvoices({ q, customerId, orderId, status, limit = 20, offset = 0 } = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                si.invoice_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR so.order_no ILIKE $${params.length}
            )`);
        }
        if (customerId) {
            params.push(customerId);
            clauses.push(`si.customer_id = $${params.length}`);
        }
        if (orderId) {
            params.push(orderId);
            clauses.push(`si.order_id = $${params.length}`);
        }
        if (status) {
            params.push(status);
            clauses.push(`si.status = $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS_WITH_ITEMS}
            FROM sales_invoices si
            LEFT JOIN customers c ON si.customer_id = c.id
            LEFT JOIN sales_orders so ON si.order_id = so.id
            ${where}
            ORDER BY si.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toSalesInvoice);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hóa đơn:', error.message);
        throw new Error('Không thể lấy danh sách hóa đơn');
    }
}

/**
 * Đếm tổng số hóa đơn, có thể kèm theo bộ lọc tìm kiếm.
 * @param {object} options - Tùy chọn lọc.
 * @returns {Promise<number>} Tổng số hóa đơn.
 */
async function countSalesInvoices({ q, customerId, orderId, status } = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            // Cần join để tìm kiếm
            clauses.push(`(
                si.invoice_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR so.order_no ILIKE $${params.length}
            )`);
        }
        if (customerId) {
            params.push(customerId);
            clauses.push(`si.customer_id = $${params.length}`);
        }
        if (orderId) {
            params.push(orderId);
            clauses.push(`si.order_id = $${params.length}`);
        }
        if (status) {
            params.push(status);
            clauses.push(`si.status = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        // Cần join nếu có 'q'
        const joins =
            q && q.trim()
                ? `LEFT JOIN customers c ON si.customer_id = c.id LEFT JOIN sales_orders so ON si.order_id = so.id`
                : '';

        const sql = `
            SELECT COUNT(DISTINCT si.id) AS count
            FROM sales_invoices si
            ${joins}
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm hóa đơn:', error.message);
        throw new Error('Không thể đếm tổng số hóa đơn');
    }
}

/**
 * Xóa một hóa đơn.
 * @param {string} id - UUID của hóa đơn.
 * @returns {Promise<boolean>} Trả về true nếu xóa thành công.
 */
async function deleteSalesInvoice(id) {
    // Nên dùng transaction nếu cần xóa các payments liên quan.
    // Hiện tại, DB schema (payment_allocations) sẽ chặn xóa nếu có payment.
    const sql = `DELETE FROM sales_invoices WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

// Hàm lấy tất cả dữ liệu của 1 invoice theo invoiceNo
async function findInvoiceWithCustomerByInvoiceNo(invoiceNo) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_ITEMS}
        FROM sales_invoices si
        LEFT JOIN customers c ON si.customer_id = c.id
        LEFT JOIN sales_orders so ON si.order_id = so.id
        WHERE si.invoice_no = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [invoiceNo]);
    return toSalesInvoice(rows[0]);
}

// Hàm lấy tất cả dữ liệu của 1 invoice theo orderNo
async function findInvoiceWithCustomerByOrderNo(orderNo) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_ITEMS}
        FROM sales_invoices si
        LEFT JOIN customers c ON si.customer_id = c.id
        LEFT JOIN sales_orders so ON si.order_id = so.id
        WHERE so.order_no = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [orderNo]);
    return toSalesInvoice(rows[0]);
}
/* -------------------- EXPORT -------------------- */

module.exports = {
    createSalesInvoice,
    findById,
    findByInvoiceNo,
    findByOrderId,
    listSalesInvoices,
    countSalesInvoices,
    updateSalesInvoice,
    deleteSalesInvoice,
    // Mở rộng
    findInvoiceWithCustomerByInvoiceNo,
    findInvoiceWithCustomerByOrderNo,
};
