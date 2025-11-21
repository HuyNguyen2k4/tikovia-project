import React, { useMemo, useState, useEffect } from 'react';
import { Card, Table, Tag, Descriptions, Spin, DatePicker, Select, Space } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, PlayCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { getOrderAssigned } from './mockData';

const { RangePicker } = DatePicker;

const StatusTag = ({ status }) => {
  const map = {
    'Chờ soạn': 'default',
    'Đang soạn': 'blue',
    'Chờ duyệt': 'orange',
    'Gặp lỗi': 'red',
    'Đã hoàn thành': 'green'
  };
  return <Tag color={map[status] || 'default'}>{status}</Tag>;
};

const PriorityTag = ({ level }) => {
  const map = {
    'Thấp': 'default',
    'Trung bình': 'geekblue',
    'Cao': 'orange',
    'Khẩn cấp': 'red'
  };
  return <Tag color={map[level] || 'default'}>{level}</Tag>;
};

const AssignedOrders = ({ panelHeight = 480 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(null);
  const [dateFilterType, setDateFilterType] = useState('createdAt'); // 'createdAt' or 'deadline'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const orders = await getOrderAssigned();
        setData(orders);
      } catch (error) {
        console.error('Error fetching assigned orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    // First filter out cancelled orders
    let filtered = data.filter(order => order.rawStatus !== 'cancelled');

    // Then apply date range filter if exists
    if (dateRange) {
      const [startDate, endDate] = dateRange;
      filtered = filtered.filter((order) => {
        const targetDate = dateFilterType === 'createdAt'
          ? order.rawDates?.createdAt
          : order.rawDates?.deadline;

        if (!targetDate) return false;

        return targetDate >= startDate && targetDate <= endDate;
      });
    }

    return filtered;
  }, [data, dateRange, dateFilterType]);

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'items',
      key: 'items',
      render: (v) => <Tag color="blue">{v} món</Tag>,
      width: 80,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag status={s} />,
      width: 80,
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      sorter: (a, b) => {
        const rank = { 'Khẩn cấp': 3, 'Cao': 2, 'Trung bình': 1, 'Thấp': 0 };
        return (rank[a.priority] ?? 0) - (rank[b.priority] ?? 0);
      },
      render: (p) => <PriorityTag level={p} />,
      width: 100,
    },
    {
      title: 'Thời hạn',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (t) => <Tag color="purple">{t}</Tag>,
      width: 100,
    },
    {
      title: 'Giám sát',
      dataIndex: 'supervisor',
      key: 'supervisor',
      width: 150,
    },
    {
      title: 'Đóng gói',
      dataIndex: 'packer',
      key: 'packer',
      width: 150,
    },
  ];

  const expandedRowRender = (record) => {
    return (
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item
          label={<><ClockCircleOutlined style={{ color: '#1890ff' }} /> Thời gian tạo</>}
        >
          {record.timeline.createdAt}
        </Descriptions.Item>

        <Descriptions.Item
          label={<><CalendarOutlined style={{ color: '#fa8c16' }} /> Thời hạn</>}
        >
          {record.timeline.deadline}
        </Descriptions.Item>

        <Descriptions.Item
          label={<><PlayCircleOutlined style={{ color: '#52c41a' }} /> Bắt đầu</>}
        >
          {record.timeline.startedAt}
        </Descriptions.Item>

        <Descriptions.Item
          label={<><CheckCircleOutlined style={{ color: '#722ed1' }} /> Hoàn thành</>}
        >
          {record.timeline.completedAt}
        </Descriptions.Item>
      </Descriptions>
    );
  };


  if (loading) {
    return (
      <Card title="Đơn hàng được phân công" bordered={false} style={{ height: panelHeight }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 57px)' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Đơn hàng được phân công"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{
        height: 'calc(100% - 57px)',
        padding: 16,
        overflow: 'auto',
        scrollbarWidth: 'none', /* Firefox */
        msOverflowStyle: 'none', /* IE and Edge */
      }}
      styles={{
        body: {
          '::-webkit-scrollbar': {
            display: 'none' /* Chrome, Safari, Opera */
          }
        }
      }}
      extra={
        <Space wrap>
          <Select
            value={dateFilterType}
            onChange={setDateFilterType}
            style={{ width: 150 }}
            options={[
              { value: 'createdAt', label: 'Thời gian tạo' },
              { value: 'deadline', label: 'Thời hạn' },
            ]}
            size="normal"
          />
          <RangePicker
            placeholder={['Từ ngày', 'Đến ngày']}
            onChange={(dates) => setDateRange(dates)}
            format="DD/MM/YYYY"
            style={{ width: 260 }}
            size="normal"
          />
          {dateRange && (
            <Tag
              closable
              onClose={() => setDateRange(null)}
              color="blue"
            >
              {filteredData.length} đơn
            </Tag>
          )}
        </Space>
      }
    >
      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="taskId"
        size="small"
        pagination={{ pageSize: 5 }}
        expandable={{
          expandedRowRender,
          rowExpandable: (record) => !!record.timeline,
        }}
      />
    </Card>
  );
};

export default AssignedOrders;

