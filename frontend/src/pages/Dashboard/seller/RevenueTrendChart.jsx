import React from 'react';
import { Card, Radio, Grid } from 'antd';
import { Column } from '@ant-design/plots';
import { revenueTrend, currency } from './mockData';

const RevenueTrendChart = ({ timeframe, onTimeframeChange, panelHeight = 380 }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const cardHeight = isMobile ? 340 : panelHeight;
  const chartHeight = cardHeight - 57 - 16;

  const config = {
    data: revenueTrend,
    xField: 'date',
    yField: 'revenue',
    label: { text: (d) => currency(d.revenue), style: { fontSize: 12 } },
    color: '#1890ff',
    tooltip: {
      title: (d) => `Ngày: ${d.date}`,
      items: [{ channel: 'y', valueFormatter: (v) => currency(v) }],
    },
    height: chartHeight,
    autoFit: true,
  };

  return (
    <Card
      title="Doanh thu cá nhân"
      bordered={false}
      style={{ height: cardHeight }}
      extra={
        <Radio.Group value={timeframe} onChange={(e) => onTimeframeChange?.(e.target.value)} size="small">
          <Radio.Button value="day">Ngày</Radio.Button>
          <Radio.Button value="week">Tuần</Radio.Button>
        </Radio.Group>
      }
    >
      <Column {...config} />
    </Card>
  );
};

export default RevenueTrendChart;

