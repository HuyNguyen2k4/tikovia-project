import React, { useEffect, useState } from 'react';
import { Card, Statistic, Typography, Row, Col } from 'antd';
import { DollarOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { getProfitComparison } from './mockData';

const { Text } = Typography;

const ProfitComparisonCard = () => {
  const [comparison, setComparison] = useState({
    currentMonthRevenue: 0,
    lastMonthRevenue: 0,
  });

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const data = await getProfitComparison();
        setComparison(data);
      } catch (error) {
        console.error('Error fetching profit comparison:', error);
      }
    };

    fetchComparison();
  }, []);

  const { currentMonthRevenue, lastMonthRevenue } = comparison;
  const profitDifference = currentMonthRevenue - lastMonthRevenue;
  const profitPercentage = lastMonthRevenue
    ? ((profitDifference / lastMonthRevenue) * 100).toFixed(1)
    : 0;

  return (
    <Card
      title={
        <span>
          <DollarOutlined style={{ marginRight: 8 }} />
          Lợi nhuận so với tháng trước
        </span>
      }
      bordered={false}
      style={{ height: 250 }}
      bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Statistic
          title="Lợi nhuận tăng/giảm"
          value={profitDifference}
          precision={0}
          valueStyle={{ color: profitDifference > 0 ? '#3f8600' : '#cf1322', fontSize: 32 }}
          prefix={profitDifference > 0 ? <RiseOutlined /> : <FallOutlined />}
          suffix=" ₫"
        />
        <Text style={{ fontSize: 18, color: profitDifference > 0 ? '#3f8600' : '#cf1322' }}>
          {profitDifference > 0 ? '+' : ''}{profitPercentage}%
        </Text>
      </div>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic title="Tháng trước" value={lastMonthRevenue} suffix=" ₫" valueStyle={{ fontSize: 16 }} />
        </Col>
        <Col span={12}>
          <Statistic title="Tháng này" value={currentMonthRevenue} suffix=" ₫" valueStyle={{ fontSize: 16 }} />
        </Col>
      </Row>
    </Card>
  );
};

export default ProfitComparisonCard;
