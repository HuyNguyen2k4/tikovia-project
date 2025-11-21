import React from 'react';
import { Card } from 'antd';
import { Pie } from '@ant-design/plots';
import { mockPaymentStatus } from './mockData';

const PaymentStatusPie = () => {
  const config = {
    data: mockPaymentStatus,
    angleField: 'value',
    colorField: 'type',
    label: { text: 'value', style: { fontWeight: 'bold', fill: '#fff' } },
    legend: { color: { position: 'bottom' } },
    color: ({ type }) => ({
      'Đã thanh toán': '#52c41a',
      'Chờ thanh toán': '#faad14',
      'Đã hủy': '#f5222d',
      'Hoàn tiền': '#13c2c2',
    })[type],
    height: 320,
    autoFit: true,
  };
  return (
    <Card title="Trạng thái thanh toán" bordered={false} style={{ height: 400 }} bodyStyle={{ height: 'calc(100% - 57px)', padding: 16 }}>
      <Pie {...config} />
    </Card>
  );
};

export default PaymentStatusPie;

