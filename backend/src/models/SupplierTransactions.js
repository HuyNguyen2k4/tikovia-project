const { query, withTransaction } = require('@src/config/dbconnect');

const PUBLIC_FIELDS = `
  id, doc_no, supplier_id, department_id, trans_date, type, status, admin_locked,
  due_date, total_amount, paid_amount, note, created_at, updated_at
`;

const PUBLIC_FIELDS_WITH_JOIN = `
  st.id, st.doc_no, st.supplier_id, st.department_id, st.trans_date, st.type, st.status, st.admin_locked,
  st.due_date, st.total_amount, st.paid_amount, st.note, st.created_at, st.updated_at,
  s.code as supplier_code, s.name as supplier_name, s.phone as supplier_phone,
  d.code as department_code, d.name as department_name
`;

// Map row -> object JS
function toSupplierTransaction(row) {
    if (!row) return null;
    return {
        id: row.id,
        docNo: row.doc_no,
        supplierId: row.supplier_id,
        departmentId: row.department_id,
        transDate: row.trans_date,
        type: row.type,
        status: row.status,
        adminLocked: row.admin_locked,
        dueDate: row.due_date,
        totalAmount: parseFloat(row.total_amount) || 0,
        paidAmount: parseFloat(row.paid_amount) || 0,
        note: row.note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Join fields
        supplierCode: row.supplier_code || null,
        supplierName: row.supplier_name || null,
        supplierPhone: row.supplier_phone || null,
        departmentCode: row.department_code || null,
        departmentName: row.department_name || null,
    };
}

/* -------------------- BASIC CRUD -------------------- */

// // Tạo supplier transaction mới
// async function createSupplierTransaction({
//     docNo,
//     supplierId,
//     departmentId,
//     transDate,
//     type = 'in',
//     dueDate,
//     note,
//     // Không nhận totalAmount, paidAmount, status - do trigger tự động xử lý
// }) {
//     const sql = `
//         INSERT INTO supplier_transactions (doc_no, supplier_id, department_id, trans_date, type, due_date, note)
//         VALUES ($1, $2, $3, $4, $5, $6, $7)
//         RETURNING id
//     `;
//     const params = [docNo, supplierId, departmentId, transDate, type, dueDate, note];
//     const { rows } = await query(sql, params);

//     // Sau khi tạo xong, gọi findById để lấy đầy đủ thông tin có join
//     const newId = rows[0].id;
//     return await findById(newId);
// }

// // Cập nhật supplier transaction
// async function updateSupplierTransaction(id, payload = {}) {
//     const fields = [];
//     const params = [];
//     const map = {
//         docNo: 'doc_no',
//         supplierId: 'supplier_id',
//         departmentId: 'department_id',
//         transDate: 'trans_date',
//         type: 'type',
//         dueDate: 'due_date',
//         note: 'note',
//         adminLocked: 'admin_locked', // Chỉ admin mới được cập nhật
//         // Không cho phép cập nhật: totalAmount, paidAmount, status
//     };

//     Object.entries(map).forEach(([kSrc, kDb]) => {
//         if (payload[kSrc] !== undefined) {
//             params.push(payload[kSrc]);
//             fields.push(`${kDb} = $${params.length}`);
//         }
//     });

//     if (fields.length === 0) return findById(id);

//     params.push(id);
//     const sql = `
//         UPDATE supplier_transactions SET ${fields.join(', ')}
//         WHERE id = $${params.length}
//         RETURNING id
//     `;
//     const { rows } = await query(sql, params);

//     // Sau khi update xong, gọi findById để lấy đầy đủ thông tin có join
//     return await findById(rows[0].id);
// }

/* -------------------- ADMIN FUNCTIONS -------------------- */

/**
 * @desc Khóa/mở khóa transaction (chỉ admin)
 * @param {string} id - Transaction ID
 * @param {boolean} locked - true để khóa, false để mở
 * @return {object} - Transaction đã cập nhật
 */
// async function setAdminLock(id, locked = true) {
//     const sql = `
//         UPDATE supplier_transactions
//         SET admin_locked = $1
//         WHERE id = $2
//         RETURNING id
//     `;
//     const { rows } = await query(sql, [locked, id]);
//     if (rows.length === 0) {
//         throw new Error('Không tìm thấy transaction');
//     }
//     return await findById(rows[0].id);
// }

