import React from 'react';
import { Card, Timeline } from 'antd';
import { alerts } from './mockData';

const colorMap = { error: 'red', warning: 'orange', success: 'green' };

const AlertsTimeline = ({ panelHeight = 380 }) => {
  return (
    <Card
      title="Cảnh báo / hoạt động gần đây"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'auto' }}
    >
      <Timeline
        items={alerts.map((a) => ({ color: colorMap[a.type] || 'blue', children: a.content }))}
      />
    </Card>
  );
};

export default AlertsTimeline;
