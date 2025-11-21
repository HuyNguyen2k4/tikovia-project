import DashboardService from "@src/services/DashboardService";

// ===========================
// MANAGER KPIs DATA
// ===========================

export const getKpiData = async () => {
  try {
    const res = await DashboardService.getManagerStats();
    if (res.success && res.data) {
      const data = res.data;

      return {
        processingOrders: data.processingOrders ?? 0,
        completedOrders: data.completedOrders ?? 0,
        cancelledOrders: data.cancelledOrders ?? 0,
        SupplierReturns: data.supplierReturn ?? 0,
        totalInventory: data.totalInventory ?? 0,
        supplierInput: data.supplierInput ?? 0,
      };

    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error loading Manager KPI data:', error);
    // fallback mock nếu API lỗi
  }
};

// ===========================
// ORDER PIPELINE DATA
// ===========================

// Map status từ BE sang tiếng Việt
const statusMap = {
  'draft': 'Nháp',
  'pending_preparation': 'Chờ chuẩn bị',
  'assigned_preparation': 'Đang soạn',
  'confirmed': 'Đã xác nhận',
  'delivering': 'Đang giao',
  'delivered': 'Đã giao',
  'completed': 'Hoàn thành',
  'cancelled': 'Đã hủy',
};

/**
 * Fetch Order Pipeline data from API
 */
export const getOrderPipelineData = async () => {
  try {
    const res = await DashboardService.getManagerOrderProcessingProgress();
    
    if (res.success && Array.isArray(res.data)) {
      // Map API data sang format cho chart
      const mapped = res.data.map((item) => ({
        stage: statusMap[item.status] || item.status, 
        orders: item.count,
        percentage: item.percentage,
      }));
      
      return mapped;
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (error) {
    console.error('Error loading order pipeline data:', error);
    // Fallback to empty array
    return [];
  }
};

// ===========================
// PRODUCT IN STOCK DATA
// ===========================

export const getProductInStockData = async () => {
  try {
    const res = await DashboardService.getProductInStock();

    if (res.success && Array.isArray(res.data)) {
      return res.data;
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (error) {
    console.error('Error loading product in stock data:', error);
    // Fallback to empty array
    return [];
  }
};


// ===========================
// SUPPLIER IN/OUT DATA
// ===========================

export const getSupplierInOutData = async (params) => {
  try {
    const res = await DashboardService.getSupplierInOut(params);

    if (res.success && Array.isArray(res.data)) {
      return res.data;
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (error) {
    console.error('Error loading supplier in/out data:', error);
    // Fallback to empty array
    return [];
  }
};



export const mockCompletionRatio = [
  { type: 'Đóng hàng', value: 82 },
  { type: 'Lỗi', value: 8 },
  { type: 'Chậm', value: 10 },
];

export const mockLeadsPerformance = [
  { key: 1, leader: 'Nguyễn A', group: 'Soạn', inProgress: 25, completed: 200, efficiency: 89 },
  { key: 2, leader: 'Trần B', group: 'Giao', inProgress: 18, completed: 170, efficiency: 92 },
  { key: 3, leader: 'Phạm C', group: 'Soạn', inProgress: 30, completed: 210, efficiency: 85 },
  { key: 4, leader: 'Lê D', group: 'Giao', inProgress: 15, completed: 160, efficiency: 94 },
  { key: 5, leader: 'Hoàng E', group: 'Soạn', inProgress: 22, completed: 180, efficiency: 87 },
  { key: 6, leader: 'Vũ F', group: 'Giao', inProgress: 20, completed: 175, efficiency: 90 },
  { key: 7, leader: 'Đặng G', group: 'Soạn', inProgress: 28, completed: 190, efficiency: 88 },
];

export const mockShiftPerformance = [
  { day: 'T2', shift: 'Sáng', value: 86 },
  { day: 'T2', shift: 'Chiều', value: 82 },
  { day: 'T2', shift: 'Tối', value: 78 },
  { day: 'T3', shift: 'Sáng', value: 88 },
  { day: 'T3', shift: 'Chiều', value: 84 },
  { day: 'T3', shift: 'Tối', value: 79 },
  { day: 'T4', shift: 'Sáng', value: 90 },
  { day: 'T4', shift: 'Chiều', value: 86 },
  { day: 'T4', shift: 'Tối', value: 81 },
  { day: 'T5', shift: 'Sáng', value: 87 },
  { day: 'T5', shift: 'Chiều', value: 85 },
  { day: 'T5', shift: 'Tối', value: 80 },
  { day: 'T6', shift: 'Sáng', value: 89 },
  { day: 'T6', shift: 'Chiều', value: 86 },
  { day: 'T6', shift: 'Tối', value: 82 },
  { day: 'T7', shift: 'Sáng', value: 91 },
  { day: 'T7', shift: 'Chiều', value: 88 },
  { day: 'T7', shift: 'Tối', value: 84 },
];

export const mockSupplierReturns = [
  { id: 'RET-0195', supplier: 'T3-Logistics', productReturned: 45, reason: 'Lỗi kỹ thuật', date: '2025-10-20', value: 8500000 },
  { id: 'RET-0201', supplier: 'HomeBuild', productReturned: 23, reason: 'Sai mẫu', date: '2025-10-21', value: 5300000 },
  { id: 'RET-0205', supplier: 'AlphaSup', productReturned: 12, reason: 'Hỏng vỏ ngoài', date: '2025-10-22', value: 2100000 },
  { id: 'RET-0210', supplier: 'MegaMat', productReturned: 19, reason: 'Thiếu phụ kiện', date: '2025-10-23', value: 4100000 },
  { id: 'RET-0214', supplier: 'BuildPro', productReturned: 15, reason: 'Lỗi kỹ thuật', date: '2025-10-23', value: 3300000 },
];

export const mockTopReturnsSuppliers = [
  { supplier: 'T3-Logistics', count: 45 },
  { supplier: 'HomeBuild', count: 23 },
  { supplier: 'MegaMat', count: 19 },
  { supplier: 'BuildPro', count: 15 },
  { supplier: 'AlphaSup', count: 12 },
];

export const mockInventoryBreakdown = [
  { type: 'Vật liệu xây dựng', value: 40 },
  { type: 'Nội thất', value: 30 },
  { type: 'Dụng cụ', value: 30 },
];

export const mockAlerts = [
  { type: 'success', title: 'Hoàn thành đơn hàng', desc: 'Đơn #DH-1020 đã được giao thành công', time: '2 phút trước' },
  { type: 'error', title: 'Lỗi đơn hàng', desc: 'Đơn #DH-1023 thiếu thông tin khách', time: '5 phút trước' },
  { type: 'warning', title: 'Giao chậm', desc: 'Đơn #DH-1011 trễ 2h', time: '12 phút trước' },
  { type: 'processing', title: 'Trả supplier', desc: 'Đơn #RET-0195 vừa được trả lại', time: '20 phút trước' },
];

export const mockActivities = [
  'Trưởng soạn A đã hoàn thành đơn #OR1234',
  'Nhân viên giao B bắt đầu giao đơn #OR1240',
  'Đơn #OR1255 báo lỗi sản phẩm',
  'Trưởng giao D xác nhận giao thành công #OR1239',
];

