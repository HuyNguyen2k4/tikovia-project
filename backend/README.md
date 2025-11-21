Test Each of these models serves different use cases, enabling flexibility in data structure for complex MongoDB applications.

## Setup Instructions

To set up the project, follow these steps:

1. **Clone the Repository**:
   Open your terminal and run the following command to clone the repository:

```bash
git clone https://github.com/PaimonZero/BarrelVine
```

2. **Install Dependencies**:
   Run the following command to install all necessary dependencies:

```bash
npm install
```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the project and fill in your `mongo_URI`:

```env
mongo_URI=your_mongodb_connection_string
```

4. **Start the Application**:
   Finally, start the application with the following command:

```bash
npm start
```

---

# Ví dụ sử dụng các biến **pool**, **query()**, và **withTransaction()** từ dbconnect

# 1) Dùng **pool** trực tiếp (thích hợp lệnh nhanh, health check)

```js
// health-check.js
const { pool } = require('./db'); // db.js export { pool, query, withTransaction }

async function healthCheck() {
    // pool.query: dùng trực tiếp, không cần connect/release thủ công
    const { rows } = await pool.query('SELECT NOW() AS now');
    console.log('DB Time:', rows[0].now);
}

healthCheck().catch(console.error);
```

---

# 2) Dùng **query()** helper (CRUD cơ bản + phân trang)

```js
// user.repo.js
const { query } = require('./db');

// Lấy 1 user theo email (SELECT + params an toàn)
async function getUserByEmail(email) {
    const { rows } = await query(
        'SELECT id, email, full_name, status FROM users WHERE email = $1',
        [email]
    );
    return rows[0] || null;
}

// Tạo user (INSERT + RETURNING)
async function createUser({ email, full_name, password_hash }) {
    const { rows } = await query(
        `INSERT INTO users (id, email, full_name, password, status, create_at, update_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'active', now(), now())
     RETURNING id, email, full_name, status`,
        [email, full_name, password_hash]
    );
    return rows[0];
}

// Cập nhật (UPDATE + WHERE)
async function updateUserName(id, newName) {
    const { rowCount } = await query(
        `UPDATE users SET full_name = $1, update_at = now() WHERE id = $2`,
        [newName, id]
    );
    return rowCount === 1;
}

// Xoá (DELETE)
async function deleteUser(id) {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount === 1;
}

// Phân trang (COUNT + LIMIT/OFFSET)
async function listProducts({ keyword = '', page = 1, size = 20 }) {
    const offset = (page - 1) * size;

    const dataQ = query(
        `SELECT id, name, price, created_at
     FROM products
     WHERE name ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
        [`%${keyword}%`, size, offset]
    );

    const countQ = query(
        `SELECT COUNT(*)::int AS total
     FROM products
     WHERE name ILIKE $1`,
        [`%${keyword}%`]
    );

    const [
        { rows: items },
        {
            rows: [{ total }],
        },
    ] = await Promise.all([dataQ, countQ]);
    return { items, page, size, total };
}

module.exports = {
    getUserByEmail,
    createUser,
    updateUserName,
    deleteUser,
    listProducts,
};
```

### Bắt lỗi theo mã lỗi Postgres (ví dụ unique_violation 23505)

```js
try {
  await createUser({ email, full_name, password_hash });
} catch (e) {
  if (e.code === '23505') {
    // email unique constraint
    return res.status(409).json({ message: 'Email already exists' });
  }
  throw e;
}
```

---

# 3) Dùng **withTransaction()** (an toàn đồng bộ khi có nhiều bước)

## 3.1. Ví dụ chuyển tiền giữa 2 ví (wallets)

```js
// wallet.service.js
const { withTransaction } = require('./db');

