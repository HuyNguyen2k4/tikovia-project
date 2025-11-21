import React from 'react';
import { Card, Grid } from 'antd';
import { Pie } from '@ant-design/plots';
import { paymentBreakdown } from './mockData';

const PaymentBreakdownPie = ({ panelHeight = 380 }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const cardHeight = isMobile ? 340 : panelHeight;

  const config = {
    data: paymentBreakdown,
    angleField: 'value',
    colorField: 'type',
    innerRadius: 0.6,
    legend: { position: 'bottom' },
    label: {
      text: (d) => `${d.type}: ${d.value}%`,
      position: 'outside',
    },
    tooltip: { items: [{ channel: 'y', valueFormatter: (v) => `${v}%` }] },
    height: cardHeight - 57 - 16,
    autoFit: true,
  };

  return (
    <Card title="Tình trạng thanh toán" bordered={false} style={{ height: cardHeight }}>
      <Pie {...config} />
    </Card>
  );
};

export default PaymentBreakdownPie;

