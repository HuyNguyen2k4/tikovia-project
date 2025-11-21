import React, { useState } from 'react';
import { Row, Col, Grid, Typography } from 'antd';

import HeaderKPIs from './shipper/HeaderKPIs';
import AssignedOrdersTable from './shipper/AssignedOrdersTable';
import PersonalProgress from './shipper/PersonalProgress';
import PriorityOrders from './shipper/PriorityOrders';
import ErrorReturnOrders from './shipper/ErrorReturnOrders';
import PerformanceByHourChart from './shipper/PerformanceByHourChart';
import Notifications from './shipper/Notifications';

const { Title } = Typography;

const ShipperDashboard = () => {
  const [timeframe, setTimeframe] = useState('today');
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
      <Title level={2} >Dashboard Người Giao Hàng</Title>

      <HeaderKPIs />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <AssignedOrdersTable />
        </Col>
        <Col xs={24} xl={8}>
          <PersonalProgress />
        </Col>
      </Row>

      {/* <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <PriorityOrders />
        </Col>
        <Col xs={24} xl={12}>
          <ErrorReturnOrders />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <PerformanceByHourChart timeframe={timeframe} onTimeframeChange={setTimeframe} />
        </Col>
        <Col xs={24} xl={8}>
          <Notifications />
        </Col>
      </Row> */}
    </div>
  );
};

export default ShipperDashboard;
