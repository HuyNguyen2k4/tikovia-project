import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Spin, Image, Modal } from 'antd';
import { sellerTopProducts } from './mockData';

const TopProducts = ({ panelHeight = 500 }) => {
  const [fullData, setFullData] = useState([]);   // full list từ API
  const [topFive, setTopFive] = useState([]);     // 5 sản phẩm top
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const products = await sellerTopProducts();  // API trả full list
        setFullData(products);

        // Lấy 5 sản phẩm top
        setTopFive(products.slice(0, 5));
      } catch (error) {
        console.error('Error fetching top products:', error);
      } finally {
        setLoading(false);
      }
    };

  fetchData();
}, []);

const columns = [
  {
    title: 'Hình ảnh',
    dataIndex: 'imgUrl',
    key: 'imgUrl',
    width: 80,
    render: (imgUrl) => (
      <Image
        src={imgUrl || 'https://via.placeholder.com/50'}
        alt="product"
        width={50}
        height={50}
        style={{ objectFit: 'cover', borderRadius: 4 }}
        preview={!!imgUrl}
        fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3Crect width='70' height='70' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EN/A%3C/text%3E%3C/svg%3E"
      />
    ),
  },
  {
    title: 'Sản phẩm',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
  },
  {
    title: 'Mã SKU',
    dataIndex: 'skuCode',
    key: 'skuCode',
    width: 130,
  },
  {
    title: 'Danh mục',
    dataIndex: 'category',
    key: 'category',
    width: 100,
  },
  {
    title: 'Đã bán',
    dataIndex: 'soldQuantity',
    key: 'soldQuantity',
    width: 80,
    align: 'center',
  },
  {
    title: 'Số đơn',
    dataIndex: 'orderCount',
    key: 'orderCount',
    width: 80,
    align: 'center',
  },
];

if (loading) {
  return (
    <Card title="Top sản phẩm bán chạy của cá nhân" bordered={false} style={{ height: panelHeight }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 57px)' }}>
        <Spin />
      </div>
    </Card>
  );
}

return (
  <>
    <Card
      title="Top sản phẩm bán chạy của cá nhân"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'auto' }}
      extra={
        <Button type="link" onClick={() => setModalVisible(true)}>
          Xem tất cả
        </Button>
      }
    >
      <Table
        size="small"
        columns={columns}
        rowKey="id"
        dataSource={topFive}       // <= chỉ hiển thị 5 sản phẩm
        pagination={false}
      />
    </Card>

    {/* Modal hiển thị full list */}
    <Modal
      title="Tất cả sản phẩm đã bán"
      width={900}
      open={modalVisible}
      onCancel={() => setModalVisible(false)}
      footer={null}
    >
      <Table
        size="small"
        columns={columns}
        rowKey="id"
        dataSource={fullData}     // <= full list
        pagination={{ pageSize: 5 }}
      />
    </Modal>
  </>
);
};

export default TopProducts;
