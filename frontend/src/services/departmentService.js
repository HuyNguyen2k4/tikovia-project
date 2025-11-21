import apiClient from "./apiClient"

// Lấy hết danh sách phòng ban không phân trang
export const listAllDepartments = () => {
  return apiClient.get("/departments/all");
}

export const listDepartments = (params = {}) => {
  const { q, limit = 10, offset = 0 } = params;
  
  return apiClient.get("/departments", {
    params: {
      q: q || undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
};
// optional: get department by id
export const getDepartment = (departmentId) => {
    return apiClient.get(`/departments/${departmentId}`)
}

export const createDepartment = (departmentData) => {
    return apiClient.post("/departments", departmentData)
}

export const updateDepartment = (departmentId, departmentData) => {
    return apiClient.put(`/departments/${departmentId}`, departmentData)
}

// update status
export const updateDepartmentStatus = (departmentId, status) => {
    return apiClient.put(`/departments/${departmentId}`, { status })
}

export const deleteDepartment = (departmentId) => {
    return apiClient.delete(`/departments/${departmentId}`)
}