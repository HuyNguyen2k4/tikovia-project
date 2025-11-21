import React, { useEffect, useState } from 'react';
import { Card, Progress } from 'antd';
import { getKpiData } from './mockData';

const PersonalProgress = ({ panelHeight = 220 }) => {
  const [kpis, setKpis] = useState({
    totalAssigned: 0,
    completed: 0,
    inProgress: 0,
    pendingApproval: 0,
    issues: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      const data = await getKpiData();
      setKpis(data);
    };
    fetchData();
  }, []);

  const {
    totalAssigned,
    completed,
    inProgress,
    pendingApproval,
    issues
  } = kpis;

  // Tổng thực tế không tính issues
  const effectiveTotal =
    totalAssigned + inProgress + pendingApproval + completed;

  const percent =
    effectiveTotal > 0
      ? Math.round((completed / effectiveTotal) * 100)
      : 0;

  const getColor = (p) => {
    if (p >= 80) return '#52c41a'; // xanh
    if (p >= 50) return '#fa8c16'; // cam
    return '#ff4d4f';              // đỏ
  };

  const getMessage = (p) => {
    if (p >= 80) return "Hiệu suất rất tốt! Tiếp tục phát huy nhé.";
    if (p >= 50) return "Tiến độ ổn, nhưng vẫn còn dư địa để cải thiện.";
    return "Hiệu suất đang thấp, cần rà soát lại tiến độ để tránh trễ hạn.";
  };

  return (
    <Card
      title="Tiến độ cá nhân"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Progress
          type="circle"
          percent={percent}
          size={120}
          strokeColor={getColor(percent)}
        />

        <div>
          <div style={{ fontWeight: 600 }}>
            {completed}/{effectiveTotal} đơn hoàn thành ({percent}%)
          </div>
          <div style={{ color: '#8c8c8c', marginTop: 4 }}>
            Lỗi / Huỷ: {issues}
          </div>
        </div>
      </div>

      {/* Lời nhắn feedback */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: getColor(percent)
        }}
      >
        {getMessage(percent)}
      </div>
    </Card>
  );
};

export default PersonalProgress;
