import React from 'react';
import { Row, Col, Typography } from 'antd';
import HeaderKPIs from './picker/HeaderKPIs';
import AssignedOrders from './picker/AssignedOrders';
import PersonalProgress from './picker/PersonalProgress';
import ActivityTimeline from './picker/ActivityTimeline';
import ErrorOrders from './picker/ErrorOrders';
import HourlyPerformanceChart from './picker/HourlyPerformanceChart';
import LeaderNotes from './picker/LeaderNotes';

const { Title } = Typography;


const PickerDashboard = () => {
  return (
    <div style={{ padding: 16 }}>
      <Title level={2} >Dashboard Người Soạn</Title>

      <HeaderKPIs />

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={16}>
          <AssignedOrders />
        </Col>
        <Col xs={24} lg={8}>
          <PersonalProgress />
          <div style={{ height: 16 }} />
          <ActivityTimeline />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}>
          <ErrorOrders />
        </Col>
        <Col xs={24} lg={12}>
          <HourlyPerformanceChart />
        </Col>
      </Row>

      {/* <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <LeaderNotes />
        </Col>
      </Row> */}
    </div>
  );
};

export default PickerDashboard;
