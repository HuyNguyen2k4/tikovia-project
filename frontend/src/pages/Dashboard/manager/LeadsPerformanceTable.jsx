import React from 'react';
import { Card, Table, Tag, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { mockLeadsPerformance } from './mockData';

const efficiencyColor = (pct) => {
  if (pct >= 90) return '#52c41a';
  if (pct >= 80) return '#bae637';
  if (pct >= 70) return '#faad14';
  return '#f5222d';
};

const LeadsPerformanceTable = ({ onViewLeader }) => {
  const columns = [
    { title: 'Người phụ trách', dataIndex: 'leader', key: 'leader' },
    { title: 'Nhóm', dataIndex: 'group', key: 'group', render: (g) => <Tag color={g === 'Soạn' ? 'blue' : 'green'}>{g}</Tag> },
    { title: 'Đơn đang xử lý', dataIndex: 'inProgress', key: 'inProgress', width: 140 },
    { title: 'Đơn hoàn thành', dataIndex: 'completed', key: 'completed', width: 140 },
    {
      title: 'Hiệu suất', dataIndex: 'efficiency', key: 'efficiency', width: 140,
      render: (pct) => (
        <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: efficiencyColor(pct), color: pct >= 80 ? '#000' : '#fff', fontWeight: 600, minWidth: 56, textAlign: 'center' }}>
          {pct}%
        </div>
      ),
    },
    { title: '', key: 'action', width: 100, render: (_, record) => (
      <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => onViewLeader(record)}>
        Chi tiết
      </Button>
    ) },
  ];

  return (
    <Card title="Hiệu suất theo trưởng nhóm" bordered={false}>
      <Table rowKey="key" columns={columns} dataSource={mockLeadsPerformance} pagination={false} size="small" />
    </Card>
  );
};

export default LeadsPerformanceTable;

