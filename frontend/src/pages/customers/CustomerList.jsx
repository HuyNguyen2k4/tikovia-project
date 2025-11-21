// src/pages/CustomerList/CustomerList.jsx
import React, { use, useEffect, useState } from "react";

import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
// Dùng chung CSS
import {
  createCustomer,
  deleteCustomer,
  fetchCustomerFinancialSummary,
  fetchCustomerWithMoney,
  updateCustomer,
} from "@src/store/customerSlice";
// Import các thunk mới
import {
  Alert,
  Avatar,
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
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

// Import các modal mới (sẽ tạo ở bước sau)
import AddCustomerModal from "./AddCustomerModal";
import CustomerDetailModal from "./CustomerDetailModal";
import EditCustomerModal from "./EditCustomerModal";

// Giả định modal chi tiết

const { Title, Text } = Typography;

const CustomerList = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20); // Có thể thay đổi
  const [total, setTotal] = useState(0);

  // State cho Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [loadingStates, setLoadingStates] = useState({}); // Loading cho nút xóa

  const dispatch = useDispatch();
  const customerList = useSelector((state) => state.customer.customers);
  const status = useSelector((state) => state.customer.fetchStatus);
  const error = useSelector((state) => state.customer.fetchError);
  const financialSummary = useSelector((state) => state.customer.financialSummary);

  // Xác định các trạng thái
  const isLoading = status === "loading";
  const isIdle = status === "idle";
  const isSucceeded = status === "succeeded";
  const isFailed = status === "failed";

  // Hàm fetch data
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    dispatch(fetchCustomerWithMoney(requestParams));
    dispatch(fetchCustomerFinancialSummary());
  };

  // Fetch data lần đầu
  useEffect(() => {
    if (status === "idle") {
      fetchData();
    }
  }, [status, dispatch]);

  // Fetch data khi pagination hoặc search thay đổi
  useEffect(() => {
    if (status !== "idle") {
      fetchData();
    }
  }, [current, pageSize, debouncedSearchText, dispatch]);

  // Debounce search text
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 700);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // Reset về trang 1 khi search
  useEffect(() => {
    if (debouncedSearchText !== searchText) return;
    if (current !== 1) {
      setCurrent(1);
    }
  }, [debouncedSearchText]);

  // Cập nhật data khi response từ API thay đổi
  const [data, setData] = useState([]);
  useEffect(() => {
    if (isSucceeded && customerList) {
      const customers = customerList.data || [];
      const pagination = customerList.pagination || {};

      const dataWithKeys = customers.map((cust, index) => ({
        ...cust,
        key: cust.id || index.toString(),
      }));

      setData(dataWithKeys);
      setTotal(pagination.total || 0);
    } else if (isSucceeded && !customerList) {
      setData([]);
      setTotal(0);
    }
  }, [customerList, isSucceeded]);

  // Handlers cho Modals
  const handleAddCustomer = () => setAddModalVisible(true);
  const handleAddModalClose = () => setAddModalVisible(false);
  const handleAddSuccess = () => {
    fetchData(); // Refresh data
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setEditModalVisible(true);
  };
  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setEditingCustomer(null);
  };
  const handleEditSuccess = () => {
    fetchData(); // Refresh data
  };

  const handleRowClick = (record) => {
    setSelectedCustomer(record);
    setDetailModalVisible(true);
  };
  const handleDetailModalClose = () => {
    setDetailModalVisible(false);
    setSelectedCustomer(null);
  };

  // Handler cho Refresh
  const handleRefreshData = () => {
    fetchData();
  };

  // Handler cho Search
  const handleSearch = (value) => {
    setSearchText(value);
    setSelectedRowKeys([]);
  };

  // Handler cho Pagination
  const handlePageChange = (page, size) => {
    if (size !== pageSize) {
      setPageSize(size);
      setCurrent(1);
    } else {
      setCurrent(page);
    }
    setSelectedRowKeys([]);
  };

  // Handler cho Xóa
  const handleDelete = (customerId, customerCode) => {
    Modal.confirm({
      title: "Xác nhận xóa khách hàng",
      content: (
        <p>
          Bạn có chắc chắn muốn xóa khách hàng <strong>{customerCode}</strong>? Hành động này không
          thể hoàn tác.
        </p>
      ),
      okText: "Xóa",
      cancelText: "Hủy",
      okType: "danger",
      onOk: () => {
        setLoadingStates((prev) => ({ ...prev, [customerId]: true }));
        dispatch(deleteCustomer(customerId))
          .unwrap()
          .then(() => {
            notification.success({ message: "Xóa khách hàng thành công" });
            fetchData(); // Refresh
          })
          .catch((err) => {
            notification.error({
              message: "Xóa thất bại",
              description: err || "Không thể xóa khách hàng này, có thể do còn dữ liệu liên quan.",
            });
          })
          .finally(() => {
            setLoadingStates((prev) => ({ ...prev, [customerId]: false }));
          });
      },
    });
  };

  // Định nghĩa các cột (lấy từ file gốc của bạn, thêm cột Actions)
  const columns = [
    {
      title: "Mã khách hàng",
      dataIndex: "code",
      key: "code",
      width: 100,
      minWidth: 100,
      render: (text) => <Tag color="cyan">{text}</Tag>,
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: "Tên khách hàng",
      dataIndex: "name",
      key: "name",
      width: 180,
      minWidth: 150,
      render: (text) => <span className="supplier-name-link">{text}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Điện thoại",
      dataIndex: "phone",
      key: "phone",
      width: 100,
      minWidth: 100,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      width: 240,
      minWidth: 150,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text || "N/A"}</span>
        </Tooltip>
      ),
    },
    {
      title: (
        <Space>
          Dư nợ cần thu
          <Tooltip title="Tổng số tiền còn phải thu từ khách">
            <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: "outstandingBalance",
      key: "outstandingBalance",
      width: 150,
      minWidth: 150,
      align: "right",
      render: (value) => {
        const numericValue = parseFloat(value);
        let style = { color: "#8C8C8C" };
        if (numericValue > 0) {
          style = { color: "#FA8C16", fontWeight: 500 };
        }
        const displayValue = isNaN(numericValue) ? 0 : numericValue;
        return (
          <span style={style}>
            {displayValue.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
          </span>
        );
      },
      sorter: (a, b) => a.outstandingBalance - b.outstandingBalance,
    },
    {
      title: (
        <Space>
          Tổng mua
          <Tooltip title="Tổng giá trị hàng khách đã mua chưa trừ hàng trả hoặc giảm giá">
            <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: "totalSalesAmount",
      key: "totalSalesAmount",
      width: 150,
      minWidth: 150,
      align: "right",
      render: (value) => {
        const numericValue = parseFloat(value);
        const displayValue = isNaN(numericValue) ? 0 : numericValue;
        let style = { color: "#8C8C8C" };
        if (displayValue > 0) {
          style = { fontWeight: 500 };
        }
        return (
          <span style={style}>
            {displayValue.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
          </span>
        );
      },
      sorter: (a, b) => a.totalSalesAmount - b.totalSalesAmount,
    },
    {
      title: (
        <Space>
          Doanh số thuần
          <Tooltip title="Tổng giá trị hàng đã mua đã trừ trả hàng, giảm giá, chiết khấu">
            <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: "netSalesAmount",
      key: "netSalesAmount",
      width: 150,
      minWidth: 150,
      align: "right",
      render: (value) => {
        const numericValue = parseFloat(value);
        const displayValue = isNaN(numericValue) ? 0 : numericValue;
        let style = { color: "#8C8C8C" };
        if (displayValue > 0) {
          style = { color: "#389E0D", fontWeight: 500 };
        }
        return (
          <span style={style}>
            {displayValue.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
          </span>
        );
      },
      sorter: (a, b) => a.netSalesAmount - b.netSalesAmount,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      minWidth: 100,
      // fixed: "right",
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditCustomer(record);
              }}
              disabled={loadingStates[record.id]}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(record.id, record.code);
              }}
              loading={loadingStates[record.id]}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      onClick: (e) => e.stopPropagation(),
    }),
  };
  return (
    <div className="table-page-container">
      <Card
        className="table-card"
        styles={{
          body: {
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          },
        }}
      >
        {/* Header */}
        <div className="table-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <Title level={3}>Danh sách khách hàng</Title>

              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <div>
                  <Text type="secondary">Tổng dư nợ cần thu</Text>
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    {financialSummary.totalOutstandingBalance
                      ? financialSummary.totalOutstandingBalance.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })
                      : 0}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary">Tổng mua</Text>
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {financialSummary.totalSalesAmount
                      ? financialSummary.totalSalesAmount.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })
                      : 0}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary">Tổng doanh thu thuần</Text>
                  <Tag color="green" style={{ marginLeft: 8 }}>
                    {financialSummary.netSalesAmount
                      ? financialSummary.netSalesAmount.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })
                      : 0}
                  </Tag>
                </div>
              </div>
            </div>
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

        {/* Trạng thái Idle (ĐÃ SỬA LỖI) */}
        {isIdle && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column", // Thay đổi để Spin và Text xếp chồng
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            {/* 1. Xóa prop 'tip' khỏi Spin */}
            <Spin size="large" />
            {/* 2. Thêm Text riêng biệt bên dưới */}
            <Text style={{ marginTop: "16px", color: "#8c8c8c" }}>Đang khởi tạo...</Text>
          </div>
        )}

        {/* Trạng thái Lỗi */}
        {isFailed && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <WarningOutlined style={{ fontSize: "64px", color: "#ff4d4f" }} />
            <Title level={4} type="danger" style={{ marginTop: "24px" }}>
              Không thể tải dữ liệu
            </Title>
            <Text type="secondary">{error || "Đã xảy ra lỗi khi tải danh sách khách hàng"}</Text>
            <Button
              type="primary"
              size="large"
              onClick={handleRefreshData}
              icon={<ReloadOutlined />}
              style={{ marginTop: "24px" }}
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* Trạng thái Loading hoặc Success */}
        {(isSucceeded || isLoading) && (
          <>
            {/* Toolbar */}
            <div className="table-toolbar">
              <div className="table-search">
                <Input
                  placeholder="Theo mã, tên, số điện thoại, địa chỉ..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  size="middle"
                  allowClear
                />
              </div>

              <div className="table-actions">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="middle"
                  disabled={isLoading}
                  onClick={handleAddCustomer}
                >
                  Thêm khách hàng
                </Button>
                {/* <Button icon={<ImportOutlined />} size="middle" disabled={isLoading}>
                  Nhập file
                </Button>
                <Button icon={<ExportOutlined />} size="middle" disabled={isLoading}>
                  Xuất file
                </Button> */}
              </div>
            </div>

            {/* Table */}
            <div className="custom-table">
              <Table
                // rowSelection={rowSelection}
                columns={columns}
                dataSource={data}
                pagination={false}
                scroll={{ x: 1200, y: "calc(100vh - 300px)" }}
                tableLayout="fixed"
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

            {/* Footer và Pagination */}
            <div className="table-footer">
              <div className="summary-section">
                <Text strong>Tổng số: {total}</Text>
                <Text type="secondary"> | Trang hiện tại: {data.length}</Text>
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

      {/* Modals */}
      <AddCustomerModal
        visible={addModalVisible}
        onCancel={handleAddModalClose}
        onSuccess={() => {
          handleAddModalClose();
          handleAddSuccess();
        }}
      />

      <EditCustomerModal
        visible={editModalVisible}
        onCancel={handleEditModalClose}
        onSuccess={() => {
          handleEditModalClose();
          handleEditSuccess();
        }}
        customerData={editingCustomer}
      />

      {/* Bạn có thể tạo file CustomerDetailModal.jsx tương tự modal của UserManage.jsx */}
      <CustomerDetailModal
        visible={detailModalVisible}
        onCancel={handleDetailModalClose}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default CustomerList;
