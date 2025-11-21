import React from 'react';
import { Card, Radio, Grid } from 'antd';
import { Area } from '@ant-design/plots';
import { performanceByHour } from './mockData';

const PerformanceByHourChart = ({ timeframe, onTimeframeChange, panelHeight = 360 }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const cardHeight = isMobile ? 320 : panelHeight;
  const chartHeight = cardHeight - 57 - 16;
  const config = {
    data: performanceByHour,
    xField: 'hour',
    yField: 'value',
    smooth: true,
    areaStyle: { fill: 'l(270) 0:#91d5ff 1:#1890ff' },
    height: chartHeight,
    autoFit: true,
    tooltip: { title: (d) => `Giờ: ${d.hour}` },
  };

  return (
    <Card
      title="Hiệu suất cá nhân theo thời gian"
      bordered={false}
      style={{ height: cardHeight }}
      extra={
        <Radio.Group value={timeframe} onChange={(e) => onTimeframeChange?.(e.target.value)} size="small">
          <Radio.Button value="today">Hôm nay</Radio.Button>
          <Radio.Button value="week">Tuần</Radio.Button>
          <Radio.Button value="month">Tháng</Radio.Button>
        </Radio.Group>
      }
    >
      <Area {...config} />
    </Card>
  );
};

export default PerformanceByHourChart;
