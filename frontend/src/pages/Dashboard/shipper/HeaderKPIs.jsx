import React from 'react';
import { Row, Col, Card, Statistic, Grid } from 'antd';
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { kpis } from './mockData';

const HeaderKPIs = () => {
  const cards = [
    { title: 'Tổng đơn được giao', value: kpis.totalAssignedToday, icon: <ShoppingOutlined />, color: '#1890ff' },
    { title: 'Đã giao thành công', value: kpis.deliveredSuccess, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: 'Đang giao', value: kpis.delivering, icon: <SyncOutlined />, color: '#13c2c2' },
    { title: 'Đơn trễ hạn', value: kpis.lateOrders, icon: <ExclamationCircleOutlined />, color: '#faad14' },
    { title: 'Đơn bị hoàn / lỗi', value: kpis.failedOrReturn, icon: <CloseCircleOutlined />, color: '#f5222d' },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col xs={24} sm={12} lg={8} xl={4} key={c.title}>
          <Card bordered={false}  style={{ background: c.color }}>
            <Statistic
              title={<span style={{ color: '#fff'}}>{c.title}</span>}
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
