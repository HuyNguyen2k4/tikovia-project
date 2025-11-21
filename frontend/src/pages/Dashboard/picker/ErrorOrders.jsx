import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Spin } from 'antd';
import { getOrderAssigned } from './mockData';

const ErrorOrders = ({ panelHeight = 380 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const orders = await getOrderAssigned();
        // Filter only cancelled orders
        const errorOrders = orders.filter(order => order.rawStatus === 'cancelled');
        setData(errorOrders);
      } catch (error) {
        console.error('Error fetching error orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { 
      title: 'Mã đơn', 
      dataIndex: 'id', 
      key: 'id',
      width: 120,
    },
    { 
      title: 'Sản phẩm', 
      dataIndex: 'items', 
      key: 'items',
      render: (v) => <Tag color="blue">{v} món</Tag>,
      width: 100,
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status', 
      render: (s) => <Tag color="red">{s}</Tag>,
      width: 120,
    },
    { 
      title: 'Lý do lỗi', 
      dataIndex: 'cancelReason', 
      key: 'cancelReason',
      ellipsis: true,
    },
    { 
      title: 'Giám sát', 
      dataIndex: 'supervisor', 
      key: 'supervisor',
      width: 150,
    },
  ];

  if (loading) {
    return (
      <Card title="Đơn gặp lỗi / cần xử lý" bordered={false} style={{ height: panelHeight }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 57px)' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Đơn gặp lỗi / cần xử lý" 
      bordered={false} 
      style={{ height: panelHeight }} 
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'auto' }}
    >
      <Table 
        dataSource={data} 
        columns={columns} 
        rowKey="taskId" 
        size="small" 
        pagination={{ pageSize: 5 }} 
      />
    </Card>
  );
};

export default ErrorOrders;
