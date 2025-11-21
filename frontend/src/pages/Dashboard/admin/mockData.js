import DashboardService from "@src/services/DashboardService";

// Admin KPI data
export const getKpiData = async () => {
  try {
    const res = await DashboardService.getAdminStats();

    if (res.success && res.data) {
      const data = res.data;

      return {
        totalUsers: data.total_users ?? 0,
        totalOrders: data.total_orders ?? 0,
        totalRevenue: 125600, // tạm giữ cứng
        totalProducts: data.total_products ?? 0,
        totalCustomer: data.total_customers ?? 0,
        totalSuppliers: data.total_suppliers ?? 0,

        // lấy từ supplier_transactions
        totalIn: data.supplier_transactions?.totalIn ?? 0,
        totalOut: data.supplier_transactions?.totalOut ?? 0,
      };
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error loading KPI data:', error);

    // fallback mock nếu API lỗi
    return {
      totalUsers: 0,
      totalOrders: 0,
      totalRevenue: 125600,
      totalProducts: 0,
      totalCustomer: 0,
      totalSuppliers: 0,
      totalIn: 0,
      totalOut: 0,
    };
  }
};


export const getTopProducts = async () => {
  try {
    const res = await DashboardService.getTopProducts();

    if (res.success && Array.isArray(res.data)) {
      const mapped = res.data.map((p) => ({
        id: p.id,
        name: p.productName,
        skuCode: p.skuCode,
        category: p.categoryName,
        soldQuantity: p.totalSold,
        orderCount: p.orderCount,
        imgUrl: p.imgUrl || null,
      }));

      return mapped;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error loading top products:', error);
  }
};

export const getRecentOrders = async () => {
  try {
    const res = await DashboardService.getOrdersListThisWeek();

    if (res.success && Array.isArray(res.data)) {
      return res.data.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName,
        sellerName: order.sellerName,
        amount: order.invoiceTotal ?? 0,
        status: order.status,
        date: new Date(order.createdAt).toLocaleString('vi-VN', {
          hour12: false,
        }),
      }));
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (error) {
    console.error('Error loading recent orders:', error);
    return [];
  }
};



export const orderStatusColorMap = {
  'Nháp': '#8c8c8c',
  'Chờ xác nhận': '#faad14',
  'Đang chuẩn bị': '#1890ff',
  'Đang giao': '#2f54eb',
  'Hoàn thành': '#389e0d',
  'Đã hủy': '#f5222d',
};

// ✅ Hàm lấy dữ liệu từ BE
export const getOrderStatusData = async () => {
  try {
    const res = await DashboardService.getAdminOrderStatus();

    if (res.success && res.data) {
      const d = res.data;

      // Map BE key → tiếng Việt + value
      const mapped = [
        { type: 'Nháp', value: d.draft || 0 },
        { type: 'Chờ xác nhận', value: d.pending || 0 },
        { type: 'Đang chuẩn bị', value: d.preparing || 0 },
        { type: 'Đang giao', value: d.shipping || 0 },
        { type: 'Hoàn thành', value: d.completed || 0 },
        { type: 'Đã hủy', value: d.cancelled || 0 },
      ];

      return mapped;
    } else {
      throw new Error('Invalid API structure');
    }
  } catch (error) {
    console.error('Error loading order status data:', error);
  }
};

export const getOrdersTimeline = async () => {
  try {
    const res = await DashboardService.getAdminOrderWeek();
    if (res.success && Array.isArray(res.data)) {
      const formatted = res.data.map((item) => ({
        date: new Date(item.date).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        }),
        orders: item.count,
      }));
      return formatted;
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (error) {
    console.error('Error loading orders timeline:', error);
  }
};

export const getRevenueTimeline = async (params) => {
  try {
    const res = await DashboardService.getTotalRevenue(params);

    if (res?.success && Array.isArray(res.data)) {
      const formatted = res.data.map((item) => {
        let label = item.label;
        
        // Chuyển đổi label sang tiếng Việt
        if (params.filter === 'week') {
          // D1 → Thứ 2, D2 → Thứ 3, ..., D7 → Chủ nhật
          const dayMap = {
            'D1': 'Thứ 2',
            'D2': 'Thứ 3',
            'D3': 'Thứ 4',
            'D4': 'Thứ 5',
            'D5': 'Thứ 6',
            'D6': 'Thứ 7',
            'D7': 'Chủ nhật'
          };
          label = dayMap[item.label] || item.label;
        } else if (params.filter === 'month') {
          // W1 → Tuần 1, W2 → Tuần 2, ...
          const weekNum = item.label.replace('W', '');
          label = `Tuần ${weekNum}`;
        } else if (params.filter === 'year') {
          // T1 → Tháng 1, T2 → Tháng 2, ...
          const monthNum = item.label.replace('T', '');
          label = ` ${monthNum}`;
        }

        return {
          label,
          revenue: Number(item.revenue) || 0
        };
      });

      return formatted;
    } else {
      throw new Error('Invalid API response structure');
    }

  } catch (error) {
    console.error('Error loading revenue timeline:', error);
    throw error;
  }
};

// Lấy doanh thu tháng này và tháng trước để hiển thị thẻ so sánh lợi nhuận
export const getProfitComparison = async () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  const fetchYearRevenueMap = async (year) => {
    const res = await DashboardService.getTotalRevenue({ filter: 'year', year });
    if (res?.success && Array.isArray(res.data)) {
      return res.data.reduce((acc, item) => {
        const monthNum = Number(String(item.label).replace(/[^0-9]/g, ''));
        if (!Number.isNaN(monthNum)) {
          acc[monthNum] = Number(item.revenue) || 0;
        }
        return acc;
      }, {});
    }
    return null;
  };

  try {
    const currentYearMap = await fetchYearRevenueMap(currentYear);
    const currentMonthRevenue = currentYearMap?.[currentMonth] ?? 0;

    // Tháng trước: nếu là tháng 1 thì lấy tháng 12 của năm trước
    if (currentMonth === 1) {
      const prevYearMap = await fetchYearRevenueMap(currentYear - 1);
      return {
        currentMonthRevenue,
        lastMonthRevenue: prevYearMap?.[12] ?? 0,
      };
    }

    return {
      currentMonthRevenue,
      lastMonthRevenue: currentYearMap?.[currentMonth - 1] ?? 0,
    };
  } catch (error) {
    console.error('Error loading profit comparison data:', error);
    return {
      currentMonthRevenue: 0,
      lastMonthRevenue: 0,
    };
  }
};

// Profit comparison numbers
export const mockProfitComparison = {
  currentMonthRevenue: 125600,
  lastMonthRevenue: 98200,
};
