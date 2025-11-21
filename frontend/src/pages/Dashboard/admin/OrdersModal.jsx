import React, { useEffect, useState } from 'react';
import { Modal, Table, Button, Tag } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { getRecentOrders } from './mockData';

const statusMap = {
  confirmed: { color: 'blue', label: 'Đã xác nhận' },
  delivering: { color: 'orange', label: 'Đang giao' },
  delivered: { color: 'green', label: 'Đã giao' },
  pending_preparation: { color: 'gold', label: 'Chờ chuẩn bị' },
  cancelled: { color: 'red', label: 'Đã hủy' },
  default: { color: 'default', label: 'Khác' },
};

const OrdersModal = ({ visible, onClose }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const result = await getRecentOrders();
        setData(result || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setData([]);
      }
    };

    if (visible) {
      fetchOrders();
    }
  }, [visible]);

  const columns = [
    { title: 'Mã đơn hàng', dataIndex: 'orderNo', key: 'orderNo', width: 180 },
    { title: 'Khách hàng', dataIndex: 'customerName', key: 'customerName', width: 180 },
    { title: 'Nhân viên', dataIndex: 'sellerName', key: 'sellerName', width: 160 },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        const st = statusMap[status] || statusMap.default;
        return <Tag color={st.color}>{st.label}</Tag>;
      },
    },
    { title: 'Ngày tạo', dataIndex: 'date', key: 'date', width: 180 },
  ];

  return (
    <Modal
      title={
        <span>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Tất cả đơn hàng gần đây
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
          locale={{ emptyText: 'Không có đơn hàng trong tuần này' }}
        />
    </Modal>
  );
};

export default OrdersModal;
