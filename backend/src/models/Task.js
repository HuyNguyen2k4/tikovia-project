// src/models/Task.js
const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const formatToVietnamTime = (date) => {
  if (!date) return null;
  return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
};

/* ===================== MAPPER FUNCTIONS ===================== */

function toPreparationTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    supervisorId: row.supervisor_id,
    packerId: row.packer_id,
    status: row.status,
    deadline: formatToVietnamTime(row.deadline),
    note: row.note,
    createdAt: formatToVietnamTime(row.created_at),
    updatedAt: formatToVietnamTime(row.updated_at),
    startedAt: formatToVietnamTime(row.started_at),
    completedAt: formatToVietnamTime(row.completed_at),
    // Join fields
    supervisorName: row.supervisor_name || null,
    packerName: row.packer_name || null,
  };
}

function toPreparationItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    taskId: row.task_id,
    orderItemId: row.order_item_id,
    lotId: row.lot_id,
    preQty: parseFloat(row.pre_qty) || 0,
    postQty: parseFloat(row.post_qty) || 0,
    preEvd: row.pre_evd,
    postEvd: row.post_evd,
    note: row.note,
    createdAt: formatToVietnamTime(row.created_at),
    updatedAt: formatToVietnamTime(row.updated_at),
    // Join fields
    lotNo: row.lot_no || null,
    productName: row.product_name || null,
    skuCode: row.sku_code || null,
  };
}

function toTaskWithItems(task, itemRows = []) {
  const items = itemRows.map(toPreparationItem).filter(Boolean);
  return { ...task, items, summary: { itemCount: items.length } };
}

/* ===================== CORE CRUD ===================== */

/**
 * Tạo task + items
 */
async function createTaskWithItems({
  orderId,
  supervisorId,
  packerId,
  deadline,
  note,
  items = [],
}) {
  return await withTransaction(async (client) => {
    // === 1. Tạo task chính ===
    const taskSql = `
      INSERT INTO preparation_tasks (order_id, supervisor_id, packer_id, deadline, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const { rows: taskRows } = await client.query(taskSql, [
      orderId,
      supervisorId,
      packerId,
      dayjs(deadline).utc().toDate(),
      note,
    ]);
    const taskId = taskRows[0].id;

    // === 2. Lặp qua từng item để insert & cập nhật tồn kho ===
    for (const item of items) {
      const {
        orderItemId,
        lotId,
        preQty,
        postQty,
        preEvd,
        postEvd,
        note: itemNote,
      } = item;

      // --- 2.1 Kiểm tra tồn kho trước khi trừ ---
      const { rows: lotRows } = await client.query(
        `SELECT qty_on_hand, expiry_date FROM inventory_lots WHERE id = $1 FOR UPDATE`,
        [lotId]
      );
      const lot = lotRows[0];
      if (!lot) {
        throw new Error(`Lô hàng không tồn tại (lotId: ${lotId})`);
      }

      if (new Date(lot.expiry_date) <= new Date()) {
        throw new Error(`Lô hàng ${lotId} đã hết hạn sử dụng`);
      }

      if (lot.qty_on_hand < preQty) {
        throw new Error(
          `Lô hàng ${lotId} không đủ tồn kho (tồn hiện tại: ${lot.qty_on_hand}, yêu cầu: ${preQty})`
        );
      }

      // --- 2.2 Trừ tồn kho (qty_on_hand -= preQty) ---
      await client.query(
        `UPDATE inventory_lots
         SET qty_on_hand = qty_on_hand - $1
         WHERE id = $2`,
        [preQty, lotId]
      );

      // --- 2.3 Thêm item ---
      await client.query(
        `
        INSERT INTO preparation_items 
        (task_id, order_item_id, lot_id, pre_qty, post_qty, pre_evd, post_evd, note)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [taskId, orderItemId, lotId, preQty, postQty, preEvd, postEvd, itemNote]
      );
    }

    // === 3. Trả về task kèm items ===
    return await findTaskWithItemsByIdTx(client, taskId);
  });
}

