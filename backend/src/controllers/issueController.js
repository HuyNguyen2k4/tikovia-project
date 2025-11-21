const asyncHandler = require('express-async-handler');
const {
  createIssueWithTags,
  updateIssue,
  deleteIssue,
  addComment,
  addTag,
  findIssueById,
  listIssues,
} = require('@src/models/Issue');

/* ================================================================
   📍 CREATE ISSUE
================================================================ */
// controllers/issueController.js
exports.createIssue = asyncHandler(async (req, res) => {
  const userId = req.user?.id; // từ middleware auth
  const {
    title,            // 👈 NHẬN THÊM title
    isPublic = false,
    type,
    severity,
    description,
    mediaUrl,
    tags = [],
  } = req.body;

  // Validate cơ bản
  const ALLOWED_TYPES = ['bug', 'feature', 'task', 'other'];
  const ALLOWED_SEVERITY = ['low', 'medium', 'high'];

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Thiếu tiêu đề (title)' });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ success: false, message: 'Thiếu mô tả (description)' });
  }
  // if (!type || !ALLOWED_TYPES.includes(type)) {
  //   return res.status(400).json({ success: false, message: 'Loại issue không hợp lệ' });
  // }
  if (!severity || !ALLOWED_SEVERITY.includes(severity)) {
    return res.status(400).json({ success: false, message: 'Mức độ không hợp lệ' });
  }

  const issue = await createIssueWithTags({
    createdBy: userId,
    title: title.trim(),     // 👈 TRUYỀN title VÀO
    isPublic: !!isPublic,
    type,
    severity,
    description,
    mediaUrl: mediaUrl || null,
    tags: Array.isArray(tags) ? tags : [],
  });

  res.status(201).json({
    success: true,
    message: 'Tạo issue thành công',
    data: issue,
  });
});

/* ================================================================
   📍 UPDATE ISSUE
================================================================ */
// exports.updateIssue = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const data = req.body;

//   const updated = await updateIssue(id, data);
//   res.json({
//     success: true,
//     message: 'Cập nhật issue thành công',
//     data: updated,
//   });
// });

exports.updateIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const userId = req.user?.id; // Lấy từ middleware auth

  const updated = await updateIssue(id, {
    ...data,
    taggedBy: userId, // Người thực hiện update
  });

  res.json({
    success: true,
    message: 'Cập nhật issue thành công',
    data: updated,
  });
});

/* ================================================================
   📍 UPDATE ISSUE STATUS
================================================================ */
exports.updateIssueStatus = asyncHandler(async (req, res) => {
  const { id } = req.params; // issueId
  const { status } = req.body;
  const { updateIssueStatus } = require('@src/models/Issue');

  const ALLOWED_STATUS = ['open', 'in_progress', 'resolved', 'closed'];
  if (!status || !ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Trạng thái không hợp lệ (open, in_progress, resolved, closed)',
    });
  }

  const updated = await updateIssueStatus(id, status);

  res.json({
    success: true,
    message: 'Cập nhật trạng thái issue thành công',
    data: updated,
  });
});


/* ================================================================
   📍 DELETE ISSUE
================================================================ */
exports.deleteIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteIssue(id);
  res.json({
    success: true,
    message: 'Xóa issue thành công',
  });
});

/* ================================================================
   📍 GET ISSUE DETAIL
================================================================ */
exports.getIssueById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const issue = await findIssueById(id);
  if (!issue) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy issue' });
  }

  // 🔒 Check quyền xem
  if (!issue.isPublic) {
    const isTagged = issue.tags.some(t => t.userId === user.id);
    const isAdmin = ['admin', 'manager'].includes(user.role);

    if (!isTagged && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem issue này',
      });
    }
  }

  res.json({
    success: true,
    data: issue,
  });
});


/* ================================================================
   📍 LIST ISSUES
================================================================ */
exports.listIssues = asyncHandler(async (req, res) => {
  const user = req.user;
  const { q, status, severity, type, limit, offset } = req.query;

  const { rows, total } = await listIssues({
    q,
    status,
    severity,
    type,
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  });

  // Lọc lại ở tầng controller
  const filtered = rows.filter(issue => {
    if (issue.isPublic) return true;

    const isTagged = issue.tags.some(t => t.userId === user.id);
    const isAdmin = ['admin', 'manager'].includes(user.role);

    return isTagged || isAdmin;
  });

  res.json({
    success: true,
    total: filtered.length,
    data: filtered,
  });
});


