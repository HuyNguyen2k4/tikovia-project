const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const crypto = require('crypto');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const PUBLIC_FIELDS = `
  id, code, name, phone, email, address, tax_code, credit_limit, note, managed_by, created_at, updated_at
`;

const PUBLIC_FIELDS_JOINED = `
  customers.id, customers.code, customers.name, customers.phone, customers.email, customers.address, 
  customers.tax_code, customers.credit_limit, customers.note, customers.managed_by, 
  customers.created_at, customers.updated_at,
  u.full_name AS managed_by_name, u.username AS managed_by_username
`;

/**
 * Helper: Chuyển chuỗi có dấu thành không dấu (ASCII).
 * @param {string} str - Chuỗi đầu vào
 * @returns {string} - Chuỗi không dấu
 */
const removeAccents = (str) => {
    return str
        .normalize('NFD') // 1. Tách ký tự và dấu (ví dụ: "Ả" -> "A" + "̉")
        .replace(/[\u0300-\u036f]/g, '') // 2. Xóa tất cả các dấu
        .replace(/đ/g, 'd') // 3. Xử lý trường hợp chữ "đ"
        .replace(/Đ/g, 'D'); // 4. Xử lý trường hợp chữ "Đ"
};

/**
 * Helper: Tạo shortName (CHÍNH XÁC 6 KÝ TỰ) từ tên đầy đủ (không dấu).
 * Ví dụ: "Nguyễn Ngọc Trung" -> "TRUNGN"
 * Ví dụ: "Khải" -> "KHAI12" (12 là số ngẫu nhiên)
 * @param {string} name - Tên đầy đủ
 * @returns {string}
 */
const generateShortName = (name) => {
    // Hàm tạo 4 số ngẫu nhiên
    const randomDefault = () => Math.floor(1000 + Math.random() * 9000).toString();
    // Xử lý trường hợp tên rỗng hoặc không hợp lệ
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return 'CU' + randomDefault(); // Trả về giá trị mặc định 6 ký tự
    }

    // 1. XÓA DẤU TRƯỚC KHI XỬ LÝ
    const normalizedName = removeAccents(name);

    // 2. Chuẩn hóa tên: Bỏ khoảng trắng thừa, viết hoa, tách thành mảng
    const parts = normalizedName
        .trim()
        .toUpperCase()
        .split(' ')
        .filter((part) => part.length > 0);
    if (parts.length === 0) {
        return 'CU' + randomDefault(); // Trả về giá trị mặc định 6 ký tự
    }

    let baseShortName;
    // Nếu chỉ có 1 từ (ví dụ: "KHAI")
    if (parts.length === 1) {
        baseShortName = parts[0]; // "KHAI"
    } else {
        // Lấy tên (phần tử cuối cùng)
        const lastName = parts.pop(); // Ví dụ: "TRUNG"
        // Lấy các ký tự đầu của họ và tên lót
        const initials = parts.map((part) => part[0]).join(''); // Ví dụ: "NN"
        baseShortName = `${lastName}${initials}`; // "TRUNGNN"
    }

    // 3. ĐẢM BẢO ĐÚNG 6 KÝ TỰ
    // Nếu dài hơn 6, cắt lấy 6 ký tự đầu
    if (baseShortName.length > 6) {
        return baseShortName.substring(0, 6); // "TRUNGNN" -> "TRUNGN"
    }

    // Nếu ngắn hơn 6, thêm số ngẫu nhiên
    if (baseShortName.length < 6) {
        const paddingLength = 6 - baseShortName.length;
        let randomPadding = '';
        // Tạo chuỗi số ngẫu nhiên
        // Math.random().toString().slice(2) nhanh hơn vòng lặp
        while (randomPadding.length < paddingLength) {
            randomPadding += Math.random().toString().slice(2);
        }
        // Cắt đúng độ dài cần
        randomPadding = randomPadding.substring(0, paddingLength);
        return `${baseShortName}${randomPadding}`; // "KHAI" -> "KHAI12"
    }
    // Nếu vừa bằng 6, trả về chính nó
    return baseShortName;
};

/**
 * Tạo customer.code tự động, kết hợp shortName và hậu tố ngẫu nhiên.
 * Ví dụ: CUS-TRUNGNN-C8F23A
 * @param {string} name - Tên đầy đủ của customer
 * @returns {string} - Mã customer duy nhất
 */
const generateCustomerCode = (name) => {
    const prefix = 'CUS';

    // 1. Tạo shortName (ví dụ: "TRUNGNN")
    const fullShortName = generateShortName(name);

    // 2. Cắt bớt shortName, chỉ lấy tối đa 6 ký tự đầu
    const shortName = fullShortName.slice(0, 6); // "TRUNGNN" -> "TRUNGN"

    // 3. Giữ nguyên 3 bytes (6 ký tự) để đảm bảo không bị trùng
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Kết quả: CUS-TRUNGN-C8F23A (ngắn hơn CUS-TRUNGNN-C8F23A)
    return `${prefix}-${shortName}-${randomSuffix}`;
};