/**
 * Cập nhật task + items
 */
async function updateTaskWithItems(taskId, payload) {
  return await withTransaction(async (client) => {
    // 1️⃣ Kiểm tra tồn tại
    const { rows: existRows } = await client.query(
      `SELECT * FROM preparation_tasks WHERE id = $1 FOR UPDATE`,
      [taskId]
    );
    if (!existRows.length) throw new Error("Không tìm thấy task");
    const existing = existRows[0];

    // 2️⃣ Lấy danh sách items cũ để hoàn kho
    const { rows: oldItems } = await client.query(
      `SELECT lot_id, pre_qty FROM preparation_items WHERE task_id = $1`,
      [taskId]
    );

    // 3️⃣ Hoàn tồn kho cũ
    for (const old of oldItems) {
      if (old.lot_id && old.pre_qty > 0) {
        await client.query(
          `UPDATE inventory_lots
           SET qty_on_hand = qty_on_hand + $1
           WHERE id = $2`,
          [old.pre_qty, old.lot_id]
        );
      }
    }

    // 4️⃣ Xoá items cũ
    await client.query(`DELETE FROM preparation_items WHERE task_id = $1`, [taskId]);

    // 5️⃣ Cập nhật thông tin task
    const fields = [];
    const params = [];
    let i = 1;
    const map = {
      supervisorId: "supervisor_id",
      packerId: "packer_id",
      status: "status",
      deadline: "deadline",
      note: "note",
      startedAt: "started_at",
      completedAt: "completed_at",
    };

    for (const [key, dbField] of Object.entries(map)) {
      if (payload[key] !== undefined) {
        fields.push(`${dbField} = $${i++}`);
        params.push(
          key.includes("At") ? dayjs(payload[key]).utc().toDate() : payload[key]
        );
      }
    }
    if (fields.length > 0) {
      params.push(taskId);
      await client.query(
        `UPDATE preparation_tasks
         SET ${fields.join(", ")}, updated_at = now()
         WHERE id = $${i}`,
        params
      );
    }

    // 6️⃣ Ghi items mới + trừ tồn kho mới
    if (payload.items && payload.items.length) {
      for (const item of payload.items) {
        const {
          orderItemId,
          lotId,
          preQty,
          postQty,
          preEvd,
          postEvd,
          note,
        } = item;

        // 🔹 Kiểm tra tồn kho mới
        const { rows: lotRows } = await client.query(
          `SELECT qty_on_hand, expiry_date FROM inventory_lots WHERE id = $1 FOR UPDATE`,
          [lotId]
        );
        const lot = lotRows[0];
        if (!lot) throw new Error(`Lô hàng ${lotId} không tồn tại`);
        if (new Date(lot.expiry_date) <= new Date())
          throw new Error(`Lô hàng ${lotId} đã hết hạn`);
        if (lot.qty_on_hand < preQty)
          throw new Error(
            `Lô hàng ${lotId} không đủ tồn (còn ${lot.qty_on_hand}, yêu cầu ${preQty})`
          );

        // 🔹 Trừ tồn kho
        await client.query(
          `UPDATE inventory_lots SET qty_on_hand = qty_on_hand - $1 WHERE id = $2`,
          [preQty, lotId]
        );

        // 🔹 Ghi lại item
        await client.query(
          `
          INSERT INTO preparation_items
          (task_id, order_item_id, lot_id, pre_qty, post_qty, pre_evd, post_evd, note)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
          [taskId, orderItemId, lotId, preQty, postQty, preEvd, postEvd, note]
        );
      }
    }

    // 7️⃣ Trả về task kèm items mới
    return await findTaskWithItemsByIdTx(client, taskId);
  });
}


/**
 * Xoá task + items
 */
async function deleteTask(taskId) {
  return await withTransaction(async (client) => {
    await client.query(`DELETE FROM preparation_items WHERE task_id = $1`, [taskId]);
    await client.query(`DELETE FROM preparation_tasks WHERE id = $1`, [taskId]);
    return true;
  });
}

/* ===================== QUERY ===================== */

async function findTaskById(id) {
  const sql = `
    SELECT 
      pt.*, 
      su.full_name AS supervisor_name,
      pa.full_name AS packer_name
    FROM preparation_tasks pt
    LEFT JOIN users su ON pt.supervisor_id = su.id
    LEFT JOIN users pa ON pt.packer_id = pa.id
    WHERE pt.id = $1
  `;
  const { rows } = await query(sql, [id]);
  return toPreparationTask(rows[0]);
}

/**
 * @desc Lấy 1 task kèm theo items và review (nếu có)
 */
async function findTaskWithItemsById(id) {
  // === Lấy task + thông tin supervisor/packer + review ===
  const sqlT = `
    SELECT 
      pt.*,
      su.full_name AS supervisor_name,
      pa.full_name AS packer_name,
      pr.id AS review_id,
      pr.reviewer_id,
      rv.full_name AS reviewer_name,
      pr.result AS review_result,
      pr.reason AS review_reason,
      pr.created_at AS review_created_at,
      pr.updated_at AS review_updated_at
    FROM preparation_tasks pt
    LEFT JOIN users su ON pt.supervisor_id = su.id
    LEFT JOIN users pa ON pt.packer_id = pa.id
    LEFT JOIN preparation_reviews pr ON pt.id = pr.task_id
    LEFT JOIN users rv ON pr.reviewer_id = rv.id
    WHERE pt.id = $1
  `;

  const { rows: trows } = await query(sqlT, [id]);
  const task = toPreparationTask(trows[0]);
  if (!task) return null;

  // === Lấy danh sách item ===
  const sqlI = `
    SELECT 
      pi.*, 
      il.lot_no,
      p.name AS product_name,
      p.sku_code
    FROM preparation_items pi
    LEFT JOIN inventory_lots il ON pi.lot_id = il.id
    LEFT JOIN products p ON il.product_id = p.id
    WHERE pi.task_id = $1
    ORDER BY pi.created_at
  `;
  const { rows: irows } = await query(sqlI, [id]);

  // === Gom dữ liệu trả về ===
  const review =
    trows[0].review_id && trows[0].review_result
      ? {
          id: trows[0].review_id,
          reviewerId: trows[0].reviewer_id,
          reviewerName: trows[0].reviewer_name,
          result: trows[0].review_result,
          reason: trows[0].review_reason,
          createdAt: dayjs
            .utc(trows[0].review_created_at)
            .tz("Asia/Ho_Chi_Minh")
            .format(),
          updatedAt: dayjs
            .utc(trows[0].review_updated_at)
            .tz("Asia/Ho_Chi_Minh")
            .format(),
        }
      : null;

  return {
    ...toTaskWithItems(task, irows),
    review, // ✅ Thêm review vào kết quả
  };
}

// Version dùng trong transaction
async function findTaskWithItemsByIdTx(client, id) {
  const sqlT = `
    SELECT 
      pt.*, 
      su.full_name AS supervisor_name,
      pa.full_name AS packer_name
    FROM preparation_tasks pt
    LEFT JOIN users su ON pt.supervisor_id = su.id
    LEFT JOIN users pa ON pt.packer_id = pa.id
    WHERE pt.id = $1
  `;
  const { rows: trows } = await client.query(sqlT, [id]);
  const task = toPreparationTask(trows[0]);
  if (!task) return null;

  const sqlI = `
    SELECT 
      pi.*, 
      il.lot_no,
      p.name AS product_name,
      p.sku_code
    FROM preparation_items pi
    LEFT JOIN inventory_lots il ON pi.lot_id = il.id
    LEFT JOIN products p ON il.product_id = p.id
    WHERE pi.task_id = $1
    ORDER BY pi.created_at
  `;
  const { rows: irows } = await client.query(sqlI, [id]);
  return toTaskWithItems(task, irows);
}

/**
 * Danh sách task theo bộ lọc
 */
async function listTasks(filters = {}) {
  const { q, status, supervisorId, packerId, limit = 50, offset = 0 } = filters;
  const clauses = [];
  const params = [];
  let i = 1;

  if (q) {
    clauses.push(`(
      pt.note ILIKE $${i} 
      OR su.full_name ILIKE $${i} 
      OR pa.full_name ILIKE $${i}
      OR so.order_no ILIKE $${i}
      OR c.name ILIKE $${i}
    )`);
    params.push(`%${q}%`);
    i++;
  }
  if (status) {
    clauses.push(`pt.status = $${i}`);
    params.push(status);
    i++;
  }
  if (supervisorId) {
    clauses.push(`pt.supervisor_id = $${i}`);
    params.push(supervisorId);
    i++;
  }
  if (packerId) {
    clauses.push(`pt.packer_id = $${i}`);
    params.push(packerId);
    i++;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const sql = `
    SELECT 
      pt.*,
      su.full_name AS supervisor_name,
      pa.full_name AS packer_name,
      so.order_no AS order_no,
      so.status AS order_status,
      so.sla_delivery_at AS order_sla_delivery_at,
      so.address AS order_address,
      so.phone AS order_phone,
      c.name AS customer_name,
      d.name AS department_name,
      COUNT(*) OVER() AS total_count
    FROM preparation_tasks pt
    LEFT JOIN users su ON pt.supervisor_id = su.id
    LEFT JOIN users pa ON pt.packer_id = pa.id
    LEFT JOIN sales_orders so ON pt.order_id = so.id
    LEFT JOIN customers c ON so.customer_id = c.id
    LEFT JOIN departments d ON so.department_id = d.id
    ${where}
    ORDER BY pt.created_at DESC
    LIMIT $${i} OFFSET $${i + 1};
  `;

  params.push(limit, offset);
  const { rows } = await query(sql, params);

  const total = rows.length > 0 ? Number(rows[0].total_count) || 0 : 0;

  const cleanedRows = rows.map((r) => {
    delete r.total_count;
    const task = toPreparationTask(r);
    return {
      ...task,
      salesOrder: {
        orderNo: r.order_no,
        orderStatus: r.order_status,
        slaDeliveryAt: r.order_sla_delivery_at,
        address: r.order_address,
        phone: r.order_phone,
        customerName: r.customer_name,
        departmentName: r.department_name,
      },
    };
  });

  return { rows: cleanedRows, total };
}

const updateTaskItemByPicker = async (taskId, itemId, data) => {
  const { postQty, preEvd, postEvd } = data;

  // Kiểm tra dữ liệu hợp lệ
  const qty = postQty !== undefined ? Number(postQty) : undefined;
  if (qty !== undefined && (isNaN(qty) || qty < 0)) {
    throw new Error("Số lượng hoàn thành không hợp lệ");
  }

  // Chỉ cho phép cập nhật 3 field này
  const updateFields = {};
  if (qty !== undefined) updateFields.post_qty = qty;
  if (preEvd !== undefined) updateFields.pre_evd = preEvd;
  if (postEvd !== undefined) updateFields.post_evd = postEvd;

  if (Object.keys(updateFields).length === 0) {
    throw new Error("Không có dữ liệu hợp lệ để cập nhật");
  }

  // Tạo câu lệnh SQL động
  const sql = `
    UPDATE preparation_items
    SET ${Object.keys(updateFields)
      .map((k, i) => `${k} = $${i + 1}`)
      .join(", ")}
    WHERE id = $${Object.keys(updateFields).length + 1}
      AND task_id = $${Object.keys(updateFields).length + 2}
    RETURNING *;
  `;

  const params = [...Object.values(updateFields), itemId, taskId];
  const { rows } = await query(sql, params);

  if (!rows.length) {
    throw new Error("Không tìm thấy item hoặc không thể cập nhật");
  }

  return rows[0];
};

/**
 * @desc Cập nhật kết quả review của preparation_review
 * @param {string} taskId - ID của preparation_task
 * @param {{ result?: string, reason?: string }} data - Dữ liệu cần cập nhật
 * @returns {Promise<object>} Bản ghi review sau khi cập nhật
 */
const updatePreparationReview = async (taskId, data) => {
  const { result, reason } = data;

  // Validate input
  const allowedResults = ["pending", "confirmed", "rejected"];
  if (result && !allowedResults.includes(result)) {
    throw new Error("Giá trị 'result' không hợp lệ");
  }

  // Chuẩn bị câu lệnh SQL động
  const fields = [];
  const params = [];
  let i = 1;

  if (result !== undefined) {
    fields.push(`result = $${i++}`);
    params.push(result);
  }

  if (reason !== undefined) {
    fields.push(`reason = $${i++}`);
    params.push(reason);
  }

  // Luôn cập nhật updated_at
  fields.push(`updated_at = NOW()`);

  if (fields.length === 0) {
    throw new Error("Không có dữ liệu hợp lệ để cập nhật");
  }

  params.push(taskId);

  const sql = `
    UPDATE preparation_reviews
    SET ${fields.join(", ")}
    WHERE task_id = $${i}
    RETURNING *;
  `;

  const { rows } = await query(sql, params);
  if (!rows.length) {
    throw new Error("Không tìm thấy review để cập nhật");
  }

  return rows[0];
};

/**
 * @desc Hủy task và hoàn trả tồn kho + remain trong sales_order_items
 * @param {string} taskId
 */
async function cancelTaskAndRestoreInventory(taskId) {
  return await withTransaction(async (client) => {
    // 1️⃣ Kiểm tra task tồn tại và chưa bị hủy
    const { rows: taskRows } = await client.query(
      `SELECT status FROM preparation_tasks WHERE id = $1 FOR UPDATE`,
      [taskId]
    );
    if (!taskRows.length) throw new Error("Không tìm thấy task");
    if (taskRows[0].status === "cancelled")
      throw new Error("Task đã bị hủy trước đó");

    // 2️⃣ Lấy danh sách items
    const { rows: items } = await client.query(
      `SELECT order_item_id, lot_id, pre_qty 
       FROM preparation_items 
       WHERE task_id = $1`,
      [taskId]
    );
    if (!items.length) throw new Error("Task không có item nào để hoàn trả");

    // 3️⃣ Hoàn kho và cập nhật remain cho từng item
    for (const item of items) {
      // ✅ Hoàn tồn kho
      if (item.lot_id && item.pre_qty > 0) {
        await client.query(
          `UPDATE inventory_lots
           SET qty_on_hand = qty_on_hand + $1
           WHERE id = $2`,
          [item.pre_qty, item.lot_id]
        );
      }

      // ✅ Cộng lại remain của order item
      await client.query(
        `UPDATE sales_order_items
         SET remain = remain + $1
         WHERE id = $2`,
        [item.pre_qty, item.order_item_id]
      );
    }

    // 4️⃣ Cập nhật trạng thái task sang cancelled
    await client.query(
      `UPDATE preparation_tasks
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [taskId]
    );

    return true;
  });
}


/* ===================== EXPORTS ===================== */
module.exports = {
  createTaskWithItems,
  updateTaskWithItems,
  deleteTask,
  findTaskById,
  findTaskWithItemsById,
  listTasks,
  updateTaskItemByPicker,
  updatePreparationReview,
  cancelTaskAndRestoreInventory,
};
