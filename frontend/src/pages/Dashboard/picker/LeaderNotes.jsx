import React from 'react';
import { Card, List, Tag } from 'antd';
import { leaderNotes } from './mockData';

const LeaderNotes = ({ panelHeight = 220 }) => {
  const colorMap = { error: 'red', warning: 'orange', processing: 'blue', success: 'green' };
  return (
    <Card title="Ghi chú từ Trưởng nhóm" bordered={false} style={{ height: panelHeight }} bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'auto' }}>
      <List
        size="small"
        dataSource={leaderNotes}
        renderItem={(n) => (
          <List.Item>
            <Tag color={colorMap[n.priority] || 'default'} style={{ marginRight: 8 }}>
              {n.priority?.toUpperCase?.() || 'NOTE'}
            </Tag>
            {n.content}
          </List.Item>
        )}
      />
    </Card>
  );
};

export default LeaderNotes;

