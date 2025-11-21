const router = require('express').Router();
const ctrls = require('@controllers/issueController');
const tokenUtils = require('@middlewares/jwt');

/* -------------------- ✅ MAIN CRUD ROUTES -------------------- */

/**
 * @desc Lấy danh sách issues (có filter & phân trang)
 * @route GET /api/issues
 * @query q?, status?, severity?, type?, limit?, offset?
 * @access Private (admin, manager)
 */
router.get(
  '/',
  [
    tokenUtils.verifyAccessToken,
    // tokenUtils.checkRole(['admin', 'manager']),
  ],
  ctrls.listIssues
);

/**
 * @desc Tạo issue mới
 * @route POST /api/issues
 * @body isPublic, type, severity, description, mediaUrl?, tags[]
 * @access Private (mọi user có quyền report)
 */
router.post(
  '/',
  [
    tokenUtils.verifyAccessToken,
    // tokenUtils.checkRole([
    //   'admin',
    //   'manager',
    //   'picker',
    //   'sup_picker',
    //   'sup_shipper',
    //   'seller',
    // ]),
  ],
  ctrls.createIssue
);

/**
 * @desc Lấy chi tiết 1 issue (kèm comments & tags)
 * @route GET /api/issues/:id
 * @access Private (mọi role đăng nhập)
 */
router.get(
  '/:id',
  [
    tokenUtils.verifyAccessToken,
    // tokenUtils.checkRole([
    //   'admin',
    //   'manager',
    //   'picker',
    //   'sup_picker',
    //   'accountant',
    //   'seller',
    // ]),
  ],
  ctrls.getIssueById
);

/**
 * @desc Cập nhật issue (chỉ người tạo hoặc admin/manager)
 * @route PUT /api/issues/:id
 * @access Private (admin, manager)
 */
router.put(
  '/:id',
  [tokenUtils.verifyAccessToken, 
    // tokenUtils.checkRole(['admin', 'manager'])
  ],
  ctrls.updateIssue
);

/**
 * @desc Cập nhật trạng thái issue (open / in_progress / resolved / closed)
 * @route PATCH /api/issues/:id/status
 * @access Private (admin, manager)
 */
router.patch(
  '/:id/status',
  [tokenUtils.verifyAccessToken],
  ctrls.updateIssueStatus
);


/**
 * @desc Xóa issue (và comment/tag liên quan)
 * @route DELETE /api/issues/:id
 * @access Private (admin, manager)
 */
router.delete(
  '/:id',
  [tokenUtils.verifyAccessToken,
    //  tokenUtils.checkRole(['admin', 'manager'])
    ],
  ctrls.deleteIssue
);

/* -------------------- ✅ COMMENT & TAG ROUTES -------------------- */

/**
 * @desc Thêm comment vào issue
 * @route POST /api/issues/:id/comments
 * @access Private (mọi role đăng nhập)
 */
router.post(
  '/:id/comments',
  [
    tokenUtils.verifyAccessToken,
    // tokenUtils.checkRole([
    //   'admin',
    //   'manager',
    //   'picker',
    //   'sup_picker',
    //   'seller',
    // ]),
  ],
  ctrls.addComment
);

/**
 * @desc Tag người dùng vào issue
 * @route POST /api/issues/:id/tags
 * @body userId
 * @access Private (admin, manager)
 */
router.post(
  '/:id/tags',
  [
    tokenUtils.verifyAccessToken,
    // tokenUtils.checkRole(['admin', 'manager']),
  ],
  ctrls.addTag
);



/* -------------------- 💬 COMMENT CRUD ROUTES -------------------- */

/**
 * @desc Lấy danh sách comment của 1 issue
 * @route GET /api/issues/:id/comments
 * @access Private (mọi role đăng nhập)
 */
router.get(
  '/:id/comments',
  [
    tokenUtils.verifyAccessToken,
    // tokenUtils.checkRole([
    //   'admin',
    //   'manager',
    //   'picker',
    //   'sup_picker',
    //   'seller',
    // ]),
  ],
  ctrls.listComments
);

/**
 * @desc Lấy chi tiết 1 comment
 * @route GET /api/issues/:issueId/comments/:commentId
 */
router.get(
  '/:issueId/comments/:commentId',
  [
    tokenUtils.verifyAccessToken,
    // tokenUtils.checkRole([
    //   'admin',
    //   'manager',
    //   'picker',
    //   'sup_picker',
    //   'seller',
    // ]),
  ],
  ctrls.getCommentById
);

/**
 * @desc Cập nhật comment (nội dung hoặc media)
 * @route PUT /api/issues/:issueId/comments/:commentId
 * @access Private (admin, manager, hoặc chính chủ comment)
 */
router.put(
  '/:issueId/comments/:commentId',
  [
    tokenUtils.verifyAccessToken,
    // tokenUtils.checkRole([
    //   'admin',
    //   'manager',
    //   'picker',
    //   'sup_picker',
    //   'seller',
    // ]),
  ],
  ctrls.updateComment
);

/**
 * @desc Xóa comment
 * @route DELETE /api/issues/:issueId/comments/:commentId
 * @access Private (admin, manager, hoặc chính chủ comment)
 */
router.delete(
  '/:issueId/comments/:commentId',
  [
    tokenUtils.verifyAccessToken,
    // tokenUtils.checkRole([
    //   'admin',
    //   'manager',
    //   'picker',
    //   'sup_picker',
    //   'seller',
    // ]),
  ],
  ctrls.deleteComment
);

module.exports = router;

