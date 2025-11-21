const { query } = require('@config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isoWeek = require('dayjs/plugin/isoWeek');

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

/* =======================================================
   🔹 Admin Dashboard Statistics
   ======================================================= */

const countUsers = async () => {
    const sql = `SELECT COUNT(*) AS total_users FROM users`;
    const result = await query(sql);
    return parseInt(result.rows[0]?.total_users || 0, 10);
};

const countOrders = async () => {
    const sql = `SELECT COUNT(*) AS total_orders FROM sales_orders`;
    const result = await query(sql);
    return parseInt(result.rows[0]?.total_orders || 0, 10);
};

const countSuppliers = async () => {
    const sql = `SELECT COUNT(*) AS total_suppliers FROM suppliers`;
    const result = await query(sql);
    return parseInt(result.rows[0]?.total_suppliers || 0, 10);
};

const countProducts = async () => {
    const sql = `SELECT COUNT(*) AS total_products FROM products`;
    const result = await query(sql);
    return parseInt(result.rows[0]?.total_products || 0, 10);
};

const countCustomers = async () => {
    const sql = `SELECT COUNT(*) AS total_customers FROM customers`;
    const result = await query(sql);
    return parseInt(result.rows[0]?.total_customers || 0, 10);
};

const countSupplierTransactions = async () => {
    const sql = `
        SELECT 
            SUM(CASE WHEN type = 'in' THEN 1 ELSE 0 END) AS total_in,
            SUM(CASE WHEN type = 'out' THEN 1 ELSE 0 END) AS total_out
        FROM supplier_transactions
    `;

    const result = await query(sql);
    const row = result.rows[0];

    return {
        totalIn: parseInt(row?.total_in || 0, 10),
        totalOut: parseInt(row?.total_out || 0, 10),
    };
};

const getAdminStats = async (req, res) => {
    try {
        // Execute multiple counts in parallel
        const [
            totalUsers,
            totalOrders,
            totalSuppliers,
            totalProducts,
            totalCustomers,
            supplierTransactions,
        ] = await Promise.all([
            countUsers(),
            countOrders(),
            countSuppliers(),
            countProducts(),
            countCustomers(),
            countSupplierTransactions(),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                total_users: totalUsers,
                total_orders: totalOrders,
                total_products: totalProducts,
                total_suppliers: totalSuppliers,
                total_customers: totalCustomers,
                supplier_transactions: supplierTransactions,
            },
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get dashboard statistics',
            error: error.message,
        });
    }
};

const getTopSellingProducts = async () => {
    const sql = `
        SELECT 
            p.id,
            p.name AS product_name,
            p.sku_code,
            p.img_url,
            pc.id AS category_id,
            pc.name AS category_name,
            COALESCE(SUM(soi.qty), 0) AS total_sold,
            COUNT(DISTINCT soi.order_id) AS order_count
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        LEFT JOIN sales_order_items soi ON p.id = soi.product_id
        GROUP BY p.id, p.name, p.sku_code, p.img_url, pc.id, pc.name
        ORDER BY total_sold DESC
        LIMIT 10
    `;
    const result = await query(sql);
    return result.rows.map((row) => ({
        id: row.id,
        productName: row.product_name,
        skuCode: row.sku_code,
        imgUrl: row.img_url,
        categoryId: row.category_id,
        categoryName: row.category_name,
        totalSold: parseFloat(row.total_sold),
        orderCount: parseInt(row.order_count, 10),
    }));
};

const countOrdersByGroupedStatus = async () => {
    const sql = `
        SELECT 
            status,
            COUNT(*) AS count
        FROM sales_orders
        GROUP BY status
    `;
    const result = await query(sql);

    // Group statuses into simplified categories
    const grouped = {
        draft: 0, // Nháp
        pending: 0, // Chờ xử lý
        preparing: 0, // Đang chuẩn bị
        shipping: 0, // Đang giao hàng
        completed: 0, // Hoàn thành
        cancelled: 0, // Đã hủy
    };

    result.rows.forEach((row) => {
        const status = row.status;
        const count = parseInt(row.count, 10);

        // Map detailed status to grouped status
        switch (status) {
            case 'draft':
                grouped.draft += count;
                break;
            case 'confirmed':
                grouped.pending += count;
                break;
            case 'assigned_preparation':
            case 'pending_preparation':
            case 'prepared':
                grouped.preparing += count;
                break;
            case 'delivering':
            case 'delivered':
                grouped.shipping += count;
                break;
            case 'completed':
                grouped.completed += count;
                break;
            case 'cancelled':
                grouped.cancelled += count;
                break;
            default:
                // Handle unknown statuses
                break;
        }
    });

    return grouped;
};

