import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import { ShoppingOutlined, CheckCircleOutlined, SyncOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { getKpiData } from './mockData';

const HeaderKPIs = () => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getKpiData();
        setKpis(data);
      } catch (error) {
        console.error('Error fetching KPI data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !kpis) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const cards = [
    { title: 'Số đơn đã giao', value: kpis.totalAssigned, icon: <ShoppingOutlined />, color: '#1890ff' },
    { title: 'Đã hoàn thành', value: kpis.completed, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: 'Đang thực hiện', value: kpis.inProgress, icon: <SyncOutlined />, color: '#faad14' },
    { title: 'Chờ duyệt', value: kpis.pendingApproval, icon: <ClockCircleOutlined />, color: '#13c2c2' },
    { title: 'Gặp lỗi / thiếu hàng', value: kpis.issues, icon: <ExclamationCircleOutlined />, color: '#f5222d' },
  ];

  return (
    <Row gutter={[16, 16]} justify="center">
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

