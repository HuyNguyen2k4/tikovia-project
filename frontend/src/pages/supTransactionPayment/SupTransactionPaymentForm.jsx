import React, { useEffect } from "react";

import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Col,
  DatePicker,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from "antd";
import viVN from "antd/es/date-picker/locale/vi_VN";
import dayjs from "dayjs";

const { Text } = Typography;

const { Option } = Select;

const SupTransactionPaymentForm = ({
  form,
  isLoading,
  handleSubmit,
  onCancel,
  // Transaction data
  transactionId,
  transactionData, // { id, supplierName, docNo, ... }
  // Users select
  userOptions = [],
  userLoading = false,
  handleUserSearch,
  handleUserPopupScroll,
  fetchUsers,
  // Upload
  fileList = [],
  handleChange,
  handlePreview,
  handleRemove,
  previewImage,
  previewOpen,
  setPreviewImage,
  setPreviewOpen,
}) => {
  // Set transaction value when transactionId changes
  useEffect(() => {
    if (transactionId && transactionData) {
      form.setFieldsValue({
        transId: transactionId,
        amount: fmtCurrency(transactionData.totalAmount - transactionData.paidAmount)
          .replace("₫", "")
          .trim(),
        paidAt: dayjs(),
      });
    } else {
      form.setFieldsValue({ paidAt: dayjs() });
    }
  }, [transactionId, transactionData, form]);
  const fmtCurrency = (value) => {
    if (typeof value !== "number") return "0 VNĐ";
    return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  };
  const wrappedHandleSubmit = (values) => {
    // Loại bỏ dấu . trong amount (nếu là string)
    if (typeof values.amount === "string") {
      values.amount = values.amount.replace(/\./g, "");
    }
    // Nếu là số thì không cần xử lý
    handleSubmit(values);
  };
  return (
    <Form form={form} layout="vertical" onFinish={wrappedHandleSubmit} disabled={isLoading}>
      <Form.Item
        label="Giao dịch"
        name="transId"
        rules={[{ required: true, message: "Vui lòng chọn giao dịch!" }]}
      >
        <Select
          size="large"
          disabled // Disable because transaction is pre-selected
          value={transactionId}
        >
          {transactionData && (
            <Option value={transactionId}>
              {`${transactionData.supplierName} — ${transactionData.docNo || transactionId}`}
            </Option>
          )}
        </Select>
      </Form.Item>
      {/* Hiển thị thông tin giao dịch */}
      {transactionData && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            borderRadius: 8,
            background: "#f6fbff",
            border: "1px solid #e6f7ff",
          }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12}>
              <Text type="secondary">Nhà cung cấp</Text>
              <br />
              <Tag color="gold" style={{ fontWeight: 600, marginTop: 4 }}>
                {transactionData.supplierName || "-"}
              </Tag>
            </Col>

            <Col xs={24} sm={12}>
              <Text type="secondary">Số chứng từ</Text>
              <br />
              <Tag color="purple" style={{ marginTop: 4 }}>
                {transactionData.docNo || "N/A"}
              </Tag>
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">Tổng số tiền</Text>
              <div style={{ fontWeight: 700, color: "#1677ff", marginTop: 4 }}>
                {fmtCurrency(transactionData.totalAmount)}
              </div>
            </Col>

            <Col xs={24} sm={12}>
              <Text type="secondary">Đã thanh toán</Text>
              <div style={{ fontWeight: 700, color: "#52c41a", marginTop: 4 }}>
                {fmtCurrency(transactionData.paidAmount)}
              </div>
            </Col>
          </Row>
        </div>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Số tiền thanh toán"
            name="amount"
            rules={[
              { required: true, message: "Vui lòng nhập số tiền!" },
              { pattern: /^\d+(\.\d+)?$/, message: "Số tiền không hợp lệ" },
            ]}
          >
            <InputNumber
              min={0}
              placeholder="0.00"
              size="large"
              style={{ width: "100%" }}
              formatter={(value) =>
                value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
              }
              parser={(value) => (value ? value.replace(/\./g, "") : "")}
              addonAfter="VNĐ"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label="Ngày thanh toán"
            name="paidAt"
            rules={[{ required: true, message: "Vui lòng chọn ngày thanh toán!" }]}
          >
            <DatePicker
              locale={viVN}
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn ngày thanh toán"
              size="large"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="Người thanh toán"
        name="paidBy"
        rules={[{ required: true, message: "Vui lòng chọn người thanh toán!" }]}
      >
        <Select
          showSearch
          placeholder="Tìm hoặc chọn người thanh toán"
          filterOption={false}
          onSearch={handleUserSearch}
          onPopupScroll={handleUserPopupScroll}
          notFoundContent={userLoading ? <Spin size="small" /> : null}
          options={userOptions}
          onFocus={() => {
            if (userOptions.length === 0 && typeof fetchUsers === "function") {
              fetchUsers("", false);
            }
          }}
          size="large"
          allowClear
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="Ảnh chứng từ" name="evdUrl">
            <div>
              <div className="large-upload">
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleChange}
                  onPreview={handlePreview}
                  onRemove={handleRemove}
                  beforeUpload={() => false}
                  customRequest={() => {}}
                  maxCount={1}
                  previewFile={async (file) => {
                    return await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onload = () => resolve(reader.result);
                      reader.onerror = (err) => reject(err);
                    });
                  }}
                >
                  {fileList.length >= 1 ? null : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  )}
                </Upload>
              </div>

              {previewImage && (
                <Image
                  wrapperStyle={{ display: "none" }}
                  preview={{
                    visible: previewOpen,
                    onVisibleChange: (visible) => setPreviewOpen(visible),
                    afterOpenChange: (visible) => !visible && setPreviewImage(""),
                  }}
                  src={previewImage}
                />
              )}
            </div>
          </Form.Item>
        </Col>

        <Col span={18}>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea
              placeholder="Nhập ghi chú về thanh toán (tùy chọn)"
              rows={3}
              size="large"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel} disabled={isLoading} size="large">
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" loading={isLoading} size="large">
            {isLoading ? "Đang tạo..." : "Tạo thanh toán"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default SupTransactionPaymentForm;
