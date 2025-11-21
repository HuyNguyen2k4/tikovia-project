const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const formatToVN = (date) =>
  date ? dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format() : null;

/* ================================================================
   🧩 MAPPER FUNCTIONS
================================================================ */
function toIssueTicket(row) {
  if (!row) return null;
  return {
    id: row.id,
    ticketNo: row.ticket_no,
    createdBy: row.created_by,
    title: row.title, // 🆕 thêm dòng này
    isPublic: row.is_public,
    type: row.type,
    severity: row.severity,
    status: row.status,
    description: row.description,
    mediaUrl: row.media_url,
    createdAt: formatToVN(row.created_at),
    updatedAt: formatToVN(row.updated_at),
    createdByName: row.created_by_name || null,
  };
}

function toIssueComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    issueId: row.issue_id,
    userId: row.user_id,
    content: row.content,
    mediaUrl: row.media_url,
    createdAt: formatToVN(row.created_at),
    userName: row.user_name || null,
  };
}

function toIssueTag(row) {
  if (!row) return null;
  return {
    id: row.id,
    issueId: row.issue_id,
    userId: row.user_id,
    taggedBy: row.tagged_by,
    createdAt: formatToVN(row.created_at),
    userName: row.user_name || null,
    taggedByName: row.tagged_by_name || null,
  };
}

/* ================================================================
   🧱 CORE CRUD
================================================================ */