/**
 * @desc Hủy transaction (set admin_locked = true, status sẽ auto = 'cancelled')
 * @param {string} id - Transaction ID
 * @return {object} - Transaction đã hủy
 */
// async function cancelTransaction(id) {
//     return await setAdminLock(id, true);
// }

/**
 * @desc Kích hoạt lại transaction (set admin_locked = false)
 * @param {string} id - Transaction ID
 * @return {object} - Transaction đã kích hoạt
 */
// async function activateTransaction(id) {
//     return await setAdminLock(id, false);
// }

/* -------------------- SEARCH & FILTER -------------------- */

// Liệt kê supplier transactions (có hỗ trợ tìm kiếm và phân trang)
async function listSupplierTransactions({
    q,
    supplierId,
    departmentId,
    type,
    status,
    adminLocked, // Thêm filter theo admin_locked
    fromDate,
    toDate,
    limit = 20,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(st.doc_no ILIKE $${params.length} OR s.name ILIKE $${params.length} OR s.code ILIKE $${params.length} OR st.note ILIKE $${params.length})`
            );
        }

        if (supplierId) {
            params.push(supplierId);
            clauses.push(`st.supplier_id = $${params.length}`);
        }

        if (departmentId) {
            params.push(departmentId);
            clauses.push(`st.department_id = $${params.length}`);
        }

        if (type) {
            params.push(type);
            clauses.push(`st.type = $${params.length}`);
        }

        if (status) {
            params.push(status);
            clauses.push(`st.status = $${params.length}`);
        }

        if (adminLocked !== undefined) {
            params.push(adminLocked);
            clauses.push(`st.admin_locked = $${params.length}`);
        }

        if (fromDate) {
            params.push(fromDate);
            clauses.push(`st.trans_date >= $${params.length}`);
        }

        if (toDate) {
            params.push(toDate);
            clauses.push(`st.trans_date <= $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS_WITH_JOIN}
            FROM supplier_transactions st
            LEFT JOIN suppliers s ON st.supplier_id = s.id
            LEFT JOIN departments d ON st.department_id = d.id
            ${where}
            ORDER BY st.trans_date DESC, st.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toSupplierTransaction);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách giao dịch nhà cung cấp:', error.message);
        throw new Error('Không thể lấy danh sách giao dịch nhà cung cấp');
    }
}

// Đếm tổng số supplier transactions
async function countSupplierTransactions({
    q,
    supplierId,
    departmentId,
    type,
    status,
    adminLocked,
    fromDate,
    toDate,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(st.doc_no ILIKE $${params.length} OR s.name ILIKE $${params.length} OR s.code ILIKE $${params.length} OR st.note ILIKE $${params.length})`
            );
        }

        if (supplierId) {
            params.push(supplierId);
            clauses.push(`st.supplier_id = $${params.length}`);
        }

        if (departmentId) {
            params.push(departmentId);
            clauses.push(`st.department_id = $${params.length}`);
        }

        if (type) {
            params.push(type);
            clauses.push(`st.type = $${params.length}`);
        }

        if (status) {
            params.push(status);
            clauses.push(`st.status = $${params.length}`);
        }

        if (adminLocked !== undefined) {
            params.push(adminLocked);
            clauses.push(`st.admin_locked = $${params.length}`);
        }

        if (fromDate) {
            params.push(fromDate);
            clauses.push(`st.trans_date >= $${params.length}`);
        }

        if (toDate) {
            params.push(toDate);
            clauses.push(`st.trans_date <= $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM supplier_transactions st
            LEFT JOIN suppliers s ON st.supplier_id = s.id
            LEFT JOIN departments d ON st.department_id = d.id
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm giao dịch nhà cung cấp:', error.message);
        throw new Error('Không thể lấy tổng số giao dịch nhà cung cấp');
    }
}

/* -------------------- STATISTICS -------------------- */

