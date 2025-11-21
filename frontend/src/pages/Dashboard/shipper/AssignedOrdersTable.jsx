import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Spin } from 'antd';
import { getOrderDeliveryDetail } from './mockData';

const AssignedOrdersTable = ({ panelHeight = 420 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const orders = await getOrderDeliveryDetail();
        setData(orders);
      } catch (error) {
        console.error('Error fetching in-transit orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { 
      title: 'Mã đơn', 
      dataIndex: 'code', 
      key: 'code',
      width: 180,
    },
    { 
      title: 'Shipper', 
      dataIndex: 'shipper', 
      key: 'shipper',
      width: 180,
    },
    { 
      title: 'Giám sát', 
      dataIndex: 'supervisor', 
      key: 'supervisor',
      width: 180,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v) => {
        const colorMap = {
          'Đã phân công': 'gold',
          'Đang giao': 'blue',
          'Hoàn thành': 'green',
          'Đã hủy': 'red',
          'Giao thất bại': 'red',
        };
        return (
          <Tag color={colorMap[v] || 'default'}>
            {v}
          </Tag>
        );
      },
    },
  ];

  return (
    <Card 
      title="Đơn hàng đang giao" 
      bordered={false} 
      style={{ height: panelHeight }}
      bodyStyle={{ 
        height: 'calc(100% - 57px)', 
        padding: 16, 
        overflow: 'auto' 
      }}
    >
      <Table
        size="middle"
        rowKey="key"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 5 }}
        scroll={{ y: 'calc(100vh - 400px)' }}
      />
    </Card>
  );
};

export default AssignedOrdersTable;

