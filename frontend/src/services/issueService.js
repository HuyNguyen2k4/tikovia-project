import apiClient from "./apiClient";

/* ============================================================
   🔹 MAIN CRUD OPERATIONS
   ============================================================ */

/**
 * Lấy danh sách issues với filter & phân trang
 * @route GET /api/issues
 * @query q?, status?, severity?, type?, limit?, offset?
 */
export const listIssues = (params = {}) => {
  return apiClient.get("/issues", { params });
};

/**
 * Lấy chi tiết 1 issue (kèm comments & tags)
 * @route GET /api/issues/:id
 */
export const getIssueById = (id) => {
  return apiClient.get(`/issues/${id}`);
};

/**
 * Tạo issue mới
 * @route POST /api/issues
 * @body { isPublic, type, severity, description, mediaUrl?, tags? }
 */
export const createIssue = (data) => {
  return apiClient.post("/issues", data);
};

/**
 * Cập nhật issue
 * @route PUT /api/issues/:id
 * @body { isPublic?, type?, severity?, status?, description?, mediaUrl? }
 */
export const updateIssue = (id, data) => {
  return apiClient.put(`/issues/${id}`, data);
};

/**
 * Cập nhật trạng thái issue
 * @route PATCH /api/issues/:id/status
 * @body { status }
 */
export const updateIssueStatus = (id, status) => {
  return apiClient.patch(`/issues/${id}/status`, { status });
};


/**
 * Xóa issue
 * @route DELETE /api/issues/:id
 */
export const deleteIssue = (id) => {
  return apiClient.delete(`/issues/${id}`);
};

/* ============================================================
   🔹 COMMENT & TAG OPERATIONS
   ============================================================ */

/**
 * Thêm comment vào issue
 * @route POST /api/issues/:id/comments
 * @body { content, mediaUrl? }
 */
export const addIssueComment = (issueId, data) => {
  return apiClient.post(`/issues/${issueId}/comments`, data);
};

/**
 * Thêm tag người dùng vào issue
 * @route POST /api/issues/:id/tags
 * @body { userId }
 */
export const addIssueTag = (issueId, data) => {
  return apiClient.post(`/issues/${issueId}/tags`, data);
};


/* ============================================================
   💬 COMMENT CRUD OPERATIONS
   ============================================================ */

/**
 * Lấy danh sách comment của 1 issue
 * @route GET /api/issues/:issueId/comments
 */
export const listIssueComments = (issueId) => {
  return apiClient.get(`/issues/${issueId}/comments`);
};

/**
 * Lấy chi tiết 1 comment
 * @route GET /api/issues/:issueId/comments/:commentId
 */
export const getIssueCommentById = (issueId, commentId) => {
  return apiClient.get(`/issues/${issueId}/comments/${commentId}`);
};

/**
 * Cập nhật comment
 * @route PUT /api/issues/:issueId/comments/:commentId
 * @body { content?, mediaUrl? }
 */
export const updateIssueComment = (issueId, commentId, data) => {
  return apiClient.put(`/issues/${issueId}/comments/${commentId}`, data);
};

/**
 * Xóa comment
 * @route DELETE /api/issues/:issueId/comments/:commentId
 */
export const deleteIssueComment = (issueId, commentId) => {
  return apiClient.delete(`/issues/${issueId}/comments/${commentId}`);
};
