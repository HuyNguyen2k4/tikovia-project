import React from 'react';
import { Card } from 'antd';
import { Line } from '@ant-design/plots';
import { mockShiftPerformance } from './mockData';

const ShiftPerformanceChart = ({ height = 360 }) => {
  const config = {
    data: mockShiftPerformance,
    xField: 'day',
    yField: 'value',
    colorField: 'shift',
    smooth: true,
    legend: { position: 'top' },
    axis: { y: { labelFormatter: (v) => `${v}%` } },
    color: ({ shift }) => (shift === 'Sáng' ? '#1677ff' : shift === 'Chiều' ? '#13c2c2' : '#faad14'),
    height: Math.max(120, height - 100),
    autoFit: true,
  };
  return (
    <Card
      title="Hiệu suất trung bình theo ca"
      bordered={false}
      style={{ height: `${height}px` }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}
    >
      <Line {...config} />
    </Card>
  );
};
export default ShiftPerformanceChart;