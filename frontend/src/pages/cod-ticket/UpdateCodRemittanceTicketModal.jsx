import React, { useEffect, useState } from "react";

import { resetUpdateStatus, updateCodRemittanceTicket } from "@src/store/codRemittanceTicketsSlice";
import { Form, Input, InputNumber, Modal, Select, Tag, Typography, notification } from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;
const { TextArea } = Input;

const UpdateCodRemittanceTicketModal = ({ visible, onCancel, ticket, onSuccess }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const { updateStatus, updateError } = useSelector((state) => state.codRemittanceTickets);
  const [receivedAmount, setReceivedAmount] = useState(0);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible && ticket) {
      form.setFieldsValue({
        receivedAmount: ticket.receivedAmount,
        status: ticket.status,
        note: ticket.note || "",
      });
      setReceivedAmount(ticket.receivedAmount || 0);
    } else {
      form.resetFields();
      setReceivedAmount(0);
    }
  }, [visible, ticket, form]);

  // Handle success
  useEffect(() => {
    if (updateStatus === "succeeded") {
      notification.success({ message: "Cập nhật phiếu thu thành công" });
      dispatch(resetUpdateStatus());
      onSuccess();
    }
  }, [updateStatus, dispatch, onSuccess]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // Calculate difference
  const calculateDifference = () => {
    const expected = ticket?.expectedAmount || 0;
    return receivedAmount - expected;
  };

  // Calculate status
  const calculateStatus = (receivedAmt, expectedAmt) => {
    if (!receivedAmt || !expectedAmt) return "unbalanced";
    return receivedAmt === expectedAmt ? "balanced" : "unbalanced";
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Auto calculate status based on amounts
      const expectedAmt = ticket?.expectedAmount || 0;
      const receivedAmt = values.receivedAmount || 0;
      const autoStatus = receivedAmt === expectedAmt ? "balanced" : "unbalanced";

      const ticketData = {
        ...values,
        status: values.status || autoStatus,
      };

      dispatch(
        updateCodRemittanceTicket({
          ticketId: ticket.id,
          ticketData,
        })
      );
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const handleReceivedAmountChange = (value) => {
    setReceivedAmount(value || 0);
  };

  if (!ticket) return null;

  return (
    <Modal
      title="Cập nhật phiếu thu tiền COD"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Cập nhật"
      cancelText="Hủy"
      confirmLoading={updateStatus === "loading"}
      width={700}
      destroyOnHidden
      centered
      style={{top: 20}}
    >
      {/* Delivery Run Info */}
      <div
        style={{
          marginBottom: 20,
          padding: 16,
          background: "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
          borderRadius: 8,
          border: "1px solid #91d5ff",
        }}
      >
        <Text strong style={{ color: "#1890ff", fontSize: 16 }}>
          📦 Thông tin chuyến giao hàng
        </Text>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Text type="secondary">Mã chuyến:</Text>
            <div style={{ fontWeight: 500 }}>{ticket.deliveryRun?.deliveryNo}</div>
          </div>
          <div>
            <Text type="secondary">Shipper:</Text>
            <div style={{ fontWeight: 500 }}>{ticket.deliveryRun?.shipperName}</div>
          </div>
          <div>
            <Text type="secondary">Tổng COD:</Text>
            <div style={{ color: "#666" }}>{formatCurrency(ticket.totalCodAmount)}</div>
          </div>
          <div>
            <Text type="secondary">Shipper thu được:</Text>
            <div style={{ fontWeight: 600, color: "#52c41a" }}>
              {formatCurrency(ticket.expectedAmount)}
            </div>
          </div>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          receivedAmount: ticket.receivedAmount,
          status: ticket.status,
          note: ticket.note || "",
        }}
      >
        <Form.Item
          name="receivedAmount"
          label={
            <span>
              Số tiền shipper trả về{" "}
              <Text type="secondary" style={{ fontSize: "12px" }}>
                (để đối soát)
              </Text>
            </span>
          }
          rules={[
            { required: true, message: "Vui lòng nhập số tiền shipper trả về" },
            { type: "number", min: 0, message: "Số tiền phải lớn hơn hoặc bằng 0" },
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
            placeholder="Nhập số tiền shipper trả về"
            addonAfter="VND"
            onChange={handleReceivedAmountChange}
          />
        </Form.Item>

        <Form.Item
          name="status"
          label="Trạng thái"
          rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
        >
          <Select placeholder="Chọn trạng thái">
            <Select.Option value="balanced">Cân bằng</Select.Option>
            <Select.Option value="unbalanced">Chênh lệch</Select.Option>
          </Select>
        </Form.Item>

        {/* Real-time calculation display */}
        <Form.Item label="📊 Xem trước kết quả">
          <div
            style={{
              background: "#fafafa",
              padding: 16,
              borderRadius: 8,
              border: "1px solid #f0f0f0",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Text type="secondary">Tổng COD:</Text>
                <div>{formatCurrency(ticket.totalCodAmount)}</div>
              </div>
              <div>
                <Text type="secondary">Shipper thu được:</Text>
                <div style={{ fontWeight: 600, color: "#52c41a" }}>
                  {formatCurrency(ticket.expectedAmount)}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #d9d9d9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <Text strong>Shipper trả về mới:</Text>
                <div style={{ fontSize: "18px", fontWeight: 600, color: "#1890ff" }}>
                  {formatCurrency(receivedAmount)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Text strong>Chênh lệch:</Text>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color:
                      calculateDifference() === 0
                        ? "#52c41a"
                        : calculateDifference() > 0
                          ? "#1890ff"
                          : "#ff4d4f",
                  }}
                >
                  {calculateDifference() > 0 ? "+" : ""}
                  {formatCurrency(Math.abs(calculateDifference()))}
                </div>
                <Tag
                  color={
                    calculateStatus(receivedAmount, ticket.expectedAmount) === "balanced"
                      ? "success"
                      : "warning"
                  }
                  style={{ marginTop: 4 }}
                >
                  {calculateStatus(receivedAmount, ticket.expectedAmount) === "balanced"
                    ? "✓ Cân bằng"
                    : "⚠ Chênh lệch"}
                </Tag>
              </div>
            </div>
          </div>
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <TextArea rows={4} placeholder="Nhập ghi chú về phiếu thu..." maxLength={500} showCount />
        </Form.Item>
      </Form>

      {updateError && (
        <div
          style={{
            color: "#ff4d4f",
            marginTop: 16,
            padding: 8,
            background: "#fff2f0",
            borderRadius: 4,
          }}
        >
          Lỗi: {updateError}
        </div>
      )}
    </Modal>
  );
};

export default UpdateCodRemittanceTicketModal;
