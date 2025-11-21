import React from 'react';
import { Card, Table, Tag } from 'antd';
import { mockSuppliers } from './mockData';

const SuppliersTable = () => {
  const columns = [
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier' },
    { title: 'Tổng nợ', dataIndex: 'debt', key: 'debt', render: (v) => `${Number(v).toLocaleString('vi-VN')} ₫` },
    { title: 'Số đơn', dataIndex: 'orders', key: 'orders' },
    { title: 'Hạn thanh toán gần nhất', dataIndex: 'dueDate', key: 'dueDate' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (status) => {
        const map = {
          paid: { color: 'green', text: 'Đã thanh toán' },
          upcoming: { color: 'orange', text: 'Sắp đến hạn' },
          overdue: { color: 'red', text: 'Quá hạn' },
          pending: { color: 'default', text: 'Chờ thanh toán' },
        };
        const s = map[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
  ];
  return (
    <Card title="Supplier cần thanh toán" bordered={false}>
      <Table rowKey={(r) => `${r.supplier}-${r.dueDate}`} columns={columns} dataSource={mockSuppliers} pagination={false} />
    </Card>
  );
};

export default SuppliersTable;

