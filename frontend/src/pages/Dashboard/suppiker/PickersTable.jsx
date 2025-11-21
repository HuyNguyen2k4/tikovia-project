import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Progress } from 'antd';
import { getPickerProgress } from './mockData';

const PickersTable = ({ panelHeight = 380 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getPickerProgress();
        setData(res || []);
      } catch (error) {
        console.error('Error loading picker progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const columns = [
  { 
    title: 'Nhân viên', 
    dataIndex: 'pickerName', 
    key: 'pickerName',
    width: 150,
    align: 'left',
    render: (text) => <strong>{text}</strong>
  },

  { 
    title: 'Tổng task', 
    dataIndex: 'totalTasks', 
    key: 'totalTasks',
    align: 'center',
    width: 90,
  },

  { 
    title: 'Đang giao', 
    dataIndex: 'assigned', 
    key: 'assigned',
    align: 'center',
    width: 90,
  },

  { 
    title: 'Đang soạn', 
    dataIndex: 'inProgress', 
    key: 'inProgress',
    align: 'center',
    width: 90,
  },

  { 
    title: 'Chờ duyệt', 
    dataIndex: 'pendingReview', 
    key: 'pendingReview',
    align: 'center',
    width: 90,
  },

  { 
    title: 'Hoàn thành', 
    dataIndex: 'completed', 
    key: 'completed',
    align: 'center',
    width: 90,
  },

  {
    title: 'Đã hủy',
    dataIndex: 'cancelled',
    key: 'cancelled',
    width: 80,
    align: 'center',
    render: (v) => (
      <Tag color={v > 0 ? 'red' : 'default'} style={{ fontSize: 13, padding: '2px 8px' }}>
        {v}
      </Tag>
    ),
  },

  {
    title: 'Tỷ lệ hoàn thành',
    dataIndex: 'completionRate',
    key: 'completionRate',
    width: 160,
    align: 'center',
    render: (p) => {
      const percent = Math.round(p);

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
          <Progress
            percent={percent}
            size="small"
            showInfo={false}
            status={
              percent >= 90 
                ? 'success' 
                : percent >= 75 
                ? 'normal' 
                : 'exception'
            }
            strokeWidth={12}
          />
          <span style={{ fontWeight: 500 }}>{percent}%</span>
        </div>
      );
    }
  }
];


  return (
    <Card
      title="Danh sách nhân viên soạn hàng"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'auto' }}
    >
      <Table
        dataSource={data}
        columns={columns}
        rowKey={(r) => r.pickerId || r.pickerName}
        size="small"
        pagination={{ pageSize: 5 }}
        loading={loading}
      />
    </Card>
  );
};

export default PickersTable;
