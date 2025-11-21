const express = require('express');
const router = express.Router();
const {
    getAdminStats,
    countOrdersThisWeek,
    getTopSellingProducts,
    countOrdersByGroupedStatus,
    getOrdersThisWeek,
    getTotalRevenue,

    getManagerStats,
    getOrderProcessingProgress,
    getProductInStock,
    getSupplierInOut,

    getSupervisorPickerStats,
    getOrderProcessing,
    getOrderPrepared,
    getCancellerOrderSupPicker,
    getPickerProgress,

    getPickerStats,
    getOrderAssigned,
    getCancelledOrders,

    getSellerStats,
    getTopSellerProducts,
    getCustomerDetailBySeller,

    getAccountantStats,
    getMonthlyTransactionStats,
    getCustomerTransaction,

    getSupShipperStats,
    getDeliveryProgress,
    getOrderDeliveryDetail
} = require('@controllers/DashboardController');
const tokenUtils = require('@middlewares/jwt');
// const { ro } = require('@faker-js/faker');

// ============================================
// 🔹 Admin Dashboard API (Essential metrics only)
// ============================================
router.get('/admin/stats', tokenUtils.verifyAccessToken, getAdminStats);


router.get('/admin/orders-this-week', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const data = await countOrdersThisWeek();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/admin/top-products', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const data = await getTopSellingProducts();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/admin/orders-by-status', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const data = await countOrdersByGroupedStatus();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/admin/orders-list-this-week', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const data = await getOrdersThisWeek();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get(
    '/admin/total-revenue',
    tokenUtils.verifyAccessToken,
    (req, res) => getTotalRevenue(req, res)
);

// ============================================
// 🔹 Manager Dashboard API (Essential metrics only)
// ============================================
router.get('/manager/stats', tokenUtils.verifyAccessToken, getManagerStats);

router.get('/manager/order-processing-progress', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const data = await getOrderProcessingProgress();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/manager/products-in-stock', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const data = await getProductInStock();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/manager/supplier-in-out', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const data = await getSupplierInOut();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// 🔹 Supervisor Picker Dashboard API (Essential metrics only)
// ============================================

router.get('/sup-picker/stats', tokenUtils.verifyAccessToken, getSupervisorPickerStats);

router.get('/sup-picker/order-processing', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const supervisorId = req.user.id; // Lấy supervisor_id từ token
        const data = await getOrderProcessing(supervisorId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/sup-picker/order-prepared', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const supervisorId = req.user.id; // Lấy supervisor_id từ token
        const data = await getOrderPrepared(supervisorId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/sup-picker/order-cancelled', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const supervisorId = req.user.id; // Lấy supervisor_id từ token
        const data = await getCancellerOrderSupPicker(supervisorId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/sup-picker/picker-progress', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const supervisorId = req.user.id; // Lấy supervisor_id từ token
        const data = await getPickerProgress(supervisorId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});


// ============================================
// 🔹 Picker Dashboard API (Essential metrics only)
// ============================================

router.get('/picker/stats', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const pickerId = req.user.id; // Lấy picker_id từ token
        const data = await getPickerStats(pickerId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/picker/order-assigned', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const pickerId = req.user.id; // Lấy picker_id từ token
        const data = await getOrderAssigned(pickerId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/picker/order-cancelled', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const pickerId = req.user.id; // Lấy picker_id từ token
        const data = await getCancelledOrders(pickerId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// 🔹 Seller Dashboard API (Essential metrics only)
// ============================================

router.get('/seller/stats', tokenUtils.verifyAccessToken, getSellerStats);

router.get('/seller/top-products', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const sellerId = req.user.id; // Lấy seller_id từ token
        const data = await getTopSellerProducts(sellerId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/seller/customer-detail', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const sellerId = req.user.id; // Lấy seller_id từ token
        const data = await getCustomerDetailBySeller(sellerId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// 🔹 Accountant Dashboard API (Essential metrics only)
// ============================================

router.get('/accountant/stats', tokenUtils.verifyAccessToken, getAccountantStats);

router.get('/accountant/monthly-transaction', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const data = await getMonthlyTransactionStats();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}); 

router.get('/accountant/customer-transaction', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const data = await getCustomerTransaction();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// 🔹 Supervisor Shipper Dashboard API (Essential metrics only)
// ============================================

router.get('/sup-shipper/stats', tokenUtils.verifyAccessToken, getSupShipperStats);

router.get('/sup-shipper/order-delivery', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const supervisorId = req.user.id; // Lấy supervisor_id từ token
        const data = await getDeliveryProgress(supervisorId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/sup-shipper/order-delivery-detail', tokenUtils.verifyAccessToken, async (req, res) => {
    try {
        const supervisorId = req.user.id; // Lấy supervisor_id từ token
        const data = await getOrderDeliveryDetail(supervisorId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});



module.exports = router;
