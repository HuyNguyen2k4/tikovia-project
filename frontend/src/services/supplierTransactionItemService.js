import apiClient from "./apiClient";

/* ============================================================
   🔹 BASIC CRUD OPERATIONS
   ============================================================ */

/**
 * Lấy item theo ID
 * @param {string} id - UUID của item
 */
export const getSupplierTransactionItemById = (id) => {
  return apiClient.get(`/supplier-transaction-items/${id}`);
};

/**
 * Tạo item mới
 * @param {Object} data - { transId, productId, lotId, qty, unitPrice }
 */
export const createSupplierTransactionItem = (data) => {
  return apiClient.post("/supplier-transaction-items", data);
};

/**
 * Cập nhật item
 * @param {string} id - UUID của item
 * @param {Object} data - Dữ liệu cần cập nhật
 */
export const updateSupplierTransactionItem = (id, data) => {
  return apiClient.put(`/supplier-transaction-items/${id}`, data);
};

/**
 * Xóa item theo ID
 * @param {string} id - UUID của item
 */
export const deleteSupplierTransactionItem = (id) => {
  return apiClient.delete(`/supplier-transaction-items/${id}`);
};

/**
 * Xóa tất cả items của một transaction
 * @param {string} transId - UUID của transaction
 */
export const deleteItemsByTransactionId = (transId) => {
  return apiClient.delete(`/supplier-transaction-items/transaction/${transId}`);
};

/* ============================================================
   🔹 BULK OPERATIONS
   ============================================================ */

/**
 * Xóa nhiều items cùng lúc
 * @param {string[]} ids - Danh sách ID items
 */
export const deleteBulkSupplierTransactionItems = (ids) => {
  return apiClient.delete("/supplier-transaction-items/bulk", { data: { ids } });
};

/* ============================================================
   🔹 SPECIALIZED QUERIES
   ============================================================ */

/**
 * Lấy danh sách items theo transaction ID
 * @param {string} transId - UUID transaction
 */
export const getItemsByTransactionId = (transId) => {
  return apiClient.get(`/supplier-transaction-items/transaction/${transId}`);
};

/**
 * Lấy danh sách items theo product ID
 * @param {string} productId - UUID product
 * @param {Object} params - { limit, offset }
 */
export const getItemsByProductId = (productId, params = {}) => {
  return apiClient.get(`/supplier-transaction-items/product/${productId}`, { params });
};

/**
 * Lấy danh sách items theo lot ID
 * @param {string} lotId - UUID lot
 */
export const getItemsByLotId = (lotId) => {
  return apiClient.get(`/supplier-transaction-items/lot/${lotId}`);
};

/**
 * Lấy thống kê items theo sản phẩm
 */
export const getItemStatsByProduct = () => {
  return apiClient.get("/supplier-transaction-items/stats/by-product");
};

/**
 * Tính tổng giá trị của một transaction
 * @param {string} transId - UUID transaction
 */
export const calculateTransactionTotal = (transId) => {
  return apiClient.get(`/supplier-transaction-items/transaction/${transId}/total`);
};