// Map row -> object JS
function toCustomer(row) {
    if (!row) return null;

    // Helper function để chuyển đổi UTC sang giờ Việt Nam
    const formatToVietnamTime = (date) => {
        if (!date) return null;
        return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
    };

    return {
        id: row.id,
        code: row.code,
        name: row.name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        taxCode: row.tax_code,
        creditLimit: row.credit_limit,
        note: row.note,
        managedBy: row.managed_by,
        managedByName: row.managed_by_name || null,
        managedByUsername: row.managed_by_username || null,
        createdAt: formatToVietnamTime(row.created_at), // ✅ Thay đổi
        updatedAt: formatToVietnamTime(row.updated_at), // ✅ Thay đổi
    };
}

/* -------------------- BASIC CRUD -------------------- */

/**
 * @desc    Tạo customer mới (với code được tự động tạo)
 * @param   {object} data - Dữ liệu customer (KHÔNG cần trường 'code')
 * @return  {object} - Customer object
 */
async function createCustomer({
    // 1. ĐÃ XÓA 'code' khỏi danh sách tham số
    name,
    phone,
    email,
    address,
    taxCode,
    creditLimit,
    note,
    managedBy,
}) {
    // 2. Tự động tạo 'code' dựa trên 'name'
    const code = generateCustomerCode(name);

    const sql = `
        INSERT INTO customers (code, name, phone, email, address, tax_code, credit_limit, note, managed_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING ${PUBLIC_FIELDS}
    `;

    // 3. Sử dụng 'code' vừa tạo để insert vào DB
    const params = [code, name, phone, email, address, taxCode, creditLimit, note, managedBy];

    const { rows } = await query(sql, params);
    return toCustomer(rows[0]);
}

/**
 * @desc    Tìm customer theo ID
 * @param   {string} id - Customer ID
 * @return  {object} - Customer object
 */
async function findById(id) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_JOINED}
        FROM customers
        LEFT JOIN users u ON customers.managed_by = u.id
        WHERE customers.id = $1
    `;
    const { rows } = await query(sql, [id]);
    return toCustomer(rows[0]);
}

/**
 * @desc    Tìm customer theo code
 * @param   {string} code - Customer code
 * @return  {object} - Customer object
 */
async function findByCode(code) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_JOINED}
        FROM customers
        LEFT JOIN users u ON customers.managed_by = u.id
        WHERE customers.code = $1
    `;
    const { rows } = await query(sql, [code]);
    return toCustomer(rows[0]);
}

/**
 * @desc    Tìm customer theo email
 * @param   {string} email - Customer email
 * @return  {object} - Customer object
 */
async function findByEmail(email) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_JOINED}
        FROM customers
        LEFT JOIN users u ON customers.managed_by = u.id
        WHERE customers.email = $1
    `;
    const { rows } = await query(sql, [email]);
    return toCustomer(rows[0]);
}

/**
 * @desc    Tìm customer theo phone
 * @param   {string} phone - Customer phone
 * @return  {object} - Customer object
 */
async function findByPhone(phone) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_JOINED}
        FROM customers
        LEFT JOIN users u ON customers.managed_by = u.id
        WHERE customers.phone = $1
    `;
    const { rows } = await query(sql, [phone]);
    return toCustomer(rows[0]);
}

/**
 * @desc    Liệt kê customers với tìm kiếm và phân trang
 * @param   {object} options - Tùy chọn tìm kiếm và phân trang
 * @return  {array} - Danh sách customers
 */
