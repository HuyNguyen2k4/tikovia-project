import React from 'react';
import { Card, Table, Badge, Tag } from 'antd';
import { shippers } from './mockData';

const statusColor = (status) => {
  switch (status) {
    case 'Active':
      return 'green';
    case 'Away':
      return 'gold';
    default:
      return 'default';
  }
};

const ShippersPerformanceTable = ({ panelHeight = 420 }) => {
  const columns = [
    { title: 'Shipper', dataIndex: 'name', key: 'name' },
    { title: 'Khu vực', dataIndex: 'area', key: 'area' },
    { title: 'Đơn đã giao', dataIndex: 'delivered', key: 'delivered', sorter: (a, b) => a.delivered - b.delivered },
    { title: 'Đơn lỗi', dataIndex: 'failed', key: 'failed', sorter: (a, b) => a.failed - b.failed },
    {
      title: 'Tỷ lệ đúng hạn',
      dataIndex: 'onTime',
      key: 'onTime',
      sorter: (a, b) => a.onTime - b.onTime,
      render: (v) => `${v}%`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (v) => (
        <>
          <Badge color={statusColor(v)} text={v} />
          {v === 'Active' && <Tag color="blue" style={{ marginLeft: 8 }}>Theo dõi</Tag>}
        </>
      ),
    },
  ];

  const top3Keys = shippers
    .slice()
    .sort((a, b) => b.onTime - a.onTime || b.delivered - a.delivered)
    .slice(0, 3)
    .map((s) => s.key);

  return (
    <Card title="Hiệu suất giao hàng của từng shipper" bordered={false} style={{ height: panelHeight }}>
      <Table
        size="middle"
        rowKey="key"
        columns={columns}
        dataSource={shippers}
        pagination={{ pageSize: 5 }}
        rowClassName={(record) => (top3Keys.includes(record.key) ? 'row-highlight' : '')}
      />
      <style>{`
        .row-highlight td { background: #f6ffed !important; }
      `}</style>
    </Card>
  );
};

export default ShippersPerformanceTable;

