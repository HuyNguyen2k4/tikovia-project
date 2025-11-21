/* src/models/OrderReturnsCombined.js */
const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const crypto = require('crypto');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

/* ========== FIELDS DEFINITIONS ========== */

const ORDER_RETURN_FIELDS = `
    orr.id, orr.order_id, orr.created_by, orr.status, orr.total_amount,
    orr.evd_url, orr.note, orr.created_at, orr.updated_at,
    so.order_no, so.customer_id,
    c.name AS customer_name, c.code AS customer_code,
    u.full_name AS created_by_name
`;

// Sử dụng json_agg để lấy items
const ORDER_RETURN_FIELDS_WITH_ITEMS = `
    ${ORDER_RETURN_FIELDS},
    (
        SELECT COALESCE(json_agg(row_to_json(items)), '[]'::json)
        FROM (
            SELECT
                ori.id,
                ori.product_id,
                ori.qty,
                ori.unit_price,
                p.name AS product_name,
                p.sku_code,
                p.img_url,
                p.pack_unit,
                p.main_unit
            FROM order_return_items ori
            LEFT JOIN products p ON ori.product_id = p.id
            WHERE ori.return_id = orr.id
            ORDER BY p.name
        ) items
    ) AS items
`;

const ORDER_RETURN_FIELDS_ONLY = `
    id, order_id, created_by, status, total_amount, evd_url, note, 
    created_at, updated_at
`;

/* ========== HELPER FUNCTIONS ========== */

/**
 * Helper function để generate return reference số tự động
 * Ví dụ: RET-091025-C8F23A
 */
const generateReturnRef = () => {
    const prefix = 'RET';
    const today = dayjs().format('DDMMYY');
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${today}-${randomSuffix}`;
};

/**
 * Chuyển đổi một hàng từ database thành một đối tượng OrderReturn JS.
 * @param {object} row - Hàng dữ liệu từ database.
 * @returns {object|null}
 */
function toOrderReturn(row) {
    if (!row) return null;

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        orderId: row.order_id,
        orderNo: row.order_no || null,
        customerId: row.customer_id || null,
        customerName: row.customer_name || null,
        customerCode: row.customer_code || null,
        createdBy: row.created_by,
        createdByName: row.created_by_name || null,
        status: row.status,
        totalAmount: parseFloat(row.total_amount) || 0,
        evdUrl: row.evd_url,
        note: row.note,
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),

        // Items (nếu có)
        items: row.items
            ? row.items.map((item) => ({
                  id: item.id,
                  productId: item.product_id,
                  qty: parseFloat(item.qty) || 0,
                  unitPrice: parseFloat(item.unit_price) || 0,
                  productName: item.product_name,
                  skuCode: item.sku_code,
                  imgUrl: item.img_url,
                  packUnit: item.pack_unit,
                  mainUnit: item.main_unit,
                  // Calculated field
                  totalPrice: (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0),
              }))
            : [],
    };
}

/**
 * Chuyển đổi order return item row thành object
 */
function toOrderReturnItem(row) {
    if (!row) return null;

    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        returnId: row.return_id,
        productId: row.product_id,
        qty: parseFloat(row.qty) || 0,
        unitPrice: parseFloat(row.unit_price) || 0,
        productName: row.product_name || null,
        skuCode: row.sku_code || null,
        imgUrl: row.img_url || null,
    };
}

/* ========== CRUD OPERATIONS - ORDER RETURNS ========== */

/**
 * Tạo một order return mới cùng với các items.
 * @param {object} data - Dữ liệu cho order return mới, bao gồm một mảng 'items'.
 * @returns {Promise<object>} Đối tượng order return vừa được tạo.
 */
async function createOrderReturn({ items = [], ...returnData }) {
    return withTransaction(async () => {
        const { orderId, createdBy, status = 'draft', evdUrl, note } = returnData;

        // Validate required fields
        if (!orderId || !createdBy || !evdUrl) {
            throw new Error('orderId, createdBy và evdUrl là bắt buộc');
        }

        // 1. Kiểm tra order tồn tại và chưa có return
        const orderCheckSql = `
            SELECT id FROM sales_orders WHERE id = $1
        `;
        const { rows: orderRows } = await query(orderCheckSql, [orderId]);
        if (orderRows.length === 0) {
            throw new Error('Order không tồn tại');
        }

        const existingReturnSql = `
            SELECT id FROM order_returns WHERE order_id = $1
        `;
        const { rows: existingRows } = await query(existingReturnSql, [orderId]);
        if (existingRows.length > 0) {
            throw new Error('Order này đã có đơn trả hàng');
        }

        // 2. Tạo order return
        const sqlReturn = `
            INSERT INTO order_returns (
                order_id, created_by, status, evd_url, note
            ) VALUES ($1, $2, $3, $4, $5) RETURNING id
        `;
        const paramsReturn = [orderId, createdBy, status, evdUrl, note];
        const { rows } = await query(sqlReturn, paramsReturn);
        const returnId = rows[0].id;

        // 3. Tạo các items nếu có
        if (items.length > 0) {
            await createReturnItems(returnId, items);
        }

        // 4. Lấy lại toàn bộ order return để trả về
        // DB triggers sẽ tự động tính toán total_amount
        return findOrderReturnById(returnId);
    });
}

/**
 * Tìm order return theo ID (có join với items, order, customer, user).
 * @param {string} id - UUID của order return.
 * @returns {Promise<object|null>} Đối tượng order return hoặc null.
 */
async function findOrderReturnById(id) {
    const sql = `
        SELECT ${ORDER_RETURN_FIELDS_WITH_ITEMS}
        FROM order_returns orr
        LEFT JOIN sales_orders so ON orr.order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN users u ON orr.created_by = u.id
        WHERE orr.id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [id]);
    return toOrderReturn(rows[0]);
}

