import React, { use, useEffect, useState } from "react";

import {
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
import "@assets/customerPayments/CustomerPaymentList.css";
import { fetchListAllPaymentsCombined } from "@src/store/paymentsCombinedSlice";
import {
  Button,
  Card,
  Input,
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

import AddCustomerPayment from "./AddCustomerPayment";
import CustomerPaymentDetail from "./CustomerPaymentDetail";
import EditCustomerPayment from "./EditCustomerPayment";

const { Title, Text } = Typography;

const CustomerPaymentList = () => {
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
  const customerPaymentList = useSelector((state) => state.paymentsCombined.paymentsCombinedData);
  const fetchAllStatus = useSelector((state) => state.paymentsCombined.fetchAllStatus);
  const fetchAllError = useSelector((state) => state.paymentsCombined.fetchAllError);
  const userRole = useSelector((state) => state.auth.user?.role);
  const isLoading = fetchAllStatus === "loading";
  const isIdle = fetchAllStatus === "idle";
  const isSucceeded = fetchAllStatus === "succeeded";
  const isFailed = fetchAllStatus === "failed";

  // Fetch data với pagination parameters
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText || undefined,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    dispatch(fetchListAllPaymentsCombined(requestParams));
  };

  // Fetch data khi component mount
  useEffect(() => {
    if (fetchAllStatus === "idle") {
      fetchData();
    }
  }, []);

  // Fetch data khi pagination hoặc search thay đổi
  useEffect(() => {
    if (fetchAllStatus !== "idle") {
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
    if (isSucceeded && customerPaymentList) {
      const payments = customerPaymentList.data || [];
      const pagination = customerPaymentList.pagination || {};
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
  }, [customerPaymentList, isSucceeded]);

  // Khi đến trang này từ SupplierTransactionPaymentTab (chưa sửa)
  useEffect(() => {
    if (location.state?.selectedPayment) {
      setSelectedPayment(location.state.selectedPayment);
      setModalVisible(true);

      // ✅ Xóa state để khi F5 không bị mở lại modal
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handlers
  const handleAddCustomerPayment = () => {
    setAddModalVisible(true);
  };

  const handleAddModalClose = () => {
    setAddModalVisible(false);
  };

  const handleAddSuccess = () => {
    fetchData();
  };

  const handleEditCustomerPayment = (payment) => {
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
  const methodpaymentMap = {
    bank: { text: "Ngân hàng", color: "blue" },
    cash: { text: "Tiền mặt", color: "green" },
    cod: { text: "COD", color: "orange" },
  };
  // Columns definition
  const columns = [
    {
      title: "Tên khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 200,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Mã khách hàng",
      dataIndex: "customerCode",
      key: "customerCode",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Phương thức thanh toán",
      dataIndex: "method",
      key: "method",
      width: 100,
      // bank/cash/cod
      render: (text) => {
        const method = methodpaymentMap[text] || { text: "Khác", color: "gray" };
        return <Tag color={method.color}>{method.text}</Tag>;
      },
    },
    {
      title: "Hướng thanh toán",
      dataIndex: "direction",
      key: "direction",
      width: 90,
      render: (text) => <Tag color="purple">{text === "in" ? "Thu" : "Chi"}</Tag>,
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      render: (text) => <Text>{formatCurrency(text)}</Text>,
    },
    {
      title: "Ngày nhận",
      dataIndex: "receivedAt",
      key: "receivedAt",
      width: 130,
      render: (text) => <Text>{formatDate(text)}</Text>,
    },
    {
      title: "Người nhận",
      dataIndex: "receivedByName",
      key: "receivedByName",
      render: (text) => <Text>{text}</Text>,
    },
  ];
  if (userRole === "admin" || userRole === "accountant") {
    columns.push({
      title: "Thao tác",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditCustomerPayment(record);
              }}
            />
          </Tooltip>
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
          <div className="customerPayment-headerContainer">
            <Title level={3}>Quản lý thanh toán của khách hàng</Title>
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
          <div className="customerPayment-errorContainer">
            <div className="customerPayment-errorIconContainer">
              <WarningOutlined className="customerPayment-errorIcon" />
            </div>
            <div className="customerPayment-errorContent">
              <Text type="danger" className="customerPayment-errorTitle">
                Không thể tải dữ liệu
              </Text>
              <Text className="customerPayment-errorDescription">
                {fetchAllError?.message ||
                  fetchAllError ||
                  "Đã xảy ra lỗi khi tải danh sách thanh toán"}
              </Text>
            </div>
            <Space size="middle">
              <Button
                type="primary"
                size="large"
                onClick={handleRefreshData}
                icon={<ReloadOutlined />}
                className="customerPayment-retryButton"
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
                placeholder="Tìm theo tên khách hàng, ghi chú"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                size="middle"
                allowClear
              />
            </div>
            <div className="table-actions">
              {(userRole === "admin" || userRole === "accountant") && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="middle"
                  disabled={isLoading}
                  onClick={handleAddCustomerPayment}
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
                scroll={{ x: 900, y: "calc(100vh - 270px)" }}
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
      <CustomerPaymentDetail
        visible={modalVisible}
        paymentData={selectedPayment}
        onClose={handleModalClose}
      />

      {/* Modal thêm */}
      <AddCustomerPayment
        visible={addModalVisible}
        onCancel={handleAddModalClose}
        onSuccess={handleAddSuccess}
      />

      {/* Modal sửa */}
      <EditCustomerPayment
        visible={editModalVisible}
        onCancel={handleEditModalClose}
        onSuccess={handleEditSuccess}
        paymentData={editingPayment}
      />
    </div>
  );
};

export default CustomerPaymentList;
