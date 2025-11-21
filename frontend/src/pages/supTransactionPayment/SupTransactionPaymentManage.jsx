import React, { useEffect, useState } from "react";

import {
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
import { fetchListSupTransactionPayments } from "@src/store/supTransactionPaymentSlice";
import {
  Button,
  Card,
  Input,
  Modal,
  Pagination,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import AddSupTransactionPaymentModal from "./AddSupTransactionPaymentModal";
import EditSupTransactionPaymentModal from "./EditSupTransactionPaymentModal";
import SupTransactionPaymentDetail from "./SupTransactionPaymentDetail";

const { Title, Text } = Typography;

const SupTransactionPaymentManage = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  const dispatch = useDispatch();
  const location = useLocation();

  // Redux selectors
  const paymentList = useSelector((state) => state.supTransactionPayment.supTransactionPayments);
  const fetchStatus = useSelector((state) => state.supTransactionPayment.fetchStatus);
  const fetchError = useSelector((state) => state.supTransactionPayment.fetchError);
  const userRole = useSelector((state) => state.auth.user?.role);

  const isLoading = fetchStatus === "loading";
  const isIdle = fetchStatus === "idle";
  const isSucceeded = fetchStatus === "succeeded";
  const isFailed = fetchStatus === "failed";

  // Fetch data với pagination parameters
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText || undefined,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    dispatch(fetchListSupTransactionPayments(requestParams));
  };

  // Fetch data khi component mount
  useEffect(() => {
    if (fetchStatus === "idle") {
      fetchData();
    }
  }, []);

  // Fetch data khi pagination hoặc search thay đổi
  useEffect(() => {
    if (fetchStatus !== "idle") {
      fetchData();
    }
  }, [current, pageSize, debouncedSearchText]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  useEffect(() => {
    if (debouncedSearchText !== searchText) return;
    if (current !== 1) {
      setCurrent(1);
    }
  }, [debouncedSearchText]);

  // Cập nhật data khi response từ API thay đổi
  useEffect(() => {
    if (isSucceeded && paymentList) {
      const payments = paymentList.data || [];
      const pagination = paymentList.pagination || {};
      const dataWithKeys = payments.map((payment, index) => ({
        ...payment,
        key: payment.id || index.toString(),
      }));
      setData(dataWithKeys);
      setTotal(pagination.total || 0);
    } else if (isSucceeded && !paymentList) {
      setData([]);
      setTotal(0);
    }
  }, [paymentList, isSucceeded]);

  // Khi đến trang này từ SupplierTransactionPaymentTab
  useEffect(() => {
    if (location.state?.selectedPayment) {
      setSelectedPayment(location.state.selectedPayment);
      setModalVisible(true);

      // ✅ Xóa state để khi F5 không bị mở lại modal
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handlers
  const handleAddPayment = () => {
    setAddModalVisible(true);
  };

  const handleAddModalClose = () => {
    setAddModalVisible(false);
  };

  const handleAddSuccess = () => {
    fetchData();
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setEditModalVisible(true);
  };

  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setEditingPayment(null);
  };

  const handleEditSuccess = () => {
    fetchData();
  };

  const handleRefreshData = () => {
    fetchData();
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setSelectedRowKeys([]);
  };

  const handlePageChange = (page, size) => {
    if (size !== pageSize) {
      setPageSize(size);
      setCurrent(1);
    } else {
      setCurrent(page);
    }
    setSelectedRowKeys([]);
  };

  const handleRowClick = (record) => {
    setSelectedPayment(record);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedPayment(null);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Columns definition
  const columns = [
    {
      title: (
        <Space>
          Mã chứng từ
          <Tooltip title="Mã chứng từ với nhà cung cấp">
            <QuestionCircleOutlined />
          </Tooltip>
        </Space>
      ),
      dataIndex: "docNo",
      key: "docNo",
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (amount) => (
        <Text strong style={{ color: "#52c41a" }}>
          {formatCurrency(amount)}
        </Text>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Ngày thanh toán",
      dataIndex: "paidAt",
      key: "paidAt",
      width: 150,
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.paidAt) - new Date(b.paidAt),
    },
    {
      title: "Người thanh toán",
      dataIndex: "paidByName",
      key: "paidByName",
      width: 150,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 200,
      render: (note) => (
        <span title={note}>
          {note && note.length > 50 ? `${note.substring(0, 50)}...` : note || "-"}
        </span>
      ),
    },
  ];
  if (userRole === "admin" || userRole === "manager" || userRole === "accountant") {
    columns.push({
      title: "Thao tác",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size="small">
          {(userRole === "admin" || userRole === "manager" || userRole === "accountant") && (
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPayment(record);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    });
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      onClick: (e) => e.stopPropagation(),
    }),
  };

  return (
    <div className="table-page-container">
      <Card className="table-card" style={{ height: "100%" }}>
        {/* Header */}
        <div className="table-header">
          <div className="productManage-headerContainer">
            <Title level={3}>Quản lý thanh toán của nhà cung cấp</Title>
            <div>
              <Button
                onClick={handleRefreshData}
                loading={isLoading}
                disabled={isLoading}
                size="middle"
                icon={<ReloadOutlined />}
              >
                Làm mới
              </Button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isIdle && (
          <div style={{ textAlign: "center", padding: 32 }}>
            <Spin size="large" />
            <div style={{ marginTop: 8 }}>
              <Text>Đang khởi tạo...</Text>
            </div>
          </div>
        )}

        {/* Error state */}
        {isFailed && (
          <div className="productManage-errorContainer">
            <div className="productManage-errorIconContainer">
              <WarningOutlined className="productManage-errorIcon" />
            </div>
            <div className="productManage-errorContent">
              <Text type="danger" className="productManage-errorTitle">
                Không thể tải dữ liệu
              </Text>
              <Text className="productManage-errorDescription">
                {fetchError?.message || fetchError || "Đã xảy ra lỗi khi tải danh sách thanh toán"}
              </Text>
            </div>
            <Space size="middle">
              <Button
                type="primary"
                size="large"
                onClick={handleRefreshData}
                icon={<ReloadOutlined />}
                className="productManage-retryButton"
              >
                Thử lại
              </Button>
            </Space>
          </div>
        )}

        {/* Toolbar */}
        {(isSucceeded || isLoading) && (
          <div className="table-toolbar">
            <div className="table-search">
              <Input
                placeholder="Tìm theo ID giao dịch, người thanh toán, ghi chú"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                size="middle"
                allowClear
              />
            </div>
            <div className="table-actions">
              {(userRole === "admin" || userRole === "manager" || userRole === "accountant") && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="middle"
                  disabled={isLoading}
                  onClick={handleAddPayment}
                >
                  Thêm thanh toán
                </Button>
              )}
              {/* <Button icon={<ImportOutlined />} size="middle" disabled={isLoading}>
                Nhập file
              </Button>
              <Button icon={<ExportOutlined />} size="middle" disabled={isLoading}>
                Xuất file
              </Button> */}
            </div>
          </div>
        )}

        {/* Table */}
        {(isSucceeded || isLoading) && (
          <>
            <div className="custom-table">
              <Table
                // rowSelection={rowSelection}
                columns={columns}
                dataSource={data}
                pagination={false}
                scroll={{ x: 900, y: "calc(100vh - 280px)" }}
                size="middle"
                loading={isLoading}
                onRow={(record) => ({
                  onClick: (e) => {
                    if (!e.target.closest(".ant-checkbox-wrapper") && !e.target.closest("button")) {
                      handleRowClick(record);
                    }
                  },
                  style: { cursor: "pointer" },
                })}
              />
            </div>

            {/* Footer */}
            <div className="table-footer">
              <div style={{ flexWrap: "wrap" }}>
                <span className="summary-item">
                  Tổng số: {total} | Trang hiện tại: {data.length}
                </span>
              </div>
              <div className="pagination-section">
                <Pagination
                  current={current}
                  pageSize={pageSize}
                  total={total}
                  onChange={handlePageChange}
                  onShowSizeChange={handlePageChange}
                  showSizeChanger={true}
                  showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} mục`}
                  pageSizeOptions={["10", "20", "50", "100"]}
                  size="small"
                  disabled={isLoading}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modal chi tiết */}
      <SupTransactionPaymentDetail
        visible={modalVisible}
        paymentData={selectedPayment}
        onClose={handleModalClose}
      />

      {/* Modal thêm */}
      <AddSupTransactionPaymentModal
        visible={addModalVisible}
        onCancel={handleAddModalClose}
        onSuccess={handleAddSuccess}
      />

      {/* Modal sửa */}
      <EditSupTransactionPaymentModal
        visible={editModalVisible}
        onCancel={handleEditModalClose}
        onSuccess={handleEditSuccess}
        paymentData={editingPayment}
      />
    </div>
  );
};

export default SupTransactionPaymentManage;
