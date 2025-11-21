import apiClient from "./apiClient";

// ===========================
// ADMIN DASHBOARD APIs
// ===========================

/**
 * Lấy thống kê KPI cho Admin Dashboard
 * @param {Object} params - Query parameters (optional)
 * @returns {Promise} Response data với total_users, total_orders, total_products, total_suppliers, total_customers
 */
const getAdminStats = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/admin/stats', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        throw error;
    }
};

const getAdminOrderStatus = async (params) => {
    try {
        const respone = await apiClient.get('/dashboard/admin/orders-by-status', { params });
        return respone.data;
    } catch (error) {
        console.error('Error fetching admin order status data:', error);
        throw error;
    }
};

const getAdminOrderWeek = async (params) => {
    try {
        const respone = await apiClient.get('/dashboard/admin/orders-this-week', { params });
        return respone.data;
    } catch (error) {
        console.error('Error fetching admin order week data:', error);
        throw error;
    }
};

const getTopProducts = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/admin/top-products', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching top products:', error);
        throw error;
    }
};

const getOrdersListThisWeek = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/admin/orders-list-this-week', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching orders this week:', error);
        throw error;
    }
};

const getTotalRevenue = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/admin/total-revenue', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching total revenue:', error);
        throw error;
    }
};

// ===========================
// MANAGER DASHBOARD APIs
// ===========================

const getManagerStats = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/manager/stats', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching manager stats:', error);
        throw error;
    }
};

const getManagerOrderProcessingProgress = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/manager/order-processing-progress', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching manager order processing progress:', error);
        throw error;
    }
};

const getProductInStock = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/manager/products-in-stock', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching product in stock:', error);
        throw error;
    }   
};

const getSupplierInOut = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/manager/supplier-in-out', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching supplier in/out data:', error);
        throw error;
    }
};

// ===========================
// SUPERVISOR PICKER DASHBOARD APIs
// ===========================

const getSupPickerStats = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/sup-picker/stats', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching sup picker stats:', error);
        throw error;
    }
};

const getSupPickerOrderProcessing = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/sup-picker/order-processing', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching sup picker order processing data:', error);
        throw error;
    }
};

const getSupPickerOrderPrepared = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/sup-picker/order-prepared', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching sup picker order prepared data:', error);
        throw error;
    }
};

const getCancellerOrderSupPicker = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/sup-picker/order-cancelled', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching sup picker cancelled orders data:', error);
        throw error;
    }
};

const getPickerProgress = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/sup-picker/picker-progress', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching picker progress data:', error);
        throw error;
    }
};

// ===========================
// PICKER DASHBOARD APIs
// ===========================

const getPickerStats = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/picker/stats', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching picker stats:', error);
        throw error;
    }
};

const getOrderPickerAssigned = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/picker/order-assigned', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching order picker assigned data:', error);
        throw error;
    }
};

// ===========================
// SELLER DASHBOARD APIs
// ===========================

const getSellerStats = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/seller/stats', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching seller stats:', error);
        throw error;
    }
};

const getTopSellerProducts = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/seller/top-products', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching top seller products:', error);
        throw error;
    }
};

const getCustomerDetailBySeller = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/seller/customer-detail', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching customer detail by seller:', error);
        throw error;
    }
};

// ===========================
// ACCOUNTANT DASHBOARD APIs
// ===========================

const getAccountantStats = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/accountant/stats', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching accountant stats:', error);
        throw error;
    }
};

const getMonthlyTransactions = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/accountant/monthly-transaction', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching monthly transactions:', error);
        throw error;
    }
};

const getCustomerTransactions = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/accountant/customer-transaction', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching customer transactions:', error);
        throw error;
    }
};

// ===========================
// SUPERVISOR SHIPPER DASHBOARD APIs
// ===========================

const getSupShipperStats = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/sup-shipper/stats', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching supervisor shipper stats:', error);
        throw error;
    }
};

const getOrderDelivery = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/sup-shipper/order-delivery', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching order delivery data:', error);
        throw error;
    }
};

const getOrderDeliveryDetail = async (params) => {
    try {
        const response = await apiClient.get('/dashboard/sup-shipper/order-delivery-detail', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching order delivery detail data:', error);
        throw error;
    }
};

const DashboardService = {
    getAdminStats,
    getAdminOrderStatus,
    getAdminOrderWeek,
    getTopProducts,
    getOrdersListThisWeek,
    getTotalRevenue,

    getManagerStats,
    getManagerOrderProcessingProgress,
    getProductInStock,
    getSupplierInOut,

    getSupPickerStats,
    getSupPickerOrderProcessing,
    getSupPickerOrderPrepared,
    getCancellerOrderSupPicker,
    getPickerProgress,

    getPickerStats,
    getOrderPickerAssigned,

    getSellerStats,
    getTopSellerProducts,
    getCustomerDetailBySeller,

    getAccountantStats,
    getMonthlyTransactions,
    getCustomerTransactions,

    getSupShipperStats,
    getOrderDelivery,
    getOrderDeliveryDetail,
};
export default DashboardService;
