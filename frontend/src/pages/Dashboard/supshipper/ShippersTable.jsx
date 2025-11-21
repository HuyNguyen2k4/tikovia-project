import React from 'react';
import { Card, Table, Tag, Progress } from 'antd';
import { pickers } from './mockData';

const ShippersTable = ({ panelHeight = 380 }) => {
  const columns = [
    { title: 'Nhân viên', dataIndex: 'name', key: 'name' },
    { title: 'Đơn đang làm', dataIndex: 'currentOrder', key: 'currentOrder', render: (id) => <Tag color="geekblue">{id}</Tag> },
    { title: 'Đơn hoàn thành', dataIndex: 'completed', key: 'completed' },
    { title: 'Đơn lỗi', dataIndex: 'issues', key: 'issues', render: (v) => <Tag color={v ? 'red' : 'green'}>{v}</Tag> },
    {
      title: 'Hiệu suất', dataIndex: 'performance', key: 'performance',
      render: (p) => (
        <div style={{ minWidth: 120 }}>
          <Progress percent={p} size="small" status={p >= 90 ? 'success' : p >= 75 ? 'normal' : 'exception'} />
        </div>
      ),
    },
  ];

  return (
    <Card
      title="Danh sách nhân viên soạn hàng"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'auto' }}
    >
      <Table
        dataSource={pickers}
        columns={columns}
        rowKey={(r) => r.id}
        size="small"
        pagination={{ pageSize: 5 }}
      />
    </Card>
  );
};

export default ShippersTable;
