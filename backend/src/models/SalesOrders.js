const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const SalesOrderItem = require('./SalesOrderItems'); // Import model mới
const crypto = require('crypto');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const PUBLIC_FIELDS = `
  so.id, so.order_no, so.customer_id, so.seller_id, so.department_id, so.status,
  so.sla_delivery_at, so.address, so.created_at, so.updated_at,
  so.admin_locked, so.items_count, so.prepared_items_count,
  so.delivered_items_count, so.prepared_at, so.delivered_at, so.completed_at,
  so.phone, so.note,
  c.name AS customer_name,
  u.full_name AS seller_name,
    d.name AS department_name
`;

// Helper function để generate order_no tự động
// Ví dụ: ORD-091025-C8F23A
const generateOrderNo = () => {
    const prefix = 'ORD';
    const today = dayjs().format('DDMMYY');
    // Dùng 3 bytes để tạo 6 ký tự hex
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${today}-${randomSuffix}`;
};

// Sử dụng json_agg để lấy items hiệu quả hơn
const PUBLIC_FIELDS_WITH_ITEMS = `
    ${PUBLIC_FIELDS},
    (
        SELECT COALESCE(json_agg(row_to_json(items)), '[]'::json)
        FROM (
            SELECT
                soi.id,
                soi.product_id,
                soi.qty,
                soi.remain,
                soi.note,
                p.name AS product_name,
                d.name AS department_name
            FROM sales_order_items soi
            LEFT JOIN products p ON soi.product_id = p.id
            LEFT JOIN departments d ON so.department_id = d.id
            WHERE soi.order_id = so.id
            ORDER BY soi.id
        ) items
    ) AS items
`;

const PUBLIC_FIELDS_ONLY = `
  id, order_no, customer_id, seller_id, department_id, status, sla_delivery_at, address,
  created_at, updated_at, admin_locked, items_count, prepared_items_count,
  delivered_items_count, prepared_at, delivered_at, completed_at
`;

/**
 * Chuyển đổi một hàng từ database thành một đối tượng SalesOrder JS.
 * @param {object} row - Hàng dữ liệu từ database.
 * @returns {object|null} Đối tượng SalesOrder hoặc null nếu không có row.
 */
function toSalesOrder(row) {
    if (!row) return null;

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        orderNo: row.order_no,
        customerId: row.customer_id,
        customerName: row.customer_name || null,
        sellerId: row.seller_id,
        sellerName: row.seller_name || null,
        departmentId: row.department_id,
        departmentName: row.department_name || null,
        status: row.status,
        slaDeliveryAt: formatToVietnamTime(row.sla_delivery_at),
        address: row.address,
        adminLocked: row.admin_locked,
        itemsCount: row.items_count,
        preparedItemsCount: row.prepared_items_count,
        deliveredItemsCount: row.delivered_items_count,
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),
        preparedAt: formatToVietnamTime(row.prepared_at),
        deliveredAt: formatToVietnamTime(row.delivered_at),
        completedAt: formatToVietnamTime(row.completed_at),
        phone: row.phone,
        note: row.note,
        items: row.items
            ? row.items.map((item) => ({
                  id: item.id,
                  productId: item.product_id,
                  qty: parseFloat(item.qty),
                  remain: item.remain !== undefined ? parseFloat(item.remain) : null,
                  note: item.note,
                  productName: item.product_name,
              }))
            : [],
    };
}

/* -------------------- CRUD OPERATIONS -------------------- */

/**
 * Tạo một đơn hàng mới cùng với các chi tiết sản phẩm.
 * @param {object} data - Dữ liệu cho đơn hàng mới, bao gồm một mảng 'items'.
 * @returns {Promise<object>} Đối tượng đơn hàng vừa được tạo.
 */
async function createSalesOrder({ items = [], ...orderData }) {
    return withTransaction(async () => {
        const {
            // orderNo,
            customerId,
            sellerId,
            departmentId,
            slaDeliveryAt,
            address,
            status = 'draft',
            adminLocked = false,
            phone,
            note,
        } = orderData;

        const sqlOrder = `
            INSERT INTO sales_orders (
                order_no, customer_id, seller_id, department_id, status, sla_delivery_at, address, admin_locked, phone, note
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
        `;
        const paramsOrder = [
            generateOrderNo(),
            customerId,
            sellerId,
            departmentId,
            status,
            slaDeliveryAt,
            address,
            adminLocked,
            phone,
            note || null,
        ];
        const { rows } = await query(sqlOrder, paramsOrder);
        const orderId = rows[0].id;

        // Tạo các item liên quan
        if (items.length > 0) {
            await SalesOrderItem.createMany(orderId, items);
        }

        // Lấy lại toàn bộ đơn hàng để trả về
        return findById(orderId);
    });
}

/**
 * Tìm đơn hàng theo ID (có join với items, customer, user).
 * @param {string} id - UUID của đơn hàng.
 * @returns {Promise<object|null>} Đối tượng đơn hàng hoặc null.
 */
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_ITEMS}
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN users u ON so.seller_id = u.id
        LEFT JOIN departments d ON so.department_id = d.id
        WHERE so.id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [id]);
    return toSalesOrder(rows[0]);
}

/**
 * Tìm đơn hàng theo OrderNo
 * @param {string} orderNo - Mã đơn hàng.
 * @returns {Promise<object|null>} Đối tượng đơn hàng hoặc null.
 */
async function findByOrderNo(orderNo) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_ONLY}
        FROM sales_orders
        WHERE order_no = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [orderNo]);
    return toSalesOrder(rows[0]);
}

/**
 * Cập nhật một đơn hàng, bao gồm cả các chi tiết sản phẩm.
 * @param {string} id - UUID của đơn hàng.
 * @param {object} payload - Dữ liệu cần cập nhật, có thể chứa mảng 'items'.
 * @returns {Promise<object>} Đối tượng đơn hàng sau khi cập nhật.
 */
async function updateSalesOrder(id, { items, ...payload }) {
    return withTransaction(async () => {
        // 1. Cập nhật các trường của sales_orders
        const fields = [],
            params = [];
        const map = {
            // orderNo: 'order_no',
            customerId: 'customer_id',
            sellerId: 'seller_id',
            departmentId: 'department_id',
            status: 'status',
            slaDeliveryAt: 'sla_delivery_at',
            address: 'address',
            adminLocked: 'admin_locked',
            phone: 'phone',
            note: 'note',
        };
        Object.entries(map).forEach(([kSrc, kDb]) => {
            if (payload[kSrc] !== undefined) {
                params.push(payload[kSrc]);
                fields.push(`${kDb} = $${params.length}`);
            }
        });
        if (fields.length > 0) {
            params.push(id);
            const sqlUpdateOrder = `UPDATE sales_orders SET ${fields.join(', ')} WHERE id = $${params.length}`;
            await query(sqlUpdateOrder, params);
        }

        // 2. Xử lý các items nếu được cung cấp
        if (items !== undefined) {
            const existingItems = await SalesOrderItem.findByOrderId(id);
            const existingItemsMap = new Map(existingItems.map((i) => [i.id, i]));
            const incomingItemsMap = new Map(items.filter((i) => i.id).map((i) => [i.id, i]));

            const toCreate = items.filter((i) => !i.id);
            const toUpdate = items.filter((i) => i.id && existingItemsMap.has(i.id));
            const toDeleteIds = existingItems
                .filter((i) => !incomingItemsMap.has(i.id))
                .map((i) => i.id);

            if (toDeleteIds.length > 0) {
                await SalesOrderItem.deleteMany(toDeleteIds);
            }
            if (toUpdate.length > 0) {
                await SalesOrderItem.updateMany(toUpdate);
            }
            if (toCreate.length > 0) {
                await SalesOrderItem.createMany(id, toCreate);
            }
        }

        return findById(id);
    });
}

/**
 * Liệt kê các đơn hàng (có hỗ trợ tìm kiếm, lọc và phân trang).
 * @param {object} options - Tùy chọn lọc và phân trang.
 * @returns {Promise<Array<object>>} Mảng các đối tượng đơn hàng.
 * Tìm kiếm theo mã đơn, khách hàng, người bán
 */
async function listSalesOrders({
    q,
    customerId,
    sellerId,
    departmentId,
    status,
    adminLocked,
    limit = 20,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                so.order_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
            )`);
        }
        if (customerId) {
            params.push(customerId);
            clauses.push(`so.customer_id = $${params.length}`);
        }
        if (sellerId) {
            params.push(sellerId);
            clauses.push(`so.seller_id = $${params.length}`);
        }
        if (status) {
            params.push(status);
            clauses.push(`so.status = $${params.length}`);
        }
        if (adminLocked !== undefined) {
            params.push(adminLocked);
            clauses.push(`so.admin_locked = $${params.length}`);
        }
        if (departmentId) {
            params.push(departmentId);
            clauses.push(`so.department_id = $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS_WITH_ITEMS}
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN users u ON so.seller_id = u.id
            LEFT JOIN departments d ON so.department_id = d.id
            ${where}
            ORDER BY so.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toSalesOrder);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn hàng:', error.message);
        throw new Error('Không thể lấy danh sách đơn hàng');
    }
}

/**
 * Đếm tổng số đơn hàng, có thể kèm theo bộ lọc tìm kiếm.
 * @param {object} options - Tùy chọn lọc.
 * @param {string} [options.q] - Từ khóa tìm kiếm (mã đơn, tên khách, tên người bán).
 * @param {string} [options.customerId] - Lọc theo ID khách hàng.
 * @param {string} [options.sellerId] - Lọc theo ID người bán.
 * @param {string|Array<string>} [options.status] - Lọc theo 1 status (string) hoặc nhiều status (array).
 * @param {boolean} [options.adminLocked] - Lọc theo trạng thái khóa.
 * @param {number} [options.departmentId] - Lọc theo ID kho xuất hàng.
 * @returns {Promise<number>} Tổng số đơn hàng.
 */
async function countSalesOrders({
    q,
    customerId,
    sellerId,
    status,
    adminLocked,
    departmentId,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        // 1. Xây dựng mệnh đề WHERE và tham số
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            // SỬA LỖI: Mở rộng tìm kiếm 'q' để bao gồm cả tên khách và người bán
            clauses.push(`(
                so.order_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
            )`);
        }
        if (customerId) {
            params.push(customerId);
            clauses.push(`so.customer_id = $${params.length}`);
        }
        if (sellerId) {
            params.push(sellerId);
            clauses.push(`so.seller_id = $${params.length}`);
        }
        if (departmentId) {
            params.push(departmentId);
            clauses.push(`so.department_id = $${params.length}`);
        }
        // SỬA LỖI: Hỗ trợ cả mảng status
        if (status) {
            if (Array.isArray(status) && status.length > 0) {
                // Nếu là mảng, dùng = ANY()
                params.push(status);
                clauses.push(`so.status = ANY($${params.length})`);
            } else if (typeof status === 'string' && status.trim()) {
                // Nếu là string, giữ logic cũ
                params.push(status.trim());
                clauses.push(`so.status = $${params.length}`);
            }
        }

        if (adminLocked !== undefined) {
            params.push(adminLocked);
            clauses.push(`so.admin_locked = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        // 2. Xây dựng câu SQL
        const sql = `
            SELECT COUNT(*) AS count
            FROM sales_orders so
            -- SỬA LỖI: Thêm các JOIN cần thiết cho việc lọc 'q'
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN users u ON so.seller_id = u.id
            ${where}
        `.trim();

        // 3. Thực thi
        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm đơn hàng:', error.message);
        throw new Error('Không thể đếm tổng số đơn hàng');
    }
}

