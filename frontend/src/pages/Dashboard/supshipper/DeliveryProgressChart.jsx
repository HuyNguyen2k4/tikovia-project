import React, { useState, useEffect } from 'react';
import { Card, Radio, Spin } from 'antd';
import { Column } from '@ant-design/plots';
import { DeliveryProgress } from './mockData';

const DeliveryProgressChart = ({ timeframe, onTimeframeChange, panelHeight = 380 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await DeliveryProgress();
        setData(result);
      } catch (error) {
        console.error('Error fetching delivery progress:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartHeight = panelHeight - 57 - 32; // approx header + padding
  const config = {
    data: data,
    xField: 'status',
    yField: 'value',
    label: { text: 'value', style: { fontWeight: 'bold' } },
    color: (d) => {
      const map = {
        'Đã phân công': '#faad14',
        'Đang giao': '#13c2c2',
        'Hoàn thành': '#52c41a',
      };
      return map[d.status] || '#888';
    },
    tooltip: { title: (d) => d.status },
    height: chartHeight,
    autoFit: true,
  };

  if (loading) {
    return (
      <Card
        title="Tiến độ giao hàng"
        bordered={false}
        style={{ height: panelHeight }}
        bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Tiến độ giao hàng"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}
      // extra={
      //   <Radio.Group value={timeframe} onChange={(e) => onTimeframeChange?.(e.target.value)} size="small">
      //     <Radio.Button value="today">Hôm nay</Radio.Button>
      //     <Radio.Button value="week">Tuần</Radio.Button>
      //     <Radio.Button value="month">Tháng</Radio.Button>
      //   </Radio.Group>
      // }
    >
      <Column {...config} />
    </Card>
  );
};

export default DeliveryProgressChart;

