// import apiClient from "./apiClient";

// // Lấy danh sách các unit conversion với bộ lọc và phân trang
// // param: q, lotId, packUnit, mainUnit, limit, offset
// export const fetchUnitConversions = async (params) => {
//   return apiClient.get("/unit-conversions", { params });
// };

// // Tạo mới một unit conversion
// // data: { lotId, packUnit, mainUnit, conversionRate }
// // export const createUnitConversion = async (data) => {
// //   return apiClient.post("/unit-conversions", data);
// // };

// //Lấy danh sách unit conversion theo lotId
// export const fetchUnitConversionsByLotId = async (lotId) => {
//   return apiClient.get(`/unit-conversions/by-lot/${lotId}`);
// };

// // Lấy tỉ lệ quy đổi giữa 2 đơn vị trong 1 lot
// export const fetchConversionRate = async (lotId, fromUnit, toUnit) => {
//   return apiClient.get(`/unit-conversions/rate`, {
//     params: { lotId, fromUnit, toUnit },
//   });
// }

// //Lấy chi tiết 1 unit conversion theo ID
// export const fetchUnitConversionById = async (id) => {
//   return apiClient.get(`/unit-conversions/${id}`);
// }

// // Cập nhật 1 unit conversion theo ID
// // data: { lotId, packUnit, mainUnit, conversionRate }
// export const updateUnitConversion = async (id, data) => {
//   return apiClient.put(`/unit-conversions/${id}`, data);
// }

// // Xoá 1 unit conversion theo ID
// export const deleteUnitConversion = async (id) => {
//   return apiClient.delete(`/unit-conversions/${id}`);
// }