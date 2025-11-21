import DashboardService from "@src/services/DashboardService";

// Accountant KPI data
export const getAccountantKpiData = async () => {
  try {
    const res = await DashboardService.getAccountantStats();

    if (res.success && res.data) {
      const data = res.data;
      return data;
    } else {
      // Ném lỗi nếu response không thành công hoặc không có data
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error loading Accountant KPI data:', error);
    return {
      suplierPaymentIn: [
        {
          totalExpected: 0,
          totalPaid: 0,
          totalMissing: 0
        }
      ],
      suplierPaymentOut: [
        {
          totalExpectedOut: 0,
          totalPaidOut: 0,
          totalMissingOut: 0
        }
      ]
    };
  }
};

export const getMonthlyTransactionData = async (month, year) => {
  try {
    const res = await DashboardService.getMonthlyTransactions({ month, year });

    if (res.success && res.data) {

      const groupedData = new Map();

      for (const item of res.data) {
        const dateKey = item.month; 
        
        if (!groupedData.has(dateKey)) {
          groupedData.set(dateKey, {
            date: dateKey, 
            moneyIn: 0,
            moneyOut: 0,
          });
        }

        const entry = groupedData.get(dateKey);

        if (item.type === 'in') {
          entry.moneyIn += item.totalPaid;
        } else if (item.type === 'out') {
          entry.moneyOut += item.totalPaid;
        }
      }

      const transformedData = Array.from(groupedData.values());
      
      transformedData.sort((a, b) => a.date.localeCompare(b.date));

      return transformedData;

    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error loading monthly transaction data:', error);
    return [];
  }
};

export const getCustomerTransactionData = async () => {
  try {
    const res = await DashboardService.getCustomerTransactions();

    if (res.success && res.data) {
      const groupedData = new Map();

      for (const item of res.data) {
        const dateKey = item.month;
        
        if (!groupedData.has(dateKey)) {
          groupedData.set(dateKey, {
            date: dateKey,
            moneyIn: 0,
            moneyOut: 0,
          });
        }

        const entry = groupedData.get(dateKey);
        entry.moneyIn += item.totalIn || 0;
        entry.moneyOut += item.totalOut || 0;
      }

      const transformedData = Array.from(groupedData.values());
      transformedData.sort((a, b) => a.date.localeCompare(b.date));

      return transformedData;
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error('Error loading customer transaction data:', error);
    return [];
  }
};

export const mockKpis = {
  revenue: 325_000_00,
  expenses: 198_500_00,
  netProfit: 126_500_00,
  pendingOrders: 18,
  supplierDebt: 23_700_00,
  onTimeRate: 86,
};

export const mockRevExpProfit = [
  { period: 'T1', type: 'Doanh thu', value: 180_000_000 },
  { period: 'T1', type: 'Chi phí', value: 120_000_000 },
  { period: 'T1', type: 'Lợi nhuận', value: 60_000_000 },
  { period: 'T2', type: 'Doanh thu', value: 195_000_000 },
  { period: 'T2', type: 'Chi phí', value: 130_000_000 },
  { period: 'T2', type: 'Lợi nhuận', value: 65_000_000 },
  { period: 'T3', type: 'Doanh thu', value: 165_000_000 },
  { period: 'T3', type: 'Chi phí', value: 118_000_000 },
  { period: 'T3', type: 'Lợi nhuận', value: 47_000_000 },
  { period: 'T4', type: 'Doanh thu', value: 210_000_000 },
  { period: 'T4', type: 'Chi phí', value: 150_000_000 },
  { period: 'T4', type: 'Lợi nhuận', value: 60_000_000 },
  { period: 'T5', type: 'Doanh thu', value: 230_000_000 },
  { period: 'T5', type: 'Chi phí', value: 162_000_000 },
  { period: 'T5', type: 'Lợi nhuận', value: 68_000_000 },
  { period: 'T6', type: 'Doanh thu', value: 245_000_000 },
  { period: 'T6', type: 'Chi phí', value: 172_000_000 },
  { period: 'T6', type: 'Lợi nhuận', value: 73_000_000 },
];

export const mockPaymentStatus = [
  { type: 'Đã thanh toán', value: 62 },
  { type: 'Chờ thanh toán', value: 21 },
  { type: 'Đã hủy', value: 9 },
  { type: 'Hoàn tiền', value: 8 },
];

export const mockOrders = [
  { code: '#ORD-1023', customer: 'Nguyễn Văn A', total: 3_200_000, status: 'pending', createdAt: '22/10/2024', note: '' },
  { code: '#ORD-1024', customer: 'Trần Thị B', total: 2_500_000, status: 'paid', createdAt: '23/10/2024', note: '' },
  { code: '#ORD-1025', customer: 'Lê Minh C', total: 5_800_000, status: 'paid', createdAt: '24/10/2024', note: 'Đã xuất hóa đơn' },
  { code: '#ORD-1026', customer: 'Phạm Văn D', total: 1_900_000, status: 'pending', createdAt: '25/10/2024', note: '' },
];

export const mockSuppliers = [
  { supplier: 'T3 Logistics', debt: 8_500_000, orders: 3, dueDate: '25/10/2024', status: 'pending' },
  { supplier: 'HomeBuild', debt: 5_200_000, orders: 2, dueDate: '27/10/2024', status: 'overdue' },
  { supplier: 'Mori Tools', debt: 2_300_000, orders: 1, dueDate: '30/10/2024', status: 'upcoming' },
];

export const mockCashFlow = [
  { date: '17/10', type: 'Tiền vào', value: 20_000_000 },
  { date: '17/10', type: 'Tiền ra', value: 12_000_000 },
  { date: '18/10', type: 'Tiền vào', value: 18_000_000 },
  { date: '18/10', type: 'Tiền ra', value: 15_000_000 },
  { date: '19/10', type: 'Tiền vào', value: 22_000_000 },
  { date: '19/10', type: 'Tiền ra', value: 16_500_000 },
  { date: '20/10', type: 'Tiền vào', value: 16_000_000 },
  { date: '20/10', type: 'Tiền ra', value: 9_000_000 },
];

export const mockAlerts = [
  { type: 'error', title: 'Công nợ quá hạn', desc: 'Supplier HomeBuild quá hạn thanh toán 2 ngày', time: '5 phút trước' },
  { type: 'success', title: 'Đối soát thành công', desc: 'Đã đối soát công nợ tháng 9', time: 'vừa xong' },
  { type: 'warning', title: 'Sai lệch đơn hàng', desc: 'Đơn #ORD-1003 lệch 150.000 ₫ cần kiểm tra', time: '10 phút trước' },
];
