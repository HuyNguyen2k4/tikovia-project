import React, { useState, useEffect } from 'react';
import { Card, Spin } from 'antd';
import { Column } from '@ant-design/plots';
import { getOrderPipelineData } from './mockData';

const OrderPipeline = ({ height = 360 }) => {
  const [pipelineData, setPipelineData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getOrderPipelineData();
        if (data && Array.isArray(data)) {
          setPipelineData(data);
        }
      } catch (error) {
        console.error('Failed to load order pipeline data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const config = {
    data: pipelineData,
    xField: 'stage',
    yField: 'orders',
    color: '#1677ff',
    columnWidthRatio: 0.6,
    label: { text: 'orders', style: { fontWeight: 'bold' } },
    axis: { x: { labelAutoHide: true }, y: { labelFormatter: (v) => `${v}` } },
        tooltip: {
          title: (d) => d.stage,
          items: [
            {
              field: 'orders',
              name: 'Số đơn',
            },
          ],
        },
    height: Math.max(120, height - 80),
    autoFit: true,
  };

  return (
    <Card
      title="Tiến độ xử lý đơn hàng"
      bordered={false}
      style={{ height: `${height}px` }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Column {...config} />
      )}
    </Card>
  );
};

export default OrderPipeline;

