import React from 'react';
import { Card } from 'antd';
import { Column } from '@ant-design/plots';
import { areaPerformance } from './mockData';

// Visualize success vs error by area; tooltip also shows on-time rate
const AreaPerformanceChart = ({ panelHeight = 380 }) => {
  const chartHeight = panelHeight - 57 - 32;

  const data = areaPerformance.flatMap((a) => [
    { area: a.area, type: 'Thành công', value: a.success, onTime: a.onTime },
    { area: a.area, type: 'Lỗi/Hoàn', value: a.error, onTime: a.onTime },
  ]);

  const config = {
    data,
    xField: 'area',
    yField: 'value',
    seriesField: 'type',
    isStack: true,
    tooltip: {
      items: [{ channel: 'y' }, { field: 'type' }],
      title: (d) => `${d.area} • Đúng hạn: ${areaPerformance.find((x) => x.area === d.area)?.onTime}%`,
    },
    color: (d) => (d.type === 'Thành công' ? '#52c41a' : '#f5222d'),
    label: {
      text: 'value',
      style: { fontSize: 12 },
    },
    height: chartHeight,
    autoFit: true,
  };

  return (
    <Card title="Tỷ lệ giao hàng theo khu vực" bordered={false} style={{ height: panelHeight }} bodyStyle={{ height: 'calc(100% - 57px)' }}>
      <Column {...config} />
    </Card>
  );
};

export default AreaPerformanceChart;