async function listCustomers({ q, limit = 20, offset = 0 } = {}) {
    try {
        const clauses = [];
        const params = [];
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(customers.code ILIKE $${params.length} OR customers.name ILIKE $${params.length} OR 
                 customers.phone ILIKE $${params.length} OR customers.email ILIKE $${params.length} OR 
                 customers.address ILIKE $${params.length} OR customers.tax_code ILIKE $${params.length})`
            );
        }
        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT ${PUBLIC_FIELDS_JOINED}
            FROM customers
            LEFT JOIN users u ON customers.managed_by = u.id
            ${where}
            ORDER BY customers.name ASC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toCustomer);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách khách hàng:', error.message);
        throw new Error('Không thể lấy danh sách khách hàng');
    }
}

/**
 * @desc    Liệt kê customers với tìm kiếm, phân trang và lọc theo người phụ trách
 * @param   {object} options - { q, managedBy, limit, offset }
 * @return  {array} - Danh sách customers kèm tổng doanh số & công nợ
 */
async function listCustomersWithMoney({ q, managedBy, limit = 20, offset = 0 } = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa tự do
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(customers.code ILIKE $${params.length} OR customers.name ILIKE $${params.length} OR 
                  customers.phone ILIKE $${params.length} OR customers.email ILIKE $${params.length} OR 
                  customers.address ILIKE $${params.length} OR customers.tax_code ILIKE $${params.length})`
            );
        }

        // Lọc theo người phụ trách (managed_by)
        if (managedBy && typeof managedBy === 'string' && managedBy.trim()) {
            params.push(managedBy.trim());
            clauses.push(`customers.managed_by = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        // ✅ Query đếm tổng số (không có LIMIT/OFFSET)
        const countSql = `
            SELECT COUNT(*) AS count
            FROM customers
            ${where}
        `.trim();

        // ✅ Query lấy danh sách với phân trang
        const listParams = [...params, limit, offset];
        const listSql = `
            SELECT
                ${PUBLIC_FIELDS_JOINED},
                inv.total_sales_amount,
                inv.net_sales_amount,
                inv.outstanding_balance
            FROM customers
            LEFT JOIN users u ON customers.managed_by = u.id
            /* Tổng hợp số liệu hóa đơn theo từng khách hàng */
            LEFT JOIN LATERAL (
                SELECT
                    COALESCE(SUM(si.total), 0) AS total_sales_amount,
                    COALESCE(SUM(si.total - si.approved_returns), 0) AS net_sales_amount,
                    COALESCE(SUM(CASE WHEN si.status <> 'cancelled'
                                      THEN si.remaining_receivables ELSE 0 END), 0) AS outstanding_balance
                FROM sales_invoices si
                WHERE si.customer_id = customers.id
            ) AS inv ON TRUE
            ${where}
            ORDER BY customers.name ASC
            LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
        `.trim();

        // ✅ Thực hiện 2 query song song
        const [countResult, listResult] = await Promise.all([
            query(countSql, params),
            query(listSql, listParams),
        ]);

        const total = parseInt(countResult.rows[0].count, 10);
        const items = listResult.rows.map((r) => ({
            ...toCustomer(r),
            totalSalesAmount: r.total_sales_amount,
            netSalesAmount: r.net_sales_amount,
            outstandingBalance: r.outstanding_balance,
        }));

        // ✅ Trả về object có { items, total }
        return { items, total };
    } catch (error) {
        console.error('Lỗi khi lấy danh sách khách hàng:', error.message);
        throw new Error('Không thể lấy danh sách khách hàng');
    }
}

/**
 * @desc    Đếm tổng số customers
 * @param   {object} options - Tùy chọn tìm kiếm
 * @return  {number} - Tổng số customers
 */
async function countCustomers({ q } = {}) {
    try {
        const searchQuery = q && q.trim() ? `%${q.trim()}%` : null;
        const clauses = [];
        const params = [];

        if (searchQuery) {
            params.push(searchQuery);
            clauses.push(
                `(code ILIKE $${params.length} OR name ILIKE $${params.length} OR 
                 phone ILIKE $${params.length} OR email ILIKE $${params.length} OR 
                 address ILIKE $${params.length} OR tax_code ILIKE $${params.length})`
            );
        }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
            SELECT COUNT(*) AS count
            FROM customers
            ${where}
        `.trim();

        const { rows } = await query(sql, params);
        if (!rows || rows.length === 0) {
            throw new Error('Không thể lấy tổng số khách hàng');
        }
        return parseInt(rows[0].count, 10);
    } catch (error) {
        console.error('Lỗi khi đếm khách hàng:', error.message);
        throw new Error('Không thể lấy tổng số khách hàng');
    }
}

/**
 * @desc    Lấy tất cả customers không phân trang
 * @param   {object} options - Tùy chọn tìm kiếm
 * @return  {array} - Danh sách customers
 */
async function getAllCustomers({ q } = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(customers.code ILIKE $${params.length} OR customers.name ILIKE $${params.length} OR 
                 customers.phone ILIKE $${params.length} OR customers.email ILIKE $${params.length} OR 
                 customers.address ILIKE $${params.length} OR customers.tax_code ILIKE $${params.length})`
            );
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT ${PUBLIC_FIELDS_JOINED}
            FROM customers
            LEFT JOIN users u ON customers.managed_by = u.id
            ${where}
            ORDER BY customers.name ASC
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toCustomer);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách khách hàng:', error.message);
        throw new Error('Không thể lấy danh sách khách hàng');
    }
}

/**
 * @desc    Lấy danh sách customers cho Select/Autocomplete (chỉ id, code, name)
 * @param   {object} options - Tùy chọn tìm kiếm (chỉ id, code, name)
 * @return  {array} - Danh sách customers (chỉ id, code, name)
 */
async function getCustomersForSelect({ q } = {}) {
    try {
        const clauses = [];
        const params = [];

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(id::text ILIKE $${params.length} OR code ILIKE $${params.length} OR name ILIKE $${params.length})`
            );
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT id, code, name
            FROM customers
            ${where}
            ORDER BY name ASC
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
        }));
    } catch (error) {
        console.error('Lỗi khi lấy danh sách khách hàng cho select:', error.message);
        throw new Error('Không thể lấy danh sách khách hàng cho select');
    }
}

