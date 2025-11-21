const express = require('express');
const router = express.Router();
const customerController = require('@controllers/customerController');
const tokenUtils = require('@middlewares/jwt');

//===================Read Operations===================

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
router.get(
    '/with-invoice-stats',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    customerController.listCustomersWithInvoiceStats
);

/**
 * ✅ NEW: Lấy tổng hợp thống kê invoices của tất cả customers
 * @route   GET /api/customers/invoice-stats-summary
 * @access  Private (Admin, Seller, Accountant)
 * @query   {string} managedBy - Lọc theo người quản lý (optional)
 * @return  {object} - Tổng hợp: invoiceCounts, invoiceAmounts, customersWithInvoices
 * Note: Seller chỉ được xem thống kê của khách hàng do mình quản lý
 */
router.get(
    '/invoice-stats-summary',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    customerController.getInvoiceStatsSummary
);

/**
 * @desc    Lấy danh sách khách hàng với bộ lọc và phân trang
 * @route   GET /api/customers
 * @access  Private (Admin only)
 * @query   q, limit, offset
 */
router.get(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    customerController.getCustomers
);

/**
 * @desc    Lấy tất cả khách hàng không phân trang (cho Select/Autocomplete)
 * @route   GET /api/customers/all
 * @access  Private (Admin, Seller, Accountant)
 * @query   q - Từ khóa tìm kiếm (tìm trong id, code, name)
 * @return  {object} - Danh sách customers (chỉ id, code, name)
 * Note:    API này có thể đổi quyền access cho nhiều role hơn nếu cần (Không trả về thông tin nhạy cảm)
 */
router.get(
    '/all',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    customerController.listCustomers
);

/**
 * @desc    Lấy danh sách khách hàng kèm tổng doanh số & công nợ
 * @route   GET /api/customers/with-money
 * @access  Private (Admin, Seller)
 * @query   q, managedBy, limit, offset
 * @return  {object} - Danh sách customers với các trường bổ sung: totalSalesAmount, netSalesAmount, outstandingBalance
 * Note:    Seller chỉ được xem khách hàng do mình quản lý
 *         API này hỗ trợ tìm kiếm theo managedBy để Seller chỉ thấy khách hàng của mình
 *        Admin có thể xem tất cả khách hàng
 *       totalSalesAmount: Tổng giá trị hàng khách đã mua chưa trừ hàng trả hoặc giảm giá
 *      netSalesAmount: Tổng giá trị hàng đã mua đã trừ trả hàng, giảm giá, chiết khấu
 *     outstandingBalance: Tổng số tiền còn phải thu từ khách (AR = Accounts Receivable)
 */
router.get(
    '/with-money',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    customerController.listCustomersWithMoney
);

/**
 * ✅ NEW: Lấy tổng hợp tài chính khách hàng
 * @route   GET /api/customers/financial-summary
 * @access  Private (Admin, Seller, Accountant)
 * @query   {string} managedBy - ID người quản lý (tùy chọn)
 */
router.get(
    '/financial-summary',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    customerController.getCustomerFinancialSummary
);

/**
 * @desc    Lấy danh sách khách hàng theo managedBy với phân trang
 * @route   GET /api/customers/managed-by/:managedBy
 * @access  Private (Admin, Seller)
 * @param   managedBy - User ID quản lý
 * @query   q, limit, offset
 */
router.get(
    '/managed-by/:managedBy',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller'])],
    customerController.getCustomersByManagedBy
);

/**
 * @desc    Tìm kiếm nâng cao customers
 * @route   GET /api/customers/search
 * @access  Private (Admin only)
 * @query   code, name, phone, email, address, taxCode, managedBy, limit, offset
 */
router.get(
    '/search',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    customerController.searchCustomers
);

/**
 * @desc    Lấy customers được tạo gần đây
 * @route   GET /api/customers/recent
 * @access  Private (Admin only)
 * @query   limit
 */
router.get(
    '/recent',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    customerController.getRecentCustomers
);

/**
 * @desc    Lấy thống kê customers theo tháng tạo
 * @route   GET /api/customers/stats/creation
 * @access  Private (Admin only)
 */
router.get(
    '/stats/creation',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    customerController.getCustomerCreationStats
);

/**
 * @desc    Lấy chi tiết khách hàng theo mã code
 * @route   GET /api/customers/code/:code
 * @access  Private (Admin, Seller)
 * @param   code
 * @return  {object} - Customer
 * Note: Seller chỉ được xem chi tiết khách hàng do mình quản lý
 */
router.get(
    '/code/:code',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller'])],
    customerController.getCustomerByCode
);

/**
 * @desc    Lấy chi tiết khách hàng theo ID
 * @route   GET /api/customers/:id
 * @access  Private (Admin, Seller)
 * @param   id
 * @return  {object} - Customer
 * Note:    Seller chỉ được xem chi tiết khách hàng do mình quản lý
 */
router.get(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller'])],
    customerController.getCustomerById
);

/**
 * ✅ NEW: Lấy chi tiết invoices của một customer cụ thể
 * @route   GET /api/customers/:customerId/invoice-details
 * @access  Private (Admin, Seller, Accountant)
 * @param   {string} customerId - Customer ID
 * @query   {string} status - Lọc theo trạng thái invoice (open/paid/cancelled)
 * @query   {number} limit - Số lượng item trên mỗi trang (default: 10, max: 50)
 * @query   {number} offset - Vị trí bắt đầu (default: 0)
 * @return  {object} - Chi tiết invoices kèm thống kê và phân trang
 * Note: Seller chỉ được xem invoices của khách hàng do mình quản lý
 */
router.get(
    '/:customerId/invoice-details',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller', 'accountant'])],
    customerController.getCustomerInvoiceDetails
);

//===================CRUD Operations===================

/**
 * @desc    Tạo mới một khách hàng
 * @route   POST /api/customers
 * @access  Private (Admin, Seller)
 * @body    code, name, phone, email, address, taxCode, creditLimit, note, managedBy
 */
router.post(
    '/',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller'])],
    customerController.createCustomer
);

/**
 * @desc    Cập nhật thông tin khách hàng theo ID
 * @route   PUT /api/customers/:id
 * @access  Private (Admin, Seller)
 * @param   id
 * @body    code, name, phone, email, address, taxCode, creditLimit, note, managedBy
 * Note:    Seller chỉ được cập nhật khách hàng do mình quản lý và không được thay đổi managedBy
 */
router.put(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'seller'])],
    customerController.updateCustomer
);

/**
 * @desc    Xóa khách hàng theo ID
 * @route   DELETE /api/customers/:id
 * @access  Private (Admin only)
 * @param   id
 */
router.delete(
    '/:id',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    customerController.deleteCustomer
);

/**
 * @desc    Xóa nhiều khách hàng theo danh sách ID
 * @route   DELETE /api/customers/bulk
 * @access  Private (Admin only)
 * @body    ids (mảng các ID)
 */
router.delete(
    '/bulk',
    [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin'])],
    customerController.deleteBulkCustomers
);

module.exports = router;
