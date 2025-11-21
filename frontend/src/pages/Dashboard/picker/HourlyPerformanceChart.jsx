import React from 'react';
import { Card } from 'antd';
import { Area } from '@ant-design/plots';
import { hourlyPerformance } from './mockData';

const HourlyPerformanceChart = ({ panelHeight = 380 }) => {
  const height = Math.max(160, panelHeight - 57 - 16);
  const config = {
    data: hourlyPerformance,
    xField: 'time',
    yField: 'done',
    smooth: true,
    areaStyle: { fill: 'l(270) 0:#91d5ff 1:#1677ff' },
    axis: { y: { labelFormatter: (v) => `${v}` } },
    height,
    autoFit: true,
  };

  return (
    <Card title="Hiệu suất theo giờ" bordered={false} style={{ height: panelHeight }} bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}>
      <Area {...config} />
    </Card>
  );
};

export default HourlyPerformanceChart;

