import DashboardService from "@src/services/DashboardService";

export const getKpiData = async () => {
  try {
    const res = await DashboardService.getSupPickerStats();
    if (res.success && res.data) {
      const data = res.data;
      return {
        totalOrderAssigned: data.totalOrderAssigned ?? 0,
        totalOrderProcessing: data.totalOrderProcessing ?? 0,
        totalOrderConfirmed: data.totalOrderConfirmed ?? 0,
        totalPickers: data.totalPickers ?? 0,
        totalOrderCancelled: data.totalOrderCancelled ?? 0,
      };
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (error) {
    console.error('Error loading KPI data:', error);
    return {
      totalOrders: 0,
      totalPickedOrders: 0,
    };
  }
};

// Hàm fetch data cho Order Processing Chart
export const getOrderProcessing = async () => {
  try {
    const res = await DashboardService.getSupPickerOrderProcessing();

    if (res.success && Array.isArray(res.data)) {

      // Status mapping - updated to match actual API response
      const statusMap = {
        'assigned': 'Chờ soạn',
        'in_progress': 'Đang soạn',
        'pending_review': 'Chờ duyệt',
        'completed': 'Đã soạn xong',
        'cancelled': 'Hủy',
      };

      // Thứ tự hiển thị các cột
      const statusOrder = ['assigned', 'in_progress', 'pending_review', 'completed', 'cancelled'];

      // Tạo map từ API data
      const dataMap = {};
      res.data.forEach((item) => {
        dataMap[item.status] = item.count;
      });

      // Tạo data theo đúng thứ tự, với giá trị 0 cho status không có data
      return statusOrder.map((status) => ({
        status: statusMap[status] || status,
        value: dataMap[status] || 0,
      }));
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (error) {
    console.error('Error loading order processing data:', error);
    return [
      { status: 'Chờ soạn', value: 0 },
      { status: 'Đang soạn', value: 0 },
      { status: 'Chờ duyệt', value: 0 },
      { status: 'Đã soạn xong', value: 0 },
      { status: 'Hủy', value: 0 },
    ];
  }
};

// Hàm fetch data cho Priority Orders
export const getOrderPrepared = async () => {
  try {
    const res = await DashboardService.getSupPickerOrderPrepared();

    if (res.success && Array.isArray(res.data)) {
      const normalizeProducts = (products) => {
        if (!Array.isArray(products)) {
          console.warn('Products is not an array:', products);
          return [];
        }
        
        const normalized = products.map((product, index) => {
          const result = {
            productId: product.productId || product.product_id || product.id || `prod-${index}`,
            skuCode: product.skuCode || product.sku_code || product.sku || 'N/A',
            imgURL: product.imgURL || product.img_url || product.imageUrl || product.image || '',
            mainUnit: product.mainUnit || product.main_unit || product.unit || 'N/A',
            productName: product.productName || product.product_name || product.name || 'Sản phẩm',
            quantity: Number(product.quantity ?? product.qty ?? product.amount ?? 0),
          };
          
          return result;
        });
        
        return normalized;
      };
      // Status mapping - updated to match actual API
      const statusMap = {
        'draft': 'Nháp',
        'pending_preparation': 'Chờ soạn',
        'assigned_preparation': 'Đã phân công',
        'in_progress': 'Đang soạn',
        'pending_review': 'Chờ duyệt',
        'confirmed': 'Đã xác nhận',
        'cancelled': 'Đã hủy',
      };

      // Priority calculation based on taskTime
      const getPriority = (taskTime) => {
        if (!taskTime) return 'Thấp';
        const taskDate = new Date(taskTime);
        const now = new Date();
        const hoursAgo = (now - taskDate) / (1000 * 60 * 60);

        // Đơn hàng càng lâu chưa xử lý thì priority càng cao
        if (hoursAgo > 48) return 'Khẩn cấp';
        if (hoursAgo > 24) return 'Cao';
        if (hoursAgo > 12) return 'Trung bình';
        return 'Thấp';
      };

      return res.data.map((item, index) => ({
        key: `${item.orderNo}-${index}`, // Unique key vì có thể có duplicate orderNo
        id: item.orderNo,
        quantityProduct: item.quantityProduct || 0,
        status: statusMap[item.status] || item.status,
        rawStatus: item.status,
        priority: getPriority(item.taskTime),
        pickerName: item.picker || '-',
        supPickerName: item.supPicker || '-',
        products: normalizeProducts(item.products),
        // Timeline data for expandable
        timeline: {
          taskTime: item.taskTime ? new Date(item.taskTime).toLocaleString('vi-VN') : '-',
        },
        // Raw dates for filtering
        rawDates: {
          taskTime: item.taskTime ? new Date(item.taskTime) : null,
        },
      }));
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (error) {
    console.error('Error loading priority orders:', error);
    return [];
  }
};

export const getCancelledOrders = async () => {
  try {
    const res = await DashboardService.getCancellerOrderSupPicker();

    if (res.success && Array.isArray(res.data)) {

      // Status mapping (cancelled focus)
      const statusMap = {
        'cancelled': 'Gặp lỗi',
        'assigned': 'Chờ soạn',
        'in_progress': 'Đang soạn',
        'pending_review': 'Chờ duyệt',
        'completed': 'Đã hoàn thành',
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

        deadline: item.deadline
          ? new Date(item.deadline).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : '-',

        supervisor: item.supervisorName || '-',
        picker: item.pickerName || '-',

        timeline: {
          createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '-',
          startedAt: item.startedAt ? new Date(item.startedAt).toLocaleString('vi-VN') : '-',
          completedAt: item.completedAt ? new Date(item.completedAt).toLocaleString('vi-VN') : '-',
          deadline: item.deadline ? new Date(item.deadline).toLocaleString('vi-VN') : '-',
        },

        rawDates: {
          createdAt: item.createdAt ? new Date(item.createdAt) : null,
          startedAt: item.startedAt ? new Date(item.startedAt) : null,
          completedAt: item.completedAt ? new Date(item.completedAt) : null,
          deadline: item.deadline ? new Date(item.deadline) : null,
        },
      }));
    } else {
      throw new Error("Invalid API response structure");
    }
  } catch (error) {
    console.error("Error loading cancelled orders:", error);
    return [];
  }
};

export const getPickerProgress = async () => {
  try {
    const res = await DashboardService.getPickerProgress();

    if (res.success && Array.isArray(res.data)) {
      return res.data.map((item) => ({
        pickerId: item.pickerId || null,
        pickerName: item.pickerName || 'N/A',

        totalTasks: item.totalTasks ?? 0,
        completed: item.completed ?? 0,
        inProgress: item.inProgress ?? 0,
        assigned: item.assigned ?? 0,
        pendingReview: item.pendingReview ?? 0,
        cancelled: item.cancelled ?? 0,

        // Tỷ lệ hoàn thành (0–100)
        completionRate: item.completionRate 
          ? Number(item.completionRate.toFixed(2))
          : 0,

        // Thời gian
        avgDurationSeconds: item.avgDurationSeconds ?? null,
        avgDurationMinutes: item.avgDurationMinutes 
          ? Number(item.avgDurationMinutes.toFixed(2)) 
          : null,
      }));
    }

    return [];

  } catch (error) {
    console.error("Error fetching picker progress:", error);
    return [];
  }
};

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

export const alerts = [
  { type: 'success', content: 'Nhân viên Nguyễn Văn A hoàn thành 30 đơn trong ngày' },
  { type: 'info', content: 'Đơn hàng #ORD-2028 đã được giao' },
  { type: 'error', content: 'Đơn #ORD-2029 trễ hạn 5 phút' },
  { type: 'warning', content: 'Thiếu sản phẩm #SP-102 - cần kiểm tra tồn kho' },
  { type: 'success', content: 'Nhân viên Lê Thị B hoàn thành 20 đơn trong ngày' },
  { type: 'warning', content: 'Đơn #ORD-2060 còn 10 phút đến hạn' },

];

