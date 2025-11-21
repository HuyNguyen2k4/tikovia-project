import React from 'react';
import { Card, List, Tag, Grid } from 'antd';
import { notifications } from './mockData';

const colorByType = (t) => (t === 'warning' ? 'gold' : t === 'error' ? 'red' : 'green');

const Notifications = ({ panelHeight = 320 }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  return (
    <Card title="Thông báo hệ thống / cảnh báo đơn" bordered={false} style={{ height: isMobile ? 300 : panelHeight }} bodyStyle={{ padding: isMobile ? 12 : 16 }}>
      <List
        size={isMobile ? 'small' : 'small'}
        dataSource={notifications}
        renderItem={(i) => (
          <List.Item>
            <Tag color={colorByType(i.type)} style={{ marginRight: 8 }}>{i.type.toUpperCase()}</Tag>
            <span>{i.content}</span>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default Notifications;

