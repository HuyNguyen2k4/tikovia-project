import React, { useEffect, useState } from "react";

import { DollarOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import "@src/assets/Scrollbar.css";
import {
  createCodRemittanceTicket,
  fetchAvailableDeliveryRuns,
  resetCreateStatus,
} from "@src/store/codRemittanceTicketsSlice";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Table,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
// import Title from "antd/es/skeleton/Title";
import { useDispatch, useSelector } from "react-redux";

const { Text, Title } = Typography;
const { TextArea } = Input;

const AddCodRemittanceTicketModal = ({ visible, onCancel, onSuccess }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const { availableDeliveryRuns, fetchAvailableRunsStatus, createStatus, createError } =
    useSelector((state) => state.codRemittanceTickets);

  // State
  const [selectedDeliveryRun, setSelectedDeliveryRun] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [filteredRuns, setFilteredRuns] = useState([]);
  const [receivedAmount, setReceivedAmount] = useState(0);

  // Load available delivery runs when modal opens
  useEffect(() => {
    if (visible) {
      dispatch(fetchAvailableDeliveryRuns({ limit: 100 }));
      form.resetFields();
      setSelectedDeliveryRun(null);
      setSearchText("");
      setReceivedAmount(0);
    }
  }, [visible, dispatch, form]);

  // Update filtered runs when data changes
  useEffect(() => {
    const runs = availableDeliveryRuns.data || [];
    if (searchText) {
      const filtered = runs.filter(
        (run) =>
          run.deliveryNo?.toLowerCase().includes(searchText.toLowerCase()) ||
          run.shipperName?.toLowerCase().includes(searchText.toLowerCase()) ||
          run.vehicleNo?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredRuns(filtered);
    } else {
      setFilteredRuns(runs);
    }
  }, [availableDeliveryRuns.data, searchText]);

  // Auto-fill form when delivery run is selected
  useEffect(() => {
    if (selectedDeliveryRun) {
      // ✅ Auto-fill với expectedAmount (số tiền shipper thu được)
      const expectedAmount = selectedDeliveryRun.expectedAmount || 0;
      form.setFieldsValue({
        deliveryRunId: selectedDeliveryRun.id,
        receivedAmount: expectedAmount,
      });
      setReceivedAmount(expectedAmount);
    }
  }, [selectedDeliveryRun, form]);

  // Handle success
  useEffect(() => {
    if (createStatus === "succeeded") {
      notification.success({ message: "Tạo phiếu thu COD thành công" });
      dispatch(resetCreateStatus());
      onSuccess();
    }
  }, [createStatus, dispatch, onSuccess]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // Calculate status based on amounts
  const calculateStatus = (receivedAmount, expectedAmount) => {
    if (!receivedAmount || !expectedAmount) return "unbalanced";
    return receivedAmount === expectedAmount ? "balanced" : "unbalanced";
  };

  // Calculate difference
  const calculateDifference = () => {
    const expected = selectedDeliveryRun?.expectedAmount || 0;
    return receivedAmount - expected;
  };

  // Table columns for delivery runs selection
  const columns = [
    {
      title: "Chọn",
      key: "select",
      width: 80,
      fixed: "left",
      render: (_, record) => (
        <Button
          type={selectedDeliveryRun?.id === record.id ? "primary" : "default"}
          size="small"
          onClick={() => setSelectedDeliveryRun(record)}
        >
          {selectedDeliveryRun?.id === record.id ? "✓" : "Chọn"}
        </Button>
      ),
    },
    {
      title: "Mã chuyến",
      dataIndex: "deliveryNo",
      key: "deliveryNo",
      width: 150,
      render: (text) => (
        <Tooltip title={text}>
          <Text
            strong
            style={{
              color: "#1890ff",
              maxWidth: 150,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "inline-block",
              verticalAlign: "middle",
            }}
          >
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Shipper",
      dataIndex: "shipperName",
      key: "shipperName",
      width: 80,
    },
    {
      title: "Số đơn",
      dataIndex: "orderCount",
      key: "orderCount",
      width: 80,
      render: (count) => <Tag color="blue">{count || 0} đơn</Tag>,
    },
    {
      title: "Tổng COD",
      dataIndex: "totalCodAmount",
      key: "totalCodAmount",
      width: 125,
      render: (amount) => (
        <Text strong style={{ color: "#666", fontSize: "12px" }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: "Shipper thu được",
      dataIndex: "expectedAmount",
      key: "expectedAmount",
      width: 140,
      render: (amount) => (
        <Text strong style={{ color: "#52c41a" }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: "Hoàn thành",
      dataIndex: "completedAt",
      key: "completedAt",
      width: 90,
      render: (date) => new Date(date).toLocaleDateString("vi-VN"),
    },
  ];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Auto calculate status
      const status = calculateStatus(values.receivedAmount, selectedDeliveryRun?.expectedAmount);

      const ticketData = {
        ...values,
        status,
      };

      dispatch(createCodRemittanceTicket(ticketData));
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const handleSearch = () => {
    // Search is handled by useEffect above
  };

  const handleReset = () => {
    setSearchText("");
    dispatch(fetchAvailableDeliveryRuns({ limit: 100 }));
  };

  const handleReceivedAmountChange = (value) => {
    setReceivedAmount(value || 0);
  };

  return (
    <Modal
      // title="Tạo phiếu thu tiền COD"
      title={
        <Title level={4} style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <DollarOutlined style={{ color: "#1890ff" }} />
          Tạo phiếu thu tiền COD
        </Title>
      }
      open={visible}
      onCancel={onCancel}
      width={1400}
      centered
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={createStatus === "loading"}
          onClick={handleSubmit}
          disabled={!selectedDeliveryRun}
        >
          Tạo phiếu thu
        </Button>,
      ]}
      destroyOnHidden={true}
    >
      <Divider style={{ marginTop: 10 }} />
      <Row gutter={[24, 24]}>
        {/* Left: Delivery Run Selection */}
        <Col xs={24} lg={14}>
          <Card
            title="Chọn chuyến giao hàng"
            size="small"
            style={{ maxHeight: "500px", overflow: "hidden" }}
          >
            {/* Search */}
            <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
              <Col flex={1}>
                <Input
                  placeholder="Tìm theo mã chuyến, shipper..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </Col>
              <Col>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Làm mới
                </Button>
              </Col>
            </Row>

            {/* Table */}
            <div className="custom-table-scroll">
              <Table
                columns={columns}
                dataSource={filteredRuns}
                rowKey="id"
                size="small"
                loading={fetchAvailableRunsStatus === "loading"}
                pagination={false}
                scroll={{ x: 700 }}
                rowClassName={(record) =>
                  selectedDeliveryRun?.id === record.id ? "ant-table-row-selected" : ""
                }
              />
            </div>

            {filteredRuns.length === 0 && fetchAvailableRunsStatus !== "loading" && (
              <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                Không có chuyến giao hàng khả dụng
              </div>
            )}
          </Card>
        </Col>

        {/* Right: Form */}
        <Col xs={24} lg={10}>
          <Card title="Thông tin phiếu thu" size="small">
            {/* Selected Delivery Run Info */}
            {selectedDeliveryRun && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
                  borderRadius: 8,
                  border: "1px solid #91d5ff",
                }}
              >
                <Text strong style={{ color: "#1890ff", fontSize: "15px" }}>
                  📦 Chuyến đã chọn
                </Text>
                <div style={{ marginTop: 8, lineHeight: "1.8" }}>
                  <div>
                    <Text type="secondary">Mã chuyến:</Text>{" "}
                    <Text strong>{selectedDeliveryRun.deliveryNo}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Shipper:</Text>{" "}
                    <Text strong>{selectedDeliveryRun.shipperName}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Số đơn:</Text>{" "}
                    <Tag color="blue">{selectedDeliveryRun.orderCount || 0} đơn</Tag>
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #91d5ff" }}>
                    <div>
                      <Text type="secondary">Tổng COD:</Text>{" "}
                      <Text style={{ color: "#666" }}>
                        {formatCurrency(selectedDeliveryRun.totalCodAmount)}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Shipper thu được:</Text>{" "}
                      <Text strong style={{ color: "#52c41a" }}>
                        {formatCurrency(selectedDeliveryRun.expectedAmount)}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Form form={form} layout="vertical" disabled={!selectedDeliveryRun}>
              {/* Hidden field chứa ID để submit */}
              <Form.Item name="deliveryRunId" hidden>
                <Input />
              </Form.Item>

              {/* Field hiển thị deliveryNo */}
              <Form.Item
                label="Chuyến giao hàng"
                rules={[{ required: true, message: "Vui lòng chọn chuyến giao hàng" }]}
              >
                <Input
                  placeholder="Chọn chuyến giao hàng từ bảng bên trái"
                  disabled
                  value={selectedDeliveryRun?.deliveryNo || ""}
                />
              </Form.Item>

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

              {/* Show difference calculation */}
              {selectedDeliveryRun && (
                <Form.Item label="📊 Thông tin đối soát">
                  <div
                    style={{
                      background: "#fafafa",
                      padding: 16,
                      borderRadius: 8,
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text type="secondary">Tổng COD đơn hàng:</Text>
                      <Text style={{ color: "#666" }}>
                        {formatCurrency(selectedDeliveryRun.totalCodAmount)}
                      </Text>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 12,
                        paddingBottom: 12,
                        borderBottom: "1px solid #e8e8e8",
                      }}
                    >
                      <Text strong>Shipper thu được (cần đối soát):</Text>
                      <Text strong style={{ color: "#52c41a", fontSize: "16px" }}>
                        {formatCurrency(selectedDeliveryRun.expectedAmount)}
                      </Text>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <Text strong>Shipper trả về:</Text>
                      <Text strong style={{ color: "#1890ff", fontSize: "16px" }}>
                        {formatCurrency(receivedAmount)}
                      </Text>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 12,
                        borderTop: "2px solid #d9d9d9",
                      }}
                    >
                      <Text strong style={{ fontSize: "15px" }}>
                        Chênh lệch:
                      </Text>
                      <div style={{ textAlign: "right" }}>
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
                            calculateStatus(receivedAmount, selectedDeliveryRun.expectedAmount) ===
                            "balanced"
                              ? "success"
                              : "warning"
                          }
                          style={{ marginTop: 4 }}
                        >
                          {calculateStatus(receivedAmount, selectedDeliveryRun.expectedAmount) ===
                          "balanced"
                            ? "✓ Cân bằng"
                            : "⚠ Chênh lệch"}
                        </Tag>
                      </div>
                    </div>

                    {calculateDifference() !== 0 && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 8,
                          background: calculateDifference() > 0 ? "#e6f7ff" : "#fff2e8",
                          borderRadius: 4,
                          fontSize: "12px",
                          color: "#666",
                        }}
                      >
                        {calculateDifference() > 0
                          ? "💰 Shipper trả thừa - Cần hoàn lại cho shipper"
                          : "⚠️ Shipper trả thiếu - Cần thu thêm từ shipper"}
                      </div>
                    )}
                  </div>
                </Form.Item>
              )}

              <Form.Item name="note" label="Ghi chú">
                <TextArea
                  rows={4}
                  placeholder="Nhập ghi chú về phiếu thu (tùy chọn)..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>

            {createError && (
              <div
                style={{
                  color: "#ff4d4f",
                  marginTop: 8,
                  padding: 8,
                  background: "#fff2f0",
                  borderRadius: 4,
                }}
              >
                Lỗi: {createError}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Modal>
  );
};

export default AddCodRemittanceTicketModal;
