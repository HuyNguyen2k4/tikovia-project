import DashboardService from "@src/services/DashboardService";

export const getKpiData = async () => {
  try {
    const res = await DashboardService.getPickerStats();
    if (res.success && Array.isArray(res.data)) {
      // Tạo map từ API data
      const dataMap = {};
      res.data.forEach((item) => {
        dataMap[item.status] = item.count;
      });

      return {
        totalAssigned: dataMap['assigned'] || 0,
        completed: dataMap['completed'] || 0,
        inProgress: dataMap['in_progress'] || 0,
        pendingApproval: dataMap['pending_review'] || 0,
        issues: dataMap['cancelled'] || 0,
      };
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error loading Picker KPI data:', error);
    // fallback mock nếu API lỗi
    return {
      totalAssigned: 0,
      completed: 0,
      inProgress: 0,
      pendingApproval: 0,
      issues: 0,
    };
  }
};

export const getOrderAssigned = async () => {
  try {
    const res = await DashboardService.getOrderPickerAssigned();
    
    if (res.success && Array.isArray(res.data)) {
      // Status mapping
      const statusMap = {
        'assigned': 'Chờ soạn',
        'in_progress': 'Đang soạn',
        'pending_review': 'Chờ duyệt',
        'completed': 'Đã hoàn thành',
        'cancelled': 'Gặp lỗi',
      };

      // Priority calculation based on deadline
      const getPriority = (deadline) => {
        if (!deadline) return 'Thấp';
        const deadlineTime = new Date(deadline);
        const now = new Date();
        const hoursLeft = (deadlineTime - now) / (1000 * 60 * 60);
        
        if (hoursLeft < 0) return 'Khẩn cấp'; // Đã quá hạn
        if (hoursLeft < 3) return 'Khẩn cấp';
        if (hoursLeft < 6) return 'Cao';
        if (hoursLeft < 12) return 'Trung bình';
        return 'Thấp';
      };

      return res.data.map((item) => ({
        taskId: item.taskId,
        id: item.orderNo,
        items: parseInt(item.totalItems) || 0,
        quantity: parseFloat(item.totalQuantity) || 0,
        status: statusMap[item.taskStatus] || item.taskStatus,
        cancelReason: item.cancelReason || '-',
        rawStatus: item.taskStatus,
        priority: getPriority(item.deadline),
        deadline: item.deadline ? new Date(item.deadline).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }) : '-',
        supervisor: item.supervisorName || '-',
        packer: item.packerName || '-',
        // Timeline data for expandable
        timeline: {
          createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '-',
          startedAt: item.startedAt ? new Date(item.startedAt).toLocaleString('vi-VN') : '-',
          completedAt: item.completedAt ? new Date(item.completedAt).toLocaleString('vi-VN') : '-',
          deadline: item.deadline ? new Date(item.deadline).toLocaleString('vi-VN') : '-',
        },
        // Raw dates for filtering
        rawDates: {
          createdAt: item.createdAt ? new Date(item.createdAt) : null,
          startedAt: item.startedAt ? new Date(item.startedAt) : null,
          completedAt: item.completedAt ? new Date(item.completedAt) : null,
          deadline: item.deadline ? new Date(item.deadline) : null,
        },
      }));
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (error) {
    console.error('Error loading assigned orders:', error);
    return [];
  }
};





export const activityLogs = [
  { type: 'success', time: '10:15', content: 'Hoàn thành đơn #ORD-2050' },
  { type: 'processing', time: '10:45', content: 'Đang soạn đơn #ORD-2051' },
  { type: 'error', time: '11:00', content: 'Báo lỗi: “Nắp chai 500ml thiếu hàng”' },
  { type: 'info', time: '11:20', content: 'Nhận đơn mới #ORD-2054' },
];

export const myErrorOrders = [
  { id: '#ORD-2045', product: 'SP-1003', reason: 'Hết hàng', status: 'Đang chờ hàng' },
  { id: '#ORD-2046', product: 'SP-1098', reason: 'Sản phẩm lỗi', status: 'Chờ xác nhận' },
  { id: '#ORD-2053', product: 'SP-301', reason: 'Lỗi tem', status: 'Đã báo cáo' },
];

export const hourlyPerformance = [
  { time: '08:00', done: 1 },
  { time: '09:00', done: 3 },
  { time: '10:00', done: 5 },
  { time: '11:00', done: 2 },
  { time: '12:00', done: 1 },
];

export const leaderNotes = [
  { priority: 'warning', content: 'Kiểm tra lại đơn đơn #ORD-2051' },
  { priority: 'processing', content: 'Kho số 2 đang bảo trì, chuyển soạn SP-301 sang kho 1' },
  { priority: 'error', content: 'Ưu tiên đơn hàng có nhãn đỏ trong 30 phút tới' },
];

