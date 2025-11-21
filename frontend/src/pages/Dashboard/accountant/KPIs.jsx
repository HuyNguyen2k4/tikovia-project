import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Spin } from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  DollarOutlined, 
  FileTextOutlined, 
  RiseOutlined, // Dùng cho "Đã thu"
  ShopOutlined  // Dùng cho "Đã trả"
} from '@ant-design/icons';
import { getAccountantKpiData } from './mockData'; 

// Hàm helper để format tiền tệ
const currencyFormatter = (v) => `${Number(v).toLocaleString('vi-VN')} ₫`;

const KPIs = () => {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Định nghĩa một hàm async bên trong effect để fetch data
    const fetchData = async () => {
      try {
        const data = await getAccountantKpiData();
        setKpiData(data);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu KPI:", error);
        // kpiData sẽ vẫn là null (hoặc là mock fallback từ hàm get)
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // [] đảm bảo effect chỉ chạy một lần khi component mount

  // Hiển thị loading spinner
  if (loading) {
    return (
      <Row gutter={[16, 16]} justify="center" align="middle" style={{ minHeight: '150px' }}>
        <Spin tip="Đang tải dữ liệu..." />
      </Row>
    );
  }

  // Xử lý trường hợp API lỗi hoặc không trả về dữ liệu
  if (!kpiData || !kpiData.suplierPaymentIn || !kpiData.suplierPaymentOut) {
    return (
      <Card>
        <Statistic title="Lỗi" value="Không thể tải dữ liệu KPI." />
      </Card>
    );
  }

  // Lấy dữ liệu an toàn, phòng trường hợp mảng rỗng
  const paymentIn = kpiData.suplierPaymentIn[0] || {};
  const paymentOut = kpiData.suplierPaymentOut[0] || {};

  // Định nghĩa lại mảng cards dựa trên dữ liệu từ API
  const cards = [
    { 
      title: 'Tổng phải trả NCC', 
      value: paymentIn.totalExpected || 0, 
      color: '#1890ff', // Xanh dương
      formatter: currencyFormatter
    },
    { 
      title: 'Đã trả NCC', 
      value: paymentIn.totalPaid || 0, 
      color: '#52c41a', // Xanh lá
      formatter: currencyFormatter
    },
    { 
      title: 'Còn phải trả NCC', 
      value: paymentIn.totalMissing || 0, 
      color: '#faad14', // Vàng
      formatter: currencyFormatter
    },
    { 
      title: 'Đã thu từ NCC', 
      value: paymentOut.totalExpectedOut || 0, 
      color: '#f5222d', // Đỏ
      formatter: currencyFormatter
    },
    { 
      title: 'Còn phải thu từ NCC', 
      value: paymentOut.totalPaidOut || 0, 
      color: '#722ed1', // Tím
      formatter: currencyFormatter
    },
    { 
      title: 'Tiền còn phải trả', 
      value: paymentOut.totalMissingOut || 0, 
      color: '#eb2f96', // Hồng
      formatter: currencyFormatter
    },
  ];

  // Phần render giữ nguyên logic, chỉ thay đổi Col span
  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col xs={24} sm={12} lg={8} xl={4} key={c.title}> {/* Thay đổi lg={4} thành lg={8} và xl={4} */}
          <Card bordered={false} style={{ background: c.color }}>
            <Statistic
              title={<span style={{ color: '#fff' }}>{c.title}</span>}
              value={c.value}
              prefix={c.icon}
              valueStyle={{ color: '#fff' }}
              suffix={c.suffix || undefined}
              formatter={c.formatter || undefined}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default KPIs;