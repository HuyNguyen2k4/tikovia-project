import React from 'react';
import { Card, List, Tag, Tabs } from 'antd';
import { Column } from '@ant-design/plots';
import { teamPerformance } from './mockData';

const TeamPerformanceChart = ({ panelHeight = 380 }) => {
  const chartData = teamPerformance.flatMap((p) => [
    { name: p.name, type: 'Hoàn thành', value: p.done },
    { name: p.name, type: 'Lỗi', value: p.issue },
  ]);

  const tabsBarHeight = 48; // approx tabs header height
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
    <Card title="Hiệu suất nhóm soạn hàng" bordered={false} style={{ height: panelHeight }} bodyStyle={{ height: 'calc(100% - 57px)', padding: 16, overflow: 'hidden' }}>
      <Tabs
        defaultActiveKey="chart"
        style={{ height: chartHeight + tabsBarHeight }}
        items={[
          { key: 'chart', label: 'Biểu đồ', children: <Column {...config} /> },
          {
            key: 'list',
            label: 'Danh sách',
            children: (
              <div style={{ height: chartHeight, overflow: 'auto' }}>
                <List
                  size="small"
                  header={<div>Thời gian trung bình (phút/đơn)</div>}
                  bordered
                  dataSource={teamPerformance}
                  renderItem={(item) => (
                    <List.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>Nhân viên {item.name}</span>
                        <Tag color={item.avg <= 18 ? 'green' : item.avg <= 20 ? 'blue' : 'orange'}>{item.avg} phút</Tag>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
};

export default TeamPerformanceChart;

