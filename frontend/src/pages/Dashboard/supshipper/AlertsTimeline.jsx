import React from 'react';
import { Card, List, Tag } from 'antd';
import { alerts } from './mockData';

const typeColor = (t) => ({ success: 'green', error: 'red', warning: 'gold', info: 'blue' }[t] || 'default');

const AlertsTimeline = ({ panelHeight = 320 }) => {
  return (
    <Card title="Cảnh báo / Thông báo gần đây" bordered={false} style={{ height: panelHeight }}>
      <List
        size="small"
        dataSource={alerts}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={
                <>
                  <Tag color={typeColor(item.type)} style={{ marginRight: 8 }}>
                    {item.type.toUpperCase()}
                  </Tag>
                  <span>{item.message}</span>
                </>
              }
              description={item.time}
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default AlertsTimeline;

