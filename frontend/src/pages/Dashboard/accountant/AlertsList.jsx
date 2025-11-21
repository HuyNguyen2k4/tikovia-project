import React from 'react';
import { Card, List, Badge, Typography } from 'antd';
import { ExclamationCircleOutlined, TruckOutlined, ReloadOutlined } from '@ant-design/icons';
import { mockAlerts } from './mockData';

const { Text } = Typography;

const AlertsList = () => {
  const badgeStatus = (type) => (type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'processing');
  const iconFor = (type) => (type === 'error' ? <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
    : type === 'warning' ? <TruckOutlined style={{ color: '#faad14' }} />
    : <ReloadOutlined style={{ color: '#1677ff' }} />);

  return (
    <Card title="Cảnh báo / Ghi chú gần đây" bordered={false}>
      <List
        size="small"
        dataSource={mockAlerts}
        renderItem={(a) => (
          <List.Item>
            <List.Item.Meta
              avatar={<Badge status={badgeStatus(a.type)} />}
              title={
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {iconFor(a.type)}
                  <Text strong>{a.title || a.text}</Text>
                  {a.time ? (
                    <Text type="secondary" style={{ marginLeft: 'auto' }}>{a.time}</Text>
                  ) : null}
                </span>
              }
              description={a.desc ? <Text type="secondary">{a.desc}</Text> : null}
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default AlertsList;