// // Lấy thống kê theo status và admin_locked
// async function getTransactionStatusStats() {
//     const sql = `
//         SELECT
//             status,
//             admin_locked,
//             COUNT(*) as count,
//             SUM(total_amount) as total_amount,
//             SUM(paid_amount) as paid_amount
//         FROM supplier_transactions
//         GROUP BY status, admin_locked
//         ORDER BY status, admin_locked
//     `;
//     const { rows } = await query(sql);
//     return rows.map((row) => ({
//         status: row.status,
//         adminLocked: row.admin_locked,
//         count: parseInt(row.count, 10),
//         totalAmount: parseFloat(row.total_amount) || 0,
//         paidAmount: parseFloat(row.paid_amount) || 0,
//     }));
// }

// // Lấy transactions sắp đến hạn thanh toán (chỉ những transaction không bị khóa)
// async function getOverdueTransactions(days = 0) {
//     const sql = `
//         SELECT ${PUBLIC_FIELDS_WITH_JOIN}
//         FROM supplier_transactions st
//         LEFT JOIN suppliers s ON st.supplier_id = s.id
//         LEFT JOIN departments d ON st.department_id = d.id
//         WHERE st.admin_locked = false
//         AND st.status IN ('draft', 'pending')
//         AND st.due_date IS NOT NULL
//         AND st.due_date <= CURRENT_DATE + INTERVAL '${days} days'
//         ORDER BY st.due_date ASC
//     `;
//     const { rows } = await query(sql);
//     return rows.map(toSupplierTransaction);
// }

// // Lấy transactions bị khóa
// async function getLockedTransactions({ limit = 50, offset = 0 } = {}) {
//     const sql = `
//         SELECT ${PUBLIC_FIELDS_WITH_JOIN}
//         FROM supplier_transactions st
//         LEFT JOIN suppliers s ON st.supplier_id = s.id
//         LEFT JOIN departments d ON st.department_id = d.id
//         WHERE st.admin_locked = true
//         ORDER BY st.updated_at DESC
//         LIMIT $1 OFFSET $2
//     `;
//     const { rows } = await query(sql, [limit, offset]);
//     return rows.map(toSupplierTransaction);
// }

/* -------------------- HELPER FUNCTIONS -------------------- */

/**
 * @desc Tìm transaction theo ID
 * @param {string} id - Transaction ID
 * @return {object|null} - Transaction hoặc null nếu không tìm thấy
 */
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_JOIN}
        FROM supplier_transactions st
        LEFT JOIN suppliers s ON st.supplier_id = s.id
        LEFT JOIN departments d ON st.department_id = d.id
        WHERE st.id = $1
    `;
    const { rows } = await query(sql, [id]);
    return rows.length ? toSupplierTransaction(rows[0]) : null;
}

/**
 * @desc Tìm transaction theo số chứng từ (doc_no)
 * @param {string} docNo - Document number
 * @return {object|null} - Transaction hoặc null nếu không tìm thấy
 */
async function findByDocNo(docNo) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_JOIN}
        FROM supplier_transactions st
        LEFT JOIN suppliers s ON st.supplier_id = s.id
        LEFT JOIN departments d ON st.department_id = d.id
        WHERE st.doc_no = $1
    `;
    const { rows } = await query(sql, [docNo]);
    return rows.length ? toSupplierTransaction(rows[0]) : null;
}

/**
 * @desc Xóa transaction theo ID
 * @param {string} id - Transaction ID
 * @return {number} - Số lượng bản ghi đã xóa
 */
// async function deleteSupplierTransaction(id) {
//     const sql = `
//         DELETE FROM supplier_transactions
//         WHERE id = $1
//     `;
//     const { rowCount } = await query(sql, [id]);
//     return rowCount;
// }

/**
 * @desc Lấy danh sách transactions theo supplier ID
 * @param {string} supplierId - Supplier ID
 * @param {object} options - { limit, offset }
 * @return {array} - Danh sách transactions
 */
// async function getTransactionsBySupplier(supplierId, { limit = 50, offset = 0 } = {}) {
//     const sql = `
//         SELECT ${PUBLIC_FIELDS_WITH_JOIN}
//         FROM supplier_transactions st
//         LEFT JOIN suppliers s ON st.supplier_id = s.id
//         LEFT JOIN departments d ON st.department_id = d.id
//         WHERE st.supplier_id = $1
//         ORDER BY st.trans_date DESC, st.created_at DESC
//         LIMIT $2 OFFSET $3
//     `;
//     const { rows } = await query(sql, [supplierId, limit, offset]);
//     return rows.map(toSupplierTransaction);
// }

