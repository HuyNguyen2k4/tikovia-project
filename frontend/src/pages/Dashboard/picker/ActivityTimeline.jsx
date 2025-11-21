import React from 'react';
import { Card, Timeline } from 'antd';
import { activityLogs } from './mockData';

const colorMap = { success: 'green', processing: 'blue', error: 'red', info: 'gray' };

const ActivityTimeline = ({ panelHeight = 240 }) => {
  return (
    <Card title="Lịch sử hoạt động trong ngày" bordered={false} style={{ height: panelHeight }} bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'auto' }}>
      <Timeline
        items={activityLogs.map((a) => ({
          color: colorMap[a.type] || 'gray',
          children: (
            <div>
              <strong style={{ marginRight: 8 }}>{a.time}</strong>
              {a.content}
            </div>
          ),
        }))}
      />
    </Card>
  );
};

export default ActivityTimeline;

