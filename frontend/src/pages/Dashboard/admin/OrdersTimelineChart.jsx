import React, { useEffect, useState } from 'react';
import { Card } from 'antd';
import { Area } from '@ant-design/plots';
import { getOrdersTimeline } from './mockData'; 

const OrdersTimelineChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const result = await getOrdersTimeline();
        setData(result);
      } catch (error) {
        console.error('Error fetching orders timeline:', error);
      }
    };
    fetchTimeline();
  }, []);

  const config = {
    data,
    xField: 'date',
    yField: 'orders',
    smooth: true,
    areaStyle: { fill: 'l(270) 0:#ffffff 0.5:#7ec2f3 1:#1890ff' },
    line: { color: '#1890ff' },
    point: { size: 4, shape: 'circle', style: { fill: '#1890ff', stroke: '#fff', lineWidth: 2 } },
    tooltip: {
      title: (d) => `Ngày ${d.date}`,
      formatter: (datum) => ({
        name: 'Đơn hàng',
        value: datum.orders,
      }),
    },
    height: 280,
    autoFit: true,
  };

  return (
    <Card
      title="Đơn hàng trong tuần này"
      bordered={false}
      style={{ height: 400 }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}
    >
        <Area {...config} />
    </Card>
  );
};

export default OrdersTimelineChart;
