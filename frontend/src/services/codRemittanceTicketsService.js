import apiClient from "./apiClient";

/**
 * @desc    Lấy danh sách COD remittance tickets với phân trang
 * @route   GET /api/cod-remittance-tickets
 * @access  Private (Admin, Accountant, Sup_Shipper)
 * @query   {string} q - Từ khóa tìm kiếm
 * @query   {string} shipperId - Lọc theo shipper
 * @query   {string} deliveryRunId - Lọc theo delivery run
 * @query   {string} status - Lọc theo trạng thái (balanced/unbalanced)
 * @query   {string} createdBy - Lọc theo người tạo
 * @query   {string} fromDate - Từ ngày
 * @query   {string} toDate - Đến ngày
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 20)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 */
export const getCodRemittanceTickets = (params = {}) => {
  const { q, shipperId, deliveryRunId, status, createdBy, fromDate, toDate, limit, offset } =
    params;

  return apiClient.get("/cod-remittance-tickets", {
    params: {
      q: q || undefined,
      shipperId: shipperId || undefined,
      deliveryRunId: deliveryRunId || undefined,
      status: status || undefined,
      createdBy: createdBy || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    },
  });
};

/**
 * @desc    Lấy thông tin ticket theo ID
 * @route   GET /api/cod-remittance-tickets/:id
 * @access  Private (Admin, Accountant, Sup_Shipper)
 */
export const getCodRemittanceTicketById = (ticketId) => {
  return apiClient.get(`/cod-remittance-tickets/${ticketId}`);
};

/**
 * @desc    Lấy danh sách delivery runs khả dụng (completed và chưa có ticket)
 * @route   GET /api/cod-remittance-tickets/available-delivery-runs
 * @access  Private (Admin, Accountant, Sup_Shipper)
 * @query   {string} shipperId - Lọc theo shipper (optional)
 * @query   {number} limit - Số lượng item (default: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 */
export const getAvailableDeliveryRuns = (params = {}) => {
  const { shipperId, limit, offset } = params;

  return apiClient.get("/cod-remittance-tickets/available-delivery-runs", {
    params: {
      shipperId: shipperId || undefined,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    },
  });
};

/**
 * @desc    Tạo COD remittance ticket mới
 * @route   POST /api/cod-remittance-tickets
 * @access  Private (Admin, Accountant, Sup_Shipper)
 * @body    {string} deliveryRunId - ID của delivery run (bắt buộc)
 * @body    {number} receivedAmount - Số tiền thực nhận (bắt buộc)
 * @body    {string} status - Trạng thái (balanced/unbalanced, optional)
 * @body    {string} note - Ghi chú (optional)
 */
export const createCodRemittanceTicket = (ticketData) => {
  return apiClient.post("/cod-remittance-tickets", ticketData);
};

/**
 * @desc    Cập nhật thông tin ticket
 * @route   PUT /api/cod-remittance-tickets/:id
 * @access  Private (Admin, Accountant)
 * @body    {number} receivedAmount - Số tiền thực nhận
 * @body    {string} status - Trạng thái
 * @body    {string} note - Ghi chú
 */
export const updateCodRemittanceTicket = (ticketId, ticketData) => {
  return apiClient.put(`/cod-remittance-tickets/${ticketId}`, ticketData);
};

/**
 * @desc    Xóa ticket
 * @route   DELETE /api/cod-remittance-tickets/:id
 * @access  Private (Admin only)
 */
export const deleteCodRemittanceTicket = (ticketId) => {
  return apiClient.delete(`/cod-remittance-tickets/${ticketId}`);
};

/**
 * ✅ NEW: Lấy thông tin chi tiết ticket theo ID (bao gồm orders)
 * @route   GET /api/cod-remittance-tickets/:id/details
 * @access  Private (Admin, Accountant, Sup_Shipper)
 */
export const getCodRemittanceTicketDetails = (ticketId) => {
  return apiClient.get(`/cod-remittance-tickets/${ticketId}/details`);
};
