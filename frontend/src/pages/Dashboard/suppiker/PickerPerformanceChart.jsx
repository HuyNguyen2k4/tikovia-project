import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Tabs, Spin } from 'antd';
import { Column } from '@ant-design/plots';
import { getPickerProgress } from './mockData';

const PickerPerformanceChart = ({ panelHeight = 380 }) => {
  const [pickers, setPickers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getPickerProgress();
        setPickers(res || []);
      } catch (error) {
        console.error('Error loading picker performance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Chuẩn hóa data chart
  const chartData = pickers.flatMap((p) => [
    { name: p.pickerName, type: 'Hoàn thành', value: p.completed ?? 0 },
    { name: p.pickerName, type: 'Hủy/Lỗi', value: p.cancelled ?? 0 },
  ]);

  const tabsBarHeight = 48;
  const chartHeight = Math.max(160, panelHeight - 57 - 32 - tabsBarHeight);

  const config = {
    data: chartData,
    xField: 'name',
    yField: 'value',
    colorField: 'type',
    group: true,
    color: (d) => (d.type === 'Hoàn thành' ? '#52c41a' : '#f5222d'),
    height: chartHeight,
    autoFit: true,
    legend: { position: 'top' },
  };

  return (
    <Card
      title="Hiệu suất nhóm soạn hàng"
      variant="bordered"
      style={{ height: panelHeight }}
      styles={{
        body: { height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' },
      }}
    >
      <Tabs
        defaultActiveKey="chart"
        style={{ height: chartHeight + tabsBarHeight }}
        items={[
          {
            key: 'chart',
            label: 'Biểu đồ',
            children: (
              <div style={{ width: '100%', height: chartHeight }}>
                {loading ? (
                  <div
                    style={{
                      height: chartHeight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Spin size="large" />
                  </div>
                ) : (
                  <Column key={pickers.length} {...config} />
                )}
              </div>
            ),
          },
          {
            key: 'list',
            label: 'Danh sách',
            children: (
              <div style={{ height: chartHeight, overflow: 'auto' }}>
                <List
                  size="small"
                  loading={loading}
                  header={<div>Thời gian trung bình (phút/tác vụ)</div>}
                  bordered
                  dataSource={pickers}
                  renderItem={(item) => {
                    const avgTime =
                      item.avgDurationMinutes ??
                      (item.avgDurationSeconds
                        ? item.avgDurationSeconds / 60
                        : null);

                    const displayTime =
                      avgTime !== null ? avgTime.toFixed(1) : '-';

                    const color =
                      avgTime === null
                        ? 'default'
                        : avgTime <= 18
                        ? 'green'
                        : avgTime <= 22
                        ? 'blue'
                        : 'orange';

                    return (
                      <List.Item>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            width: '100%',
                          }}
                        >
                          <span>Nhân viên {item.pickerName}</span>
                          <Tag color={color}>
                            {displayTime === '-' ? '-' : `${displayTime} phút`}
                          </Tag>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
};

export default PickerPerformanceChart;
