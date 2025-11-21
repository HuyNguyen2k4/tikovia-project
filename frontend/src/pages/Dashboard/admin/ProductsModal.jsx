import React, { useEffect, useState } from 'react';
import { Modal, Table, Button, Image } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { getTopProducts } from './mockData';

const ProductsModal = ({ visible, onClose }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const result = await getTopProducts();
        setData(result);
      } catch (error) {
        console.error('Error fetching top products:', error);
      }
    };
    if (visible) fetchTopProducts(); // chỉ fetch khi mở modal
  }, [visible]);

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'imgUrl',
      key: 'imgUrl',
      width: 100,
      render: (url) =>
        url ? (
          <Image src={url} alt="product" width={100} />
        ) : (
          <span style={{ color: '#aaa' }}>Không có</span>
        ),
    },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name', width: 220 },
    { title: 'Mã SKU', dataIndex: 'skuCode', key: 'skuCode', width: 140 },
    { title: 'Danh mục', dataIndex: 'category', key: 'category', width: 120 },
    { title: 'Số lượng bán', dataIndex: 'soldQuantity', key: 'soldQuantity', width: 120 },
    { title: 'Số đơn hàng', dataIndex: 'orderCount', key: 'orderCount', width: 120 },
  ];

  return (
    <Modal
      title={
        <span>
          <TrophyOutlined style={{ marginRight: 8 }} />
          Tất cả sản phẩm bán chạy
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[<Button key="close" onClick={onClose}>Đóng</Button>]}
    >
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
        />
    </Modal>
  );
};

export default ProductsModal;
