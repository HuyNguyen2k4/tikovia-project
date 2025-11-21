import React, { useMemo, useState } from 'react';
import { Card, Table, Tag, Tabs, Grid } from 'antd';
import { personalOrders, currency } from './mockData';

const statusColor = (s) => {
  switch (s) {
    case 'Nháp':
      return 'default';
    case 'Chuẩn bị':
      return 'processing';
    case 'Đang xử lý':
      return 'gold';
    case 'Hoàn thành':
      return 'green';
    case 'Đã hủy':
      return 'red';
    default:
      return 'default';
  }
};

const PersonalOrdersTable = ({ panelHeight = 460 }) => {
  const [tab, setTab] = useState('all');
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const data = useMemo(() => {
    if (tab === 'all') return personalOrders;
    if (tab === 'processing') return personalOrders.filter((o) => ['Nháp', 'Chuẩn bị', 'Đang xử lý'].includes(o.status));
    if (tab === 'done') return personalOrders.filter((o) => o.status === 'Hoàn thành');
    if (tab === 'cancelled') return personalOrders.filter((o) => o.status === 'Đã hủy');
    return personalOrders;
  }, [tab]);

  const columns = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code', width: 120, render: (t) => <b>{t}</b> },
    { title: 'Khách hàng', dataIndex: 'customer', key: 'customer', ellipsis: true },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 130, render: (s) => <Tag color={statusColor(s)}>{s}</Tag> },
    { title: 'Tổng tiền', dataIndex: 'total', key: 'total', width: 140, align: 'right', render: (v) => currency(v), responsive: ['md'] },
    { title: 'Ngày tạo', dataIndex: 'created', key: 'created', width: 110 },
    { title: 'Thanh toán', dataIndex: 'payment', key: 'payment', width: 140 },
  ];

  return (
    <Card title="Danh sách đơn hàng cá nhân" bordered={false} style={{ height: panelHeight }} bodyStyle={{ padding: isMobile ? 12 : 16 }}>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'all', label: 'Tất cả' },
          { key: 'processing', label: 'Đang xử lý' },
          { key: 'done', label: 'Hoàn thành' },
          { key: 'cancelled', label: 'Hủy' },
        ]}
      />
      <Table
        size={isMobile ? 'small' : 'middle'}
        rowKey="key"
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: isMobile ? 5 : 7, position: ['bottomRight'], simple: isMobile, showSizeChanger: false }}
        scroll={screens.md ? { x: 900 } : undefined}
      />
    </Card>
  );
};

export default PersonalOrdersTable;

