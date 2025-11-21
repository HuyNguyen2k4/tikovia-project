import apiClient from "./apiClient";

// export const listUsers = () => {
//     return apiClient.get("/users")
// }
export const listUsers = (params = {}) => {
  const { q, role, limit = 10, offset = 0 } = params;

  return apiClient.get("/users", {
    params: {
      q: q || undefined,
      role: role || undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
};

// Alias for consistency
export const getListUsers = listUsers;

export const createUser = (userData) => {
  return apiClient.post("/users", userData);
};

export const updateUser = (userId, userData) => {
  return apiClient.put(`/users/${userId}`, userData);
};

// Thêm function update status riêng
export const updateUserStatus = (userId, status) => {
  return apiClient.put(`/users/${userId}`, { status });
};

/**
 * @desc    Lấy tất cả user có role 'seller' hoặc 'admin'
 * @route   GET /api/users/by-role?role=seller,admin
 */
export const getListAllSellers = () => {
  return apiClient.get("/users/by-role", {
    params: {
      role: "seller", // Gửi query param chứa role
    },
  });
};
