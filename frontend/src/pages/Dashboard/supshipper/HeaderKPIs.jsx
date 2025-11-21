import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  UserOutlined, // Thay thế RiseOutlined
} from '@ant-design/icons';
import { getKpiData } from './mockData'; // Import hàm fetch data

// Đây là trạng thái khởi tạo, dựa trên fallback mock trong hàm getKpiData
const initialKpiData = {
  orderAssignedShipper: 0,
  orderDelivering: 0,
  orderDelivered: 0,
  totalOrderCancelled: 0,
  countTotalShipper: 0,
};

const HeaderKPIs = () => {
  // Thêm state để lưu dữ liệu KPI và trạng thái loading
  const [kpiData, setKpiData] = useState(initialKpiData);
  const [loading, setLoading] = useState(true);

  // Dùng useEffect để fetch data khi component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Gọi hàm getKpiData
        const data = await getKpiData();
        setKpiData(data);
      } catch (error) {
        // Hàm getKpiData đã tự xử lý lỗi và trả về mock
        // nên chúng ta chỉ cần setKpiData với kết quả của nó
        console.error("Lỗi khi fetch Kpi:", error);
        setKpiData(initialKpiData); // Đảm bảo an toàn
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // [] đảm bảo chỉ chạy 1 lần

  // Cập nhật mảng 'cards' để dùng dữ liệu từ state
  const cards = [
    { title: 'Tổng đơn cần giao', value: kpiData.orderAssignedShipper, icon: <ShoppingOutlined />, color: '#1890ff' },
    { title: 'Đã giao thành công', value: kpiData.orderDelivered, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: 'Đang giao', value: kpiData.orderDelivering, icon: <SyncOutlined />, color: '#13c2c2' },
    { title: 'Đơn bị hoàn / lỗi', value: kpiData.totalOrderCancelled, icon: <ExclamationCircleOutlined />, color: '#f5222d' },
    { title: 'Tổng Shipper', value: kpiData.countTotalShipper, icon: <UserOutlined />, color: '#722ed1', suffix: undefined }, // Thay thế thẻ 'Tỷ lệ'
  ];

  return (
    // Bọc Row trong Spin để hiển thị loading
    <Spin spinning={loading} tip="Đang tải dữ liệu...">
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={c.title}>
            <Card bordered={false} style={{ background: c.color }}>
              <Statistic
                title={<span style={{ color: '#fff' }}>{c.title}</span>}
                value={c.value}
                prefix={c.icon}
                valueStyle={{ color: '#fff' }}
                suffix={c.suffix || undefined}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Spin>
  );
};

export default HeaderKPIs;