import DashboardService from '../../../services/DashboardService';

export const currency = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

export const getKpiData = async () => {
  try {
    const res = await DashboardService.getShipperStats();

    if (res.success && res.data) {
      const data = res.data;

      return {
        totalAssignedToday: data.totalAssignedToday ?? 0,
        deliveredSuccess: data.deliveredSuccess ?? 0,
        delivering: data.delivering ?? 0,
        lateOrders: data.lateOrders ?? 0,
        failedOrReturn: data.failedOrReturn ?? 0,
      };
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error loading Shipper KPI data:', error);
    return {
      totalAssignedToday: 0,
      deliveredSuccess: 0,
      delivering: 0,
      lateOrders: 0,
      failedOrReturn: 0,
    };
  }
};

export const calculateProgress = (kpiData) => {
  const total = kpiData.totalAssignedToday || 0;
  const completed = kpiData.deliveredSuccess || 0;
  const failed = kpiData.failedOrReturn || 0;
  const late = kpiData.lateOrders || 0;
  
  // Số đơn giao đúng hạn = Tổng hoàn thành - Số đơn trễ
  const onTime = Math.max(0, completed - late);
  
  // Giả sử thời gian trung bình mỗi đơn (có thể tính từ API nếu có)
  // Tạm thời set giá trị mặc định
  const averageMinutes = completed > 0 ? Math.round((8 * 60) / completed) : 0; // 8 giờ làm việc
  
  return {
    total,
    completed,
    onTime,
    averageMinutes,
    failed,
    late,
  };
};

export const kpis = {
  totalAssignedToday: 4,
  deliveredSuccess: 3,
  delivering: 0,
  lateOrders: 0,
  failedOrReturn: 0,
};

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



export const assignedOrders = [
  {
    key: '1',
    code: '#ORD-4123',
    customer: 'Nguyễn Văn A',
    address: '45 Phan Châu Trinh',
    value: 1250000,
    eta: '10:30',
    status: 'Đang giao',
  },
  {
    key: '2',
    code: '#ORD-4124',
    customer: 'Trần Thị B',
    address: '22 Nguyễn Văn Linh',
    value: 2100000,
    eta: '11:00',
    status: 'Chờ giao',
  },
  {
    key: '3',
    code: '#ORD-4125',
    customer: 'Lê Văn C',
    address: '89 Nguyễn Tri Phương',
    value: 780000,
    eta: '09:30',
    status: 'Trễ hạn',
  },
  {
    key: '4',
    code: '#ORD-4126',
    customer: 'Phạm Thị D',
    address: '12 Lý Thường Kiệt',
    value: 560000,
    eta: '12:15',
    status: 'Chờ giao',
  },
  {
    key: '5',
    code: '#ORD-4127',
    customer: 'Hoàng Văn E',
    address: '7 Nguyễn Huệ',
    value: 960000,
    eta: '12:45',
    status: 'Đang giao',
  },
];

export const progress = {
  total: 20,
  completed: 12,
  onTime: 10, 
  averageMinutes: 14,
};

export const priorityOrders = [
  { key: 'p1', code: '#ORD-4131', customer: 'Lê Văn D', deadline: '10:45', remainingMins: 15 },
  { key: 'p2', code: '#ORD-4132', customer: 'Hoàng Thị E', deadline: '11:00', remainingMins: 30 },
  { key: 'p3', code: '#ORD-4133', customer: 'Nguyễn Văn F', deadline: '11:05', remainingMins: 35 },
];

export const errorOrders = [
  { key: 'e1', code: '#ORD-4105', reason: 'Khách từ chối nhận', handling: 'Chờ xác nhận', time: '09:20' },
  { key: 'e2', code: '#ORD-4107', reason: 'Hư hàng khi vận chuyển', handling: 'Đang xử lý', time: '10:10' },
];

export const performanceByHour = [
  { hour: '08:00', value: 1 },
  { hour: '09:00', value: 3 },
  { hour: '10:00', value: 5 },
  { hour: '11:00', value: 2 },
  { hour: '12:00', value: 4 },
  { hour: '13:00', value: 3 },
];

export const notifications = [
  { key: 'n1', type: 'warning', content: 'Đơn #ORD-4132 cần giao gấp trong 15 phút' },
  { key: 'n2', type: 'error', content: 'Khách hàng #ORD-4105 yêu cầu đổi giờ giao sang 13:00' },
  { key: 'n3', type: 'success', content: 'Tốt lắm! Bạn đạt 95% giao đúng hạn trong tuần này 🎉' },
];

