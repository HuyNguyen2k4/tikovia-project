import React from 'react';
import { Card, Progress, Typography, Space, Grid } from 'antd';
// 1. Import 'kpis' (từ file mockData) thay vì 'progress'
import { kpis } from './mockData';

const PersonalProgress = ({ panelHeight = 420 }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // 2. Ánh xạ dữ liệu từ 'kpis' sang các biến mà component cần
  const total = kpis.totalAssignedToday;
  const completed = kpis.deliveredSuccess;
  
  // Tính toán 'onTime' = (Hoàn thành) - (Trễ)
  // (Chúng ta giả định 'lateOrders' là số đơn trễ trong số đơn đã giao)
  const onTime = kpis.deliveredSuccess - kpis.lateOrders;

  // 3. Tính toán các phần trăm (thêm kiểm tra chia cho 0)
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const onTimePercent = completed > 0 ? Math.round((onTime / completed) * 100) : 0;

  return (
    <Card title="Tiến độ cá nhân trong ca" bordered={false} style={{ height: panelHeight }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
        <Progress type="dashboard" percent={percent} size={isMobile ? 140 : 180} />
        <Space direction="vertical" size={4} align="center">
          <Typography.Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
            {/* 4. Cập nhật các giá trị hiển thị */}
            {completed}/{total} đơn hoàn thành ({percent}%)
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>
            Đúng hạn: {onTime}/{completed} ({onTimePercent}%)
          </Typography.Text>
          
          {/* Dòng này bị ẩn đi vì 'kpis' không cung cấp 'averageMinutes'
            Bạn có thể bỏ comment nếu 'kpis' của bạn được cập nhật
          */}
          {/* <Typography.Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>
            Thời gian trung bình mỗi đơn: {kpis.averageMinutes} phút
          </Typography.Text>
          */}
        </Space>
      </div>
    </Card>
  );
};

export default PersonalProgress;