/** 🔹 Tạo issue + tags (optional) */
async function createIssueWithTags({ createdBy, title, isPublic, type, severity, description, mediaUrl, tags = [] }) {
  return await withTransaction(async (client) => {
    // 1️⃣ Tạo ticket_no tự động (ISS-YYYYMMDD-xxxx)
    const ticketNo = `ISS-${dayjs().format('YYMMDD')}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    // 2️⃣ Tạo issue chính
    const issueSql = `
      INSERT INTO issue_tickets (ticket_no, created_by, title, is_public, type, severity, description, media_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const { rows: issueRows } = await client.query(issueSql, [
      ticketNo,
      createdBy,
      title,
      isPublic,
      type,
      severity,
      description,
      mediaUrl,
    ]);
    const issue = issueRows[0];

    // 3️⃣ Gắn tag (nếu có)
    for (const tagUserId of tags) {
      await client.query(
        `INSERT INTO issue_tags (issue_id, user_id, tagged_by) VALUES ($1, $2, $3)`,
        [issue.id, tagUserId, createdBy]
      );
    }

    return findIssueByIdTx(client, issue.id);
  });
}

/** 🔹 Cập nhật issue */
// async function updateIssue(issueId, data) {
//   const fields = [];
//   const params = [];
//   let i = 1;

//   const map = {
//     title: 'title',
//     isPublic: 'is_public',
//     type: 'type',
//     severity: 'severity',
//     status: 'status',
//     description: 'description',
//     mediaUrl: 'media_url',
//   };

//   for (const [key, col] of Object.entries(map)) {
//     if (data[key] !== undefined) {
//       fields.push(`${col} = $${i++}`);
//       params.push(data[key]);
//     }
//   }

//   if (fields.length === 0) throw new Error('Không có dữ liệu để cập nhật');

//   params.push(issueId);
//   const sql = `
//     UPDATE issue_tickets 
//     SET ${fields.join(', ')}, updated_at = NOW()
//     WHERE id = $${i}
//     RETURNING *;
//   `;

//   const { rows } = await query(sql, params);
//   return toIssueTicket(rows[0]);
// }
/** 🔹 Cập nhật issue (kèm tags) */
/** 🔹 Cập nhật issue (kèm tags) */
async function updateIssue(issueId, data) {
  return await withTransaction(async (client) => {
    // 1️⃣ Cập nhật các trường của issue
    const fields = [];
    const params = [];
    let i = 1;

    const map = {
      title: 'title',
      isPublic: 'is_public',
      type: 'type',
      severity: 'severity',
      status: 'status',
      description: 'description',
      mediaUrl: 'media_url',
    };

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${i++}`);
        params.push(data[key]);
      }
    }

    if (fields.length > 0) {
      params.push(issueId);
      const sql = `
        UPDATE issue_tickets 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${i}
        RETURNING *;
      `;
      await client.query(sql, params);
    }

    // 2️⃣ Cập nhật tags (nếu có) - ĐỐI CHIẾU VÀ CHỈ CÁP NHẬT PHẦN THAY ĐỔI
    if (data.tags !== undefined && Array.isArray(data.tags)) {
      // Lấy danh sách tag hiện tại
      const { rows: existingTags } = await client.query(
        `SELECT user_id FROM issue_tags WHERE issue_id = $1`,
        [issueId]
      );
      const existingUserIds = existingTags.map(t => t.user_id);

      // Tìm những tag cần XÓA (có trong DB nhưng không có trong data.tags)
      const tagsToRemove = existingUserIds.filter(userId => !data.tags.includes(userId));

      // Tìm những tag cần THÊM (có trong data.tags nhưng chưa có trong DB)
      const tagsToAdd = data.tags.filter(userId => !existingUserIds.includes(userId));

      // Xóa những tag không còn
      for (const userId of tagsToRemove) {
        await client.query(
          `DELETE FROM issue_tags WHERE issue_id = $1 AND user_id = $2`,
          [issueId, userId]
        );
      }

      // Thêm những tag mới
      for (const userId of tagsToAdd) {
        await client.query(
          `INSERT INTO issue_tags (issue_id, user_id, tagged_by) VALUES ($1, $2, $3)`,
          [issueId, userId, data.taggedBy]
        );
      }
    }

    // 3️⃣ Lấy lại issue đầy đủ (kèm tags)
    return await findIssueByIdTx(client, issueId);
  });
}

/** Dùng trong transaction - lấy issue đầy đủ */
async function findIssueByIdTx(client, id) {
  const { rows: issueRows } = await client.query(
    `
    SELECT i.*, u.full_name AS created_by_name
    FROM issue_tickets i
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.id = $1
  `,
    [id]
  );
  const issue = toIssueTicket(issueRows[0]);
  if (!issue) return null;

  const { rows: tagRows } = await client.query(
    `
    SELECT t.*, u.full_name AS user_name, tb.full_name AS tagged_by_name
    FROM issue_tags t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN users tb ON t.tagged_by = tb.id
    WHERE t.issue_id = $1
  `,
    [id]
  );

  return {
    ...issue,
    tags: tagRows.map(toIssueTag),
  };
}

/** 🔹 Xóa issue (và comment/tag liên quan) */
async function deleteIssue(issueId) {
  return await withTransaction(async (client) => {
    await client.query(`DELETE FROM issue_comments WHERE issue_id = $1`, [issueId]);
    await client.query(`DELETE FROM issue_tags WHERE issue_id = $1`, [issueId]);
    await client.query(`DELETE FROM issue_tickets WHERE id = $1`, [issueId]);
    return true;
  });
}

/** 🔹 Thêm comment vào issue */
async function addComment({ issueId, userId, content, mediaUrl }) {
  const sql = `
    INSERT INTO issue_comments (issue_id, user_id, content, media_url)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const { rows } = await query(sql, [issueId, userId, content, mediaUrl]);
  return toIssueComment(rows[0]);
}

/** 🔹 Thêm tag cho issue */
async function addTag({ issueId, userId, taggedBy }) {
  const sql = `
    INSERT INTO issue_tags (issue_id, user_id, tagged_by)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const { rows } = await query(sql, [issueId, userId, taggedBy]);
  return toIssueTag(rows[0]);
}

/* ================================================================
   🔍 QUERY
================================================================ */

/** Lấy issue theo id (kèm comments + tags) */
// async function findIssueById(id) {
//   const { rows: issueRows } = await query(
//     `
//     SELECT i.*, u.full_name AS created_by_name
//     FROM issue_tickets i
//     LEFT JOIN users u ON i.created_by = u.id
//     WHERE i.id = $1
//   `,
//     [id]
//   );
//   const issue = toIssueTicket(issueRows[0]);
//   if (!issue) return null;

//   const { rows: commentRows } = await query(
//     `
//     SELECT c.*, u.full_name AS user_name
//     FROM issue_comments c
//     LEFT JOIN users u ON c.user_id = u.id
//     WHERE c.issue_id = $1
//     ORDER BY c.created_at ASC
//   `,
//     [id]
//   );

//   const { rows: tagRows } = await query(
//     `
//     SELECT t.*, u.full_name AS user_name, tb.full_name AS tagged_by_name
//     FROM issue_tags t
//     LEFT JOIN users u ON t.user_id = u.id
//     LEFT JOIN users tb ON t.tagged_by = tb.id
//     WHERE t.issue_id = $1
//   `,
//     [id]
//   );

//   return {
//     ...issue,
//     comments: commentRows.map(toIssueComment),
//     tags: tagRows.map(toIssueTag),
//   };
// }
/** Lấy issue theo id (kèm comments + tags + thông tin user đầy đủ) */
async function findIssueById(id) {
  const { rows: issueRows } = await query(
    `
    SELECT 
      i.*,
      u.id AS creator_id,
      u.full_name AS created_by_name,
      u.email AS creator_email,
      u.avatar AS creator_avatar,
      u.role AS creator_role,
      u.phone AS creator_phone,
      u.department_id AS creator_department_id,
      d.name AS creator_department_name
    FROM issue_tickets i
    LEFT JOIN users u ON i.created_by = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE i.id = $1
  `,
    [id]
  );
  
  if (!issueRows.length) return null;
  
  const row = issueRows[0];
  const issue = {
    ...toIssueTicket(row),
    creator: {
      id: row.creator_id,
      fullName: row.created_by_name,
      email: row.creator_email,
      avatar: row.creator_avatar,
      role: row.creator_role,
      phone: row.creator_phone,
      departmentId: row.creator_department_id,
      departmentName: row.creator_department_name,
    }
  };

  const { rows: commentRows } = await query(
    `
    SELECT 
      c.*,
      u.full_name AS user_name,
      u.email AS user_email,
      u.avatar AS user_avatar,
      u.role AS user_role
    FROM issue_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.issue_id = $1
    ORDER BY c.created_at ASC
  `,
    [id]
  );

  const { rows: tagRows } = await query(
    `
    SELECT 
      t.*,
      u.full_name AS user_name,
      u.email AS user_email,
      u.avatar AS user_avatar,
      tb.full_name AS tagged_by_name,
      tb.email AS tagged_by_email,
      tb.avatar AS tagged_by_avatar
    FROM issue_tags t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN users tb ON t.tagged_by = tb.id
    WHERE t.issue_id = $1
  `,
    [id]
  );

  return {
    ...issue,
    comments: commentRows.map(comment => ({
      ...toIssueComment(comment),
      user: {
        name: comment.user_name,
        email: comment.user_email,
        avatar: comment.user_avatar,
        role: comment.user_role,
      }
    })),
    tags: tagRows.map(tag => ({
      ...toIssueTag(tag),
      user: {
        name: tag.user_name,
        email: tag.user_email,
        avatar: tag.user_avatar,
      },
      taggedByUser: {
        name: tag.tagged_by_name,
        email: tag.tagged_by_email,
        avatar: tag.tagged_by_avatar,
      }
    })),
  };
}

/** Dùng trong transaction */
// async function findIssueByIdTx(client, id) {
//   const { rows } = await client.query(
//     `SELECT * FROM issue_tickets WHERE id = $1`,
//     [id]
//   );
//   return toIssueTicket(rows[0]);
// }

/** Danh sách issue theo filter */
// async function listIssues(filters = {}) {
//   const { q, status, severity, type, limit = 50, offset = 0 } = filters;
//   const clauses = [];
//   const params = [];
//   let i = 1;

//   if (q) {
//     clauses.push(`(i.title ILIKE $${i} OR i.description ILIKE $${i} OR u.full_name ILIKE $${i})`);
//     params.push(`%${q}%`);
//     i++;
//   }
//   if (status) {
//     clauses.push(`i.status = $${i}`);
//     params.push(status);
//     i++;
//   }
//   if (severity) {
//     clauses.push(`i.severity = $${i}`);
//     params.push(severity);
//     i++;
//   }
//   if (type) {
//     clauses.push(`i.type = $${i}`);
//     params.push(type);
//     i++;
//   }

//   const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

//   const sql = `
//     SELECT i.*, u.full_name AS created_by_name,
//            COUNT(*) OVER() AS total_count
//     FROM issue_tickets i
//     LEFT JOIN users u ON i.created_by = u.id
//     ${where}
//     ORDER BY i.created_at DESC
//     LIMIT $${i} OFFSET $${i + 1};
//   `;

//   params.push(limit, offset);
//   const { rows } = await query(sql, params);
//   const total = rows.length ? Number(rows[0].total_count) || 0 : 0;

//   return {
//     rows: rows.map(toIssueTicket),
//     total,
//   };
// }
async function listIssues(filters = {}) {
  const { q, status, severity, type, limit = 50, offset = 0 } = filters;
  const clauses = [];
  const params = [];
  let i = 1;

  if (q) {
    clauses.push(`(i.title ILIKE $${i} OR i.description ILIKE $${i} OR u.full_name ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }
  if (status) {
    clauses.push(`i.status = $${i}`);
    params.push(status);
    i++;
  }
  if (severity) {
    clauses.push(`i.severity = $${i}`);
    params.push(severity);
    i++;
  }
  if (type) {
    clauses.push(`i.type = $${i}`);
    params.push(type);
    i++;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const sql = `
    SELECT i.*, u.full_name AS created_by_name,
           COUNT(*) OVER() AS total_count,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', t.id,
                 'userId', t.user_id,
                 'userName', tu.full_name,
                 'taggedBy', t.tagged_by,
                 'taggedByName', tbu.full_name,
                 'createdAt', t.created_at
               )
             ) FILTER (WHERE t.id IS NOT NULL),
             '[]'::json
           ) AS tags
    FROM issue_tickets i
    LEFT JOIN users u ON i.created_by = u.id
    LEFT JOIN issue_tags t ON i.id = t.issue_id
    LEFT JOIN users tu ON t.user_id = tu.id
    LEFT JOIN users tbu ON t.tagged_by = tbu.id
    ${where}
    GROUP BY i.id, u.full_name
    ORDER BY i.created_at DESC
    LIMIT $${i} OFFSET $${i + 1};
  `;

  params.push(limit, offset);
  const { rows } = await query(sql, params);
  const total = rows.length ? Number(rows[0].total_count) || 0 : 0;

  return {
    rows: rows.map(row => ({
      ...toIssueTicket(row),
      tags: row.tags || []
    })),
    total,
  };
}
/* ================================================================
   💬 ISSUE COMMENTS CRUD
================================================================ */

/** 🔹 Lấy comment theo ID */
async function findCommentById(id) {
  const sql = `
    SELECT c.*, u.full_name AS user_name
    FROM issue_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = $1;
  `;
  const { rows } = await query(sql, [id]);
  return toIssueComment(rows[0]);
}

/** 🔹 Lấy danh sách comment theo issue_id */
async function listCommentsByIssue(issueId) {
  const sql = `
    SELECT c.*, u.full_name AS user_name
    FROM issue_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.issue_id = $1
    ORDER BY c.created_at ASC;
  `;
  const { rows } = await query(sql, [issueId]);
  return rows.map(toIssueComment);
}

/** 🔹 Cập nhật comment (chỉ cho phép chỉnh content/media_url) */
async function updateComment(commentId, data) {
  const fields = [];
  const params = [];
  let i = 1;

  if (data.content !== undefined) {
    fields.push(`content = $${i++}`);
    params.push(data.content);
  }
  if (data.mediaUrl !== undefined) {
    fields.push(`media_url = $${i++}`);
    params.push(data.mediaUrl);
  }

  if (fields.length === 0) throw new Error('Không có dữ liệu để cập nhật comment');

  params.push(commentId);
  const sql = `
    UPDATE issue_comments
    SET ${fields.join(', ')}, created_at = created_at -- giữ nguyên thời gian cũ
    WHERE id = $${i}
    RETURNING *;
  `;
  const { rows } = await query(sql, params);
  return toIssueComment(rows[0]);
}

/** 🔹 Xóa comment */
async function deleteComment(commentId) {
  const sql = `DELETE FROM issue_comments WHERE id = $1 RETURNING id;`;
  const { rows } = await query(sql, [commentId]);
  return rows.length > 0;
}

/** 🔹 Cập nhật trạng thái issue */
async function updateIssueStatus(issueId, newStatus) {
  const ALLOWED_STATUS = ['open', 'in_progress', 'resolved', 'closed'];

  if (!ALLOWED_STATUS.includes(newStatus)) {
    throw new Error('Trạng thái issue không hợp lệ');
  }

  const sql = `
    UPDATE issue_tickets
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  const { rows } = await query(sql, [newStatus, issueId]);
  if (!rows.length) throw new Error('Không tìm thấy issue để cập nhật');

  return toIssueTicket(rows[0]);
}

async function canViewIssue(userId, issue) {
  if (!issue.isPublic) {
    // Nếu private → chỉ cho admin/manager hoặc người được tag
    if (['admin', 'manager'].includes(issue.creator?.role)) return true;
    if (issue.tags.some(tag => tag.userId === userId)) return true;
    return false;
  }
  return true; // public → ai cũng xem được
}


/* ================================================================
   📤 EXPORTS
================================================================ */
module.exports = {
  createIssueWithTags,
  updateIssue,
  deleteIssue,
  addComment,
  addTag,
  findIssueById,
  listIssues,
  findCommentById,
  listCommentsByIssue,
  updateComment,
  deleteComment,
  updateIssueStatus,
  canViewIssue,
};