const countOrdersThisWeek = async () => {
    // Get start and end of current week (Monday to Sunday)
    const startOfWeek = dayjs().tz('Asia/Ho_Chi_Minh').startOf('isoWeek');
    const endOfWeek = dayjs().tz('Asia/Ho_Chi_Minh').endOf('isoWeek');

    const sql = `
        SELECT 
            DATE(created_at) AS order_date,
            COUNT(*) AS count
        FROM sales_orders
        WHERE created_at >= $1 
          AND created_at <= $2
        GROUP BY DATE(created_at)
        ORDER BY order_date
    `;

    const result = await query(sql, [
        startOfWeek.format('YYYY-MM-DD HH:mm:ssZ'),
        endOfWeek.format('YYYY-MM-DD HH:mm:ssZ'),
    ]);

    // Create a map of existing counts
    const countsMap = {};
    result.rows.forEach((row) => {
        // Format date to YYYY-MM-DD for comparison
        const dateStr = dayjs(row.order_date).format('YYYY-MM-DD');
        countsMap[dateStr] = parseInt(row.count, 10);
    });

    // Generate all 7 days of the week with counts (0 if no orders)
    const weekDays = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let i = 0; i < 7; i++) {
        const currentDay = startOfWeek.add(i, 'day');
        const dateStr = currentDay.format('YYYY-MM-DD');

        weekDays.push({
            date: dateStr,
            dayName: dayNames[i],
            count: countsMap[dateStr] || 0,
        });
    }

    return weekDays;
};

const getOrdersThisWeek = async () => {
    // Get start and end of current week (Monday to Sunday)
    const startOfWeek = dayjs().tz('Asia/Ho_Chi_Minh').startOf('isoWeek');
    const endOfWeek = dayjs().tz('Asia/Ho_Chi_Minh').endOf('isoWeek');

    const sql = `
        SELECT 
            so.id,
            so.order_no,
            so.created_at,
            so.status,
            c.name AS customer_name,
            u.full_name AS seller_name,
            si.expected_receivables,
            si.total AS invoice_total
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN users u ON so.seller_id = u.id AND u.role = 'seller'
        LEFT JOIN sales_invoices si ON so.id = si.order_id
        WHERE so.created_at >= $1 
          AND so.created_at <= $2
        ORDER BY so.created_at DESC
    `;

    const result = await query(sql, [
        startOfWeek.format('YYYY-MM-DD HH:mm:ssZ'),
        endOfWeek.format('YYYY-MM-DD HH:mm:ssZ'),
    ]);

    // Format the response
    return result.rows.map((row) => ({
        id: row.id,
        orderNo: row.order_no,
        createdAt: dayjs.utc(row.created_at).tz('Asia/Ho_Chi_Minh').format(),
        status: row.status,
        customerName: row.customer_name || 'N/A',
        sellerName: row.seller_name || 'N/A',
        expectedReceivables: row.expected_receivables ? parseFloat(row.expected_receivables) : 0,
        invoiceTotal: row.invoice_total ? parseFloat(row.invoice_total) : 0,
    }));
};

