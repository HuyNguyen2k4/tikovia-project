import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Spin, Modal, Image } from 'antd';
import { getOrderPrepared } from './mockData';

const StatusTag = ({ status }) => {
  const map = {
    'Nháp': 'default',
    'Chờ soạn': 'gold',
    'Đã phân công': 'cyan',
    'Đang soạn': 'blue',
    'Chờ duyệt': 'orange',
    'Đã xác nhận': 'green',
    'Đã hủy': 'red',
  };
  return <Tag color={map[status] || 'default'}>{status}</Tag>;
};

const PriorityOrders = ({ panelHeight = 380 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const orders = await getOrderPrepared();
        setData(orders);
      } catch (error) {
        console.error('Error fetching priority orders:', error);
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
      width: 110,
    },
    { 
      title: 'Số lượng', 
      dataIndex: 'quantityProduct', 
      key: 'quantityProduct', 
      render: (v) => <Tag color="blue">{v || 0} SP</Tag>,
      width: 45,
    },
    { 
      title: 'Thời gian tạo đơn',
      key: 'taskTime',
      render: (_, record) => record.timeline.taskTime,
      width: 110,
      sorter: (a, b) => {
        const dateA = a.rawDates?.taskTime || new Date(0);
        const dateB = b.rawDates?.taskTime || new Date(0);
        return dateB - dateA;
      },
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status', 
      render: (s) => <StatusTag status={s} />,
      width: 100,
      filters: [
        { text: 'Nháp', value: 'Nháp' },
        { text: 'Chờ soạn', value: 'Chờ soạn' },
        { text: 'Đã phân công', value: 'Đã phân công' },
        { text: 'Đã xác nhận', value: 'Đã xác nhận' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    { 
      title: 'Người soạn', 
      dataIndex: 'pickerName', 
      key: 'pickerName',
      width: 75,
    },
    { 
      title: 'Giám sát', 
      dataIndex: 'supPickerName', 
      key: 'supPickerName',
      width: 90,
    }, 
  ];

  const productColumns = [
    {
      title: 'Hình ảnh',
      key: 'imgURL',
      width: 100,
      render: (_, record) => {
        if (record.imgURL && record.imgURL !== '') {
          return (
            <Image
              src={record.imgURL}
              alt={record.productName || 'Product'}
              width={70}
              height={70}
              style={{ 
                objectFit: 'cover',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              preview={{
                mask: 'Xem ảnh',
              }}
              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3Crect width='70' height='70' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EN/A%3C/text%3E%3C/svg%3E"
            />
          );
        }
        return (
          <div style={{ 
            width: 70, 
            height: 70, 
            backgroundColor: '#f0f0f0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: 4,
            color: '#999',
            fontSize: 12,
          }}>
            N/A
          </div>
        );
      },
    },
    {
      title: 'Mã SKU',
      dataIndex: 'skuCode',
      key: 'skuCode',
      width: 150,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      width: 250,
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      align: 'center',
      render: (value) => <Tag color="purple">{value}</Tag>,
    },
    {
      title: 'Đơn vị',
      dataIndex: 'mainUnit',
      key: 'mainUnit',
      width: 100,
      align: 'center',
    }
  ];

  const handleRowClick = (record) => {
    setSelectedOrder(record);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <Card title="Đơn hàng cần soạn" bordered={false} style={{ height: panelHeight }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 57px)' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Đơn hàng cần soạn"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'auto' }}
    >
      <Table
        dataSource={data}
        columns={columns}
        rowKey="key"
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{ 
          pageSize: 5,
          showTotal: (total) => `Tổng ${total} đơn hàng`,
        }}
        size="small"
      />
      <Modal
        title={`Danh sách sản phẩm - ${selectedOrder?.id || ''}`}
        open={isModalVisible}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
        width={900}
      >
        {selectedOrder?.products && selectedOrder.products.length > 0 ? (
          <Table
            dataSource={selectedOrder.products}
            columns={productColumns}
            size="small"
            rowKey={(record, index) => record.productId || `prod-${index}`}
            pagination={false}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            Không có sản phẩm
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default PriorityOrders;


