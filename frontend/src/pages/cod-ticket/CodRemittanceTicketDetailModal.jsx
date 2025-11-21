import React, { useEffect } from "react";

import {
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  TruckOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  clearCurrentTicket,
  fetchCodRemittanceTicketDetails,
} from "@src/store/codRemittanceTicketsSlice";
import {
  Alert,
  Col,
  Descriptions,
  Divider,
  Grid,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

const { useBreakpoint } = Grid;

const { Text } = Typography;

const CodRemittanceTicketDetailModal = ({ visible, onCancel, ticketId }) => {
  const dispatch = useDispatch();
  const { currentTicket, fetchTicketDetailsStatus, fetchTicketDetailsError } = useSelector(
    (state) => state.codRemittanceTickets
  );
  const screens = useBreakpoint(); // Lấy thông tin breakpoint hiện tại

  const isMobile = !screens.md;
  // ✅ Fetch ticket details khi modal mở
  useEffect(() => {
    if (visible && ticketId) {
      dispatch(fetchCodRemittanceTicketDetails(ticketId));
    }
  }, [visible, ticketId, dispatch]);

  // ✅ Clear ticket khi modal đóng
  useEffect(() => {
    if (!visible) {
      dispatch(clearCurrentTicket());
    }
  }, [visible, dispatch]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("vi-VN");
  };

  // Status config
  const statusConfig = {
    balanced: { label: "Cân bằng", color: "success" },
    unbalanced: { label: "Chênh lệch", color: "warning" },
  };

  // Loading state
  if (fetchTicketDetailsStatus === "loading") {
    return (
      <Modal
        title="Chi tiết phiếu thu COD"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={1000}
      >
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" tip="Đang tải chi tiết phiếu thu..." />
        </div>
      </Modal>
    );
  }

  // Error state
  if (fetchTicketDetailsStatus === "failed") {
    return (
      <Modal
        title="Chi tiết phiếu thu COD"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={1000}
      >
        <Alert
          message="Lỗi"
          description={fetchTicketDetailsError || "Không thể tải chi tiết phiếu thu"}
          type="error"
          showIcon
        />
      </Modal>
    );
  }

  // No data
  if (!currentTicket) {
    return null;
  }

  const ticket = currentTicket;
  const difference = (ticket.receivedAmount || 0) - (ticket.expectedAmount || 0);

  // Orders table columns
  const orderColumns = [
    {
      title: "STT",
      dataIndex: "routeSeq",
      key: "routeSeq",
      width: 60,
      render: (seq) => <Tag color="blue">{seq}</Tag>,
    },
    {
      title: "Mã đơn",
      dataIndex: "orderNo",
      key: "orderNo",
      width: 150,
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) => (
        <div>
          <div>{record.customer?.name || "-"}</div>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.customer?.code || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "COD",
      dataIndex: "codAmount",
      key: "codAmount",
      width: 120,
      render: (amount) => <Text style={{ color: "#666" }}>{formatCurrency(amount)}</Text>,
    },
    {
      title: "Thực thu",
      dataIndex: "actualPay",
      key: "actualPay",
      width: 120,
      render: (amount) => (
        <Text strong style={{ color: "#52c41a" }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => {
        const statusMap = {
          assigned: { label: "Đã phân công", color: "blue" },
          in_progress: { label: "Đang giao", color: "orange" },
          completed: { label: "Đã giao", color: "green" },
        };
        const config = statusMap[status] || { label: status, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined style={{ color: "#1890ff" }} />
          <span>Chi tiết phiếu thu COD - {ticket.ticketNo}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      centered
      style={{ top: 20 }}
    >
      {/* Header Summary */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f7fa 100%)",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "24px",
          border: "1px solid #d1ecf1",
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6} lg={6}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Tổng COD
              </div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#666" }}>
                {formatCurrency(ticket.statistics?.totalCodAmount || 0)}
              </div>
            </div>
          </Col>

          <Col xs={12} sm={8} md={6} lg={6}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Shipper thu được
              </div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#52c41a" }}>
                {formatCurrency(ticket.expectedAmount)}
              </div>
            </div>
          </Col>

          <Col xs={12} sm={8} md={6} lg={6}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Shipper trả về
              </div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1890ff" }}>
                {formatCurrency(ticket.receivedAmount)}
              </div>
            </div>
          </Col>

          <Col xs={12} sm={8} md={6} lg={6}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Chênh lệch
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: difference === 0 ? "#52c41a" : difference > 0 ? "#1890ff" : "#ff4d4f",
                }}
              >
                {difference > 0 ? "+" : ""}
                {formatCurrency(difference)}
              </div>
            </div>
          </Col>

          <Col xs={12} sm={8} md={6} lg={6}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Trạng thái
              </div>
              <div style={{ marginTop: "4px" }}>
                <Tag
                  color={statusConfig[ticket.status]?.color || "default"}
                  style={{ fontSize: "14px", padding: "4px 12px" }}
                >
                  {statusConfig[ticket.status]?.label || ticket.status}
                </Tag>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <Divider orientation="left">
        <Space>
          <FileTextOutlined />
          <span>Thông tin phiếu thu</span>
        </Space>
      </Divider>

      <Descriptions bordered size="small" column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}>
        <Descriptions.Item label="Mã phiếu thu" span={2}>
          <Text strong style={{ color: "#1890ff" }}>
            {ticket.ticketNo}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="Tổng COD đơn hàng">
          <Text style={{ color: "#666" }}>
            {formatCurrency(ticket.statistics?.totalCodAmount || 0)}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="Shipper thu được">
          <Text strong style={{ color: "#52c41a" }}>
            {formatCurrency(ticket.expectedAmount)}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="Shipper trả về">
          <Text strong style={{ color: "#1890ff" }}>
            {formatCurrency(ticket.receivedAmount)}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="Chênh lệch">
          <Text
            strong
            style={{
              color: difference === 0 ? "#52c41a" : difference > 0 ? "#1890ff" : "#ff4d4f",
            }}
          >
            {difference > 0 ? "+" : ""}
            {formatCurrency(difference)}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="Trạng thái" span={2}>
          <Space direction={isMobile ? "vertical" : "horizontal"} size={4}>
            <Tag color={statusConfig[ticket.status]?.color || "default"}>
              {statusConfig[ticket.status]?.label || ticket.status}
            </Tag>
            {difference !== 0 && (
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {difference > 0
                  ? "(Shipper trả thừa - Cần hoàn lại)"
                  : "(Shipper trả thiếu - Cần thu thêm)"}
              </Text>
            )}
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="Ghi chú" span={2}>
          {ticket.note || <Text type="secondary">Không có ghi chú</Text>}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">
        <Space>
          <TruckOutlined />
          <span>Thông tin chuyến giao hàng</span>
        </Space>
      </Divider>

      <Descriptions bordered column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }} size="small">
        <Descriptions.Item label="Mã chuyến">
          <Text strong style={{ color: "#1890ff" }}>
            {ticket.deliveryRun?.deliveryNo || "-"}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item label="Shipper">
          <Space>
            <UserOutlined style={{ color: "#fa8c16" }} />
            {ticket.shipper?.name || "-"}
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="Biển số xe">
          {ticket.deliveryRun?.vehicleNo || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Người giám sát">
          {ticket.deliveryRun?.supervisorName || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Bắt đầu">
          <Space>
            <CalendarOutlined />
            {formatDate(ticket.deliveryRun?.startedAt)}
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="Hoàn thành">
          <Space>
            <CalendarOutlined />
            {formatDate(ticket.deliveryRun?.completedAt)}
          </Space>
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">
        <Space>
          <ShoppingOutlined />
          <span>Danh sách đơn hàng ({ticket.orders?.length || 0} đơn)</span>
        </Space>
      </Divider>
      <div style={{ maxHeight: 500, overflowY: "auto" }}>
        <Table
          columns={orderColumns}
          dataSource={ticket.orders || []}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 700 }}
          summary={(data) => {
            const totalCod = data.reduce((sum, item) => sum + (item.codAmount || 0), 0);
            const totalActual = data.reduce((sum, item) => sum + (item.actualPay || 0), 0);

            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: "#fafafa", fontWeight: "bold" }}>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Tổng cộng</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <Text strong style={{ color: "#666" }}>
                      {formatCurrency(totalCod)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <Text strong style={{ color: "#52c41a" }}>
                      {formatCurrency(totalActual)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </div>

      <Divider orientation="left">
        <Space>
          <UserOutlined />
          <span>Thông tin tạo/cập nhật</span>
        </Space>
      </Divider>

      <Descriptions bordered column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }} size="small">
        <Descriptions.Item label="Người tạo">
          <Space>
            <UserOutlined style={{ color: "#1890ff" }} />
            {ticket.creator?.name || "-"}
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="Ngày tạo">
          <Space>
            <CalendarOutlined />
            {formatDate(ticket.createdAt)}
          </Space>
        </Descriptions.Item>

        {/* ✅ Thêm thông tin cập nhật */}
        <Descriptions.Item label="Người cập nhật">
          <Space>
            <UserOutlined style={{ color: "#52c41a" }} />
            {ticket.updater?.name || "-"}
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="Ngày cập nhật">
          <Space>
            <CalendarOutlined />
            {ticket.updatedAt ? formatDate(ticket.updatedAt) : "-"}
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default CodRemittanceTicketDetailModal;