async function transferBalance(fromUserId, toUserId, amount) {
    return withTransaction(async (c) => {
        // Khoá 2 ví theo thứ tự nhất quán để tránh deadlock
        const [a, b] = [fromUserId, toUserId].sort();
        const fromQ = await c.query(
            'SELECT user_id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
            [a]
        );
        const toQ = await c.query(
            'SELECT user_id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
            [b]
        );

        // Map lại đúng from/to
        const from = fromQ.rows[0]?.user_id === fromUserId ? fromQ.rows[0] : toQ.rows[0];
        const to = toQ.rows[0]?.user_id === toUserId ? toQ.rows[0] : fromQ.rows[0];

        if (!from || !to) throw new Error('Wallet not found');
        if (from.balance < amount) throw new Error('Insufficient funds');

        await c.query('UPDATE wallets SET balance = balance - $1 WHERE user_id = $2', [
            amount,
            fromUserId,
        ]);
        await c.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [
            amount,
            toUserId,
        ]);

        await c.query(
            `INSERT INTO wallet_transactions(id, from_user_id, to_user_id, amount, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, now())`,
            [fromUserId, toUserId, amount]
        );

        return { ok: true };
    });
}
```

## 3.2. Tạo đơn hàng + trừ tồn kho (rollback nếu thiếu hàng)

```js
// order.service.js
const { withTransaction } = require('./db');

// payload: { customerId, items: [{ productId, qty, price }...] }
async function createOrder({ customerId, items }) {
    return withTransaction(async (c) => {
        // 1) Tạo order
        const { rows: orderRows } = await c.query(
            `INSERT INTO orders(id, customer_id, status, created_at)
       VALUES (gen_random_uuid(), $1, 'pending', now())
       RETURNING id`,
            [customerId]
        );
        const orderId = orderRows[0].id;

        // 2) Kiểm tra & trừ tồn kho cho từng item (khoá hàng)
        for (const { productId, qty, price } of items) {
            const stockQ = await c.query(
                `SELECT id, stock FROM products WHERE id = $1 FOR UPDATE`,
                [productId]
            );
            const product = stockQ.rows[0];
            if (!product) throw new Error(`Product ${productId} not found`);
            if (product.stock < qty) throw new Error(`Insufficient stock for ${productId}`);

            await c.query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [qty, productId]);

            await c.query(
                `INSERT INTO order_items(id, order_id, product_id, quantity, price)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
                [orderId, productId, qty, price]
            );
        }

        // 3) Cập nhật trạng thái order
        await c.query(`UPDATE orders SET status = 'created' WHERE id = $1`, [orderId]);

        return { ok: true, orderId };
    });
}
```

## 3.3. Hàng đợi xử lý (queue) an toàn concurrent

```js
// queue.worker.js
const { withTransaction } = require('./db');

// Lấy 1 job chưa xử lý, khoá và gán worker
async function pullOneJobAndProcess(workerId) {
    return withTransaction(async (c) => {
        // FOR UPDATE SKIP LOCKED: tránh nhiều worker giành cùng job
        const { rows } = await c.query(
            `SELECT id FROM jobs
       WHERE status = 'queued'
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1`
        );

        const job = rows[0];
        if (!job) return { ok: false, reason: 'no_job' };

        await c.query(
            `UPDATE jobs SET status = 'processing', worker_id = $1, started_at = now()
       WHERE id = $2`,
            [workerId, job.id]
        );

        // … chạy xử lý công việc …
        // Nếu thành công:
        await c.query(
            `UPDATE jobs SET status = 'done', finished_at = now()
       WHERE id = $1`,
            [job.id]
        );

        return { ok: true, jobId: job.id };
    });
}
```

---

# 4) Bonus: UPSERT bằng `query()` (tránh trùng dữ liệu)

```js
// upsert category theo name (unique)
const { query } = require('./db');

async function upsertCategory(name) {
    const { rows } = await query(
        `INSERT INTO categories (id, name, created_at)
     VALUES (gen_random_uuid(), $1, now())
     ON CONFLICT (name)
     DO UPDATE SET updated_at = now()
     RETURNING id, name`,
        [name]
    );
    return rows[0];
}
```
