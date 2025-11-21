import React from 'react';
import { Card, List, Badge, Grid } from 'antd';
import { priorityOrders } from './mockData';

const PriorityOrders = ({ panelHeight = 380 }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  return (
    <Card title="Đơn hàng cần ưu tiên" bordered={false} style={{ height: isMobile ? 320 : panelHeight }} bodyStyle={{ padding: isMobile ? 12 : 16 }}>
      <List
        itemLayout={isMobile ? 'vertical' : 'horizontal'}
        dataSource={priorityOrders}
        renderItem={(item) => {
          const danger = item.remainingMins < 15;
          return (
            <List.Item>
              <List.Item.Meta
                title={`${item.code} — ${item.customer}`}
                description={`Hạn giao: ${item.deadline}`}
              />
              <div>
                <Badge color={danger ? 'red' : 'gold'} text={`⏱️ ${item.remainingMins} phút`} />
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default PriorityOrders;