/**
 * Tìm order return theo Order ID
 * @param {string} orderId - UUID của order.
 * @returns {Promise<object|null>} Đối tượng order return hoặc null.
 */
async function findOrderReturnByOrderId(orderId) {
    const sql = `
        SELECT ${ORDER_RETURN_FIELDS_WITH_ITEMS}
        FROM order_returns orr
        LEFT JOIN sales_orders so ON orr.order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN users u ON orr.created_by = u.id
        WHERE orr.order_id = $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [orderId]);
    return toOrderReturn(rows[0]);
}

/**
 * Cập nhật một order return, bao gồm cả các items.
 * @param {string} id - UUID của order return.
 * @param {object} payload - Dữ liệu cần cập nhật, có thể chứa mảng 'items'.
 * @returns {Promise<object>} Đối tượng order return sau khi cập nhật.
 */
async function updateOrderReturn(id, { items, ...payload }) {
    return withTransaction(async () => {
        // 1. Cập nhật các trường của order_returns
        const fields = [],
            params = [];
        const map = {
            status: 'status',
            evdUrl: 'evd_url',
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
            const sqlUpdateReturn = `UPDATE order_returns SET ${fields.join(', ')} WHERE id = $${params.length}`;
            await query(sqlUpdateReturn, params);
        }

        // 2. Xử lý các items nếu được cung cấp
        if (items !== undefined) {
            const existingItems = await findReturnItemsByReturnId(id);
            const existingItemsMap = new Map(existingItems.map((i) => [i.id, i]));
            const incomingItemsMap = new Map(items.filter((i) => i.id).map((i) => [i.id, i]));

            const toCreate = items.filter((i) => !i.id); // Item mới phải có { productId, qty, unitPrice }
            const toUpdate = items.filter((i) => i.id && existingItemsMap.has(i.id)); // Item cũ { id, qty, unitPrice }
            const toDeleteIds = existingItems
                .filter((i) => !incomingItemsMap.has(i.id))
                .map((i) => i.id);

            if (toDeleteIds.length > 0) {
                await deleteReturnItems(toDeleteIds);
            }
            if (toUpdate.length > 0) {
                await updateReturnItems(toUpdate);
            }
            if (toCreate.length > 0) {
                await createReturnItems(id, toCreate);
            }
        }

        // 3. Lấy lại dữ liệu
        // DB triggers sẽ tự động tính toán lại total_amount sau khi item thay đổi
        return findOrderReturnById(id);
    });
}

/**
 * Liệt kê các order returns (có hỗ trợ tìm kiếm, lọc và phân trang).
 * @param {object} options - Tùy chọn lọc và phân trang.
 * @returns {Promise<Array<object>>} Mảng các đối tượng order return.
 */
async function listOrderReturns({
    q,
    orderId,
    customerId,
    createdBy,
    status,
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
                so.order_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR c.code ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
                OR orr.note ILIKE $${params.length}
            )`);
        }

        // Lọc theo order
        if (orderId) {
            params.push(orderId);
            clauses.push(`orr.order_id = $${params.length}`);
        }

        // Lọc theo customer
        if (customerId) {
            params.push(customerId);
            clauses.push(`so.customer_id = $${params.length}`);
        }

        // Lọc theo người tạo
        if (createdBy) {
            params.push(createdBy);
            clauses.push(`orr.created_by = $${params.length}`);
        }

        // Lọc theo trạng thái
        if (status) {
            params.push(status);
            clauses.push(`orr.status = $${params.length}`);
        }

        // ✅ THÊM: Lọc theo người quản lý khách hàng (cho seller)
        if (managedBy) {
            params.push(managedBy);
            clauses.push(`c.managed_by = $${params.length}`);
        }

        // Lọc theo khoảng thời gian
        if (fromDate) {
            params.push(fromDate);
            clauses.push(`orr.created_at >= $${params.length}`);
        }
        if (toDate) {
            params.push(toDate);
            clauses.push(`orr.created_at <= $${params.length}`);
        }

        // Lọc theo khoảng số tiền
        if (minAmount !== undefined) {
            params.push(parseFloat(minAmount));
            clauses.push(`orr.total_amount >= $${params.length}`);
        }
        if (maxAmount !== undefined) {
            params.push(parseFloat(maxAmount));
            clauses.push(`orr.total_amount <= $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${ORDER_RETURN_FIELDS_WITH_ITEMS}
            FROM order_returns orr
            LEFT JOIN sales_orders so ON orr.order_id = so.id
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN users u ON orr.created_by = u.id
            ${where}
            ORDER BY orr.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toOrderReturn);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách order returns:', error.message);
        throw new Error('Không thể lấy danh sách order returns');
    }
}

/**
 * Đếm tổng số order returns, có thể kèm theo bộ lọc tìm kiếm.
 * @param {object} options - Tùy chọn lọc.
 * @returns {Promise<number>} Tổng số order returns.
 */
async function countOrderReturns({
    q,
    orderId,
    customerId,
    createdBy,
    status,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    managedBy, // ✅ THÊM parameter mới
} = {}) {
    try {
        const clauses = [];
        const params = [];

        // Same filter logic as listOrderReturns
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(`(
                so.order_no ILIKE $${params.length}
                OR c.name ILIKE $${params.length}
                OR c.code ILIKE $${params.length}
                OR u.full_name ILIKE $${params.length}
                OR orr.note ILIKE $${params.length}
            )`);
        }

        if (orderId) {
            params.push(orderId);
            clauses.push(`orr.order_id = $${params.length}`);
        }

        if (customerId) {
            params.push(customerId);
            clauses.push(`so.customer_id = $${params.length}`);
        }

        if (createdBy) {
            params.push(createdBy);
            clauses.push(`orr.created_by = $${params.length}`);
        }

        if (status) {
            params.push(status);
            clauses.push(`orr.status = $${params.length}`);
        }

        // ✅ THÊM: Lọc theo người quản lý khách hàng (cho seller)
        if (managedBy) {
            params.push(managedBy);
            clauses.push(`c.managed_by = $${params.length}`);
        }

        if (fromDate) {
            params.push(fromDate);
            clauses.push(`orr.created_at >= $${params.length}`);
        }
        if (toDate) {
            params.push(toDate);
            clauses.push(`orr.created_at <= $${params.length}`);
        }

        if (minAmount !== undefined) {
            params.push(parseFloat(minAmount));
            clauses.push(`orr.total_amount >= $${params.length}`);
        }
        if (maxAmount !== undefined) {
            params.push(parseFloat(maxAmount));
            clauses.push(`orr.total_amount <= $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT COUNT(DISTINCT orr.id) AS count
            FROM order_returns orr
            LEFT JOIN sales_orders so ON orr.order_id = so.id
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN users u ON orr.created_by = u.id
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm order returns:', error.message);
        throw new Error('Không thể đếm tổng số order returns');
    }
}

