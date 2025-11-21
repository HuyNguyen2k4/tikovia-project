import React from "react";

import { CreditCardOutlined, DollarOutlined } from "@ant-design/icons";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import { Col, Divider, Empty, Image, Modal, Row, Space, Table, Tag, Typography } from "antd";

const { Text, Title } = Typography;

const CustomerPaymentDetail = ({ visible, paymentData, onClose }) => {
  if (!paymentData) return null;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

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
  const invoiceStatusMap = {
    open: { text: "Đã mở", color: "blue" },
    paid: { text: "Đã thanh toán", color: "green" },
    cancelled: { text: "Đã hủy", color: "red" },
  };
  const methodpaymentMap = {
    bank: { text: "Ngân hàng", color: "blue" },
    cash: { text: "Tiền mặt", color: "green" },
    cod: { text: "COD", color: "orange" },
  };
  const allocationColumns = [
    {
      title: "Mã hóa đơn",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      render: (text) => <Tag color="geekblue">{text}</Tag>,
    },
    {
      title: "Số tiền phân bổ",
      dataIndex: "amount",
      key: "amount",
      render: (text) => <Text>{formatCurrency(text)}</Text>,
    },
    {
      title: "Tổng tiền hóa đơn",
      dataIndex: "invoiceTotal",
      key: "invoiceTotal",
      render: (text) => <Text>{formatCurrency(text)}</Text>,
    },
    {
      title: "Trạng thái hóa đơn",
      dataIndex: "invoiceStatus",
      key: "invoiceStatus",
      width: 100,
      render: (text) => {
        const status = invoiceStatusMap[text] || { text: "Không xác định", color: "default" };
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (text) => <Text>{formatDate(text)}</Text>,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
    },
  ];
  return (
    <Modal
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            rowGap: 8,
            minWidth: 0,
          }}
        >
          <CreditCardOutlined style={{ fontSize: 22, color: "#52c41a", flexShrink: 0 }} />
          <span
            style={{
              fontWeight: 600,
              fontSize: 18,
              minWidth: 0,
            }}
          >
            Chi tiết thanh toán
          </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      className="custom-modal"
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <Divider style={{ margin: "12px 0" }} />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24} md={8} lg={8} xl={8}>
          <Image src={paymentData?.evdUrl} alt="Payment" />
        </Col>
        <Col xs={24} sm={24} md={16} lg={16} xl={16}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Tên khách hàng:
                  </Text>
                  <br />
                  <Text>{paymentData.customerName}</Text>
                </LiquidGlassPanel>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Mã khách hàng:
                  </Text>
                  <br />
                  <Tag color="blue">{paymentData.customerCode}</Tag>
                </LiquidGlassPanel>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Phương thức thanh toán:
                  </Text>
                  <br />
                  <Tag color={methodpaymentMap[paymentData.method]?.color || "gray"}>
                    {methodpaymentMap[paymentData.method]?.text || "Khác"}
                  </Tag>
                </LiquidGlassPanel>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Hướng thanh toán:
                  </Text>
                  <br />
                  <Tag color="purple">{paymentData.direction === "in" ? "Thu" : "Chi"}</Tag>
                </LiquidGlassPanel>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Số tiền thanh toán:
                  </Text>
                  <br />
                  <Text>{formatCurrency(paymentData.amount)}</Text>
                </LiquidGlassPanel>
              </Space>
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Ngày nhận thanh toán:
                  </Text>
                  <br />
                  <Text>{formatDate(paymentData.receivedAt)}</Text>
                </LiquidGlassPanel>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Người nhận:
                  </Text>
                  <br />
                  <Tag color="success">{paymentData.receivedByName}</Tag>
                </LiquidGlassPanel>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Ngày tạo:
                  </Text>
                  <br />
                  <Text>{formatDate(paymentData.createdAt)}</Text>
                </LiquidGlassPanel>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Cập nhật lần cuối:
                  </Text>
                  <br />
                  <Text>{formatDate(paymentData.updatedAt)}</Text>
                </LiquidGlassPanel>
                <LiquidGlassPanel padding={12} radius={12}>
                  <Text type="secondary" strong>
                    Ghi chú:
                  </Text>
                  <br />
                  <Text>{paymentData.note || "Không có"}</Text>
                </LiquidGlassPanel>
              </Space>
            </Col>
          </Row>
        </Col>
      </Row>

      <Divider orientation="center">Phân bổ hóa đơn</Divider>
      <Table
        columns={allocationColumns}
        dataSource={paymentData.allocations || []}
        noDataElement={<Empty description="Không có hóa đơn nào" />}
        pagination={false}
        rowKey={(record) => record.id}
        bordered
        scroll={{ x: 800 }}
      />
    </Modal>
  );
};

export default CustomerPaymentDetail;