/**
 * Xóa một đơn hàng.
 * @param {string} id - UUID của đơn hàng.
 * @returns {Promise<boolean>} Trả về true nếu xóa thành công.
 */
async function deleteSalesOrder(id) {
    // Transaction được khuyến nghị nếu bạn cần xóa các items liên quan trước
    const sql = `DELETE FROM sales_orders WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

/**
 * Cập nhật trạng thái admin_locked hàng loạt.
 * @param {Array<string>} ids - Mảng các UUID.
 * @param {boolean} adminLocked - Trạng thái khóa mới.
 * @returns {Promise<number>} Số lượng bản ghi được cập nhật.
 * Note: Hàm này hiện không được sử dụng trong module, nhưng giữ lại để tham khảo.
 */
// async function updateAdminLocked(ids = [], adminLocked = true) {
//     if (!Array.isArray(ids) || ids.length === 0) return 0;
//     const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
//     const sql = `
//         UPDATE sales_orders
//         SET admin_locked = $${ids.length + 1}
//         WHERE id IN (${placeholders})
//     `;
//     const { rowCount } = await query(sql, [...ids, adminLocked]);
//     return rowCount;
// }

/**
 * Lấy danh sách và đếm tổng số đơn hàng (hỗ trợ tìm kiếm, lọc, phân trang).
 *
 * @param {object} options - Tùy chọn lọc và phân trang.
 * @param {string} [options.q] - Từ khóa tìm kiếm (mã đơn, tên khách, tên người bán).
 * @param {string} [options.customerId] - Lọc theo ID khách hàng.
 * @param {string} [options.sellerId] - Lọc theo ID người bán.
 * @param {number} [options.departmentId] - Lọc theo ID kho xuất hàng.
 * @param {string|Array<string>} [options.status] - Lọc theo 1 status (string) hoặc nhiều status (array).
 * @param {boolean} [options.adminLocked] - Lọc theo trạng thái khóa.
 * @param {number} [options.limit=20] - Giới hạn số lượng.
 * @param {number} [options.offset=0] - Vị trí bắt đầu.
 * @returns {Promise<{data: Array<object>, count: number}>}
 * Object chứa mảng đơn hàng và tổng số đếm.
 */
async function listAndCountSalesOrders({
    q,
    customerId,
    sellerId,
    departmentId,
    status, // Có thể là string hoặc array
    adminLocked,
    limit = 20,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = []; // Chỉ chứa các tham số cho WHERE

        // Các JOIN này cần thiết cho cả COUNT và LIST
        // để logic filter 'q' (tìm kiếm) hoạt động đồng nhất
        const commonJoins = `
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN users u ON so.seller_id = u.id
            LEFT JOIN departments d ON so.department_id = d.id
        `;

        // 1. Xây dựng mệnh đề WHERE và tham số
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            // Logic tìm kiếm 'q' này phải giống hệt nhau cho cả count và list
            clauses.push(`(
                so.order_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
            )`);
        }
        if (customerId) {
            params.push(customerId);
            clauses.push(`so.customer_id = $${params.length}`);
        }
        if (sellerId) {
            params.push(sellerId);
            clauses.push(`so.seller_id = $${params.length}`);
        }
        if (departmentId) {
            params.push(departmentId);
            clauses.push(`so.department_id = $${params.length}`);
        }

        // --- Logic mới cho MẢNG STATUS ---
        if (status) {
            if (Array.isArray(status) && status.length > 0) {
                // Nếu là mảng, dùng = ANY()
                params.push(status);
                clauses.push(`so.status = ANY($${params.length})`);
            } else if (typeof status === 'string' && status.trim()) {
                // Nếu là string, giữ logic cũ
                params.push(status.trim());
                clauses.push(`so.status = $${params.length}`);
            }
        }
        // --- Hết logic mới ---

        if (adminLocked !== undefined) {
            params.push(adminLocked);
            clauses.push(`so.admin_locked = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        // 2. Chạy truy vấn COUNT
        // Sử dụng commonJoins và where, với các tham số của WHERE
        const countSql = `SELECT COUNT(*) AS count ${commonJoins} ${where}`.trim();

        // params lúc này chỉ chứa các giá trị cho WHERE
        const { rows: countRows } = await query(countSql, params);
        const count = parseInt(countRows[0].count, 10);

        // Nếu không có kết quả, trả về sớm, không cần query list
        if (count === 0) {
            return { data: [], count: 0 };
        }

        // 3. Chạy truy vấn LIST (lấy dữ liệu)
        // Tạo mảng tham số mới cho list, bao gồm cả LIMIT/OFFSET
        const listParams = [...params]; // Copy các tham số của WHERE
        listParams.push(limit, offset); // Thêm tham số cho LIMIT và OFFSET

        const listSql = `
            SELECT ${PUBLIC_FIELDS_WITH_ITEMS}
            ${commonJoins}
            ${where}
            ORDER BY so.created_at DESC
            LIMIT $${listParams.length - 1} 
            OFFSET $${listParams.length}
        `.trim();

        const { rows } = await query(listSql, listParams);
        const data = rows.map(toSalesOrder);

        // 4. Trả về kết quả kết hợp
        return { data, count };
    } catch (error) {
        console.error('Lỗi khi lấy/đếm danh sách đơn hàng:', error.message);
        throw new Error('Không thể xử lý yêu cầu danh sách đơn hàng');
    }
}

/**
 * Lấy danh sách đơn hàng kèm đầy đủ thông tin hóa đơn (nếu có).
 * @param {object} options - Tùy chọn lọc và phân trang.
 * @returns {Promise<Array<object>>} Mảng các đối tượng đơn hàng, mỗi order có trường 'invoice' (hoặc null).
 */
async function listSalesOrdersWithInvoiceFull({
    q,
    customerId,
    sellerId,
    departmentId,
    status,
    adminLocked,
    limit = 20,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                so.order_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
            )`);
        }
        if (customerId) {
            params.push(customerId);
            clauses.push(`so.customer_id = $${params.length}`);
        }
        if (sellerId) {
            params.push(sellerId);
            clauses.push(`so.seller_id = $${params.length}`);
        }
        if (departmentId) {
            params.push(departmentId);
            clauses.push(`so.department_id = $${params.length}`);
        }
        if (status) {
            if (Array.isArray(status) && status.length > 0) {
                params.push(status);
                clauses.push(`so.status = ANY($${params.length})`);
            } else if (typeof status === 'string' && status.trim()) {
                params.push(status.trim());
                clauses.push(`so.status = $${params.length}`);
            }
        }
        if (adminLocked !== undefined) {
            params.push(adminLocked);
            clauses.push(`so.admin_locked = $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT so.*, c.name AS customer_name, u.full_name AS seller_name, d.name AS department_name,
                   si.id AS invoice_id,
                   si.invoice_no, si.order_id AS invoice_order_id, si.customer_id AS invoice_customer_id,
                   si.subtotal, si.tax_amount, si.discount_amount, si.surcharge, si.total,
                   si.status AS invoice_status, si.created_at AS invoice_created_at, si.updated_at AS invoice_updated_at,
                   si.approved_returns, si.expected_receivables, si.received_in, si.refunded_out,
                   si.actual_receivables, si.remaining_receivables, si.last_payment_at, si.last_payment_id
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN users u ON so.seller_id = u.id
            LEFT JOIN departments d ON so.department_id = d.id
            LEFT JOIN sales_invoices si ON so.id = si.order_id
            ${where}
            ORDER BY so.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);

        return rows.map(row => {
            const order = toSalesOrder(row);
            order.invoice = row.invoice_id
                ? {
                    id: row.invoice_id,
                    invoiceNo: row.invoice_no,
                    orderId: row.invoice_order_id,
                    customerId: row.invoice_customer_id,
                    subtotal: row.subtotal,
                    taxAmount: row.tax_amount,
                    discountAmount: row.discount_amount,
                    surcharge: row.surcharge,
                    total: row.total,
                    status: row.invoice_status,
                    createdAt: row.invoice_created_at,
                    updatedAt: row.invoice_updated_at,
                    approvedReturns: row.approved_returns,
                    expectedReceivables: row.expected_receivables,
                    receivedIn: row.received_in,
                    refundedOut: row.refunded_out,
                    actualReceivables: row.actual_receivables,
                    remainingReceivables: row.remaining_receivables,
                    lastPaymentAt: row.last_payment_at,
                    lastPaymentId: row.last_payment_id,
                }
                : null;
            return order;
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn hàng với hóa đơn:', error.message);
        throw new Error('Không thể lấy danh sách đơn hàng với hóa đơn');
    }
}

/**
 * Lấy thông tin hóa đơn đầy đủ theo orderId.
 * @param {string} orderId - UUID của đơn hàng.
 * @returns {Promise<object|null>} Đối tượng hóa đơn hoặc null.
 */
async function findInvoiceByOrderIdFull(orderId) {
    const sql = `
        SELECT *
        FROM sales_invoices
        WHERE order_id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [orderId]);
    return rows[0] || null;
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    createSalesOrder,
    findById,
    findByOrderNo,
    listSalesOrders,
    countSalesOrders,
    updateSalesOrder,
    deleteSalesOrder,
    // updateAdminLocked,
    listAndCountSalesOrders,
    findInvoiceByOrderIdFull,
    listSalesOrdersWithInvoiceFull,
};
