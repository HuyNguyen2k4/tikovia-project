import React, { useEffect, useState } from 'react';
import { Card, Button, List, Tag, Typography } from 'antd';
import { FileTextOutlined, EyeOutlined } from '@ant-design/icons';
import { getRecentOrders } from './mockData';

const { Text } = Typography;

// 🎨 Map màu + nhãn trạng thái (chuẩn theo status BE)
const statusMap = {
  confirmed: { color: 'blue', label: 'Đã xác nhận' },
  delivering: { color: 'orange', label: 'Đang giao' },
  delivered: { color: 'green', label: 'Đã giao' },
  pending_preparation: { color: 'gold', label: 'Chờ chuẩn bị' },
  cancelled: { color: 'red', label: 'Đã hủy' },
  default: { color: 'default', label: 'Khác' },
};

const RecentOrdersCard = ({ onViewAll }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const result = await getRecentOrders();
        setData(result);
      } catch (error) {
        console.error('Error fetching recent orders:', error);
      }
    };
    fetchOrders();
  }, []);

  return (
    <Card
      title={
        <span>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Đơn hàng gần đây
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
          renderItem={(item) => {
            const st = statusMap[item.status] || statusMap.default;
            return (
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
                      <Text strong>{item.orderNo}</Text>
                      <Tag color={st.color}>{st.label}</Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary">{item.customerName}</Text>
                      <br />
                      {/* <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                        {item.amount.toLocaleString('vi-VN')} ₫
                      </Text> */}
                      {/* <br /> */}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.date}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
    </Card>
  );
};

export default RecentOrdersCard;
