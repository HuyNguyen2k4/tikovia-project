import React, { useState } from "react";

import { ShoppingCartOutlined } from "@ant-design/icons";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import { Col, Divider, Grid, Modal, Row, Space, Tabs, Tag, Typography } from "antd";
import { useSelector } from "react-redux";

import OrderReturnsTab from "../order-returns/OrderReturnsTab";
import SalesInvoicesDetailTab from "../sales-invoices/SalesInvoicesDetailTab";
import ProductListTab from "./ProductListTab";
import SalesOrdersStatusTab from "./SalesOrdersStatusTab";

const { Text } = Typography;

const SalesOrdersDetail = ({ visible, orderData, onClose }) => {
  if (!orderData) return null;

  const items = orderData.items || [];

  const [activeTab, setActiveTab] = useState("details");
  const userRole = useSelector((state) => state.auth.user?.role);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens?.md; // md and up = desktop/tablet

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const renderStatusTag = (status) => {
    const statusMap = {
      draft: { color: "default", text: "Nháp" },
      pending_preparation: { color: "orange", text: "Chờ chuẩn bị" },
      assigned_preparation: { color: "gold", text: "Đang phân công chuẩn bị" },
      confirmed: { color: "blue", text: "Xác nhận" },
      prepared: { color: "green", text: "Chờ giao hàng" },
      delivering: { color: "cyan", text: "Đang giao" },
      delivered: { color: "green", text: "Đã giao" },
      completed: { color: "success", text: "Hoàn thành" },
      cancelled: { color: "red", text: "Đã hủy" },
    };
    const cfg = statusMap[status] || { color: "default", text: status || "-" };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  const detailsContent = (
    <Row gutter={[16, 16]}>
      {!isMobile && (
        <Col xs={0} sm={0} md={6} lg={6}>
          <SalesOrdersStatusTab orderData={orderData} />
        </Col>
      )}

      <Col xs={24} sm={24} md={isMobile ? 24 : 18} lg={isMobile ? 24 : 18}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <LiquidGlassPanel padding={12} radius={8}>
              <Text type="secondary" strong>
                Khách hàng
              </Text>
              <br />
              <div style={{ marginTop: 6 }}>
                <Tag color="purple">{orderData.customerName || orderData.customerId}</Tag>
              </div>
            </LiquidGlassPanel>

            <LiquidGlassPanel padding={12} radius={8}>
              <Text type="secondary" strong>
                Người bán
              </Text>
              <br />
              <div style={{ marginTop: 6 }}>
                <Tag color="orange">{orderData.sellerName || orderData.sellerId}</Tag>
              </div>
            </LiquidGlassPanel>

            <LiquidGlassPanel padding={12} radius={8}>
              <Text type="secondary" strong>
                Ngày giao (SLA)
              </Text>
              <br />
              <div style={{ marginTop: 6 }}>
                <Tag color="cyan">{formatDate(orderData.slaDeliveryAt)}</Tag>
              </div>
            </LiquidGlassPanel>

            <LiquidGlassPanel padding={12} radius={8}>
              <Text type="secondary" strong>
                Địa chỉ giao hàng
              </Text>
              <br />
              <div style={{ marginTop: 6 }}>
                <Text>{orderData.address || "-"}</Text>
              </div>
            </LiquidGlassPanel>

            <LiquidGlassPanel padding={12} radius={8}>
              <Text type="secondary" strong>
                Số điện thoại
              </Text>
              <br />
              <div style={{ marginTop: 6 }}>
                <Text>{orderData.phone || "-"}</Text>
              </div>
            </LiquidGlassPanel>

            <LiquidGlassPanel padding={12} radius={8}>
              <Text type="secondary" strong>
                Số lượng sản phẩm
              </Text>
              <br />
              <div style={{ marginTop: 6 }}>
                <Tag color="blue">{orderData.itemsCount}</Tag>
              </div>
            </LiquidGlassPanel>

            <LiquidGlassPanel padding={12} radius={8}>
              <Text type="secondary" strong>
                Ngày tạo đơn hàng
              </Text>
              <br />
              <div style={{ marginTop: 6 }}>
                <Tag color="green">{formatDate(orderData.createdAt)}</Tag>
              </div>
            </LiquidGlassPanel>

            <LiquidGlassPanel padding={12} radius={8}>
              <Text type="secondary" strong>
                Trạng thái khóa đơn hàng
              </Text>
              <br />
              <div style={{ marginTop: 6 }}>
                {orderData.adminLocked ? (
                  <Tag color="red">Đã bị khóa</Tag>
                ) : (
                  <Tag color="green">Không bị khóa</Tag>
                )}
              </div>
            </LiquidGlassPanel>
          </div>

          <LiquidGlassPanel padding={12} radius={8}>
            <Text type="secondary" strong>
              Ghi chú đơn hàng
            </Text>
            <br />
            <div style={{ marginTop: 6 }}>
              <Text>{orderData.note || "Không có"}</Text>
            </div>
          </LiquidGlassPanel>
        </Space>
      </Col>
    </Row>
  );

  const tabsItems = [
    {
      key: "details",
      label: "Chi tiết",
      children: detailsContent,
    },
    {
      key: "products",
      label: "Danh sách sản phẩm",
      children: <ProductListTab items={items} />,
    },
  ];
  // Chỉ có admin, accountant và seller mới được xem tab hóa đơn bán hàng và từ status confirmed trở lên

  if (
    (userRole === "admin" || userRole === "accountant" || userRole === "seller") &&
    !["draft", "pending_preparation", "assigned_preparation"].includes(orderData.status)
  ) {
    tabsItems.push({
      key: "salesInvoices",
      label: "Hóa đơn bán hàng",
      children: (
        <SalesInvoicesDetailTab
          orderId={orderData.id}
          orderNo={orderData.orderNo}
          orderItems={orderData.items}
        />
      ),
    });
  }
  // Chỉ khi order đó đang ở trạng thái completed hoặc delivered mới hiển thị tab
  if (orderData.status === "completed" || orderData.status === "delivered") {
    tabsItems.push({
      key: "orderReturns",
      label: "Trả hàng",
      children: <OrderReturnsTab orderId={orderData.id} orderNo={orderData.orderNo} />,
    });
  }

  if (isMobile) {
    tabsItems.push({
      key: "status",
      label: "Tiến trình đơn hàng",
      children: <SalesOrdersStatusTab orderData={orderData} />,
    });
  }

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ShoppingCartOutlined style={{ fontSize: 22, color: "#1890ff" }} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 18,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Đơn hàng: <Tag color="blue">{orderData.orderNo}</Tag>
            </div>
          </div>
          <div>Trạng thái: {renderStatusTag(orderData.status)}</div>
        </div>
      }
      open={visible}
      onCancel={() => {
        setActiveTab("details");
        onClose?.();
      }}
      footer={null}
      width={1000}
      style={{ top: 20 }}
      className="custom-modal"
    >
      <Divider style={{ margin: "12px 0" }} />
      <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k)} items={tabsItems} />
    </Modal>
  );
};

export default SalesOrdersDetail;