/**
 * Xóa một order return.
 * @param {string} id - UUID của order return.
 * @returns {Promise<boolean>} Trả về true nếu xóa thành công.
 */
async function deleteOrderReturn(id) {
    // Xóa order return sẽ tự động xóa các items (CASCADE)
    const sql = `DELETE FROM order_returns WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

/* ========== CRUD OPERATIONS - ORDER RETURN ITEMS ========== */

/**
 * Tạo nhiều return items cho một order return
 * @param {string} returnId - UUID của order return
 * @param {Array} items - Mảng các item { productId, qty, unitPrice }
 * @returns {Promise<Array>} - Mảng các item ID vừa tạo
 */
async function createReturnItems(returnId, items) {
    if (!items || items.length === 0) {
        return [];
    }

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    items.forEach((item) => {
        const { productId, qty, unitPrice } = item;
        values.push(returnId, productId, qty, unitPrice);
        placeholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`
        );
        paramIndex += 4;
    });

    const sql = `
        INSERT INTO order_return_items (return_id, product_id, qty, unit_price)
        VALUES ${placeholders.join(', ')}
        RETURNING id
    `;

    const { rows } = await query(sql, values);
    return rows.map((row) => row.id);
}

/**
 * Cập nhật nhiều return items
 * @param {Array} items - Mảng các item { id, qty, unitPrice }
 * @returns {Promise<void>}
 */
