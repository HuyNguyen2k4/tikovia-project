import apiClient from "./apiClient";

/* ============================================================
   🔹 MAIN CRUD OPERATIONS
   ============================================================ */

/**
 * Lấy danh sách preparation tasks với phân trang & filter
 * @route GET /api/tasks
 * @query q?, status?, supervisorId?, packerId?, limit?, offset?
 */
export const listTasks = (params = {}) => {
  return apiClient.get("/tasks", { params });
};

/**
 * Lấy chi tiết 1 preparation task kèm danh sách items
 * @route GET /api/tasks/:id
 */
export const getTaskById = (id) => {
  return apiClient.get(`/tasks/${id}`);
};

/**
 * Lấy danh sách items của 1 preparation task
 * @route GET /api/tasks/:id/items
 */
export const getItemsByTask = (id) => {
  return apiClient.get(`/tasks/${id}/items`);
};

/**
 * Tạo preparation task mới (gồm danh sách items)
 * @route POST /api/tasks
 * @body { orderId, packerId, deadline, note?, items[] }
 * ⚠️ supervisorId sẽ được lấy từ JWT (server xác định)
 */
export const createTask = (taskData) => {
  return apiClient.post("/tasks", taskData);
};

/**
 * Cập nhật thông tin + items của preparation task
 * @route PUT /api/tasks/:id
 * @body { packerId?, status?, deadline?, note?, startedAt?, completedAt?, items[]? }
 */
export const updateTask = (id, taskData) => {
  return apiClient.put(`/tasks/${id}`, taskData);
};

/**
 * Picker cập nhật 1 item trong task (số lượng + ảnh)
 * @route PUT /api/tasks/:taskId/items/:itemId
 * @body { postQty?, preEvd?, postEvd? }
 */
export const updateTaskItemByPicker = (taskId, itemId, data) => {
  return apiClient.put(`/tasks/${taskId}/items/${itemId}`, data);
};

/**
 * Cập nhật trạng thái của preparation task
 * @route PATCH /api/tasks/:id/status
 * @body { status: string }
 */
export const updateTaskStatus = (id, status) => {
  return apiClient.patch(`/tasks/${id}/status`, { status });
};

/**
 * Cập nhật kết quả review của preparation task
 * @route PATCH /api/tasks/:id/review
 * @body { result: 'pending' | 'confirmed' | 'rejected', reason?: string }
 */
export const updateTaskReview = (id, data) => {
  return apiClient.patch(`/tasks/${id}/review`, data);
};

/**
 * Xóa preparation task (và toàn bộ items liên quan)
 * @route DELETE /api/tasks/:id
 */
export const deleteTask = (id) => {
  return apiClient.delete(`/tasks/${id}`);
};

/* ============================================================
   🔹 ANALYTICS / DASHBOARD
   ============================================================ */

/**
 * Lấy thống kê tổng quan các preparation tasks
 * @route GET /api/tasks/stats/overview
 */
export const getTaskStatsOverview = (params = {}) => {
  return apiClient.get("/tasks/stats/overview", { params });
};

/**
 * Lấy thống kê task theo người dùng (supervisor hoặc packer)
 * @route GET /api/tasks/stats/by-user/:userId
 */
export const getTaskStatsByUser = (userId) => {
  return apiClient.get(`/tasks/stats/by-user/${userId}`);
};

/* ============================================================
   🔹 HELPER QUERIES
   ============================================================ */

/**
 * Lọc task theo supervisorId
 * @route GET /api/tasks?supervisorId=:id
 */
export const getTasksBySupervisor = (supervisorId, params = {}) => {
  return apiClient.get("/tasks", { params: { supervisorId, ...params } });
};

/**
 * Lọc task theo packerId
 * @route GET /api/tasks?packerId=:id
 */
export const getTasksByPacker = (packerId, params = {}) => {
  return apiClient.get("/tasks", { params: { packerId, ...params } });
};

/**
 * Lấy toàn bộ task của supervisor đang đăng nhập (theo JWT)
 * @route GET /api/tasks/mine/supervisor
 */
export const getTasksByCurrentSupervisor = (params = {}) => {
  return apiClient.get("/tasks/mine/supervisor", { params });
};

/**
 * Lấy toàn bộ task của packer đang đăng nhập (theo JWT)
 * @route GET /api/tasks/mine/packer
 */
export const getTasksByCurrentPacker = (params = {}) => {
  return apiClient.get("/tasks/mine/packer", { params });
};

/**
 * @desc Lấy tổng số lượng đã post cho một order item trong tất cả các tasks
 * @route GET /api/tasks/order-item/:orderItemId/post-qty
 * @access Private (any authenticated user)
 */
export const getTotalPostedQtyForOrderItem = (orderItemId) => {
  return apiClient.get(`/tasks/order-item/${orderItemId}/post-qty`);
};