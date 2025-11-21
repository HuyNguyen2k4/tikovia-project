import React, { useState } from 'react';
import { Row, Col, Typography } from 'antd';
import KPIs from './manager/KPIs';
import OrderPipeline from './manager/OrderPipeline';
import CompletionRatio from './manager/CompletionRatio';
import InventoryTable from './manager/InventoryTable';
import LeadsPerformanceTable from './manager/LeadsPerformanceTable';

const { Title } = Typography;

import LeaderDetailModal from './manager/LeaderDetailModal';
import SuppliersInOut from './manager/SupplierInOut';
import Notification from './manager/Notification';
const ManagerDashboard = () => {
  const [selectedLeader, setSelectedLeader] = useState(null);

  return (
    <div>
      <Title level={2} >Dashboard Quản Lí</Title>
      <KPIs />

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={16}>
          <InventoryTable />
        </Col>
        <Col xs={24} lg={8}>
          <OrderPipeline height={400} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={16}>
          <SuppliersInOut />
        </Col>
        <Col xs={24} lg={8}>
          <Notification />
        </Col>
      </Row>

      {/* <LeaderDetailModal open={!!selectedLeader} leader={selectedLeader} onClose={() => setSelectedLeader(null)} />

      <Row gutter={[16, 16]} align="stretch" style={{ marginTop: 12 }}>

        <Col xs={24} lg={16}>
          <LeadsPerformanceTable onViewLeader={(r) => setSelectedLeader(r)} />
        </Col>
      </Row> */}

    </div>
  );
};

export default ManagerDashboard;

