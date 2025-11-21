import React, { useState } from 'react';
import { Card, Table, Button, Space, Modal, Tag } from 'antd';
import { errorOrders } from './mockData';

const ErrorOrders = ({ panelHeight = 420 }) => {
  const [detail, setDetail] = useState(null);

  const columns = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code' },
    { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
    { title: 'Shipper', dataIndex: 'shipper', key: 'shipper' },
    { title: 'Thời gian', dataIndex: 'time', key: 'time' },
    { title: 'Trạng thái xử lý', dataIndex: 'handling', key: 'handling', render: (v) => <Tag color={v === 'Đã xử lý' ? 'green' : v === 'Đang xử lý' ? 'gold' : 'red'}>{v}</Tag> },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setDetail(record)}>Xem chi tiết</Button>
          <Button size="small" type="primary">Giao lại</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Đơn giao lỗi / hoàn hàng" bordered={false} style={{ height: panelHeight }}>
      <Table size="middle" rowKey="key" columns={columns} dataSource={errorOrders} pagination={{ pageSize: 5 }} />

      <Modal open={!!detail} title={`Chi tiết ${detail?.code || ''}`} onCancel={() => setDetail(null)} onOk={() => setDetail(null)}>
        {detail && (
          <div style={{ lineHeight: 1.9 }}>
            <div><b>Mã đơn:</b> {detail.code}</div>
            <div><b>Lý do:</b> {detail.reason}</div>
            <div><b>Shipper:</b> {detail.shipper}</div>
            <div><b>Thời gian:</b> {detail.time}</div>
            <div><b>Trạng thái xử lý:</b> {detail.handling}</div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default ErrorOrders;

