import React from "react";

import { CreditCardOutlined, DollarOutlined } from "@ant-design/icons";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import { Button, Col, Divider, Image, Modal, Row, Space, Tag, Typography } from "antd";

const { Text } = Typography;

const SupTransactionPaymentDetail = ({ visible, paymentData, onClose }) => {
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

  const paidByLabel = paymentData.paidByName || paymentData.paidBy || "Không rõ";
  const createdByLabel = paymentData.createdByName || paymentData.createdBy || "Không rõ";

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
      width={900}
      style={{ top: 20 }}
    >
      <Divider style={{ margin: "12px 0" }} />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          {paymentData.evdUrl ? (
            <Image
              src={paymentData.evdUrl}
              alt="EVD"
              style={{ width: "100%", borderRadius: 8, objectFit: "cover" }}
              preview={{ src: paymentData.evdUrl }}
              fallback=""
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fafafa",
                border: "1px dashed #e9e9e9",
                borderRadius: 8,
                color: "#999",
              }}
            >
              Không có ảnh
            </div>
          )}
        </Col>

        <Col xs={24} sm={16}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div className="productManage-detailGrid">
              <LiquidGlassPanel padding={12} radius={12}>
                <Text type="secondary" strong>
                  Mã giao dịch:
                </Text>
                <br />
                <Tag color="cyan">{paymentData.transId}</Tag>
              </LiquidGlassPanel>

              <LiquidGlassPanel padding={12} radius={12}>
                <Text type="secondary" strong>
                  Số chứng từ:
                </Text>
                <br />
                <Tag color="blue">{paymentData.docNo}</Tag>
              </LiquidGlassPanel>

              <LiquidGlassPanel padding={12} radius={12}>
                <Text type="secondary" strong>
                  Ngày thanh toán:
                </Text>
                <br />
                <Tag color="orange">{formatDate(paymentData.paidAt)}</Tag>
              </LiquidGlassPanel>

              <LiquidGlassPanel padding={12} radius={12}>
                <Text type="secondary" strong>
                  Người thanh toán:
                </Text>
                <br />
                <Tag color="purple">{paidByLabel}</Tag>
              </LiquidGlassPanel>

              <LiquidGlassPanel padding={12} radius={12}>
                <Text type="secondary" strong>
                  Người tạo:
                </Text>
                <br />
                <Text>{createdByLabel}</Text>
              </LiquidGlassPanel>

              <LiquidGlassPanel padding={12} radius={12}>
                <Text type="secondary" strong>
                  Số tiền thanh toán:
                </Text>
                <br />
                <Tag color="green">{formatCurrency(paymentData.amount)}</Tag>
              </LiquidGlassPanel>
            </div>
            <LiquidGlassPanel padding={12} radius={12} style={{ flex: 1 }}>
              <Text type="secondary" strong>
                Ghi chú:
              </Text>
              <br />
              <div
                style={{
                  marginTop: 6,
                  borderRadius: 4,
                }}
              >
                <Text>{paymentData.note ?? "Không có"}</Text>
              </div>
            </LiquidGlassPanel>
            {(paymentData.createdAt || paymentData.updatedAt) && (
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                {paymentData.createdAt && (
                  <div>
                    <Text type="secondary">Ngày tạo:</Text>
                    <div>
                      <Text>{formatDate(paymentData.createdAt)}</Text>
                    </div>
                  </div>
                )}
                {paymentData.updatedAt && (
                  <div>
                    <Text type="secondary">Cập nhật lần cuối:</Text>
                    <div>
                      <Text>{formatDate(paymentData.updatedAt)}</Text>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Space>
        </Col>
      </Row>
    </Modal>
  );
};

export default SupTransactionPaymentDetail;