const getTotalRevenue = async (req, res) => {
    try {
        const { filter = 'year', week, month, year } = req.query;

        const f = ['week', 'month', 'year'].includes(filter) ? filter : 'year';

        // Default year
        const selectedYear = year ? parseInt(year) : dayjs().year();

        let start, end;

        // ======================
        //        FILTER WEEK
        // ======================
        if (f === 'week') {
            if (!week || !year) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing week or year for filter=week',
                });
            }

            const w = parseInt(week);
            start = dayjs().tz('Asia/Ho_Chi_Minh').year(selectedYear).isoWeek(w).startOf('isoWeek');
            end = dayjs().tz('Asia/Ho_Chi_Minh').year(selectedYear).isoWeek(w).endOf('isoWeek');
        }

        // ======================
        //       FILTER MONTH
        // ======================
        else if (f === 'month') {
            if (!month || !year) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing month or year for filter=month',
                });
            }

            const m = parseInt(month) - 1; // month = 11 → index 10

            start = dayjs().tz('Asia/Ho_Chi_Minh').year(selectedYear).month(m).startOf('month');
            end = dayjs().tz('Asia/Ho_Chi_Minh').year(selectedYear).month(m).endOf('month');
        }

        // ======================
        //        FILTER YEAR
        // ======================
        else {
            start = dayjs().tz('Asia/Ho_Chi_Minh').year(selectedYear).startOf('year');
            end = dayjs().tz('Asia/Ho_Chi_Minh').year(selectedYear).endOf('year');
        }

        // ======================
        //       BUCKET LOGIC
        // ======================
        let bucketExpr = '';
        if (f === 'week') bucketExpr = `DATE_TRUNC('day', received_at)`;
        if (f === 'month') bucketExpr = `DATE_TRUNC('week', received_at)`;
        if (f === 'year') bucketExpr = `DATE_TRUNC('month', received_at)`;

        // ======================
        //         QUERY
        // ======================
        const sql = `
            SELECT 
                ${bucketExpr} AS bucket,
                SUM(amount) AS total_amount
            FROM payments
            WHERE direction = 'in'
              AND received_at BETWEEN $1 AND $2
            GROUP BY bucket
            ORDER BY bucket;
        `;

        const rows = await query(sql, [start.utc().toDate(), end.utc().toDate()]);

        const data = [];

        // ======================
        //  FORMAT: WEEK → 7 ngày
        // ======================
        if (f === 'week') {
            for (let i = 0; i < 7; i++) {
                const day = start.add(i, 'day');

                const match = rows.rows.find((r) =>
                    dayjs.utc(r.bucket).tz('Asia/Ho_Chi_Minh').isSame(day, 'day')
                );

                data.push({
                    label: `D${i + 1}`,
                    date: day.format('YYYY-MM-DD'),
                    revenue: match ? parseFloat(match.total_amount) : 0,
                });
            }
        }

        // ======================
        // FORMAT: MONTH → 4–5 tuần
        // ======================
        else if (f === 'month') {
            let currentWeek = start.clone().startOf('isoWeek');
            const monthEnd = end.clone();
            let weekIndex = 0;

            while (currentWeek.isBefore(monthEnd) || currentWeek.isSame(monthEnd, 'day')) {
                const match = rows.rows.find((r) => {
                    const bucketDate = dayjs.utc(r.bucket).tz('Asia/Ho_Chi_Minh');
                    return bucketDate.isSame(currentWeek, 'isoWeek');
                });

                data.push({
                    label: `W${weekIndex + 1}`,
                    weekStart: currentWeek.format('YYYY-MM-DD'),
                    revenue: match ? parseFloat(match.total_amount) : 0,
                });

                currentWeek = currentWeek.add(1, 'week');
                weekIndex++;

                // Safety check to prevent infinite loop
                if (weekIndex > 6) break;
            }
        }

        // ======================
        // FORMAT: YEAR → 12 tháng
        // ======================
        else {
            for (let i = 0; i < 12; i++) {
                const monthStart = dayjs()
                    .tz('Asia/Ho_Chi_Minh')
                    .year(selectedYear)
                    .month(i)
                    .startOf('month');

                const match = rows.rows.find((r) => {
                    const bucketDate = dayjs.utc(r.bucket).tz('Asia/Ho_Chi_Minh');
                    return bucketDate.year() === selectedYear && bucketDate.month() === i;
                });

                data.push({
                    label: `T${i + 1}`,
                    month: monthStart.format('YYYY-MM'),
                    revenue: match ? parseFloat(match.total_amount) : 0,
                });
            }
        }

        return res.status(200).json({
            success: true,
            filter: f,
            year: selectedYear,
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD'),
            data,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* =======================================================
   🔹 Manager Dashboard Statistics
   ======================================================= */

const countOrderProcessing = async () => {
    const sql = `
        SELECT COUNT(*) AS count
        FROM sales_orders
        WHERE status NOT IN ('cancelled', 'completed', 'draft')
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};

const countOrderCompleted = async () => {
    const sql = `
        SELECT COUNT(*) AS count
        FROM sales_orders
        WHERE status = 'completed'
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};

const countOrderCancelled = async () => {
    const sql = `
        SELECT COUNT(*) AS count
        FROM sales_orders
        WHERE status = 'cancelled'
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};

const countSupplierReturn = async () => {
    const sql = `
        SELECT COUNT(*) AS count
        FROM supplier_transactions 
        WHERE type in ('out')
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};

const countSupplierInput = async () => {
    const sql = `
        SELECT COUNT(*) AS count
        FROM supplier_transactions
        WHERE type in ('in')
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};

const countTotalInventory = async () => {
    const sql = `
        SELECT COALESCE(SUM(qty_on_hand), 0) AS total_stock
        FROM inventory_lots
        WHERE expiry_date > NOW();
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.total_stock || 0, 10);
};

const getManagerStats = async (req, res) => {
    try {
        // Execute multiple counts in parallel
        const [
            processingOrders,
            completedOrders,
            cancelledOrders,
            supplierReturn,
            supplierInput,
            totalInventory,
        ] = await Promise.all([
            countOrderProcessing(),
            countOrderCompleted(),
            countOrderCancelled(),
            countSupplierReturn(),
            countSupplierInput(),
            countTotalInventory(),
        ]);

        // Send the response
        return res.status(200).json({
            success: true,
            data: {
                processingOrders,
                completedOrders,
                cancelledOrders,
                supplierReturn,
                supplierInput,
                totalInventory,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getOrderProcessingProgress = async () => {
    const sql = `
    SELECT
    status,
        COUNT(*) AS count
        FROM sales_orders
        GROUP BY status
        ORDER BY count DESC
        `;

    const result = await query(sql);

    return result.rows.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
        percentage: parseFloat(row.percentage),
    }));
};

const getProductInStock = async () => {
    const sql = `
        SELECT
    p.sku_code                                AS sku,
    p.name                                    AS name,
    pc.name                                   AS category,
    string_agg(DISTINCT COALESCE(d.name, d.code), ', ') AS warehouses,
    TO_CHAR(
        MIN(COALESCE(st.trans_date::timestamp, st.created_at)),
        'YYYY-MM-DD'
    )                                         AS received_date,
    p.status                                  AS status,
    COALESCE(SUM(il.qty_on_hand), 0)          AS stock,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'batch',    il.lot_no,
                'warehouse',COALESCE(d.name, d.code),
                'quantity', il.qty_on_hand,
                'expiry',   TO_CHAR(il.expiry_date, 'YYYY-MM-DD')
            )
            ORDER BY il.expiry_date, il.lot_no
        ),
        '[]'::jsonb
    )                                         AS batches
FROM inventory_lots il
JOIN products p               ON p.id = il.product_id
LEFT JOIN product_categories pc ON pc.id = p.category_id
LEFT JOIN departments d       ON d.id = il.department_id
LEFT JOIN supplier_transaction_items sti ON sti.lot_id = il.id
LEFT JOIN supplier_transactions st
       ON st.id = sti.trans_id
      AND st.type = 'in'
WHERE il.qty_on_hand > 0
GROUP BY p.id, p.sku_code, p.name, p.status, pc.id, pc.name
ORDER BY p.name;
    `;
    const result = await query(sql);

    return result.rows.map((row) => ({
        sku: row.sku,
        name: row.name,
        category: row.category,
        warehouses: row.warehouses,
        receivedDate: row.received_date,
        status: row.status,
        stock: parseInt(row.stock, 10),
        batches: row.batches.map((batch) => ({
            batch: batch.batch,
            quantity: parseInt(batch.quantity, 10),
            expiry: batch.expiry,
            warehouse: batch.warehouse,
        })),
    }));
};

const getSupplierInOut = async () => {
    const sql = `
        SELECT
    s.id,
    s.code,
    s.name,
    COALESCE(SUM(st.total_amount), 0)                                   AS total_price,
    jsonb_agg(
        jsonb_build_object(
            'transaction_id', st.id,
            'doc_no',         st.doc_no,
            'type',           st.type,
            'status',         st.status,
            'date',           TO_CHAR(COALESCE(st.trans_date::timestamp, st.created_at), 'YYYY-MM-DD'),
            'amount',         st.total_amount
        )
        ORDER BY COALESCE(st.trans_date, st.created_at) DESC
    ) FILTER (WHERE st.id IS NOT NULL)                                   AS transactions
FROM suppliers s
LEFT JOIN supplier_transactions st ON st.supplier_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY s.name;
`;
    const result = await query(sql);

    return result.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        totalPrice: parseFloat(row.total_price),
        transactions: (row.transactions || []).map((transaction) => ({
            transactionId: transaction.transaction_id,
            docNo: transaction.doc_no,
            type: transaction.type,
            status: transaction.status,
            date: transaction.date,
            amount: parseFloat(transaction.amount),
        })),
    }));
};

