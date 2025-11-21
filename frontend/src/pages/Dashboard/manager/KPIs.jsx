import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin } from 'antd';
import { SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, InboxOutlined, TeamOutlined } from '@ant-design/icons';
import {getKpiData } from './mockData';

const KPIs = () => {
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
    { title: 'Đơn cần xử lý hôm nay', value: data.processingOrders, icon: <SyncOutlined />, color: '#1677ff' },
    { title: 'Đơn hoàn thành hôm nay', value: data.completedOrders, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: 'Đơn bị hủy', value: data.cancelledOrders, icon: <ExclamationCircleOutlined />, color: '#ff4d4f' },
    { title: 'Đơn trả supplier', value: data.SupplierReturns, icon: <ReloadOutlined />, color: '#fa8c16' },
    { title: 'Đơn nhập supplier', value: data.supplierInput, icon: <TeamOutlined />, color: '#6ce0f2ff' },
    { title: 'Tổng tồn kho', value: data.totalInventory, icon: <InboxOutlined />, color: '#8c8c8c' },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col xs={24} sm={12} lg={8} xxl={4} key={c.title}>
          <Card bordered={false} style={{ background: c.color }}>
            <Statistic
              title={<span style={{ color: c.titleColor || '#fff' }}>{c.title}</span>}
              value={c.value}
              prefix={c.icon}
              valueStyle={{ color: c.valueColor || '#fff' }}
              suffix={c.suffix || undefined}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default KPIs;

