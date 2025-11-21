import React, { useState } from 'react';
import { Row, Col, Modal, Button, Typography } from 'antd';
import KPIs from './accountant/KPIs';
import RevExpProfitChart from './accountant/RevExpProfitChart';
import PaymentStatusPie from './accountant/PaymentStatusPie';
import CashFlowChart from './accountant/CashFlowChart';
import OrdersTable from './accountant/OrdersTable';
import SuppliersTable from './accountant/SuppliersTable';
import AlertsList from './accountant/AlertsList';
import CustomerCashFlowChart from './accountant/CustomerCashFlowChart';
import { FileTextOutlined } from '@ant-design/icons';

const { Title } = Typography;


const AccountantDashboard = () => {
  const [granularity, setGranularity] = useState('month');
  const [selectedOrder, setSelectedOrder] = useState(null);

  return (
    <div>
      <Title level={2} >Dashboard Kế Toán</Title>
      <KPIs />

      {/* <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={14}>
          <RevExpProfitChart granularity={granularity} onChangeGranularity={(e) => setGranularity(e.target.value)} />
        </Col>
        <Col xs={24} lg={10}>
          <PaymentStatusPie />
        </Col>
      </Row> */}

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}>
          <CashFlowChart />
        </Col>
        <Col xs={24} lg={12}>
          <CustomerCashFlowChart />
        </Col>
      </Row>

      {/* <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={14}>
          <OrdersTable onOpenDetail={(order) => setSelectedOrder(order)} />
        </Col>
        <Col xs={24} lg={10}>
          <SuppliersTable />
        </Col>
      </Row> */}

      <Modal
        open={!!selectedOrder}
        onCancel={() => setSelectedOrder(null)}
        onOk={() => setSelectedOrder(null)}
        title={`Chi tiết ${selectedOrder?.code || ''}`}
      >
        {selectedOrder ? (
          <div>
            <p><b>Khách hàng:</b> {selectedOrder.customer}</p>
            <p><b>Tổng tiền:</b> {selectedOrder.total.toLocaleString('vi-VN')} ₫</p>
            <p><b>Trạng thái:</b> {selectedOrder.status}</p>
            <p><b>Ngày tạo:</b> {selectedOrder.createdAt}</p>
            <p><b>Ghi chú:</b> {selectedOrder.note || '—'}</p>
            <Button type="primary" block icon={<FileTextOutlined />}>Xem hóa đơn PDF</Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AccountantDashboard;