/**
 * @desc    Lấy danh sách customers theo managedBy với phân trang và đếm tổng số
 * @param   {object} options - Tùy chọn tìm kiếm và phân trang
 * @return  {object} - Object chứa danh sách customers và tổng số
 */
async function getCustomersByManagedByWithCount({ managedBy, q, limit = 20, offset = 0 } = {}) {
    try {
        const clauses = [];
        const params = [];

        // Luôn luôn filter theo managedBy
        if (managedBy) {
            params.push(managedBy);
            clauses.push(`customers.managed_by = $${params.length}`);
        } else {
            // Nếu không có managedBy thì trả về empty
            return { items: [], total: 0 };
        }

        // Thêm tìm kiếm nếu có
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(customers.code ILIKE $${params.length} OR customers.name ILIKE $${params.length} OR 
                 customers.phone ILIKE $${params.length} OR customers.email ILIKE $${params.length} OR 
                 customers.address ILIKE $${params.length} OR customers.tax_code ILIKE $${params.length})`
            );
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        // Query để đếm tổng số
        const countSql = `
            SELECT COUNT(*) AS count
            FROM customers
            ${where}
        `.trim();

        // Query để lấy danh sách với phân trang
        const listParams = [...params, limit, offset];
        const listSql = `
            SELECT ${PUBLIC_FIELDS_JOINED}
            FROM customers
            LEFT JOIN users u ON customers.managed_by = u.id
            ${where}
            ORDER BY customers.name ASC
            LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
        `.trim();

        // Thực hiện 2 query song song
        const [countResult, listResult] = await Promise.all([
            query(countSql, params),
            query(listSql, listParams),
        ]);

        const total = parseInt(countResult.rows[0].count, 10);
        const items = listResult.rows.map(toCustomer);

        return { items, total };
    } catch (error) {
        console.error('Lỗi khi lấy danh sách khách hàng theo managedBy:', error.message);
        throw new Error('Không thể lấy danh sách khách hàng theo managedBy');
    }
}

/**
 * @desc    Cập nhật customer
 * @param   {string} id - Customer ID
 * @param   {object} payload - Dữ liệu cập nhật
 * @return  {object} - Customer đã cập nhật
 */
async function updateCustomer(id, payload = {}) {
    const fields = [];
    const params = [];
    const map = {
        name: 'name',
        phone: 'phone',
        email: 'email',
        address: 'address',
        taxCode: 'tax_code',
        creditLimit: 'credit_limit',
        note: 'note',
        managedBy: 'managed_by',
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
        UPDATE customers SET ${fields.join(', ')}
        WHERE id = $${params.length}
        RETURNING ${PUBLIC_FIELDS}
    `;
    const { rows } = await query(sql, params);
    return toCustomer(rows[0]);
}

/**
 * @desc    Xóa customer
 * @param   {string} id - Customer ID
 * @return  {boolean} - True nếu thành công
 */
async function deleteCustomer(id) {
    const sql = `DELETE FROM customers WHERE id = $1`;
    await query(sql, [id]);
    return true;
}

// ========== EXTRA HELPERS ========== //

/**
 * @desc    Tìm customers theo danh sách IDs
 * @param   {array} ids - Danh sách customer IDs
 * @return  {array} - Danh sách customers
 */
async function findByIds(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `
        SELECT ${PUBLIC_FIELDS_JOINED}
        FROM customers
        LEFT JOIN users u ON customers.managed_by = u.id
        WHERE customers.id IN (${placeholders})
        ORDER BY customers.name ASC
    `;
    const { rows } = await query(sql, ids);
    return rows.map(toCustomer);
}

/**
 * @desc    Xóa nhiều customers cùng lúc
 * @param   {array} ids - Danh sách customer IDs
 * @return  {number} - Số lượng đã xóa
 */
async function deleteMany(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `DELETE FROM customers WHERE id IN (${placeholders})`;
    const { rowCount } = await query(sql, ids);
    return rowCount;
}

/**
 * @desc    Kiểm tra code có tồn tại chưa
 * @param   {string} code - Customer code
 * @param   {string} excludeId - ID loại trừ (dùng khi update)
 * @return  {boolean} - True nếu đã tồn tại
 */
async function isCodeExists(code, excludeId = null) {
    let sql = `SELECT id FROM customers WHERE code = $1`;
    const params = [code];

    if (excludeId) {
        params.push(excludeId);
        sql += ` AND id != $${params.length}`;
    }

    const { rowCount } = await query(sql, params);
    return rowCount > 0;
}

/**
 * @desc    Kiểm tra email có tồn tại chưa
 * @param   {string} email - Customer email
 * @param   {string} excludeId - ID loại trừ (dùng khi update)
 * @return  {boolean} - True nếu đã tồn tại
 */
async function isEmailExists(email, excludeId = null) {
    if (!email) return false;
    let sql = `SELECT id FROM customers WHERE email = $1`;
    const params = [email];

    if (excludeId) {
        params.push(excludeId);
        sql += ` AND id != $${params.length}`;
    }

    const { rowCount } = await query(sql, params);
    return rowCount > 0;
}

/**
 * @desc    Kiểm tra phone có tồn tại chưa
 * @param   {string} phone - Customer phone
 * @param   {string} excludeId - ID loại trừ (dùng khi update)
 * @return  {boolean} - True nếu đã tồn tại
 */
async function isPhoneExists(phone, excludeId = null) {
    let sql = `SELECT id FROM customers WHERE phone = $1`;
    const params = [phone];

    if (excludeId) {
        params.push(excludeId);
        sql += ` AND id != $${params.length}`;
    }

    const { rowCount } = await query(sql, params);
    return rowCount > 0;
}

/**
 * @desc    Tìm kiếm nâng cao customers
 * @param   {object} options - Tùy chọn tìm kiếm
 * @return  {array} - Danh sách customers
 */
async function searchCustomers({
    code,
    name,
    phone,
    email,
    address,
    taxCode,
    managedBy,
    limit = 50,
    offset = 0,
} = {}) {
    try {
        const clauses = [];
        const params = [];

        if (code && code.trim()) {
            params.push(`%${code.trim()}%`);
            clauses.push(`customers.code ILIKE $${params.length}`);
        }
        if (name && name.trim()) {
            params.push(`%${name.trim()}%`);
            clauses.push(`customers.name ILIKE $${params.length}`);
        }
        if (phone && phone.trim()) {
            params.push(`%${phone.trim()}%`);
            clauses.push(`customers.phone ILIKE $${params.length}`);
        }
        if (email && email.trim()) {
            params.push(`%${email.trim()}%`);
            clauses.push(`customers.email ILIKE $${params.length}`);
        }
        if (address && address.trim()) {
            params.push(`%${address.trim()}%`);
            clauses.push(`customers.address ILIKE $${params.length}`);
        }
        if (taxCode && taxCode.trim()) {
            params.push(`%${taxCode.trim()}%`);
            clauses.push(`customers.tax_code ILIKE $${params.length}`);
        }
        if (managedBy) {
            params.push(managedBy);
            clauses.push(`customers.managed_by = $${params.length}`);
        }

        params.push(limit, offset);
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT ${PUBLIC_FIELDS_JOINED}
            FROM customers
            LEFT JOIN users u ON customers.managed_by = u.id
            ${where}
            ORDER BY customers.name ASC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `.trim();

        const { rows } = await query(sql, params);
        return rows.map(toCustomer);
    } catch (error) {
        console.error('Lỗi khi tìm kiếm khách hàng:', error.message);
        throw new Error('Không thể tìm kiếm khách hàng');
    }
}

/**
 * @desc    Lấy customers được tạo gần đây
 * @param   {number} limit - Số lượng items
 * @return  {array} - Danh sách customers
 */
async function getRecentCustomers(limit = 10) {
    try {
        const sql = `
            SELECT ${PUBLIC_FIELDS_JOINED}
            FROM customers
            LEFT JOIN users u ON customers.managed_by = u.id
            ORDER BY customers.created_at DESC
            LIMIT $1
        `;
        const { rows } = await query(sql, [limit]);
        return rows.map(toCustomer);
    } catch (error) {
        console.error('Lỗi khi lấy khách hàng gần đây:', error.message);
        throw new Error('Không thể lấy khách hàng gần đây');
    }
}

/**
 * @desc    Thống kê customers theo tháng tạo
 * @return  {array} - Thống kê theo tháng
 */
async function getCustomerCreationStats() {
    try {
        const sql = `
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) AS count
            FROM customers
            WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        `;
        const { rows } = await query(sql);
        return rows.map((row) => ({
            month: dayjs.utc(row.month).tz('Asia/Ho_Chi_Minh').format('YYYY-MM'), // ✅ Thay đổi
            count: parseInt(row.count, 10),
        }));
    } catch (error) {
        console.error('Lỗi khi lấy thống kê khách hàng:', error.message);
        throw new Error('Không thể lấy thống kê khách hàng');
    }
}

/**
 * Lấy tổng hợp tài chính (Dư nợ, Tổng mua, Doanh số thuần)
 * - Nếu truyền vào managedBy: Tính tổng theo người quản lý đó.
 * - Nếu KHÔNG truyền vào managedBy (null/undefined): Tính tổng của TẤT CẢ khách hàng.
 *
 * @param {string | null | undefined} managedBy - ID của người quản lý (tùy chọn)
 * @returns {object} - { totalOutstandingBalance, totalSalesAmount, netSalesAmount }
 */
async function getCustomerFinancialSummary(managedBy = null) {
    try {
        const params = [];
        let whereClause = '';

        // 1. Kiểm tra nếu managedBy được truyền vào và có giá trị
        if (managedBy) {
            params.push(managedBy);
            // Gán tham số $1 cho mệnh đề WHERE
            whereClause = 'WHERE c.managed_by = $1';
        }

        // Nếu không có managedBy, whereClause sẽ là chuỗi rỗng
        // và params sẽ là mảng rỗng, câu query sẽ tính tổng toàn bộ.

        const sql = `
        SELECT
            COALESCE(SUM(CASE WHEN si.status <> 'cancelled' THEN si.remaining_receivables ELSE 0 END), 0) AS total_outstanding_balance,
            COALESCE(SUM(si.total), 0) AS total_sales_amount,
            COALESCE(SUM(si.total - si.approved_returns), 0) AS net_sales_amount
        FROM customers c
        LEFT JOIN sales_invoices si ON si.customer_id = c.id
        ${whereClause}
    `;

        // 2. Thực thi query với params (có thể rỗng)
        const { rows } = await query(sql, params);

        // 3. Trả về kết quả
        // Hàm SUM() không có GROUP BY luôn trả về 1 hàng.
        // Dùng COALESCE trong SQL để đảm bảo giá trị trả về là 0 thay vì NULL.
        return {
            totalOutstandingBalance: parseFloat(rows[0].total_outstanding_balance),
            totalSalesAmount: parseFloat(rows[0].total_sales_amount),
            netSalesAmount: parseFloat(rows[0].net_sales_amount),
        };
    } catch (error) {
        console.error('Lỗi khi lấy tổng hợp tài chính khách hàng:', error.message);
        throw new Error('Không thể lấy tổng hợp tài chính khách hàng');
    }
}

/**
 * @desc    Lấy danh sách customers với thống kê số lượng invoices theo trạng thái
 * @param   {object} options - { q, managedBy, limit, offset }
 * @return  {object} - { items: Customer[], total: number }
 */
async function listCustomersWithInvoiceStats({ q, managedBy, limit = 20, offset = 0 } = {}) {
    try {
        const clauses = [];
        const params = [];

        // Tìm kiếm theo từ khóa tự do
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            clauses.push(
                `(customers.code ILIKE $${params.length} OR customers.name ILIKE $${params.length} OR 
                  customers.phone ILIKE $${params.length} OR customers.email ILIKE $${params.length} OR 
                  customers.address ILIKE $${params.length} OR customers.tax_code ILIKE $${params.length})`
            );
        }

        // Lọc theo người phụ trách (managed_by)
        if (managedBy && typeof managedBy === 'string' && managedBy.trim()) {
            params.push(managedBy.trim());
            clauses.push(`customers.managed_by = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        // ✅ Query đếm tổng số customers (không có LIMIT/OFFSET)
        const countSql = `
            SELECT COUNT(*) AS count
            FROM customers
            ${where}
        `.trim();

        // ✅ Query lấy danh sách customers với thống kê invoices
        const listParams = [...params, limit, offset];
        const listSql = `
            SELECT
                ${PUBLIC_FIELDS_JOINED},
                -- Thống kê tài chính (giữ nguyên từ hàm cũ)
                fin.total_sales_amount,
                fin.net_sales_amount,
                fin.outstanding_balance,
                -- ✅ THÊM: Thống kê số lượng invoices theo trạng thái
                inv_stats.open_invoices_count,
                inv_stats.paid_invoices_count,
                inv_stats.cancelled_invoices_count,
                inv_stats.total_invoices_count
            FROM customers
            LEFT JOIN users u ON customers.managed_by = u.id
            
            /* Tổng hợp số liệu tài chính theo từng khách hàng */
            LEFT JOIN LATERAL (
                SELECT
                    COALESCE(SUM(si.total), 0) AS total_sales_amount,
                    COALESCE(SUM(si.total - si.approved_returns), 0) AS net_sales_amount,
                    COALESCE(SUM(CASE WHEN si.status <> 'cancelled'
                                      THEN si.remaining_receivables ELSE 0 END), 0) AS outstanding_balance
                FROM sales_invoices si
                WHERE si.customer_id = customers.id
            ) AS fin ON TRUE
            
            /* ✅ THÊM: Thống kê số lượng invoices theo trạng thái */
            LEFT JOIN LATERAL (
                SELECT
                    COALESCE(SUM(CASE WHEN si.status = 'open' THEN 1 ELSE 0 END), 0) AS open_invoices_count,
                    COALESCE(SUM(CASE WHEN si.status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_invoices_count,
                    COALESCE(SUM(CASE WHEN si.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_invoices_count,
                    COALESCE(COUNT(*), 0) AS total_invoices_count
                FROM sales_invoices si
                WHERE si.customer_id = customers.id
            ) AS inv_stats ON TRUE
            
            ${where}
            ORDER BY customers.name ASC
            LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
        `.trim();

        // ✅ Thực hiện 2 query song song
        const [countResult, listResult] = await Promise.all([
            query(countSql, params),
            query(listSql, listParams),
        ]);

        const total = parseInt(countResult.rows[0].count, 10);
        const items = listResult.rows.map((r) => ({
            ...toCustomer(r),
            // Thống kê tài chính (giữ nguyên)
            totalSalesAmount: parseFloat(r.total_sales_amount || 0),
            netSalesAmount: parseFloat(r.net_sales_amount || 0),
            outstandingBalance: parseFloat(r.outstanding_balance || 0),
            // ✅ THÊM: Thống kê invoices theo trạng thái
            invoiceStats: {
                openCount: parseInt(r.open_invoices_count || 0, 10),
                paidCount: parseInt(r.paid_invoices_count || 0, 10),
                cancelledCount: parseInt(r.cancelled_invoices_count || 0, 10),
                totalCount: parseInt(r.total_invoices_count || 0, 10),
            },
        }));

        // ✅ Trả về object có { items, total }
        return { items, total };
    } catch (error) {
        console.error('Lỗi khi lấy danh sách khách hàng với thống kê invoices:', error.message);
        throw new Error('Không thể lấy danh sách khách hàng với thống kê invoices');
    }
}

