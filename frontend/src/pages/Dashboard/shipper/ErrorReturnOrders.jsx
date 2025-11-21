import React, { useState } from 'react';
import { Card, Table, Button, Space, Modal, Tag, Grid } from 'antd';
import { errorOrders } from './mockData';

const ErrorReturnOrders = ({ panelHeight = 380 }) => {
  const [detail, setDetail] = useState(null);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const columns = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code', width: 110 },
    { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
    { title: 'Thời gian', dataIndex: 'time', key: 'time', width: 100, responsive: ['md'] },
    { title: 'Trạng thái xử lý', dataIndex: 'handling', key: 'handling', width: 140, render: (v) => (
      <Tag color={v === 'Đã xử lý' ? 'green' : v === 'Đang xử lý' ? 'gold' : 'red'}>{v}</Tag>
    ) },
    {
      title: 'Thao tác',
      key: 'action',
      width: isMobile ? 140 : undefined,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>{isMobile ? 'Cập nhật' : 'Cập nhật lý do'}</Button>
          <Button size="small" type="primary">Giao lại</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Đơn bị lỗi / hoàn hàng" bordered={false} style={{ height: panelHeight }}>
      <Table size={isMobile ? 'small' : 'middle'} rowKey="key" columns={columns} dataSource={errorOrders} pagination={{ pageSize: isMobile ? 4 : 5, simple: isMobile }} />

      <Modal open={!!detail} title={`Cập nhật ${detail?.code || ''}`} onCancel={() => setDetail(null)} onOk={() => setDetail(null)}>
        {detail && (
          <div style={{ lineHeight: 1.9 }}>
            <div><b>Mã đơn:</b> {detail.code}</div>
            <div><b>Lý do:</b> {detail.reason}</div>
            <div><b>Thời gian:</b> {detail.time}</div>
            <div><b>Trạng thái xử lý:</b> {detail.handling}</div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default ErrorReturnOrders;
