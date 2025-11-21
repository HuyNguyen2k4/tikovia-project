import apiClient from "./apiClient";

//Lấy tất cả payments của một transaction
// Access: Admin, Manager, Accountant
export const getAllPaymentsByTransactionId = async (transactionId) => {
  return apiClient.get(`/supplier-transaction-payments/transaction/${transactionId}`);
};

//Lấy payments theo người thanh toán
// Query params: limit, offset
//Access: Admin, Manager, Accountant
export const getPaymentsByPayer = async (paidBy, queryParams) => {
  return apiClient.get(`/supplier-transaction-payments/paid-by/${paidBy}`, { params: queryParams });
};

//Lấy payments theo người tạo
// Query params: limit, offset
//Access: Admin, Manager, Accountant
export const getPaymentsByCreator = async (createdBy, queryParams) => {
  return apiClient.get(`/supplier-transaction-payments/created-by/${createdBy}`, {
    params: queryParams,
  });
};

//Lấy thống kê thanh toán theo user
//Query params: from, to, period, timezone
//Access: Admin, Manager, Accountant
export const getPaymentStatsByUser = async (userId, queryParams) => {
  return apiClient.get(`/supplier-transaction-payments/stats/by-user/${userId}`, {
    params: queryParams,
  });
};

//Lấy thống kê thanh toán theo tháng
//Access: Admin và Manager, Accountant
export const getPaymentStatsByMonth = async () => {
  return apiClient.get(`/supplier-transaction-payments/stats/by-month`);
};

//Lấy danh sách payments với phân trang và tìm kiếm
//Query params: q, transId, paidBy, createdBy, fromDate, toDate, limit, offset
//Access: Admin, Manager, Accountant
export const getPayments = async (params = {}) => {
  const { q, transId, paidBy, createdBy, fromDate, toDate, limit = 10, offset = 0 } = params;

  const queryParams = {
    q: q || undefined,
    transId: transId || undefined,
    paidBy: paidBy || undefined,
    createdBy: createdBy || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
  return apiClient.get(`/supplier-transaction-payments`, { params: queryParams });
};

//Tạo mới payment
//Body: {transId, amount, paidAt, paidBy, evdUrl, note}
//Access: Admin, Manager, Accountant
export const createPayment = async (paymentData) => {
  return apiClient.post(`/supplier-transaction-payments`, paymentData);
};

//Lấy thông tin payment theo ID
//Access: Admin, Manager, Accountant
export const getPaymentById = async (paymentId) => {
  return apiClient.get(`/supplier-transaction-payments/${paymentId}`);
};

//Cập nhật thông tin payment
//Body: {amount, paidAt, paidBy, evdUrl, note}
//Access: Admin, Manager, Accountant
export const updatePayment = async (paymentId, updateData) => {
  return apiClient.put(`/supplier-transaction-payments/${paymentId}`, updateData);
};

//Xoá payment
//Access: Admin, Manager
export const deletePayment = async (paymentId) => {
  return apiClient.delete(`/supplier-transaction-payments/${paymentId}`);
};

//Xóa tất cả payments của một transaction
//Access: Admin, Manager
export const deletePaymentsByTransactionId = async (transactionId) => {
  return apiClient.delete(`/supplier-transaction-payments/transaction/${transactionId}`);
};

//Tính tổng số tiền đã thanh toán cho một transaction
//Access: Admin, Manager, Accountant
export const getTotalPaidAmountByTransactionId = async (transactionId) => {
  return apiClient.get(`/supplier-transaction-payments/transaction/${transactionId}/total`);
};