/**
 * @desc    Lấy thống kê tổng hợp invoices của tất cả customers
 * @param   {string|null} managedBy - Lọc theo người quản lý (optional)
 * @return  {object} - Tổng hợp thống kê invoices
 */
async function getInvoiceStatsSummary(managedBy = null) {
    try {
        const params = [];
        let whereClause = '';

        // Nếu có managedBy, thêm điều kiện lọc
        if (managedBy) {
            params.push(managedBy);
            whereClause = 'WHERE c.managed_by = $1';
        }

        const sql = `
            SELECT
                COALESCE(SUM(CASE WHEN si.status = 'open' THEN 1 ELSE 0 END), 0) AS total_open_invoices,
                COALESCE(SUM(CASE WHEN si.status = 'paid' THEN 1 ELSE 0 END), 0) AS total_paid_invoices,
                COALESCE(SUM(CASE WHEN si.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS total_cancelled_invoices,
                COALESCE(COUNT(si.id), 0) AS total_invoices,
                COALESCE(COUNT(DISTINCT c.id), 0) AS customers_with_invoices,
                COALESCE(SUM(CASE WHEN si.status = 'open' THEN si.total ELSE 0 END), 0) AS open_invoices_amount,
                COALESCE(SUM(CASE WHEN si.status = 'paid' THEN si.total ELSE 0 END), 0) AS paid_invoices_amount,
                COALESCE(SUM(CASE WHEN si.status = 'cancelled' THEN si.total ELSE 0 END), 0) AS cancelled_invoices_amount
            FROM customers c
            LEFT JOIN sales_invoices si ON si.customer_id = c.id
            ${whereClause}
        `;

        const { rows } = await query(sql, params);
        const row = rows[0];

        return {
            invoiceCounts: {
                open: parseInt(row.total_open_invoices, 10),
                paid: parseInt(row.total_paid_invoices, 10),
                cancelled: parseInt(row.total_cancelled_invoices, 10),
                total: parseInt(row.total_invoices, 10),
            },
            invoiceAmounts: {
                open: parseFloat(row.open_invoices_amount),
                paid: parseFloat(row.paid_invoices_amount),
                cancelled: parseFloat(row.cancelled_invoices_amount),
                total:
                    parseFloat(row.open_invoices_amount) +
                    parseFloat(row.paid_invoices_amount) +
                    parseFloat(row.cancelled_invoices_amount),
            },
            customersWithInvoices: parseInt(row.customers_with_invoices, 10),
        };
    } catch (error) {
        console.error('Lỗi khi lấy tổng hợp thống kê invoices:', error.message);
        throw new Error('Không thể lấy tổng hợp thống kê invoices');
    }
}

