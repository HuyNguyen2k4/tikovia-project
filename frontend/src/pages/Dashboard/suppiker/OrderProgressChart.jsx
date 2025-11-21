import React, { useState, useEffect } from 'react';
import { Card, Radio, Spin } from 'antd';
import { Column } from '@ant-design/plots';
import { getOrderProcessing } from './mockData';

const OrderProgressChart = ({ timeframe, onTimeframeChange, panelHeight = 380 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const orderData = await getOrderProcessing();
        setData(orderData);
      } catch (error) {
        console.error('Error fetching order processing data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartHeight = panelHeight - 57 - 32; // card header ~57, padding 16*2
  const config = {
    data: data,
    xField: 'status',
    yField: 'value',
    label: {
      text: 'value',
      style: { fontWeight: 'bold' },
    },
    color: (d) => {
      const map = {
        'Chờ soạn': '#faad14',
        'Đang soạn': '#1890ff',
        'Chờ duyệt': '#13c2c2',
        'Đã soạn xong': '#52c41a',
        'Hủy': '#f5222d',
      };
      return map[d.status] || '#888';
    },
    tooltip: { title: (d) => d.status },
    height: chartHeight,
    autoFit: true,
  };

  if (loading) {
    return (
      <Card title="Tiến độ xử lý soạn hàng" bordered={false} style={{ height: panelHeight }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 57px)' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Tiến độ xử lý soạn hàng"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}
      // extra={
      //   <Radio.Group
      //     value={timeframe}
      //     onChange={(e) => onTimeframeChange?.(e.target.value)}
      //     size="small"
      //   >
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

export default OrderProgressChart;
