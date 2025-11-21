import DashboardService from "@src/services/DashboardService";

export const getKpiData = async () => {
  try {
    const res = await DashboardService.getSellerStats();

    if (res.success && res.data) {
      const orders = res.data.sellerOrders || {};
      const customers = res.data.customerBySeller || {};

      return {
        processingOrders: orders.processingOrders ?? 0,
        completedOrders: orders.completedOrders ?? 0,
        cancelledOrders: orders.cancelledOrders ?? 0,
        draftOrders: orders.draftOrders ?? 0,
        totalOrders: orders.totalOrders ?? 0,

        totalCustomers: customers.totalCustomers ?? 0
      };
    } else {
      throw new Error("Invalid response structure");
    }
  } catch (error) {
    console.error("Error loading Seller KPI data:", error);
    return {
      processingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      draftOrders: 0,
      totalOrders: 0,
      totalCustomers: 0
    };
  }
};



export const currency = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);


export const sellerTopProducts = async () => {
  try{
    const res = await DashboardService.getTopSellerProducts();
    
    if (res.success && Array.isArray(res.data)) {
      const mapped = res.data.map((p) => ({
        id: p.id,
        name: p.productName,
        skuCode: p.skuCode,
        category: p.categoryName,
        soldQuantity: p.totalSold,
        orderCount: p.orderCount,
        imgUrl: p.imgUrl || null,
        totalSold: p.totalSold,
      }));

      return mapped;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error loading top seller products:', error);
    return [];
  }
};

export const customersBySeller = async () => {
  try {
    const res = await DashboardService.getCustomerDetailBySeller();

    if (res.success && Array.isArray(res.data?.customers)) {
      return res.data.customers.map((c, index) => ({
        key: c.customerId ?? index,
        code: c.customerCode ?? "",
        name: c.customerName ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
        address: c.address ?? "",
        taxCode: c.taxCode ?? "",
      }));
    }

    console.error("❌ Invalid customer structure:", res);
    return [];
  } catch (error) {
    console.error("🔥 Error loading customers:", error);
    return [];
  }
};





export const revenueTrend = [
  { date: '17/10', revenue: 8200000 },
  { date: '18/10', revenue: 9500000 },
  { date: '19/10', revenue: 11000000 },
  { date: '20/10', revenue: 6800000 },
  { date: '21/10', revenue: 7900000 },
  { date: '22/10', revenue: 9200000 },
];

export const personalOrders = [
  { key: '1', code: '#ORD-4231', customer: 'Nguyễn Văn A', status: 'Đang xử lý', total: 1250000, created: '20/10', payment: 'COD' },
  { key: '2', code: '#ORD-4232', customer: 'Trần Thị B', status: 'Hoàn thành', total: 2450000, created: '19/10', payment: 'Đã thanh toán' },
  { key: '3', code: '#ORD-4233', customer: 'Lê Văn C', status: 'Đã hủy', total: 890000, created: '18/10', payment: '-' },
  { key: '4', code: '#ORD-4234', customer: 'Phạm Văn D', status: 'Nháp', total: 450000, created: '21/10', payment: '-' },
  { key: '5', code: '#ORD-4235', customer: 'Hoàng Thị E', status: 'Chuẩn bị', total: 1630000, created: '21/10', payment: 'COD' },
  { key: '6', code: '#ORD-4236', customer: 'Bùi Văn F', status: 'Hoàn thành', total: 1980000, created: '20/10', payment: 'Đã thanh toán' },
];

export const paymentBreakdown = [
  { type: 'Đã thanh toán', value: 55 },
  { type: 'COD', value: 35 },
  { type: 'Hủy / Hoàn', value: 10 },
];

export const topProducts = [
  { key: 'tp1', name: 'Áo phông nam', quantity: 25, revenue: 3750000 },
  { key: 'tp2', name: 'Quần jeans', quantity: 18, revenue: 5400000 },
  { key: 'tp3', name: 'Giày thể thao', quantity: 12, revenue: 2880000 },
];

export const recentCustomers = [
  { key: 'rc1', name: 'Nguyễn Văn A', phone: '0912xxxxxx', orders: 5, totalSpent: 12350000 },
  { key: 'rc2', name: 'Trần Thị B', phone: '0983xxxxxx', orders: 3, totalSpent: 6200000 },
  { key: 'rc3', name: 'Lê Văn C', phone: '0905xxxxxx', orders: 2, totalSpent: 2800000 },
];

export const notifications = [
  { key: 'n1', type: 'error', content: 'Đơn #ORD-4234 chưa được xác nhận hơn 1 giờ' },
  { key: 'n2', type: 'warning', content: 'Đơn #ORD-4230 bị lỗi thông tin khách hàng' },
  { key: 'n3', type: 'success', content: 'Đơn #ORD-4228 đã hoàn tất – chúc mừng!' },
];


