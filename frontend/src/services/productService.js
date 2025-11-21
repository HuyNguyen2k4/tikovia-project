import apiClient from "./apiClient";

// Lấy hết danh sách sản phẩm không phân trang
export const listAllProducts = () => {
  return apiClient.get("/products/all");
};

export const listProducts = (params = {}) => {
  const { q, limit = 10, offset = 0 } = params;
  return apiClient.get("/products", {
    params: {
      q: q || undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
};

export const createProduct = (productData) => {
  return apiClient.post("/products", productData);
};

export const updateProduct = (productId, productData) => {
  return apiClient.put(`/products/${productId}`, productData);
};

// Thêm function update status riêng
export const updateProductStatus = (productId, status) => {
  return apiClient.put(`/products/${productId}`, { status });
};

export const getProductById = (productId) => {
  return apiClient.get(`/products/${productId}`);
};

export const deleteProduct = (productId) => {
  return apiClient.delete(`/products/${productId}`);
};

// Cập nhật trạng thái adminLocked
export const updateProductAdminLocked = (productId, adminLocked) => {
  return apiClient.put(`/products/${productId}`, { adminLocked });
};

// Refresh status single product (admin, manager)
export const refreshProductStatus = (productId) => {
  return apiClient.post(`/products/${productId}/refresh-status`);
};

// Refresh status all products (admin)
export const refreshAllProductStatuses = () => {
  return apiClient.post(`/products/refresh-all-status`);
};

/**
 * @route   GET /inventory-lots/find-products-in-department/:departmentId
 * @desc    Lấy danh sách các sản phẩm (đã gom nhóm) có tồn kho trong một phòng ban.
 * Hàm này hữu ích để hiển thị tổng quan những mặt hàng nào đang có trong kho.
 * @access  Private (All authenticated users)
 * @params  departmentId (UUID)
 * @query   q, limit, offset
 * @returns { items, pagination }
 */
export const findProductsInDepartment = (departmentId, params = {}) => {
  const { q, limit = 10, offset = 0 } = params;
  return apiClient.get(`/inventory-lots/find-products-in-department/${departmentId}`, {
    params: {
      q: q || undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
};
