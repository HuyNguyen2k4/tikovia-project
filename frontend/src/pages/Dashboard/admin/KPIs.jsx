import React, { useEffect, useState } from "react";

import {
  FallOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Statistic } from "antd";

import { getKpiData } from "./mockData";

const KPIs = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const result = await getKpiData();
        setData(result);
      } catch (error) {
        console.error("Error fetching KPI data:", error);
      }
    };
    fetchKpis();
  }, []);

  if (!data) {
    return null;
  }

  const cards = [
    {
      title: "Tổng người dùng",
      value: data.totalUsers,
      icon: <UserOutlined />,
      color: "#1890ff",
    },
    {
      title: "Tổng đơn hàng",
      value: data.totalOrders,
      icon: <ShoppingCartOutlined />,
      color: "#52c41a",
    },
    {
      title: "Tổng sản phẩm",
      value: data.totalProducts,
      icon: <ShoppingOutlined />,
      color: "#f5222d",
    },
    {
      title: "Tổng khách hàng",
      value: data.totalCustomer,
      icon: <TeamOutlined />,
      color: "#0DCCCC",
    },
    // {
    //   title: "Tổng nhà cung cấp",
    //   value: data.totalSuppliers,
    //   icon: <UserOutlined />,
    //   color: "#722ed1",
    // },
    {
      title: "Giao dịch nhà cung cấp",
      color: "#faad14",
      span: { xs: 24, sm: 24, lg: 8 },
      customContent: (
        <div>
          <div style={{ color: "#fff", marginBottom: 10 }}>Giao dịch nhà cung cấp</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
              <RiseOutlined />
              <span style={{ fontSize: 20 }}>Nhập</span>
              <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 700 }}>
                {data.totalIn}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
              <FallOutlined />
              <span style={{ fontSize: 20 }}>Trả</span>
              <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 700 }}>
                {data.totalOut}
              </span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col key={c.title} xs={c.span?.xs || 24} sm={c.span?.sm || 12} lg={c.span?.lg || 4}>
          <Card bordered={false} style={{ background: c.color }}>
            {c.customContent ? (
              c.customContent
            ) : (
              <Statistic
                title={<span style={{ color: "#fff" }}>{c.title}</span>}
                value={c.value}
                prefix={c.icon}
                valueStyle={{ color: "#fff" }}
                suffix={c.suffix || undefined}
                precision={c.precision || undefined}
              />
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default KPIs;
