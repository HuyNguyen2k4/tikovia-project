import apiClient from "./apiClient"

/**
 * @desc    Lấy đơn trả hàng theo order ID
 * @route   GET /api/order-returns/order/:orderId
 * @access  Private (All authenticated users)
 */
export const getOrderReturnsByOrderId = (orderId) => {
    return apiClient.get(`/order-returns/order/${orderId}`);
}

/**
 * @desc    Lấy chi tiết đơn trả hàng
 * @route   GET /api/order-returns/:id
 * @access  Private (Admin, Accountant, Seller)
 */
export const getOrderReturnById = (id) => {
    return apiClient.get(`/order-returns/${id}`);
}

/**
 * @desc    Tạo đơn trả hàng mới
 * @route   POST /api/order-returns
 * @access  Private (Admin, Accountant, Seller)
 */
export const createOrderReturn = (orderReturnData) => {
    return apiClient.post('/order-returns', orderReturnData);
}

/**
 * @desc    Cập nhật đơn trả hàng
 * @route   PUT /api/order-returns/:id
 * @access  Private (Admin, Accountant, Seller)
 */
export const updateOrderReturn = (id, orderReturnData) => {
    return apiClient.put(`/order-returns/${id}`, orderReturnData);
}