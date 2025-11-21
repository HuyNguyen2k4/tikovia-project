import apiClient from "./apiClient";

/**
 * @desc    Lấy danh sách payments
 * @route   GET /api/payments-combined
 * @access  Private (admin, accountant, seller)
 */
export const fetchPaymentsCombined = (params = {}) => {
  const { q, limit = 10, offset = 0 } = params;
  return apiClient.get("/payments-combined", {
    params: { q: q || undefined, limit: parseInt(limit), offset: parseInt(offset) },
  });
};

/**
 * @desc    Lấy thống kê payments theo phương thức thanh toán
 * @route   GET /api/payments-combined/stats/by-method
 * @access  Private (Admin, Accountant)
 */
export const fetchPaymentStatsByMethod = () => {
  return apiClient.get("/payments-combined/stats/by-method");
};

/**
 * @desc    Lấy tổng số tiền đã nhận cho một invoice
 * @route   GET /api/payments-combined/invoice/:invoiceId/total-received
 * @access  Private (Admin, Seller, Accountant)
 */
export const fetchTotalReceivedForInvoice = (invoiceId) => {
  return apiClient.get(`/payments-combined/invoice/${invoiceId}/total-received`);
};

/**
 * @desc    Lấy allocations của một invoice
 * @route   GET /api/payments-combined/invoice/:invoiceId/allocations
 * @access  Private (Admin, Seller, Accountant)
 */
export const fetchAllocationsForInvoice = (invoiceId) => {
  return apiClient.get(`/payments-combined/invoice/${invoiceId}/allocations`);
};

/**
 * @desc    Tạo payment mới
 * @route   POST /api/payments-combined
 * @access  Private (Admin, Accountant)
 */
export const createPaymentCombined = (paymentData) => {
  return apiClient.post("/payments-combined", paymentData);
};

/**
 * @desc    Lấy chi tiết payment
 * @route   GET /api/payments-combined/:id
 * @access  Private (Admin, Seller, Accountant)
 */
export const fetchPaymentCombinedById = (id) => {
  return apiClient.get(`/payments-combined/${id}`);
}

/**
 * @desc    Cập nhật payment
 * @route   PUT /api/payments-combined/:id
 * @access  Private (Admin, Accountant)
 */
export const updatePaymentCombined = (id, paymentData) => {
  return apiClient.put(`/payments-combined/${id}`, paymentData);
};

