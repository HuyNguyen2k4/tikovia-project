import React from "react";

import { CopyOutlined } from "@ant-design/icons";
import SepayQRCode from "@src/components/sePay/QRCodeGenerator";
import { Button, Card, Col, Divider, Row, Space, Typography, message } from "antd";
import PropTypes from "prop-types";

const { Title, Text } = Typography;
const CONTENT_BASE = import.meta.env.VITE_CONTENT_BASE || "THANH TOAN HOA DON";
const bankAccount = import.meta.env.VITE_BANK_ACCOUNT || "0123456789";
const bankAccountName = import.meta.env.VITE_BANK_ACCOUNT_NAME || "Nguyen Van A";
const bank = import.meta.env.VITE_BANK || "MBBANK";
const bankName = import.meta.env.VITE_BANK_NAME || "Ngân hàng TMCP Quân đội";
const bankIconUrl =
  import.meta.env.VITE_BANK_ICON_URL || "https://img.bankhub.dev/rounded/mbbank.png";

// --- COMPONENT InfoRow (Không thay đổi) ---
const InfoRow = ({ label, value, onCopy, copyValue, isAmount = false, ellipsis = false }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: "4px 16px",
      alignItems: "center",
      width: "100%",
    }}
  >
    {/* Cột 1: Nhãn */}
    <Text type="secondary" style={{ whiteSpace: "nowrap" }}>
      {label}:
    </Text>

    {/* Cột 2: Giá trị + Nút Copy (wrapper) */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        minWidth: 0,
      }}
    >
      {/* Giá trị (Text) */}
      <Text
        strong
        style={{
          fontSize: "1.1em",
          color: isAmount ? "#f5222d" : "inherit",
          textAlign: "right",
        }}
        ellipsis={ellipsis ? { tooltip: value } : false}
      >
        {value}
      </Text>

      {/* Nút Copy */}
      <Button
        type="text"
        shape="circle"
        icon={<CopyOutlined />}
        onClick={() => onCopy(copyValue || value, label.toLowerCase())}
        style={{ flexShrink: 0, marginLeft: 4 }}
      />
    </div>
  </div>
);

// --- COMPONENT PaymentPage ---
const PaymentPage = ({ layout, code, amount }) => {
  // chuyển đổi code: IMP-091025-C8F23A thành IMP091025C8F23A
  const formattedCode = code ? code.replace(/-/g, "") : "ERROR";
  const contentPayment = `${formattedCode} ${CONTENT_BASE}`;

  const paymentInfo = {
    account: bankAccount,
    accountName: bankAccountName,
    bank: bank,
    bankName: bankName,
    bankIcon: bankIconUrl,
    amount: amount,
    description: contentPayment,
  };

  /**
   * Hàm xử lý sao chép nội dung vào clipboard
   */
  const handleCopy = (textToCopy, fieldName) => {
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        message.success(`Đã sao chép ${fieldName}!`);
      },
      (err) => {
        console.error("Lỗi sao chép: ", err);
        message.error("Sao chép thất bại!");
      }
    );
  };

  const isVertical = layout === "vertical";

  // --- KHỐI THÔNG TIN ĐÃ CẬP NHẬT ---
  const InfoBlock = (
    <div>
      {/* Dùng Space để căn giữa icon và title trên cùng 1 hàng */}
      <Space
        direction="horizontal"
        align="center"
        style={{
          width: "100%",
          justifyContent: "center", // Căn giữa nội dung của Space
        }}
      >
        <img
          src={paymentInfo.bankIcon}
          alt={`${paymentInfo.bankName} logo`}
          style={{ width: 30, height: 30, borderRadius: "50%" }}
        />
        <Title level={5} style={{ margin: 0 }}>
          {paymentInfo.bankName}
        </Title>
      </Space>

      {/* Các InfoRow giữ nguyên */}
      <Space direction="vertical" size="middle" style={{ width: "100%", marginTop: 16 }}>
        {/* --- THÊM CHỦ TÀI KHOẢN --- */}
        <InfoRow
          label="Chủ tài khoản"
          value={paymentInfo.accountName}
          onCopy={handleCopy}
          copyValue={paymentInfo.accountName}
          ellipsis={true} // Tên có thể dài
        />
        {/* --- KẾT THÚC --- */}

        <InfoRow
          label="Số tài khoản"
          value={paymentInfo.account}
          onCopy={handleCopy}
          copyValue={paymentInfo.account}
        />
        {paymentInfo.amount > 0 && (
          <InfoRow
            label="Số tiền"
            value={`${paymentInfo.amount.toLocaleString("vi-VN")} VNĐ`}
            onCopy={handleCopy}
            copyValue={paymentInfo.amount}
            isAmount={true}
          />
        )}
        <InfoRow
          label="Nội dung"
          value={paymentInfo.description}
          onCopy={handleCopy}
          copyValue={paymentInfo.description}
          ellipsis={true}
        />
      </Space>
    </div>
  );

  // Khối component QR (để tái sử dụng)
  const QrBlock = (
    <div style={{ textAlign: "center" }}>
      <SepayQRCode
        account={paymentInfo.account}
        bank={paymentInfo.bank}
        description={paymentInfo.description}
        template="compact"
        {...(paymentInfo.amount > 0 ? { amount: paymentInfo.amount } : {})}
      />
    </div>
  );

  return (
    <Card
      title="Quét mã QR để thanh toán"
      style={{
        maxWidth: isVertical ? 350 : 700,
        width: "100%",
        margin: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      {isVertical ? (
        // --- GIAO DIỆN DỌC ---
        <>
          {InfoBlock}
          <Divider dashed />
          {QrBlock}
        </>
      ) : (
        // --- GIAO DIỆN NGANG ---
        <Row gutter={[24, 16]} align="middle">
          {/* Cột 1: QR Code */}
          <Col xs={24} sm={10}>
            {QrBlock}
          </Col>

          {/* Cột 2: Thông tin */}
          <Col xs={24} sm={14}>
            {InfoBlock}
          </Col>
        </Row>
      )}
    </Card>
  );
};

PaymentPage.propTypes = {
  layout: PropTypes.oneOf(["vertical", "horizontal"]),
  code: PropTypes.string.isRequired, // Thêm prop type cho code
  amount: PropTypes.number, // Thêm prop type cho amount
};

PaymentPage.defaultProps = {
  layout: "vertical",
  amount: 10000, // Thêm giá trị default
};

export default PaymentPage;
