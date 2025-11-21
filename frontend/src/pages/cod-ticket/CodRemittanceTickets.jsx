import React, { useEffect, useState } from "react";

import {
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  deleteCodRemittanceTicket,
  fetchCodRemittanceTickets,
  resetDeleteStatus,
} from "@src/store/codRemittanceTicketsSlice";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

import AddCodRemittanceTicketModal from "./AddCodRemittanceTicketModal";
import CodRemittanceTicketDetailModal from "./CodRemittanceTicketDetailModal";
import UpdateCodRemittanceTicketModal from "./UpdateCodRemittanceTicketModal";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const CodRemittanceTickets = () => {
  const dispatch = useDispatch();
  const { tickets, fetchStatus, deleteStatus } = useSelector((state) => state.codRemittanceTickets);
  const userRole = useSelector((state) => state.auth.user?.role);

  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    shipperId: "",
    dateRange: null,
    limit: 20,
    offset: 0,
  });

  // Permissions
  const canCreate = ["admin", "accountant", "sup_shipper"].includes(userRole);
  const canUpdate = ["admin", "accountant"].includes(userRole);
  const canDelete = userRole === "admin";

  // Load data
  useEffect(() => {
    handleLoadData();
  }, [filters.limit, filters.offset]);

  useEffect(() => {
    if (deleteStatus === "succeeded") {
      notification.success({ message: "Xóa ticket thành công" });
      dispatch(resetDeleteStatus());
      handleLoadData();
    }
  }, [deleteStatus]);

  const handleLoadData = () => {
    const params = {
      q: filters.q || undefined,
      status: filters.status || undefined,
      shipperId: filters.shipperId || undefined,
      fromDate: filters.dateRange?.[0]?.format("YYYY-MM-DD") || undefined,
      toDate: filters.dateRange?.[1]?.format("YYYY-MM-DD") || undefined,
      limit: filters.limit,
      offset: filters.offset,
    };
    dispatch(fetchCodRemittanceTickets(params));
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, offset: 0 }));
    setTimeout(handleLoadData, 100);
  };

  const handleReset = () => {
    setFilters({
      q: "",
      status: "",
      shipperId: "",
      dateRange: null,
      limit: 20,
      offset: 0,
    });
    setTimeout(handleLoadData, 100);
  };

  const handleTableChange = (pagination) => {
    setFilters((prev) => ({
      ...prev,
      offset: (pagination.current - 1) * pagination.pageSize,
      limit: pagination.pageSize,
    }));
  };

  // Modal handlers
  const handleOpenAddModal = () => setAddModalVisible(true);
  const handleCloseAddModal = () => setAddModalVisible(false);

  const handleOpenUpdateModal = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateModalVisible(true);
  };
  const handleCloseUpdateModal = () => {
    setSelectedTicket(null);
    setUpdateModalVisible(false);
  };

  const handleOpenDetailModal = (ticket) => {
    setSelectedTicketId(ticket.id);
    setDetailModalVisible(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedTicketId(null);
    setDetailModalVisible(false);
  };

  // const handleDelete = (ticketId) => {
  //   dispatch(deleteCodRemittanceTicket(ticketId));
  // };
  const handleDelete = (ticketId) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa ticket này?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        dispatch(deleteCodRemittanceTicket(ticketId));
      },
    });
  };

  const handleSuccess = () => {
    handleLoadData();
    handleCloseAddModal();
    handleCloseUpdateModal();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // Status mapping
  const statusConfig = {
    balanced: { label: "Cân bằng", color: "success" },
    unbalanced: { label: "Chênh lệch", color: "warning" },
  };

  // Table columns
  const columns = [
    {
      title: "Mã Ticket",
      dataIndex: "ticketNo",
      key: "ticketNo",
      width: 150,
      render: (text) => <span style={{ fontWeight: 600, color: "#1890ff" }}>{text}</span>,
    },
    {
      title: "Chuyến giao",
      key: "deliveryInfo",
      width: 170,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.deliveryNo || "-"}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>{record.shipperName || "-"}</div>
        </div>
      ),
    },
    {
      title: "Tổng COD",
      key: "totalCodAmount",
      width: 140,
      render: (_, record) => {
        const total = record.orders?.reduce((sum, order) => sum + (order.codAmount || 0), 0) || 0;
        return <span style={{ color: "#666" }}>{formatCurrency(total)}</span>;
      },
    },
    {
      title: "Shipper thu được",
      dataIndex: "expectedAmount",
      key: "expectedAmount",
      width: 150,
      render: (amount) => (
        <span style={{ fontWeight: 600, color: "#52c41a" }}>{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "Shipper trả về",
      dataIndex: "receivedAmount",
      key: "receivedAmount",
      width: 150,
      render: (amount) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "Chênh lệch",
      key: "difference",
      width: 140,
      render: (_, record) => {
        const diff = (record.receivedAmount || 0) - (record.expectedAmount || 0);
        const color = diff === 0 ? "#52c41a" : diff > 0 ? "#1890ff" : "#ff4d4f";
        return (
          <span style={{ fontWeight: 600, color }}>
            {diff > 0 ? "+" : ""}
            {formatCurrency(Math.abs(diff))}
          </span>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const config = statusConfig[status] || { label: status, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "Người tạo",
      dataIndex: "creatorName",
      key: "creatorName",
      width: 120,
      render: (name) => name || "-",
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 110,
      render: (date) => new Date(date).toLocaleDateString("vi-VN"),
    },
    // {
    //   title: "Người cập nhật",
    //   dataIndex: "updaterName",
    //   key: "updaterName",
    //   width: 150,
    //   render: (name) => name || "-",
    // },
    // {
    //   title: "Ngày cập nhật",
    //   dataIndex: "updatedAt",
    //   key: "updatedAt",
    //   width: 120,
    //   render: (date) => {
    //     return date ? new Date(date).toLocaleDateString("vi-VN") : "-";
    //   },
    // },
    {
      title: "Thao tác",
      key: "actions",
      width: 90,
      fixed: "right",
      render: (_, record) => (
        <Space>
          {canUpdate && (
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenUpdateModal(record);
                }}
              />
            </Tooltip>
          )}
          {/* {canDelete && (
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc muốn xóa ticket này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              
            >
              <Tooltip title="Xóa">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteStatus === "loading"}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Popconfirm>
          )} */}
          {canDelete && (
            <Tooltip title="Xóa">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deleteStatus === "loading"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(record.id);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <DollarOutlined style={{ color: "#1890ff" }} />
          Quản lý phiếu thu tiền COD
        </Title>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: "24px" }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="Tìm kiếm mã ticket, mã chuyến..."
              prefix={<SearchOutlined />}
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Trạng thái"
              // value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              style={{ width: "100%" }}
              allowClear
            >
              <Select.Option value="balanced">Cân bằng</Select.Option>
              <Select.Option value="unbalanced">Chênh lệch</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <RangePicker
              placeholder={["Từ ngày", "Đến ngày"]}
              value={filters.dateRange}
              onChange={(dates) => setFilters((prev) => ({ ...prev, dateRange: dates }))}
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                Tìm kiếm
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Action Bar */}
      <Card style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 500 }}>
              Tổng: <strong style={{ color: "#1890ff" }}>{tickets.pagination?.total || 0}</strong>{" "}
              ticket
            </span>
          </div>
          <div>
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                Tạo phiếu thu
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={tickets.data || []}
          rowKey="id"
          loading={fetchStatus === "loading"}
          pagination={{
            current: Math.floor(filters.offset / filters.limit) + 1,
            pageSize: filters.limit,
            total: tickets.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} ticket`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onRow={(record) => ({
            onClick: () => handleOpenDetailModal(record),
            style: { cursor: "pointer" },
          })}
          onChange={handleTableChange}
          scroll={{ x: 1300 }}
        />
      </Card>

      {/* Modals */}
      <AddCodRemittanceTicketModal
        visible={addModalVisible}
        onCancel={handleCloseAddModal}
        onSuccess={handleSuccess}
      />

      <UpdateCodRemittanceTicketModal
        visible={updateModalVisible}
        onCancel={handleCloseUpdateModal}
        ticket={selectedTicket}
        onSuccess={handleSuccess}
      />

      <CodRemittanceTicketDetailModal
        visible={detailModalVisible}
        onCancel={handleCloseDetailModal}
        ticketId={selectedTicketId}
      />
    </div>
  );
};

export default CodRemittanceTickets;