/* =======================================================
   🔹 Supervisor Picker Dashboard Statistics
   ======================================================= */
const countTotalOrderAssigned = async () => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM sales_orders
      WHERE status = 'pending_preparation'
  `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};


const countTotalOrderProcessing = async () => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM sales_orders
      WHERE status = 'assigned_preparation'
  `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};


const countTotalOrderConfirmed = async () => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM sales_orders
      WHERE status = 'confirmed'
  `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};

const countTotalOrderCancelled = async () => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM sales_orders
      WHERE status = 'cancelled'
  `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};



const countTotalPicker = async () => {
    const sql = `
        SELECT COUNT(*) AS total_picker FROM users
        WHERE role = 'picker'
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.total_picker || 0, 10);
};

const getSupervisorPickerStats = async (req, res) => {
    try {
        const [
            totalOrderAssigned,
            totalOrderProcessing,
            totalOrderConfirmed,
            totalPickers,
            totalOrderCancelled,
        ] = await Promise.all([
            countTotalOrderAssigned(),
            countTotalOrderProcessing(),
            countTotalOrderConfirmed(),
            countTotalPicker(),
            countTotalOrderCancelled(),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalOrderAssigned,
                totalOrderProcessing,
                totalOrderConfirmed,
                totalPickers,
                totalOrderCancelled,
            },
        });
    } catch (error) {
        return res
            .status(500)
            .json({ success: false, message: error.message });
    }
};


const getOrderProcessing = async (supervisorId) => {
    const sql = `
        SELECT
            status,
            COUNT(*) AS count
        FROM preparation_tasks
        WHERE supervisor_id = $1
        GROUP BY status
        ORDER BY count DESC
    `;

    const result = await query(sql, [supervisorId]);

    return result.rows.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
    }));
};

const getOrderPrepared = async (supervisorId) => {
    const sql = `
        SELECT
        so.order_no,
        COALESCE(pt.created_at, so.created_at) AS task_time,
        COALESCE(qty_summary.total_qty, 0) AS quantity_product,
        so.status,
        picker.full_name   AS picker,
        supervisor.full_name AS sup_picker,
        (
            SELECT COALESCE(
                json_agg(
                    json_build_object(
                        'productId', soi.product_id,
                        'skuCode', p.sku_code,
                        'imgURL', p.img_url,
                        'mainUnit', p.main_unit,
                        'productName', p.name,
                        'quantity', soi.qty
                    )
                    ORDER BY soi.id
                ),
                '[]'::json
            )
            FROM sales_order_items soi
            LEFT JOIN products p ON p.id = soi.product_id
            WHERE soi.order_id = so.id
        ) AS products
    FROM sales_orders AS so
    LEFT JOIN preparation_tasks AS pt
        ON pt.order_id = so.id
    LEFT JOIN (
        SELECT order_id, SUM(qty) AS total_qty
        FROM sales_order_items
        GROUP BY order_id
    ) AS qty_summary
       ON qty_summary.order_id = so.id
    LEFT JOIN users AS picker
          ON picker.id = pt.packer_id
    LEFT JOIN users AS supervisor
        ON supervisor.id = pt.supervisor_id
    WHERE so.status IN ('draft','pending_preparation','assigned_preparation','confirmed')
      AND (pt.supervisor_id = $1 OR pt.supervisor_id IS NULL)
    ORDER BY COALESCE(pt.created_at, so.created_at) DESC;
        `;
    const result = await query(sql, [supervisorId]);
    return result.rows.map((row) => ({
        orderNo: row.order_no,
        taskTime: row.task_time,
        quantityProduct: parseInt(row.quantity_product, 10) || 0,
        status: row.status,
        picker: row.picker,
        supPicker: row.sup_picker,
        products: row.products || [],
    }));
};

const getCancellerOrderSupPicker = async (supervisorId) => {
    const sql = `
        SELECT 
            pt.id AS task_id,
            so.order_no AS order_no,
            COALESCE(SUM(soi.qty), 0) AS total_quantity,
            COUNT(DISTINCT soi.id) AS total_items,
            pt.status AS task_status,
            pt.note AS cancel_reason,
            su.full_name AS supervisor_name,
            pa.full_name AS packer_name,
            pt.deadline,
            pt.created_at,
            pt.started_at,
            pt.completed_at
        FROM preparation_tasks pt
        INNER JOIN sales_orders so ON pt.order_id = so.id
        LEFT JOIN sales_order_items soi ON so.id = soi.order_id
        LEFT JOIN users su ON pt.supervisor_id = su.id
        LEFT JOIN users pa ON pt.packer_id = pa.id
        WHERE pt.status = 'cancelled'
          AND pt.supervisor_id = $1
        GROUP BY 
            pt.id, 
            so.order_no, 
            pt.status, 
            pt.note, 
            su.full_name, 
            pa.full_name,
            pt.deadline, 
            pt.created_at, 
            pt.started_at, 
            pt.completed_at
        ORDER BY pt.created_at DESC;
    `;

    const result = await query(sql, [supervisorId]);

    return result.rows.map(row => ({
        taskId: row.task_id,
        orderNo: row.order_no,
        totalQuantity: row.total_quantity,
        totalItems: parseInt(row.total_items, 10),
        taskStatus: row.task_status,
        cancelReason: row.cancel_reason,
        supervisorName: row.supervisor_name,
        pickerName: row.packer_name,
        deadline: row.deadline,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at
    }));
};

const getPickerProgress = async (supervisorId) => {
    const sql = `
        SELECT
            pt.packer_id,
            u.full_name AS picker_name,
            COUNT(*) AS total_tasks,
            COUNT(*) FILTER (WHERE pt.status = 'completed') AS completed,
            COUNT(*) FILTER (WHERE pt.status = 'in_progress') AS in_progress,
            COUNT(*) FILTER (WHERE pt.status = 'assigned') AS assigned,
            COUNT(*) FILTER (WHERE pt.status = 'pending_review') AS pending_review,
            COUNT(*) FILTER (WHERE pt.status = 'cancelled') AS cancelled,
            AVG(
                EXTRACT(EPOCH FROM (pt.completed_at - pt.started_at))
            ) FILTER (
                WHERE pt.status = 'completed'
                  AND pt.completed_at IS NOT NULL
                  AND pt.started_at IS NOT NULL
            ) AS avg_duration_seconds
        FROM preparation_tasks pt
        LEFT JOIN users u ON pt.packer_id = u.id
        WHERE pt.supervisor_id = $1
          AND pt.packer_id IS NOT NULL
        GROUP BY pt.packer_id, u.full_name
        ORDER BY completed DESC, total_tasks DESC;`
        ;

    const { rows } = await query(sql, [supervisorId]);

    return rows.map((row) => {
        const totalTasks = parseInt(row.total_tasks || 0, 10);
        const completed = parseInt(row.completed || 0, 10);
        const inProgress = parseInt(row.in_progress || 0, 10);
        const assigned = parseInt(row.assigned || 0, 10);
        const pendingReview = parseInt(row.pending_review || 0, 10);
        const cancelled = parseInt(row.cancelled || 0, 10);
        const avgDurationSeconds =
            row.avg_duration_seconds !== null && row.avg_duration_seconds !== undefined
                ? parseFloat(row.avg_duration_seconds)
                : null;
        const completionRate = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;

        return {
            pickerId: row.packer_id,
            pickerName: row.picker_name || '-',
            totalTasks,
            completed,
            inProgress,
            assigned,
            pendingReview,
            cancelled,
            completionRate,
            avgDurationSeconds,
            avgDurationMinutes: avgDurationSeconds !== null ? avgDurationSeconds / 60 : null,
        };
    });
};


/* =======================================================
   🔹 Picker Dashboard Statistics
   ======================================================= */
const getPickerStats = async (pickerId) => {
    const sql = `
        SELECT
            status,
            COUNT(*) AS count
        FROM preparation_tasks
        WHERE packer_id = $1
        GROUP BY status
        ORDER BY count DESC
    `;

    const result = await query(sql, [pickerId]);

    return result.rows.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
    }));
};

const getOrderAssigned = async (pickerId) => {
    const sql = `
        SELECT 
    pt.id AS task_id,
    so.order_no AS order_no,
    COALESCE(SUM(soi.qty), 0) AS total_quantity,
    COUNT(DISTINCT soi.id) AS total_items,
    pt.status AS task_status,
    pt.note AS cancel_reason,
    su.full_name AS supervisor_name,
    pt.deadline,
    pt.created_at,
    pt.started_at,
    pt.completed_at,
    pa.full_name AS packer_name
FROM preparation_tasks pt
INNER JOIN sales_orders so ON pt.order_id = so.id
LEFT JOIN sales_order_items soi ON so.id = soi.order_id
LEFT JOIN users su ON pt.supervisor_id = su.id
LEFT JOIN users pa ON pt.packer_id = pa.id
WHERE pt.packer_id = $1
GROUP BY pt.id, so.order_no, so.items_count, pt.status, pt.note, su.full_name, pt.deadline, 
         pt.created_at, pt.started_at, pt.completed_at, pa.full_name
ORDER BY pt.created_at DESC;
`;
    const result = await query(sql, [pickerId]);

    return result.rows.map((row) => ({
        taskId: row.task_id,
        orderNo: row.order_no,
        totalQuantity: row.total_quantity,
        totalItems: parseInt(row.total_items, 10),
        taskStatus: row.task_status,
        cancelReason: row.cancel_reason,
        supervisorName: row.supervisor_name,
        packerName: row.packer_name,
        deadline: row.deadline,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
    }));
};

const getCancellerOrders = async (pickerId) => {
    const sql = `
        SELECT COUNT(*) AS count
        FROM preparation_tasks
        WHERE status = 'cancelled'
          AND packer_id = $1
`;
    const result = await query(sql, [pickerId]);
    return parseInt(result.rows[0]?.count || 0, 10);
};

/* =======================================================
   🔹 Supervisor Shipper Dashboard Statistics
   ======================================================= */



/* =======================================================
   🔹 Seller Dashboard Statistics
   ======================================================= */
const getSellerOrder = async (sellerId) => {
    const sql = `
        SELECT
            so.seller_id,
            u.full_name AS seller_name,
            COUNT(*) FILTER (
                WHERE so.status NOT IN ('draft','completed','cancelled') OR so.status IS NULL
            ) AS processing_orders,
            COUNT(*) FILTER (WHERE so.status = 'completed') AS completed_orders,
            COUNT(*) FILTER (WHERE so.status = 'cancelled') AS cancelled_orders,
            COUNT(*) FILTER (WHERE so.status = 'draft') AS draft_orders,
            COUNT(*) AS total_orders
        FROM sales_orders AS so
        LEFT JOIN users AS u ON u.id = so.seller_id
        WHERE so.seller_id = $1
        GROUP BY so.seller_id, u.full_name;
    `;

    const result = await query(sql, [sellerId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        // sellerId: row.seller_id,
        // sellerName: row.seller_name,
        processingOrders: parseInt(row.processing_orders, 10),
        completedOrders: parseInt(row.completed_orders, 10),
        cancelledOrders: parseInt(row.cancelled_orders, 10),
        draftOrders: parseInt(row.draft_orders, 10),
        totalOrders: parseInt(row.total_orders, 10),
    };
};

const getCustomerBySeller = async (sellerId) => {
    const sql = `
        SELECT
            u.id AS seller_id,
            u.full_name AS seller_name,
            COUNT(c.id) AS total_customers
        FROM users AS u
        LEFT JOIN customers AS c ON c.managed_by = u.id
        WHERE u.role = 'seller' AND u.id = $1
        GROUP BY u.id, u.full_name;
    `;
    const result = await query(sql, [sellerId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        // sellerId: row.seller_id,
        // sellerName: row.seller_name,
        totalCustomers: parseInt(row.total_customers, 10),
    };
};

const getSellerStats = async (req, res) => {
    try {
        const sellerId = req.user.id; // Lấy seller_id từ token
        const [sellerOrders, customerBySeller] = await Promise.all([
            getSellerOrder(sellerId),
            getCustomerBySeller(sellerId),
        ]);
        return res.status(200).json({
            success: true,
            data: {
                sellerOrders,
                customerBySeller,
            },
        });
    } catch (error) {
        console.error('Error getting seller stats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getTopSellerProducts = async (sellerId) => {
    const sql = `
    SELECT 
    p.id,
    p.name AS product_name,
    p.sku_code,
    p.img_url,
    pc.id AS category_id,
    pc.name AS category_name,
    COALESCE(SUM(soi.qty), 0) AS total_sold,
    COUNT(DISTINCT so.id) AS order_count
FROM products p
LEFT JOIN product_categories pc 
    ON p.category_id = pc.id
LEFT JOIN sales_order_items soi 
    ON p.id = soi.product_id
LEFT JOIN sales_orders so
    ON soi.order_id = so.id
WHERE so.seller_id = $1   
GROUP BY 
    p.id, p.name, p.sku_code, p.img_url,
    pc.id, pc.name
ORDER BY total_sold DESC
LIMIT 10;
`;
    const result = await query(sql, [sellerId]);
    return result.rows.map((row) => ({
        id: row.id,
        productName: row.product_name,
        skuCode: row.sku_code,
        imgUrl: row.img_url,
        categoryId: row.category_id,
        categoryName: row.category_name,
        totalSold: parseInt(row.total_sold, 10),
        orderCount: parseInt(row.order_count, 10),
    }));
};

const getCustomerDetailBySeller = async (sellerId) => {
    const sql = `
      SELECT
          u.id AS seller_id,
          u.full_name AS seller_name,
          c.id AS customer_id,
          c.code AS customer_code,
          c.name AS customer_name,
          c.phone,
          c.email,
          c.address,
          c.tax_code
      FROM users AS u
      LEFT JOIN customers AS c ON c.managed_by = u.id
      WHERE u.role = 'seller' AND u.id = $1
      ORDER BY c.created_at DESC;
  `;

    const result = await query(sql, [sellerId]);

    if (result.rows.length === 0) return { sellerId, sellerName: null, customers: [] };

    return {
        sellerId: result.rows[0].seller_id,
        sellerName: result.rows[0].seller_name,
        customers: result.rows.map(r => ({
            customerId: r.customer_id,
            customerCode: r.customer_code,
            customerName: r.customer_name,
            phone: r.phone,
            email: r.email,
            address: r.address,
            taxCode: r.tax_code
        }))
    };
};

/* =======================================================
   🔹 Accountant Dashboard Statistics
   ======================================================= */

//     const getSuplierTransaction = async () => {
//     const sql =`
//         SELECT
//             status,
//             COUNT(*) AS count
//         FROM supplier_transactions st 
//         GROUP BY status
//         ORDER BY count DESC
//         `;
//     const result = await query(sql);

//     return result.rows.map((row) => ({
//         status: row.status,
//         count: parseInt(row.count, 10),
//     }));
// }
const getSuplierPaymentIn = async () => {
    const sql = `
                SELECT
    SUM(total_amount) AS total_expected,
    SUM(paid_amount) AS total_paid,
    SUM(total_amount - paid_amount) AS total_missing
    FROM supplier_transactions
    WHERE type = 'in';`;
    const result = await query(sql);

    return result.rows.map((row) => ({
        totalExpected: parseFloat(row.total_expected),
        totalPaid: parseFloat(row.total_paid),
        totalMissing: parseFloat(row.total_missing),
    }));
};

const getSuplierPaymentOUT = async () => {
    const sql = `
    SELECT
    SUM(total_amount) AS totalExpectedOut,
    SUM(paid_amount) AS totalPaidOut,
    SUM(total_amount - paid_amount) AS totalMissingOut,
    
    COUNT(*) FILTER (WHERE status = 'pending') AS pendingCount,
    COUNT(*) FILTER (WHERE status = 'paid') AS paidCount
    FROM supplier_transactions
    WHERE type = 'out';
    `;
    const result = await query(sql);

    return result.rows.map((row) => ({
        totalExpectedOut: parseFloat(row.totalexpectedout),
        totalPaidOut: parseFloat(row.totalpaidout),
        totalMissingOut: parseFloat(row.totalmissingout),
    }));
};

const getAccountantStats = async (req, res) => {
    try {
        const [suplierPaymentIn, suplierPaymentOut] = await Promise.all([
            getSuplierPaymentIn(),
            getSuplierPaymentOUT()
        ]);
        return res.status(200).json({
            success: true,
            data: {
                suplierPaymentIn,
                suplierPaymentOut
            }
        });
    } catch (error) {
        console.error('Error getting accountant stats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getMonthlyTransactionStats = async () => {
    const sql = `
        SELECT
            type,
            DATE_TRUNC('month', created_at) AS month,
            SUM(paid_amount) AS total_paid
        FROM supplier_transactions
        GROUP BY type, month
        ORDER BY month, type;
    `;

    const result = await query(sql);
    return result.rows.map((row) => ({
        type: row.type,
        month: dayjs(row.month).format('YYYY-MM'),
        totalPaid: parseFloat(row.total_paid),
    }));
};

const getCustomerTransaction = async () => {
    const sql = `
        SELECT
            TO_CHAR(received_at, 'YYYY-MM') AS thang,
            SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) AS tong_thu,
            SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) AS tong_chi
        FROM
            payments
        GROUP BY
            thang
        ORDER BY
            thang;
    `;
    const result = await query(sql);

    return result.rows.map((row) => ({
        month: row.thang,
        totalIn: parseFloat(row.tong_thu),
        totalOut: parseFloat(row.tong_chi),
    }));
};

/* =======================================================
   🔹 Supervisor Shipper Dashboard Statistics
   ======================================================= */

const getOrderAssignedShipper = async () => {
    const sql = `
        SELECT COUNT(*) AS total_confirmed_with_invoice
        FROM sales_orders so
        INNER JOIN sales_invoices si ON si.order_id = so.id
        WHERE so.status = 'confirmed';
        `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.total_confirmed_with_invoice || 0, 10);
};

const getOrderDelivering = async () => {
    const sql = `
        SELECT COUNT(*) AS count
        FROM delivery_run_orders
        WHERE status = 'in_progress'
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};

const getOrderDelivered = async () => {
    const sql = `
        SELECT COUNT(*) AS count
        FROM delivery_run_orders
        WHERE status = 'completed'
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.count || 0, 10);
};

const getTotalShipper = async () => {
    const sql = `
        SELECT COUNT(*) AS total_shipper FROM users
        WHERE role = 'shipper'
    `;
    const result = await query(sql);
    return parseInt(result.rows[0]?.total_shipper || 0, 10);
};

const getSupShipperStats = async (req, res) => {
    try {
        const [ orderAssignedShipper, orderDelivering, orderDelivered, totalOrderCancelled, countTotalShipper ] = await Promise.all([
            getOrderAssignedShipper(),
            getOrderDelivering(),
            getOrderDelivered(),
            countTotalOrderCancelled(),
            getTotalShipper()
        ]);
        return res.status(200).json({
            success: true,
            data: {
                orderAssignedShipper,
                orderDelivering,
                orderDelivered,
                totalOrderCancelled,
                countTotalShipper
            },
        });
    } catch (error) {
        return res
            .status(500)
            .json({ success: false, message: error.message });
    }
};

const getDeliveryProgress = async (supervisorId) => {
    const sql = `
        SELECT
            status,
            COUNT(*) AS count
        FROM delivery_runs
        WHERE supervisor_id = $1
        GROUP BY status
        ORDER BY count DESC
    `;

    const result = await query(sql, [supervisorId]);

    return result.rows.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
    }));
};

