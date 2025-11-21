import apiClient from "./apiClient";

/**
 * [GET] /api/sales-orders
 * Query: q, customerId, sellerId, status, adminLocked, limit, offset
 * Access: any authenticated user
 */
export const getListSalesOrders = async (params = {}) => {
  // Chỉ cần đảm bảo limit/offset có giá trị mặc định,
  // còn lại truyền tất cả vào `apiClient`.
  const defaultParams = {
    limit: 10,
    offset: 0,
    ...params, // params truyền vào sẽ ghi đè defaults
  };

  // Truyền toàn bộ object params
  // axios/apiClient sẽ tự động xử lý các giá trị 'undefined'
  return apiClient.get("/sales-orders", {
    params: defaultParams,
  });
};

/**
 * [GET] /api/sales-orders/with-invoice
 * Query: q, customerId, sellerId, departmentId, status, adminLocked, limit, offset
 * Access: any authenticated user
 */
export const getListSalesOrdersWithInvoice = async (params = {}) => {
  // Chỉ cần đảm bảo limit/offset có giá trị mặc định,
  // còn lại truyền tất cả vào `apiClient`.
  const defaultParams = {
    limit: 10,
    offset: 0,
    ...params, // params truyền vào sẽ ghi đè defaults
  };
  // Truyền toàn bộ object params
  // axios/apiClient sẽ tự động xử lý các giá trị 'undefined'
  return apiClient.get("/sales-orders/with-invoice", {
    params: defaultParams,
  });
}

/**
 * [GET] /api/sales-orders/:id
 * Access: any authenticated user
 */
export const getSalesOrderById = async (id) => {
  return apiClient.get(`/sales-orders/${id}`);
};

/**
 * [POST] /api/sales-orders
 * Body: orderNo, customerId, slaDeliveryAt, address, items
 * Items: array of { productId, qty, note }
 * Access: seller (sellerId taken from req.user in controller)
 */
export const createSalesOrder = async (data) => {
  return apiClient.post("/sales-orders", data);
};

/**
 * [PUT] /api/sales-orders/:id
 * Body: orderNo, customerId, sellerId (ignored for sellers), status, slaDeliveryAt, address, adminLocked, items
 * Items: array of { id, productId, qty, note }
 * Access: admin, seller
 * Note: controller ensures sellerId comes from req.user for callers with role 'seller'
 */
export const updateSalesOrder = async (id, data) => {
  return apiClient.put(`/sales-orders/${id}`, data);
};

/**
 * [PATCH] /api/sales-orders/:id/admin-lock
 * Body: { adminLocked: boolean }
 * Access: admin, seller
 */
export const setSalesOrderAdminLock = async (id, adminLocked) => {
  return apiClient.patch(`/sales-orders/${id}/admin-lock`, { adminLocked });
};