/**
 * @desc    Lấy chi tiết invoices của một customer cụ thể
 * @param   {string} customerId - Customer ID
 * @param   {object} options - { status, limit, offset }
 * @return  {object} - { invoices: Invoice[], total: number, stats: object }
 */
async function getCustomerInvoiceDetails(customerId, { status, limit = 10, offset = 0 } = {}) {
    try {
        const params = [customerId];
        const clauses = ['si.customer_id = $1'];

        // Lọc theo trạng thái nếu có
        if (status && ['open', 'paid', 'cancelled'].includes(status)) {
            params.push(status);
            clauses.push(`si.status = $${params.length}`);
        }

        const where = `WHERE ${clauses.join(' AND ')}`;

        // Query đếm tổng số invoices
        const countSql = `
            SELECT COUNT(*) AS count
            FROM sales_invoices si
            ${where}
        `;

        // Query lấy danh sách invoices
        const listParams = [...params, limit, offset];
        const listSql = `
            SELECT 
                si.id, si.invoice_no, si.order_id, si.total, si.status,
                si.remaining_receivables, si.created_at, si.updated_at,
                so.order_no
            FROM sales_invoices si
            LEFT JOIN sales_orders so ON si.order_id = so.id
            ${where}
            ORDER BY si.created_at DESC
            LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
        `;

        // Query thống kê của customer này
        const statsSql = `
            SELECT
                COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) AS open_count,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_count,
                COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_count,
                COALESCE(SUM(CASE WHEN status = 'open' THEN total ELSE 0 END), 0) AS open_amount,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) AS paid_amount,
                COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total ELSE 0 END), 0) AS cancelled_amount,
                COALESCE(SUM(remaining_receivables), 0) AS total_remaining
            FROM sales_invoices
            WHERE customer_id = $1
        `;

        // Thực hiện 3 query song song
        const [countResult, listResult, statsResult] = await Promise.all([
            query(countSql, params),
            query(listSql, listParams),
            query(statsSql, [customerId]),
        ]);

        const total = parseInt(countResult.rows[0].count, 10);
        const statsRow = statsResult.rows[0];

        return {
            invoices: listResult.rows.map((row) => ({
                id: row.id,
                invoiceNo: row.invoice_no,
                orderId: row.order_id,
                orderNo: row.order_no,
                total: parseFloat(row.total),
                status: row.status,
                remainingReceivables: parseFloat(row.remaining_receivables),
                createdAt: dayjs.utc(row.created_at).tz('Asia/Ho_Chi_Minh').format(),
                updatedAt: dayjs.utc(row.updated_at).tz('Asia/Ho_Chi_Minh').format(),
            })),
            total,
            stats: {
                counts: {
                    open: parseInt(statsRow.open_count, 10),
                    paid: parseInt(statsRow.paid_count, 10),
                    cancelled: parseInt(statsRow.cancelled_count, 10),
                    total:
                        parseInt(statsRow.open_count, 10) +
                        parseInt(statsRow.paid_count, 10) +
                        parseInt(statsRow.cancelled_count, 10),
                },
                amounts: {
                    open: parseFloat(statsRow.open_amount),
                    paid: parseFloat(statsRow.paid_amount),
                    cancelled: parseFloat(statsRow.cancelled_amount),
                    totalRemaining: parseFloat(statsRow.total_remaining),
                },
            },
        };
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết invoices của customer:', error.message);
        throw new Error('Không thể lấy chi tiết invoices của customer');
    }
}