async function updateReturnItems(items) {
    const promises = items.map(async (item) => {
        const { id, qty, unitPrice } = item;
        const sql = `
            UPDATE order_return_items 
            SET qty = $1, unit_price = $2
            WHERE id = $3
        `;
        return query(sql, [qty, unitPrice, id]);
    });

    await Promise.all(promises);
}

/**
 * Xóa nhiều return items
 * @param {Array} itemIds - Mảng các item ID
 * @returns {Promise<void>}
 */
async function deleteReturnItems(itemIds) {
    if (!itemIds || itemIds.length === 0) {
        return;
    }

    const placeholders = itemIds.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `DELETE FROM order_return_items WHERE id IN (${placeholders})`;
    await query(sql, itemIds);
}

/**
 * Tìm tất cả items của một order return
 * @param {string} returnId - UUID của order return
 * @returns {Promise<Array>} - Mảng các item
 */
async function findReturnItemsByReturnId(returnId) {
    const sql = `
        SELECT 
            ori.id, ori.return_id, ori.product_id, ori.qty, ori.unit_price,
            p.name AS product_name, p.sku_code, p.img_url
        FROM order_return_items ori
        LEFT JOIN products p ON ori.product_id = p.id
        WHERE ori.return_id = $1
        ORDER BY p.name
    `;
    const { rows } = await query(sql, [returnId]);
    return rows.map(toOrderReturnItem);
}

/* ========== SPECIAL FUNCTIONS ========== */

/**
 * Lấy thống kê order returns theo trạng thái
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} - Thống kê theo status
 */
