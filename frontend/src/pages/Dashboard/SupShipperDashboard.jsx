import React, { useState } from 'react';
import { Row, Col, Typography } from 'antd';
import HeaderKPIs from './supshipper/HeaderKPIs';
import DeliveryProgressChart from './supshipper/DeliveryProgressChart';
import ShippersPerformanceTable from './supshipper/ShippersPerformanceTable';
import InTransitOrders from './supshipper/InTransitOrders';
import ErrorOrders from './supshipper/ErrorOrders';
import AreaPerformanceChart from './supshipper/AreaPerformanceChart';
import AlertsTimeline from './supshipper/AlertsTimeline';
import ShippersTable from './supshipper/ShippersTable';
import TeamPerformanceChart from './supshipper/TeamPerformanceChart';

const { Title } = Typography;


const SupShipperDashboard = () => {
  const [timeframe, setTimeframe] = useState('today');
  const panelHeight = 380;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Title level={2} >Dashboard Giám sát giao hàng</Title>
      <HeaderKPIs />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <DeliveryProgressChart timeframe={timeframe} onTimeframeChange={setTimeframe} />
        </Col>
        <Col xs={24} xl={14}>
          <InTransitOrders />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}>
          <ShippersTable panelHeight={panelHeight} />
        </Col>
        <Col xs={24} lg={12}>
          <TeamPerformanceChart panelHeight={panelHeight} />
        </Col>
      </Row>

      {/* <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <InTransitOrders />
        </Col>
        <Col xs={24} xl={10}>
          <ErrorOrders />
        </Col>
      </Row>

      <AlertsTimeline /> */}
    </div>
  );
};

export default SupShipperDashboard;