const getOrderDeliveryDetail = async () => {
    const sql = `
        SELECT
    so.order_no                    AS ma_don,
    dro.status                     AS delivery_status,   
    sup.full_name                  AS supervisor,
    ship.full_name                 AS shipper
FROM delivery_run_orders dro
JOIN sales_orders      so   ON dro.order_id = so.id
JOIN delivery_runs     dr   ON dro.run_id   = dr.id
LEFT JOIN users        sup  ON dr.supervisor_id = sup.id
LEFT JOIN users        ship ON dr.shipper_id    = ship.id
ORDER BY dr.created_at DESC, dro.route_seq NULLS LAST;`;

    const result = await query(sql);

    return result.rows.map((row) => ({
        orderNo:  row.ma_don,
        deliveryStatus: row.delivery_status,
        supervisor: row.supervisor,
        shipper: row.shipper,
    }));
}



/* =======================================================
   🔹 Exports
   ======================================================= */
module.exports = {
    //Admin exports
    getAdminStats,
    getTopSellingProducts,
    countOrdersByGroupedStatus,
    countOrdersThisWeek,
    getOrdersThisWeek,
    getTotalRevenue,

    //Manager exports
    getManagerStats,
    getOrderProcessingProgress,
    getProductInStock,
    getSupplierInOut,

    //Supervisor Picker exports
    getSupervisorPickerStats,
    getOrderProcessing,
    getOrderPrepared,
    getCancellerOrderSupPicker,
    getPickerProgress,

    //Picker exports
    getPickerStats,
    getOrderAssigned,
    getCancellerOrders,

    //Seller exports
    getSellerStats,
    getTopSellerProducts,
    getCustomerDetailBySeller,

    //Accountant exports
    getAccountantStats,
    getMonthlyTransactionStats,
    getCustomerTransaction,

    //Supervisor Shipper exports
    getSupShipperStats,
    getDeliveryProgress,
    getOrderDeliveryDetail
};

