import apiClient from "./apiClient";

//Lấy inventory lots theo product ID
export const getListInventoryLotsByProductId = (productId, params = {}) => {
  const { limit = 10, offset = 0 } = params;
  return apiClient.get(`/inventory-lots`, {
    params: {
      productId,
      limit,
      offset,
    },
  });
};
// Lấy chi tiết inventory lot theo ID
export const getInventoryLotById = (inventoryLotId) => {
  return apiClient.get(`/inventory-lots/${inventoryLotId}`);
};

// Lấy danh sách inventory lots với phân trang và tìm kiếm
export const getListInventoryLots = (params = {}) => {
  const { q, limit = 10, offset = 0 } = params;
  return apiClient.get("/inventory-lots", {
    params: {
      q: q || undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
};

// Tạo inventory lot mới (Admin, Manager)
export const createInventoryLot = (data) => {
  return apiClient.post("/inventory-lots", data);
};

// Cập nhật thông tin inventory lot (Admin, Manager)
export const updateInventoryLot = (inventoryLotId, data) => {
  return apiClient.put(`/inventory-lots/${inventoryLotId}`, data);
};

// Xóa inventory lot (Admin, Manager)
export const deleteInventoryLot = (inventoryLotId) => {
  return apiClient.delete(`/inventory-lots/${inventoryLotId}`);
};

// Cập nhật số lượng tồn kho (Admin, Manager, Picker, Sup_Picker) (hiện tại chưa dùng)
export const updateInventoryLotQuantity = (inventoryLotId, quantity) => {
  return apiClient.put(`/inventory-lots/${inventoryLotId}/quantity`, { quantity });
};

/**
 * @route   GET /inventory-lots/find-with-department-product/:departmentId/:productId
 * @desc    Lấy chi tiết các lô hàng (inventory lots) của một sản phẩm cụ thể
 * trong một phòng ban cụ thể. Dùng để xem chi tiết hạn sử dụng, số lô...
 * @access  Private (All authenticated users)
 * @params  departmentId (UUID), productId (UUID)
 * @query   q, limit, offset
 * @returns { items, pagination }
 */
export const findInventoryLotsInDepartmentByProduct = (departmentId, productId, params = {}) => {
  const { q, limit = 10, offset = 0 } = params;
  return apiClient.get(
    `/inventory-lots/find-with-department-product/${departmentId}/${productId}`,
    {
      params: {
        q: q || undefined,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    }
  );
};
