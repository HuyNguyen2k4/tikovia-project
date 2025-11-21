import React from 'react';
import { Card, Table, Tag, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { mockOrders } from './mockData';

const OrdersTable = ({ onOpenDetail }) => {
  const columns = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code' },
    { title: 'Khách hàng', dataIndex: 'customer', key: 'customer' },
    {
      title: 'Tổng tiền', dataIndex: 'total', key: 'total',
      render: (v) => `${Number(v).toLocaleString('vi-VN')} ₫`,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (status) => {
        const map = {
          paid: { color: 'green', text: 'Đã thanh toán' },
          pending: { color: 'orange', text: 'Chờ thanh toán' },
          cancelled: { color: 'red', text: 'Đã hủy' },
          refund: { color: 'cyan', text: 'Hoàn tiền' },
        };
        const s = map[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
    {
      title: 'Thao tác', key: 'actions',
      render: (_, record) => (
        <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => onOpenDetail(record)}>
          Chi tiết
        </Button>
      ),
    },
  ];
  return (
    <Card title="Đơn hàng liên quan kế toán" bordered={false}>
      <Table rowKey="code" columns={columns} dataSource={mockOrders} pagination={{ pageSize: 5 }} />
    </Card>
  );
};

export default OrdersTable;

