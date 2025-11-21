// src/pages/CustomerList/CustomerDetailModal.jsx
import React, { useEffect, useState } from "react";

import {
  BankOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  IdcardOutlined,
  MailOutlined,
  NumberOutlined,
  PhoneOutlined,
  QrcodeOutlined,
  SolutionOutlined,
  UserOutlined,
} from "@ant-design/icons";
// Import CSS gốc
import "@assets/customer/CustomerDetailModal.css";
// 1. Import CSS của UserManage để lấy grid style
import "@assets/user/UserManage.css";
// 2. Import LiquidGlassPanel
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import {
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  InputNumber,
  Modal,
  Row,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";

import PaymentPage from "../PaymentPage";

// Giả định bạn có service để gọi API lịch sử giao dịch
// import { getTransactionHistory } from "@src/services/transactionService";

const { Title, Text, Link } = Typography;

// --- Helper Functions ---
const formatCurrency = (value) => {
  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) {
    return (0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  }
  return numericValue.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};
// ------------------------

const CustomerDetailModal = ({ visible, onCancel, customer }) => {
  const [activeTabKey, setActiveTabKey] = useState("1");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [amount, setAmount] = useState(0);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [isQRWithoutAmountModalVisible, setIsQRWithoutAmountModalVisible] = useState(false);
  // Hàm này sẽ được gọi khi người dùng nhấp vào tab "Lịch sử giao dịch"
  const fetchHistory = async (customerId) => {
    if (!customerId) return;
    setHistoryLoading(true);
    try {
      // --- ĐÂY LÀ NƠI GỌI API THẬT ---
      // const response = await getTransactionHistory({ customerId: customerId, limit: 10 });
      // setHistoryData(response.data.items);

      // Giả lập API call
      console.log("Đang giả lập fetch lịch sử cho customer:", customerId);
      setTimeout(() => {
        setHistoryData([]); // Để trống để hiển thị Empty
        setHistoryLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Lỗi khi fetch lịch sử giao dịch:", error);
      setHistoryLoading(false);
      setHistoryData([]);
    }
  };

  // Reset tab và fetch dữ liệu khi modal mở hoặc customer thay đổi
  useEffect(() => {
    if (visible && customer) {
      // Reset về tab 1
      setActiveTabKey("1");
      setHistoryData([]);
      setHistoryLoading(false);
    }
  }, [visible, customer]);

  // Xử lý khi chuyển tab
  const handleTabChange = (key) => {
    setActiveTabKey(key);
    if (key === "2" && historyData.length === 0) {
      // Chỉ fetch khi chuyển sang tab 2 và chưa có dữ liệu
      fetchHistory(customer?.id);
    }
  };

  // Render cột cho bảng lịch sử (Tab 2)
  const historyColumns = [
    { title: "Mã HĐ", dataIndex: "id", key: "id", render: (text) => <Link>{text}</Link> },
    { title: "Ngày tạo", dataIndex: "date", key: "date", render: formatDateTime },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      render: formatCurrency,
      align: "right",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => <Tag color={status === "completed" ? "green" : "orange"}>{status}</Tag>,
    },
  ];

  return (
    <Modal
      title={
        <div className="customerDetail-modalTitle">
          <Avatar size={32} icon={<UserOutlined />} className="customerDetail-modalAvatar" />
          <span className="customerDetail-modalCode">{customer?.code}</span>
          <span className="customerDetail-modalName">{customer?.name}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      style={{ top: 20 }}
      destroyOnHidden={true}
      className="custom-modal"
    >
      {customer && (
        <div className="customerDetail-container">
          {/* Thông tin tổng quan */}
          <div className="customerDetail-summaryContainer">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <PhoneOutlined /> <Text strong>Điện thoại: </Text>
                <Text>{customer.phone || "N/A"}</Text>
              </Col>
              <Col xs={24} sm={12} md={10}>
                <MailOutlined /> <Text strong>Email: </Text>
                <Text>{customer.email || "N/A"}</Text>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <SolutionOutlined /> <Text strong>Người quản lý: </Text>
                <Text>{customer.managedByName || "N/A"}</Text>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
              <Col xs={24} sm={8}>
                {/* SỬA LỖI: Thay bordered={false} bằng variant="borderless" */}
                <Card hoverable className="customerDetail-statCard">
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span className="customerDetail-cartTitle">Dư nợ cần thu</span>
                    {(() => {
                      const value = parseFloat(customer.outstandingBalance) || 0;
                      let style = {
                        color: "#8C8C8C",
                        fontSize: 22,
                        fontWeight: 600,
                        marginTop: 4,
                      };
                      if (value > 0) {
                        style = { ...style, color: "#FA8C16" };
                      }
                      return <span style={style}>{formatCurrency(value)}</span>;
                    })()}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                {/* SỬA LỖI: Thay bordered={false} bằng variant="borderless" */}
                <Card
                  variant="borderless"
                  className="customerDetail-statCard customerDetail-statCard-total"
                  hoverable
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span className="customerDetail-cartTitle">Tổng mua</span>
                    {(() => {
                      const value = parseFloat(customer.totalSalesAmount) || 0;
                      let style = {
                        color: "#8C8C8C",
                        fontSize: 22,
                        fontWeight: 600,
                        marginTop: 4,
                      };
                      if (value > 0) {
                        style = { ...style };
                      }
                      return <span style={style}>{formatCurrency(value)}</span>;
                    })()}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                {/* SỬA LỖI: Thay bordered={false} bằng variant="borderless" */}
                <Card
                  variant="borderless"
                  className="customerDetail-statCard customerDetail-statCard-net"
                  hoverable
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span className="customerDetail-cartTitle">Doanh số thuần</span>
                    {(() => {
                      const value = parseFloat(customer.netSalesAmount) || 0;
                      let style = {
                        color: "#8C8C8C",
                        fontSize: 22,
                        fontWeight: 600,
                        marginTop: 4,
                      };
                      if (value > 0) {
                        style = { ...style, color: "#389E0D" };
                      }
                      return <span style={style}>{formatCurrency(value)}</span>;
                    })()}
                  </div>
                </Card>
              </Col>
            </Row>
          </div>

          {/* Tabs */}
          <Tabs
            activeKey={activeTabKey}
            onChange={handleTabChange}
            // style={{ backgroundColor: "#20bed3ff" }}
            items={[
              {
                key: "1",
                label: "Thông tin chi tiết",
                children: (
                  <>
                    <div
                      className="flex items-center gap-4"
                      style={{
                        padding: "16px",
                        background: "#fff",
                        borderRadius: 8,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    >
                      {/* Form nhập tiền */}
                      <Form layout="inline" onFinish={() => setIsQRModalVisible(true)}>
                        <Form.Item
                          name="amount"
                          rules={[{ required: true, message: "Vui lòng nhập số tiền!" }]}
                        >
                          <InputNumber
                            placeholder="Nhập số tiền..."
                            min={0}
                            style={{ width: 250 }}
                            addonAfter="VNĐ"
                            formatter={(value) =>
                              value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                            }
                            parser={(value) => (value ? value.replace(/\./g, "") : "")}
                            onChange={(val) => setAmount(val)}
                          />
                        </Form.Item>

                        <Form.Item>
                          <Button type="primary" htmlType="submit" icon={<QrcodeOutlined />}>
                            Tạo QR với số tiền
                          </Button>
                        </Form.Item>
                      </Form>

                      {/* Divider dọc đẹp hơn */}
                      <Divider
                        type="vertical"
                        style={{
                          height: 40,
                          borderColor: "#d9d9d9",
                        }}
                      />

                      {/* Nút tạo QR mặc định */}
                      <Button
                        type="default"
                        icon={<QrcodeOutlined />}
                        onClick={() => setIsQRWithoutAmountModalVisible(true)}
                      >
                        Tạo QR mặc định
                      </Button>
                    </div>

                    {/*  */}
                    <Modal
                      width={700}
                      open={isQRModalVisible}
                      footer={null}
                      centered
                      onCancel={() => setIsQRModalVisible(false)}
                    >
                      <PaymentPage amount={amount} code={customer.code} />
                    </Modal>
                    {/*  */}
                    <Modal
                      width={700}
                      open={isQRWithoutAmountModalVisible}
                      footer={null}
                      centered
                      onCancel={() => setIsQRWithoutAmountModalVisible(false)}
                    >
                      <PaymentPage code={customer.code} />
                    </Modal>
                    <div className="customerDetail-tabContent">
                      <div className="userManage-detailGrid">
                        <LiquidGlassPanel>
                          <Text strong>
                            <IdcardOutlined /> ID Khách hàng:
                          </Text>
                          <br />
                          <Text copyable>{customer.id}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <NumberOutlined /> Mã khách hàng:
                          </Text>
                          <br />
                          <Tag color="cyan">{customer.code}</Tag>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <UserOutlined /> Tên khách hàng:
                          </Text>
                          <br />
                          <Text>{customer.name}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <PhoneOutlined /> Số điện thoại:
                          </Text>
                          <br />
                          <Text>{customer.phone}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <MailOutlined /> Email:
                          </Text>
                          <br />
                          <Text>{customer.email || "N/A"}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <BankOutlined /> Mã số thuế:
                          </Text>
                          <br />
                          <Text>{customer.taxCode || "N/A"}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel className="userManage-detailGrid-spanFull">
                          <Text strong>
                            <EnvironmentOutlined /> Địa chỉ:
                          </Text>
                          <br />
                          <Text>{customer.address || "N/A"}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <DollarCircleOutlined /> Hạn mức tín dụng:
                          </Text>
                          <br />
                          <Text>{formatCurrency(customer.creditLimit)}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <SolutionOutlined /> Người quản lý:
                          </Text>
                          <br />
                          <Text>{customer.managedByName || "N/A"}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <FileTextOutlined /> Ghi chú:
                          </Text>
                          <br />
                          <Text>{customer.note || "N/A"}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <CalendarOutlined /> Ngày tạo:
                          </Text>
                          <br />
                          <Text>{formatDateTime(customer.createdAt)}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>
                            <CalendarOutlined /> Cập nhật lần cuối:
                          </Text>
                          <br />
                          <Text>{formatDateTime(customer.updatedAt)}</Text>
                        </LiquidGlassPanel>
                      </div>
                    </div>
                  </>
                ),
              },
              {
                key: "2",
                label: "Lịch sử giao dịch",
                children: (
                  <div className="customerDetail-tabContent">
                    <Spin spinning={historyLoading} tip="Đang tải lịch sử...">
                      <Table
                        columns={historyColumns}
                        dataSource={historyData}
                        rowKey="id"
                        pagination={{ pageSize: 5, size: "small" }}
                        locale={{
                          emptyText: (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="Không tìm thấy lịch sử giao dịch"
                            />
                          ),
                        }}
                      />
                    </Spin>
                  </div>
                ),
              },
              {
                key: "3",
                label: "Công nợ",
                children: (
                  <div className="customerDetail-tabContent customerDetail-debtTab">
                    <Title level={5} type="secondary">
                      Tổng số tiền còn phải thu từ khách
                    </Title>
                    <Title level={1} className="customerDetail-debtAmount">
                      {formatCurrency(customer.outstandingBalance)}
                    </Title>
                    {/* {parseFloat(customer.outstandingBalance) > 0 && (
                      <Button type="primary" size="large" icon={<DollarCircleOutlined />}>
                        Tạo phiếu thu tiền
                      </Button>
                    )} */}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
};

export default CustomerDetailModal;
