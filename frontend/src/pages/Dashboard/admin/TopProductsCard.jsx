import React, { useEffect, useState } from 'react';
import { Card, Button, List, Tag, Typography } from 'antd';
import { TrophyOutlined, EyeOutlined } from '@ant-design/icons';
import { getTopProducts } from './mockData';

const { Text } = Typography;

const TopProductsCard = ({ onViewAll }) => {
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
    fetchTopProducts();
  }, []);

  return (
    <Card
      title={
        <span>
          <TrophyOutlined style={{ marginRight: 8 }} />
          Sản phẩm bán chạy
        </span>
      }
      bordered={false}
      style={{ height: 250 }}
      bodyStyle={{
        padding: '12px 16px',
        height: 'calc(100% - 57px)',
        overflow: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      className="hide-scrollbar"
      extra={
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={onViewAll}>
          Xem tất cả
        </Button>
      }
    >
        <List
          size="small"
          dataSource={data.slice(0, 3)}
          renderItem={(item) => (
            <List.Item style={{ padding: '8px 0' }}>
              <List.Item.Meta
                title={
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text strong>{item.name}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Đã bán:
                      </Text>
                      <Tag color="blue" style={{ margin: 0 }}>
                        {item.soldQuantity}
                      </Tag>
                    </div>
                  </div>
                }
                description={
                  <div>
                    <Text type="secondary">Mã SKU: </Text>
                    <Text style={{ color: '#722ed1', fontWeight: 'bold' }}>{item.skuCode}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
    </Card>
  );
};

export default TopProductsCard;
