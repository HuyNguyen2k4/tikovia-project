import DashboardService from "@src/services/DashboardService";

export const getKpiData = async () => {
  try {
    const res = await DashboardService.getSupShipperStats();

    if (res.success && res.data) {
      const data = res.data;

      return {
        orderAssignedShipper: data.orderAssignedShipper ?? 0,
        orderDelivering: data.orderDelivering ?? 0,
        orderDelivered: data.orderDelivered ?? 0,
        totalOrderCancelled: data.totalOrderCancelled ?? 0,
        countTotalShipper: data.countTotalShipper ?? 0,
      };
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error loading Supervisor Shipper KPI data:', error);

    // fallback mock nếu API lỗi
    return {
      orderAssignedShipper: 0,
      orderDelivering: 0,
      orderDelivered: 0,
      totalOrderCancelled: 0,
      countTotalShipper: 0,
    };
  }
};

export const DeliveryProgress = async () => {
  try {
    const res = await DashboardService.getOrderDelivery();

    if (res.success && Array.isArray(res.data)) {
      // Status mapping từ API sang tiếng Việt
      const statusMap = {
        'assigned': 'Đã phân công',
        'in_progress': 'Đang giao',
        'completed': 'Hoàn thành',
      };

      // Tạo object để lưu count theo status
      const dataMap = {};
      res.data.forEach((item) => {
        const vietnameseStatus = statusMap[item.status] || item.status;
        dataMap[vietnameseStatus] = item.count;
      });

      // Tạo mảng kết quả với tất cả status, thiếu thì = 0
      const result = [
        { status: 'Đã phân công', value: dataMap['Đã phân công'] || 0 },
        { status: 'Đang giao', value: dataMap['Đang giao'] || 0 },
        { status: 'Hoàn thành', value: dataMap['Hoàn thành'] || 0 },
      ];

      return result;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error loading delivery progress data:', error);

    // fallback mock nếu API lỗi
    return [
      { status: 'Đã phân công', value: 0 },
      { status: 'Đang giao', value: 0 },
      { status: 'Hoàn thành', value: 0 },
    ];
  }
}

export const getOrderDeliveryDetail = async () => {
  try {
    const res = await DashboardService.getOrderDeliveryDetail();

    if (res.success && Array.isArray(res.data)) {
      // Status mapping từ API sang tiếng Việt
      const statusMap = {
        'assigned': 'Đã phân công',
        'in_progress': 'Đang giao',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy',
        'failed': 'Giao thất bại',
      };

      return res.data.map((item) => ({
        key: item.orderNo,
        code: item.orderNo,
        shipper: item.shipper || '-',
        supervisor: item.supervisor || '-',
        status: statusMap[item.deliveryStatus] || item.deliveryStatus,
        rawStatus: item.deliveryStatus,
      }));
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error loading order delivery detail data:', error);
    return [];
  }
};

// Delivery progress by status
export const deliveryProgress = [
  { status: 'Đang giao', value: 20 },
  { status: 'Giao thành công', value: 45 },
  { status: 'Giao trễ', value: 5 },
  { status: 'Hoàn / lỗi', value: 3 },
];

// Shippers performance
export const shippers = [
  { key: 1, name: 'Nguyễn Văn A', area: 'Hải Châu', delivered: 25, failed: 1, onTime: 96, status: 'Active' },
  { key: 2, name: 'Lê Thị B', area: 'Sơn Trà', delivered: 22, failed: 3, onTime: 88, status: 'Active' },
  { key: 3, name: 'Trần Văn C', area: 'Liên Chiểu', delivered: 18, failed: 0, onTime: 100, status: 'Away' },
  { key: 4, name: 'Phạm Minh D', area: 'Thanh Khê', delivered: 16, failed: 2, onTime: 90, status: 'Active' },
  { key: 5, name: 'Võ Quốc E', area: 'Hòa Vang', delivered: 11, failed: 1, onTime: 93, status: 'Active' },
];

// In-transit orders
export const inTransitOrders = [
  { key: 'ORD-3021', code: '#ORD-3021', shipper: 'Nguyễn Văn A', customer: 'Trần Thị Bích', amount: 1250000, status: 'Đang giao', eta: '10:45', isLate: false },
  { key: 'ORD-3022', code: '#ORD-3022', shipper: 'Lê Thị B', customer: 'Nguyễn Văn Long', amount: 2050000, status: 'Đang giao', eta: '11:15', isLate: false },
  { key: 'ORD-3023', code: '#ORD-3023', shipper: 'Trần Văn C', customer: 'Lê Quang', amount: 890000, status: 'Trễ hạn', eta: '09:50', isLate: true },
  { key: 'ORD-3024', code: '#ORD-3024', shipper: 'Phạm Minh D', customer: 'Đỗ Thị N', amount: 1780000, status: 'Đang giao', eta: '11:40', isLate: false },
];

// Error / return orders
export const errorOrders = [
  { key: 'ORD-3008', code: '#ORD-3008', reason: 'Khách không nhận hàng', shipper: 'Nguyễn Văn A', time: '10:20', handling: 'Đang xử lý' },
  { key: 'ORD-3010', code: '#ORD-3010', reason: 'Hư hàng khi vận chuyển', shipper: 'Lê Thị B', time: '11:05', handling: 'Chưa xử lý' },
  { key: 'ORD-3012', code: '#ORD-3012', reason: 'Sai địa chỉ', shipper: 'Trần Văn C', time: '12:00', handling: 'Đã xử lý' },
];

// Area performance
export const areaPerformance = [
  { area: 'Hải Châu', success: 40, error: 2, onTime: 95 },
  { area: 'Sơn Trà', success: 25, error: 3, onTime: 89 },
  { area: 'Thanh Khê', success: 30, error: 0, onTime: 100 },
  { area: 'Liên Chiểu', success: 18, error: 1, onTime: 96 },
];

// Alerts / notifications
export const alerts = [
  { type: 'error', message: 'Đơn #ORD-3023 bị trễ 15 phút (Shipper: Lê Thị B)', time: '5 phút trước' },
  { type: 'warning', message: 'Khách hàng #ORD-3010 yêu cầu giao lại lúc 14:00', time: '12 phút trước' },
  { type: 'success', message: 'Nguyễn Văn C đã hoàn thành 20 đơn liên tiếp không lỗi 👏', time: '25 phút trước' },
];

export const currency = (v) =>
  (v ?? 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export const pickers = [
  { id: 1, name: 'Nguyễn Văn A', currentOrder: '#ORD-2034', completed: 24, issues: 1, performance: 92 },
  { id: 2, name: 'Lê Thị B', currentOrder: '#ORD-2035', completed: 21, issues: 3, performance: 84 },
  { id: 3, name: 'Phạm Văn C', currentOrder: '#ORD-2038', completed: 18, issues: 0, performance: 100 },
  { id: 4, name: 'Trần Văn D', currentOrder: '#ORD-2041', completed: 16, issues: 2, performance: 88 },
  { id: 5, name: 'Hoàng Thị E', currentOrder: '#ORD-2042', completed: 14, issues: 1, performance: 90 },
];

export const teamPerformance = [
  { name: 'A', done: 25, issue: 2, avg: 18 },
  { name: 'B', done: 21, issue: 0, avg: 15 },
  { name: 'C', done: 30, issue: 3, avg: 20 },
  { name: 'D', done: 17, issue: 1, avg: 19 },
  { name: 'E', done: 14, issue: 2, avg: 22 },
];