async function getOrderReturnStatsByStatus({ customerId, createdBy, fromDate, toDate } = {}) {
    try {
        const clauses = [];
        const params = [];

        if (customerId) {
            params.push(customerId);
            clauses.push(`so.customer_id = $${params.length}`);
        }

        if (createdBy) {
            params.push(createdBy);
            clauses.push(`orr.created_by = $${params.length}`);
        }

        if (fromDate) {
            params.push(fromDate);
            clauses.push(`orr.created_at >= $${params.length}`);
        }

        if (toDate) {
            params.push(toDate);
            clauses.push(`orr.created_at <= $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT 
                orr.status,
                COUNT(*) as count,
                SUM(orr.total_amount) as total_amount,
                AVG(orr.total_amount) as avg_amount
            FROM order_returns orr
            LEFT JOIN sales_orders so ON orr.order_id = so.id
            ${where}
            GROUP BY orr.status
            ORDER BY total_amount DESC
        `;

        const { rows } = await query(sql, params);
        return rows.map((row) => ({
            status: row.status,
            count: parseInt(row.count, 10),
            totalAmount: parseFloat(row.total_amount) || 0,
            avgAmount: parseFloat(row.avg_amount) || 0,
        }));
    } catch (error) {
        console.error('Lỗi khi lấy thống kê order returns:', error.message);
        throw new Error('Không thể lấy thống kê order returns');
    }
}

/**
 * Kiểm tra xem order có thể tạo return không
 * @param {string} orderId - UUID của order
 * @returns {Promise<{canReturn: boolean, message: string}>}
 */
async function checkOrderCanReturn(orderId) {
    try {
        // 1. Kiểm tra order tồn tại
        const orderSql = `
            SELECT id, status FROM sales_orders WHERE id = $1
        `;
        const { rows: orderRows } = await query(orderSql, [orderId]);

        if (orderRows.length === 0) {
            return { canReturn: false, message: 'Order không tồn tại' };
        }

        const order = orderRows[0];

        // 2. Kiểm tra trạng thái order (chỉ cho phép return nếu đã delivered hoặc completed)
        const allowedStatuses = ['delivered', 'completed'];
        if (!allowedStatuses.includes(order.status)) {
            return {
                canReturn: false,
                message: `Order phải ở trạng thái 'delivered' hoặc 'completed' để có thể trả hàng. Trạng thái hiện tại: ${order.status}`,
            };
        }

        // 3. Kiểm tra đã có return chưa
        const returnSql = `
            SELECT id FROM order_returns WHERE order_id = $1
        `;
        const { rows: returnRows } = await query(returnSql, [orderId]);

        if (returnRows.length > 0) {
            return { canReturn: false, message: 'Order này đã có đơn trả hàng' };
        }

        // 4. Kiểm tra có invoice không (để validate giá trả)
        const invoiceSql = `
            SELECT id FROM sales_invoices WHERE order_id = $1
        `;
        const { rows: invoiceRows } = await query(invoiceSql, [orderId]);

        if (invoiceRows.length === 0) {
            return {
                canReturn: false,
                message: 'Order chưa có hóa đơn, không thể tạo đơn trả hàng',
            };
        }

        return { canReturn: true, message: 'Order có thể tạo đơn trả hàng' };
    } catch (error) {
        console.error('Lỗi khi kiểm tra order return:', error.message);
        throw new Error('Không thể kiểm tra order return');
    }
}

/* ========== EXPORTS ========== */

module.exports = {
    // Order Return CRUD
    createOrderReturn,
    findOrderReturnById,
    findOrderReturnByOrderId,
    updateOrderReturn,
    listOrderReturns,
    countOrderReturns,
    deleteOrderReturn,

    // Order Return Item CRUD
    createReturnItems,
    updateReturnItems,
    deleteReturnItems,
    findReturnItemsByReturnId,

    // Special functions
    getOrderReturnStatsByStatus,
    checkOrderCanReturn,

    // Utilities
    generateReturnRef,
    toOrderReturn,
    toOrderReturnItem,
};