// ✅ NEW: Thêm hàm tìm kiếm theo tên không phân biệt hoa thường
/**
 * @desc    Tìm customer theo tên (không phân biệt hoa thường)
 * @param   {string} name - Tên khách hàng
 * @return  {object|null} - Customer object hoặc null
 */
async function findByNameInsensitive(name) {
    const sql = `
        SELECT ${PUBLIC_FIELDS_JOINED}
        FROM customers
        LEFT JOIN users u ON customers.managed_by = u.id
        WHERE customers.name ILIKE $1
        LIMIT 1
    `;
    const { rows } = await query(sql, [name]);
    return toCustomer(rows[0]);
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    // Filter by managedBy
    getCustomersByManagedByWithCount,
    // BASIC CRUD
    createCustomer,
    listCustomers,
    countCustomers,
    updateCustomer,
    deleteCustomer,
    getAllCustomers, // Lấy tất cả không phân trang
    getCustomersForSelect, // Lấy cho select/autocomplete

    listCustomersWithMoney, // Danh sách customers kèm tổng doanh số & công nợ (có thể tìm theo managedBy)
    getCustomerFinancialSummary, // Tổng hợp tài chính (Dư nợ, Tổng mua, Doanh số thuần)

    // ✅ THÊM: Các hàm mới cho thống kê invoices
    listCustomersWithInvoiceStats, // Danh sách customers kèm thống kê invoices theo trạng thái
    getInvoiceStatsSummary, // Tổng hợp thống kê invoices của tất cả customers
    getCustomerInvoiceDetails, // Chi tiết invoices của một customer cụ thể

    // Finders
    findById,
    findByIds,
    findByCode,
    findByEmail,
    findByPhone,
    searchCustomers,
    findByNameInsensitive,
    // Extra helpers - Fake data, statistical, bulk actions
    deleteMany,
    getRecentCustomers,
    getCustomerCreationStats,
    // Validators
    isCodeExists,
    isEmailExists,
    isPhoneExists,
};
