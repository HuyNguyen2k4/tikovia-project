import React from 'react';
import { Card } from 'antd';
import { Pie } from '@ant-design/plots';
import { mockCompletionRatio } from './mockData';

const CompletionRatio = ({ height = 360 }) => {
  const config = {
    data: mockCompletionRatio,
    angleField: 'value',
    colorField: 'type',
    innerRadius: 0.64,
    radius: 0.9,
    color: ({ type }) => (type === 'Đúng hạn' ? '#52c41a' : type === 'Lỗi' ? '#ff4d4f' : '#faad14'),
    label: { text: 'value', style: { fontWeight: 'bold', fill: '#fff' } },
    legend: { color: { position: 'bottom', layout: 'horizontal' } },
    height: Math.max(120, height - 80),
  };
  return (
    <Card
      title="Tỷ lệ hoàn thành / lỗi"
      bordered={false}
      style={{ height: `${height}px` }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}
    >
      <Pie {...config} />
    </Card>
  );
};

export default CompletionRatio;

