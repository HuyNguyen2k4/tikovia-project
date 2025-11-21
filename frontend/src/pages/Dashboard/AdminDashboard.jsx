import React, { useState, useEffect } from 'react';
import { Row, Col, Tag, Typography, Spin } from 'antd';
import KPIs from './admin/KPIs';
import RevenueChart from './admin/RevenueChart';
import OrderStatusPie from './admin/OrderStatusPie';
import OrdersTimelineChart from './admin/OrdersTimelineChart';
import TopProductsCard from './admin/TopProductsCard';
import RecentOrdersCard from './admin/RecentOrdersCard';
import ProfitComparisonCard from './admin/ProfitComparisonCard';
import ProductsModal from './admin/ProductsModal';
import OrdersModal from './admin/OrdersModal';

// Import các hàm fetch data
import { getKpiData, getTopProducts, getRecentOrders, getOrderStatusData, getOrdersTimeline, getRevenueTimeline } from './admin/mockData';

const { Title } = Typography;

const AdminDashboard = () => {
  const [revenueTimePeriod, setRevenueTimePeriod] = useState('month');
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Load tất cả data song song
        await Promise.all([
          getKpiData(),
          getTopProducts(),
          getRecentOrders(),
          getOrderStatusData(),
          getOrdersTimeline(),
          getRevenueTimeline({ filter: 'month', month: new Date().getMonth() + 1, year: new Date().getFullYear() })
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh' 
      }}>
        <Spin size="large" tip="Đang tải dashboard..." />
      </div>
    );
  }

  const productColumns = [
    { title: '#', dataIndex: 'id', key: 'id', width: 50 },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name' },
    { title: 'Danh mục', dataIndex: 'category', key: 'category' },
    { title: 'Giá tiền', dataIndex: 'price', key: 'price', render: (price) => `${price.toLocaleString('vi-VN')} ₫` },
    { title: 'Số lượng bán', dataIndex: 'soldQuantity', key: 'soldQuantity', render: (qty) => <Tag color="blue">{qty}</Tag> },
  ];

  const orderColumns = [
    { title: 'Mã đơn', dataIndex: 'id', key: 'id' },
    { title: 'Khách hàng', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', render: (amount) => `${amount.toLocaleString('vi-VN')} ₫` },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (status) => {
        const map = { paid: { color: 'green', text: 'Đã thanh toán' }, pending: { color: 'orange', text: 'Chờ thanh toán' }, cancelled: { color: 'red', text: 'Đã hủy' } };
        const s = map[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    },
    { title: 'Thời gian', dataIndex: 'date', key: 'date' },
  ];

  return (
    <div>
      <Title level={2} >Dashboard Quản Trị</Title>
      <KPIs />

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}>
          <RevenueChart timePeriod={revenueTimePeriod} onTimePeriodChange={(e) => setRevenueTimePeriod(e.target.value)} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <OrderStatusPie />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <OrdersTimelineChart />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} sm={12} lg={8}>
          <TopProductsCard onViewAll={() => setShowProductsModal(true)} />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <RecentOrdersCard onViewAll={() => setShowOrdersModal(true)} />
        </Col>
        <Col xs={24} lg={8}>
          <ProfitComparisonCard />
        </Col>
      </Row>

      <ProductsModal visible={showProductsModal} onClose={() => setShowProductsModal(false)} productColumns={productColumns} />
      <OrdersModal visible={showOrdersModal} onClose={() => setShowOrdersModal(false)} orderColumns={orderColumns} />
    </div>
  );
};

export default AdminDashboard;