/**
 * @desc Lấy danh sách transactions theo department ID
 * @param {string} departmentId - Department ID
 * @param {object} options - { limit, offset }
 * @return {array} - Danh sách transactions
 */
// async function getTransactionsByDepartment(departmentId, { limit = 50, offset = 0 } = {}) {
//     const sql = `
//         SELECT ${PUBLIC_FIELDS_WITH_JOIN}
//         FROM supplier_transactions st
//         LEFT JOIN suppliers s ON st.supplier_id = s.id
//         LEFT JOIN departments d ON st.department_id = d.id
//         WHERE st.department_id = $1
//         ORDER BY st.trans_date DESC, st.created_at DESC
//         LIMIT $2 OFFSET $3
//     `;
//     const { rows } = await query(sql, [departmentId, limit, offset]);
//     return rows.map(toSupplierTransaction);
// }

/**
 * @desc Kiểm tra số chứng từ (doc_no) có tồn tại không
 * @param {string} docNo - Document number
 * @param {string|null} excludeId - ID cần loại trừ (nếu có)
 * @return {boolean} - true nếu tồn tại, false nếu không
 */
// async function isDocNoExists(docNo, excludeId = null) {
//     const params = [docNo];
//     let sql = `
//         SELECT 1
//         FROM supplier_transactions
//         WHERE doc_no = $1
//     `;
//     if (excludeId) {
//         params.push(excludeId);
//         sql += ` AND id != $2`;
//     }
//     const { rows } = await query(sql, params);
//     return rows.length > 0;
// }

/**
 * @desc Lấy thống kê giao dịch theo nhà cung cấp
 * @return {array} - Danh sách thống kê
 */
// async function getTransactionStatsBySupplier() {
//     const sql = `
//         SELECT
//             s.id AS supplier_id,
//             s.name AS supplier_name,
//             COUNT(st.id) AS transaction_count,
//             SUM(st.total_amount) AS total_amount,
//             SUM(st.paid_amount) AS paid_amount
//         FROM supplier_transactions st
//         LEFT JOIN suppliers s ON st.supplier_id = s.id
//         GROUP BY s.id, s.name
//         ORDER BY transaction_count DESC
//     `;
//     const { rows } = await query(sql);
//     return rows.map((row) => ({
//         supplierId: row.supplier_id,
//         supplierName: row.supplier_name,
//         transactionCount: parseInt(row.transaction_count, 10),
//         totalAmount: parseFloat(row.total_amount) || 0,
//         paidAmount: parseFloat(row.paid_amount) || 0,
//     }));
// }

/**
 * @desc Xóa nhiều transactions theo danh sách ID
 * @param {array} ids - Danh sách Transaction IDs
 * @return {number} - Số lượng bản ghi đã xóa
 */
// async function deleteMany(ids) {
//     if (!Array.isArray(ids) || ids.length === 0) return 0;

//     const sql = `
//         DELETE FROM supplier_transactions
//         WHERE id = ANY($1::uuid[])
//     `;
//     const { rowCount } = await query(sql, [ids]);
//     return rowCount;
// }

/**
 * @desc Tìm nhiều transactions theo danh sách ID
 * @param {array} ids - Danh sách Transaction IDs
 * @return {array} - Danh sách transactions
 */
async function findByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const sql = `
        SELECT ${PUBLIC_FIELDS_WITH_JOIN}
        FROM supplier_transactions st
        LEFT JOIN suppliers s ON st.supplier_id = s.id
        LEFT JOIN departments d ON st.department_id = d.id
        WHERE st.id = ANY($1::uuid[])
    `;
    const { rows } = await query(sql, [ids]);
    return rows.map(toSupplierTransaction);
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    // Basic CRUD
    // createSupplierTransaction,
    findById,
    findByDocNo,
    listSupplierTransactions,
    // updateSupplierTransaction,
    // deleteSupplierTransaction,
    countSupplierTransactions,

    // Admin functions
    // setAdminLock,
    // cancelTransaction,
    // activateTransaction,

    // Helper functions
    // getTransactionsBySupplier,
    // getTransactionsByDepartment,
    // isDocNoExists,
    // getTransactionStatsBySupplier,
    // getOverdueTransactions,
    // getLockedTransactions,
    // getTransactionStatusStats,
    // deleteMany,
    findByIds,
};
