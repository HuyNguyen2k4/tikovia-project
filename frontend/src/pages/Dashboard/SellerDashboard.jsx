import React, { useState } from 'react';
import { Row, Col, Grid, Typography } from 'antd';

import HeaderKPIs from './seller/HeaderKPIs';
import RevenueTrendChart from './seller/RevenueTrendChart';
import PaymentBreakdownPie from './seller/PaymentBreakdownPie';
import PersonalOrdersTable from './seller/PersonalOrdersTable';
import TopProducts from './seller/TopProducts';
import RecentCustomers from './seller/RecentCustomers';
import Notifications from './seller/Notifications';

const { Title } = Typography;


const SellerDashboard = () => {
  const [timeframe, setTimeframe] = useState('day');
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
      <Title level={2} >Dashboard Người Bán</Title>

      <HeaderKPIs />

      {/* <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <RevenueTrendChart timeframe={timeframe} onTimeframeChange={setTimeframe} />
        </Col>
        <Col xs={24} xl={8}>
          <PaymentBreakdownPie />
        </Col>
      </Row> */}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={13}>
          <TopProducts />
        </Col>
        <Col xs={24} xl={11}>
          <RecentCustomers />
        </Col>
      </Row>

      {/* <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
      <PersonalOrdersTable />
        </Col>
        <Col xs={24} xl={8}>
      <Notifications />
      </Col>
      </Row> */}
    </div>
  );
};

export default SellerDashboard;
