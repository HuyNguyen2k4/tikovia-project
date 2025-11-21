import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import {
  ShoppingCartOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  UserOutlined,
  FileOutlined
} from '@ant-design/icons';
import { getKpiData } from './mockData';

const HeaderKPIs = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const result = await getKpiData();
        setData(result);
      } catch (error) {
        console.error('Error fetching KPI data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }
  const cards = [
    { title: 'Đơn nháp', value: data.draftOrders, icon: <FileOutlined />, color: '#434241ff' },
    { title: 'Tổng đơn đã tạo', value: data.totalOrders, icon: <ShoppingCartOutlined />, color: '#1890ff' },
    { title: 'Đơn đang xử lý', value: data.processingOrders, icon: <SyncOutlined />, color: '#faad14' },
    { title: 'Đơn đã Hoàn thành', value: data.completedOrders, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: 'Vấn đề/ Lỗi', value: data.cancelledOrders, icon: <CloseCircleOutlined />, color: '#f5222d' },
    { title: 'Số lượng khách hàng', value: data.totalCustomers, icon: <UserOutlined />, color: '#722ed1' },

  ];

  return (
    <Row gutter={[16, 16]} justify="center">
      {cards.map((c) => (
        <Col xs={24} sm={12} lg={8} xl={4} key={c.title}>
          <Card bordered={false} style={{ background: c.color }}>
            <Statistic
              title={<span style={{ color: '#fff' }}>{c.title}</span>}
              value={c.value}
              prefix={c.icon}
              valueStyle={{ color: '#fff', lineHeight: 1.1 }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default HeaderKPIs;

