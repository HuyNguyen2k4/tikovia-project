import React from 'react';
import { Card, Radio } from 'antd';
import { Line } from '@ant-design/plots';
import { mockRevExpProfit } from './mockData';

const RevExpProfitChart = ({ granularity, onChangeGranularity }) => {
  const config = {
    data: mockRevExpProfit,
    xField: 'period',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    color: ({ type }) => ({
      'Doanh thu': '#1890ff',
      'Chi phí': '#faad14',
      'Lợi nhuận': '#52c41a',
    })[type],
    tooltip: {
      title: (d) => d.period,
      formatter: (d) => ({ name: d.type, value: `${(d.value).toLocaleString('vi-VN')} ₫` }),
    },
    height: 320,
    autoFit: true,
  };

  return (
    <Card
      title="Doanh thu – Chi phí – Lợi nhuận"
      bordered={false}
      style={{ height: 400 }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}
      extra={
        <Radio.Group size="small" value={granularity} onChange={onChangeGranularity}>
          <Radio.Button value="week">Tuần</Radio.Button>
          <Radio.Button value="month">Tháng</Radio.Button>
          <Radio.Button value="year">Năm</Radio.Button>
        </Radio.Group>
      }
    >
      <Line {...config} />
    </Card>
  );
};

export default RevExpProfitChart;

