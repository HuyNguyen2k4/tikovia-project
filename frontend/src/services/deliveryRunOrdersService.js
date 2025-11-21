import apiClient from "./apiClient";

/**
 * Bắt đầu giao hàng cho một order
 * @param {string} orderId - ID của delivery run order
 * @returns {Promise} - Response từ API
 */
export const startDeliveryRunOrder = async (orderId) => {
  try {
    const response = await apiClient.patch(`/delivery-run-orders/${orderId}/start`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Hoàn thành giao hàng cho một order
 * @param {string} orderId - ID của delivery run order
 * @param {Object} data - Dữ liệu hoàn thành giao hàng
 * @param {number} data.actualPay - Số tiền thực tế thu được
 * @param {string} data.evdUrl - URL ảnh chứng minh
 * @param {string} data.note - Ghi chú
 * @returns {Promise} - Response từ API
 */
export const completeDeliveryRunOrder = async (orderId, data = {}) => {
  try {
    const response = await apiClient.patch(`/delivery-run-orders/${orderId}/complete`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Hủy giao hàng cho một order (chỉ admin)
 * @param {string} orderId - ID của delivery run order
 * @param {Object} data - Dữ liệu hủy giao hàng
 * @param {string} data.note - Lý do hủy (optional)
 * @returns {Promise} - Response từ API
 */
export const cancelDeliveryRunOrder = async (orderId, data = {}) => {
  try {
    const response = await apiClient.patch(`/delivery-run-orders/${orderId}/cancel`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Đánh dấu giao hàng thất bại (chỉ admin)
 * @param {string} orderId - ID của delivery run order
 * @param {Object} data - Dữ liệu thất bại
 * @param {string} data.note - Lý do thất bại (required)
 * @returns {Promise} - Response từ API
 */
export const failDeliveryRunOrder = async (orderId, data) => {
  try {
    const response = await apiClient.patch(`/delivery-run-orders/${orderId}/fail`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Lấy danh sách delivery run orders
 * @param {Object} params - Tham số query
 * @param {string} params.q - Từ khóa tìm kiếm
 * @param {string} params.runId - ID của delivery run
 * @param {string} params.orderId - ID của sales order
 * @param {string} params.status - Trạng thái
 * @param {number} params.limit - Số lượng bản ghi
 * @param {number} params.offset - Vị trí bắt đầu
 * @returns {Promise} - Response từ API
 */
export const getDeliveryRunOrders = async (params = {}) => {
  try {
    const response = await apiClient.get("/delivery-run-orders", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Lấy thông tin chi tiết một delivery run order
 * @param {string} orderId - ID của delivery run order
 * @returns {Promise} - Response từ API
 */
export const getDeliveryRunOrderById = async (orderId) => {
  try {
    const response = await apiClient.get(`/delivery-run-orders/${orderId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Lấy danh sách orders theo delivery run ID
 * @param {string} runId - ID của delivery run
 * @returns {Promise} - Response từ API
 */
export const getDeliveryRunOrdersByRunId = async (runId) => {
  try {
    const response = await apiClient.get(`/delivery-run-orders/run/${runId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Lấy danh sách delivery runs theo sales order ID
 * @param {string} orderId - ID của sales order
 * @returns {Promise} - Response từ API
 */
export const getDeliveryRunOrdersByOrderId = async (orderId) => {
  try {
    const response = await apiClient.get(`/delivery-run-orders/order/${orderId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Mở lại giao hàng cho một order đã hủy (chỉ admin, sup_shipper)
 * @param {string} orderId - ID của delivery run order
 * @param {Object} data - Dữ liệu mở lại (optional)
 * @returns {Promise} - Response từ API
 */
export const reopenDeliveryRunOrder = async (orderId, data = {}) => {
  try {
    const response = await apiClient.patch(`/delivery-run-orders/${orderId}/reopen`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
