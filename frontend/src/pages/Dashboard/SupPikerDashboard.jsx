import React, { useState } from 'react';
import { Row, Col, Typography } from 'antd';
import HeaderKPIs from './suppiker/HeaderKPIs';
import OrderProgressChart from './suppiker/OrderProgressChart';
import PickersTable from './suppiker/PickersTable';
import PriorityOrders from './suppiker/PriorityOrders';
import ErrorOrders from './suppiker/ErrorOrders';
import PickerPerformanceChart from './suppiker/PickerPerformanceChart';
import AlertsTimeline from './suppiker/AlertsTimeline';

const { Title } = Typography;

const SupPikerDashboard = () => {
  const [timeframe, setTimeframe] = useState('today');
  const panelHeight = 380;

  return (
    <div>
      <Title level={2} >Dashboard Giám sát soạn hàng</Title>

      <HeaderKPIs />

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={9}>
          <OrderProgressChart timeframe={timeframe} onTimeframeChange={setTimeframe} panelHeight={panelHeight} />
        </Col>
        <Col xs={24} lg={15}>
          <PriorityOrders panelHeight={panelHeight} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={14}>
          <ErrorOrders panelHeight={panelHeight} />
        </Col>
        <Col xs={24} lg={10}>
          <AlertsTimeline panelHeight={panelHeight} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={14}>
          <PickersTable panelHeight={panelHeight} />
        </Col>
        <Col xs={24} lg={10}>
          <PickerPerformanceChart panelHeight={panelHeight} />
        </Col>
      </Row>
    </div>
  );
};

export default SupPikerDashboard;
