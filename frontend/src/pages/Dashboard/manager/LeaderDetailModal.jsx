import React, { useMemo } from 'react';
import { Modal, Table } from 'antd';

const efficiencyColor = (pct) => {
  if (pct >= 90) return '#52c41a';
  if (pct >= 80) return '#bae637';
  if (pct >= 70) return '#faad14';
  return '#f5222d';
};

const LeaderDetailModal = ({ open, onClose, leader }) => {
  const subordinates = useMemo(
    () => (leader ? [
      { key: 1, name: 'NV-01', inProgress: 5, completed: 42, efficiency: 89 },
      { key: 2, name: 'NV-02', inProgress: 4, completed: 38, efficiency: 86 },
      { key: 3, name: 'NV-03', inProgress: 6, completed: 45, efficiency: 88 },
    ] : []),
    [leader]
  );

  return (
    <Modal title={`Chi tiết trưởng nhóm: ${leader?.leader ?? ''}`} open={open} onCancel={onClose} footer={null} width={720}>
      <Table
        size="small"
        rowKey="key"
        dataSource={subordinates}
        pagination={false}
        columns={[
          { title: 'Nhân viên', dataIndex: 'name', key: 'name' },
          { title: 'Đang xử lý', dataIndex: 'inProgress', key: 'inProgress' },
          { title: 'Hoàn thành', dataIndex: 'completed', key: 'completed' },
          { title: 'Hiệu suất', dataIndex: 'efficiency', key: 'efficiency', render: (pct) => (
            <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: efficiencyColor(pct), color: pct >= 80 ? '#000' : '#fff', fontWeight: 600 }}>
              {pct}%
            </div>
          ) },
        ]}
      />
    </Modal>
  );
};

export default LeaderDetailModal;

