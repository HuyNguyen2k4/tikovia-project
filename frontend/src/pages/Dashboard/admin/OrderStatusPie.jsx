import React, { useState, useEffect } from 'react';
import { Card } from 'antd';
import { Pie } from '@ant-design/plots';
import { getOrderStatusData, orderStatusColorMap } from './mockData';

const OrderStatusPie = () => {
  const [orderStatusData, setOrderStatusData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getOrderStatusData();
        if (data && Array.isArray(data)) {
          // Filter out items with value = 0
          const filteredData = data.filter(item => item.value > 0);
          setOrderStatusData(filteredData);
        }
      } catch (error) {
        console.error('Failed to load order status data:', error);
      }
    };

    loadData();
  }, []);

  const config = {
    data: orderStatusData,
    angleField: 'value',
    colorField: 'type',
    label: { text: (d) => `${d.value}`, style: { fontWeight: 'bold', fontSize: 12, fill: '#fff' } },
    tooltip: { title: (d) => d.type, items: [{ field: 'value', name: 'Số lượng' }] },
    legend: { color: { title: false, position: 'bottom', layout: 'horizontal', itemMarker: 'circle', rowPadding: 3 } },
    color: ({ type }) => orderStatusColorMap[type],
    height: 320,
    autoFit: true,
  };

  return (
    <Card 
      title="Trạng thái đơn hàng" 
      bordered={false} 
      style={{ height: 400 }} 
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16 }}
    >
        <Pie {...config} />
    </Card>
  );
};

export default OrderStatusPie;

