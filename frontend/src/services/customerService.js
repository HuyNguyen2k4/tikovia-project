import apiClient from "./apiClient";

/**
 * @desc    Lấy danh sách khách hàng theo managedBy với phân trang
 * @route   GET /api/customers/managed-by/:managedBy
 * @access  Private (Admin, Seller)
 * @param   managedBy - User ID quản lý
 * @query   q, limit, offset
 */
const getListCustomers = async (managedBy, params) => {
  const { q, limit, offset } = params;
  return apiClient.get(`/customers/managed-by/${managedBy}`, {
    params: {
      q: q || undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
};

/**
 * ✅ NEW: Lấy danh sách customers với thống kê số lượng invoices theo trạng thái
 * @route   GET /api/customers/with-invoice-stats
 * @access  Private (Admin, Seller, Accountant)
 * @query   {string} q - Từ khóa tìm kiếm
 * @query   {string} managedBy - Lọc theo người quản lý (optional)
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 20, max: 100)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Danh sách customers kèm invoiceStats: { openCount, paidCount, cancelledCount, totalCount }
 * Note: Seller chỉ được xem khách hàng do mình quản lý
 */
export const getListCustomersWithInvoiceStats = (params = {}) => {
  const { q, limit, offset } = params;
  return apiClient.get(`/customers/with-invoice-stats`, {
    params: {
      q: q || undefined,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    },
  });
};

/**
 * @desc    Lấy danh sách khách hàng kèm tổng doanh số & công nợ
 * @route   GET /api/customers/with-money
 */
const getListCustomersWithMoney = async (params) => {
  const { q, managedBy, limit, offset } = params;
  return apiClient.get(`/customers/with-money`, {
    params: {
      q: q || undefined,
      managedBy: managedBy || undefined,
      limit: parseInt(limit) || 20, // Thêm default
      offset: parseInt(offset) || 0, // Thêm default
    },
  });
};

/**
 * @desc    Lấy danh sách khách hàng (bản gốc)
 * @route   GET /api/customers
 */
const listCustomers = (params = {}) => {
  const { q, limit = 10, offset = 0 } = params;
  return apiClient.get("/customers", {
    params: { q, limit, offset },
  });
};

/**
 * @desc    Tạo mới một khách hàng
 * @route   POST /api/customers
 */
const createCustomer = (customerData) => {
  return apiClient.post("/customers", customerData);
};

/**
 * @desc    Cập nhật thông tin khách hàng theo ID
 * @route   PUT /api/customers/:id
 */
const updateCustomer = (customerId, customerData) => {
  return apiClient.put(`/customers/${customerId}`, customerData);
};

/**
 * @desc    Xóa khách hàng theo ID
 * @route   DELETE /api/customers/:id
 */
const deleteCustomer = (customerId) => {
  return apiClient.delete(`/customers/${customerId}`);
};

/**
 * @desc    Lấy chi tiết khách hàng theo ID
 * @route   GET /api/customers/:id
 */
const getCustomerById = (customerId) => {
  return apiClient.get(`/customers/${customerId}`);
};

/**
 * ✅ NEW: Lấy tổng hợp tài chính khách hàng
 * @route   GET /api/customers/financial-summary
 * @access  Private (Admin, Seller, Accountant)
 * @query   {string} managedBy - ID người quản lý (tùy chọn)
 */
const getCustomerFinancialSummary = (params = {}) => {
  const { managedBy } = params;
  return apiClient.get("/customers/financial-summary", {
    params: {
      managedBy: managedBy || undefined,
    },
  });
};

export {
  listCustomers,
  getListCustomers,
  getListCustomersWithMoney,
  getCustomerFinancialSummary,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerById,
};
