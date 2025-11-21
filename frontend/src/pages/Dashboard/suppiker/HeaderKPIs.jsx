import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  RiseOutlined,
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
    { title: 'Tổng đơn cần soạn', value: data.totalOrderAssigned, icon: <ShoppingOutlined />, color: '#1890ff' },
    { title: 'Tổng đơn đang soạn', value: data.totalOrderProcessing, icon: <SyncOutlined />, color: '#faad14' },
    { title: 'Tổng đơn đã soạn xong', value: data.totalOrderConfirmed, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: 'Đơn hàng bị lỗi', value: data.totalOrderCancelled, icon: <ExclamationCircleOutlined />, color: '#f5222d' },
    { title: 'Nhân viên soạn', value: data.totalPickers, icon: <TeamOutlined />, color: '#13c2c2' },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col xs={24} sm={12} lg={4} key={c.title}>
          <Card bordered={false} style={{ background: c.color }}>
            <Statistic
              title={<span style={{ color: '#fff' }}>{c.title}</span>}
              value={c.value}
              prefix={c.icon}
              valueStyle={{ color: '#fff' }}
              suffix={c.suffix || undefined}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default HeaderKPIs;