/* ================================================================
   📍 ADD COMMENT
================================================================ */
exports.addComment = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params; // issueId
  const { content, mediaUrl } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      message: 'Nội dung comment không được để trống',
    });
  }

  // Lấy issue + tags để check quyền
  const issue = await findIssueById(id);
  if (!issue) {
    return res.status(404).json({ success: false, message: 'Issue không tồn tại' });
  }

  // 🔒 Issue private → check quyền
  if (!issue.isPublic) {
    const isTagged = issue.tags.some(t => t.userId === user.id);
    const isAdmin = ['admin', 'manager'].includes(user.role);

    if (!isTagged && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền comment vào issue private này',
      });
    }
  }

  const comment = await addComment({
    issueId: id,
    userId: user.id,
    content,
    mediaUrl,
  });

  res.status(201).json({
    success: true,
    message: 'Thêm comment thành công',
    data: comment,
  });
});

/* ================================================================
   📍 ADD TAG
================================================================ */
exports.addTag = asyncHandler(async (req, res) => {
  const taggedBy = req.user?.id;
  const { id } = req.params; // issueId
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu userId để tag',
    });
  }

  const tag = await addTag({
    issueId: id,
    userId,
    taggedBy,
  });

  res.status(201).json({
    success: true,
    message: 'Tag người dùng thành công',
    data: tag,
  });
});

/* ================================================================
   💬 COMMENT CRUD
================================================================ */

/**
 * @desc Lấy danh sách comment của 1 issue
 * @route GET /api/issues/:id/comments
 * @access Private (mọi role đăng nhập)
 */
exports.listComments = asyncHandler(async (req, res) => {
  const { id } = req.params; // issueId
  const { listCommentsByIssue } = require('@src/models/Issue');
  const comments = await listCommentsByIssue(id);

  res.json({
    success: true,
    data: comments,
  });
});

/**
 * @desc Lấy chi tiết 1 comment
 * @route GET /api/issues/:issueId/comments/:commentId
 * @access Private
 */
exports.getCommentById = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { findCommentById } = require('@src/models/Issue');
  const comment = await findCommentById(commentId);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy comment',
    });
  }

  res.json({
    success: true,
    data: comment,
  });
});

/**
 * @desc Cập nhật comment (chỉ người tạo hoặc admin/manager)
 * @route PUT /api/issues/:issueId/comments/:commentId
 * @access Private (admin, manager, hoặc chính chủ comment)
 */
exports.updateComment = asyncHandler(async (req, res) => {
  const user = req.user;
  const { issueId, commentId } = req.params;
  const { content, mediaUrl } = req.body;
  const { findCommentById, updateComment } = require('@src/models/Issue');

  const existing = await findCommentById(commentId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy comment để cập nhật',
    });
  }

  // Kiểm tra quyền chỉnh sửa
  if (existing.userId !== user.id && !['admin', 'manager'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền chỉnh sửa comment này',
    });
  }

  const updated = await updateComment(commentId, { content, mediaUrl });

  res.json({
    success: true,
    message: 'Cập nhật comment thành công',
    data: updated,
  });
});

/**
 * @desc Xóa comment
 * @route DELETE /api/issues/:issueId/comments/:commentId
 * @access Private (admin, manager, hoặc chính chủ comment)
 */
exports.deleteComment = asyncHandler(async (req, res) => {
  const user = req.user;
  const { issueId, commentId } = req.params;
  const { findCommentById, deleteComment } = require('@src/models/Issue');

  const existing = await findCommentById(commentId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Comment không tồn tại',
    });
  }

  // Kiểm tra quyền xóa
  if (existing.userId !== user.id && !['admin', 'manager'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền xóa comment này',
    });
  }

  await deleteComment(commentId);

  res.json({
    success: true,
    message: 'Xóa comment thành công',
  });
});
