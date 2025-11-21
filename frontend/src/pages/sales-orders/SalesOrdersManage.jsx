import React, { useEffect, useState } from "react";

import {
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnlockOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
import {
  fetchSalesOrders,
  fetchSalesOrdersBySeller,
  resetSalesOrders,
  updateAdminLockStatus,
} from "@src/store/salesOrdersSlice";
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
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import AddSalesOrdersModal from "./AddSalesOrdersModal";
import EditSalesOrdersModal from "./EditSalesOrdersModal";
import SalesOrdersDetail from "./SalesOrdersDetail";

const { Title, Text } = Typography;

const SalesOrdersManage = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  // Redux selectors (salesOrders slice)
  const ordersState = useSelector((state) => state.salesOrders.salesOrders) || {
    data: [],
    pagination: {},
  };
  const fetchStatus = useSelector((state) => state.salesOrders.fetchStatus);
  const fetchError = useSelector((state) => state.salesOrders.fetchError);
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role;
  const userId = user?.id;

  const isLoading = fetchStatus === "loading";
  const isIdle = fetchStatus === "idle";
  const isSucceeded = fetchStatus === "succeeded";
  const isFailed = fetchStatus === "failed";

  // Fetch data with pagination
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText || undefined,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    const sellerRequestParams = {
      q: debouncedSearchText || undefined,
      sellerId: userId,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    // If user is seller -> use seller-specific thunk
    if (userRole === "seller") {
      dispatch(fetchSalesOrdersBySeller(sellerRequestParams));
    } else {
      // admin/manager/accountant/sup_picker/sup_shipper -> use general fetch with pagination
      dispatch(fetchSalesOrders(requestParams));
    }
  };
  useEffect(() => {
    dispatch(resetSalesOrders());
    setCurrent(1);
    // trigger fetch for new role immediately
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, userId]);
  useEffect(() => {
    if (isIdle) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isIdle) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Update data when store changes
  useEffect(() => {
    if (isSucceeded && ordersState) {
      const orders = ordersState.data || [];
      const pagination = ordersState.pagination || {};
      const dataWithKeys = orders.map((order, index) => ({
        ...order,
        key: order.id || index.toString(),
      }));
      setData(dataWithKeys);
      setTotal(pagination.total || orders.length || 0);
    } else if (isSucceeded && !ordersState) {
      setData([]);
      setTotal(0);
    }
  }, [ordersState, isSucceeded]);

  // If route passed an order to open
  useEffect(() => {
    if (location.state?.selectedOrder) {
      setSelectedOrder(location.state.selectedOrder);
      setModalVisible(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  // Kiểm tra URL có ?add=true không và chỉ mở modal nếu user là seller
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("add") === "true") {
      if (userRole === "seller") {
        setAddModalVisible(true);
      } else {
        notification.warning({
          message: "Không có quyền",
          description: "Chỉ nhân viên bán hàng mới có thể tạo đơn hàng",
        });
        navigate("/sales-orders", { replace: true });
      }
    }
  }, [location.search, userRole, navigate]);
  // Handlers
  // const handleAddOrder = () => setAddModalVisible(true);
  const handleAddOrder = () => {
    if (userRole === "seller") {
      navigate("/sales-orders?add=true");
    } else {
      notification.warning({
        message: "Không có quyền",
        description: "Chỉ nhân viên bán hàng mới có thể tạo đơn hàng",
      });
    }
  };
  // const handleAddModalClose = () => setAddModalVisible(false);
  const handleAddModalClose = () => {
    setAddModalVisible(false);
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("add") === "true") {
      navigate("/sales-orders", { replace: true });
    }
  };
  const handleAddSuccess = () => fetchData();

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setEditModalVisible(true);
  };
  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setEditingOrder(null);
  };
  const handleEditSuccess = () => fetchData();

  const handleRefreshData = () => fetchData();

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
    setSelectedOrder(record);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  // Format date
  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";
  // Render status tag for sales orders
  const renderStatusTag = (status) => {
    const statusMap = {
      draft: { color: "default", text: "Nháp" },
      pending_preparation: { color: "orange", text: "Chờ chuẩn bị" },
      assigned_preparation: { color: "gold", text: "Đã phân công chuẩn bị" },
      prepared: { color: "green", text: "Đã chuẩn bị" },
      confirmed: { color: "blue", text: "Xác nhận" },
      delivering: { color: "cyan", text: "Đang giao" },
      delivered: { color: "green", text: "Đã giao" },
      completed: { color: "success", text: "Hoàn thành" },
      cancelled: { color: "red", text: "Đã hủy" },
    };
    const cfg = statusMap[status] || { color: "default", text: status || "-" };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };
  // Summary counts by status (for footer)
  const getSummaryByStatus = () => {
    const counts = {};
    data.forEach((order) => {
      const s = order.status || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  };
  const statusCounts = getSummaryByStatus();
  const handleChangeAdminLocked = (orderId, adminLocked) => {
    Modal.confirm({
      title: adminLocked ? "Mở khóa đơn hàng" : "Khóa đơn hàng",
      content: `Bạn có chắc muốn ${adminLocked ? "mở khóa" : "khóa"} đơn hàng này không?`,
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        dispatch(updateAdminLockStatus({ id: orderId, adminLocked: !adminLocked }))
          .unwrap()
          .then(() => {
            notification.success({
              message: `${adminLocked ? "Mở khóa" : "Khóa"} thành công`,
              description: `Đơn hàng đã được ${adminLocked ? "mở khóa" : "khóa"} thành công`,
              duration: 5,
            });
            fetchData();
          })
          .catch((error) => {
            notification.error({
              message: `Không thể ${adminLocked ? "mở khóa" : "khóa"} đơn hàng`,
              description: error.message || "Đã xảy ra lỗi trong quá trình xử lý",
              duration: 5,
            });
          });
      },
    });
  };
  // Columns for sales orders
  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "orderNo",
      key: "orderNo",
      width: 130,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 220,
    },
    {
      title: "Người bán",
      dataIndex: "sellerName",
      key: "sellerName",
      width: 180,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (s) => renderStatusTag(s),
    },
    {
      title: "Ngày giao (SLA)",
      dataIndex: "slaDeliveryAt",
      key: "slaDeliveryAt",
      width: 180,
      render: (d) => formatDate(d),
    },
    {
      title: "Số mặt hàng",
      dataIndex: "itemsCount",
      key: "itemsCount",
      width: 120,
    },
  ];
  if (userRole === "seller" || userRole === "admin") {
    columns.push({
      title: "Thao tác",
      key: "actions",
      width: 100,
      render: (_, record) => {
        const status = record?.status;
        // Trạng thái từ đây trở đi không được edit
        const nonEditableStatuses = new Set([
          "confirmed",
          "delivering",
          "delivered",
          "completed",
          "cancelled",
        ]);
        const isEditDisabled = nonEditableStatuses.has(status);
        const nonLockableStatuses = new Set(["delivering", "delivered", "completed"]);
        const isLockDisabled = nonLockableStatuses.has(status);
        const statusMap = {
          draft: "Nháp",
          pending_preparation: "Chờ chuẩn bị",
          assigned_preparation: "Đã phân công chuẩn bị",
          confirmed: "Xác nhận",
          prepared: "Chờ giao hàng",
          delivering: "Đang giao",
          delivered: "Đã giao",
          completed: "Hoàn thành",
          cancelled: "Đã hủy",
        };
        return (
          <Space size="small">
            {userRole === "seller" && (
              <Tooltip
                title={isEditDisabled ? `${statusMap[status]} - không thể chỉnh sửa` : "Chỉnh sửa"}
              >
                <Button
                  type="text"
                  icon={
                    isEditDisabled ? (
                      <EditOutlined style={{ color: "#b2b0b0ff" }} />
                    ) : (
                      <EditOutlined />
                    )
                  }
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEditDisabled) return;
                    handleEditOrder(record);
                  }}
                  disabled={isEditDisabled}
                />
              </Tooltip>
            )}

            <Tooltip
              title={
                isLockDisabled
                  ? "Đơn hàng đang giao - không thể thay đổi trạng thái khóa"
                  : record?.adminLocked
                    ? "Mở khóa đơn hàng"
                    : "Khóa đơn hàng"
              }
            >
              <Button
                type="text"
                icon={
                  isLockDisabled ? (
                    record.adminLocked ? (
                      <UnlockOutlined style={{ color: "#b2b0b0ff" }} />
                    ) : (
                      <LockOutlined style={{ color: "#b2b0b0ff" }} />
                    )
                  ) : record.adminLocked ? (
                    <UnlockOutlined />
                  ) : (
                    <LockOutlined />
                  )
                }
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLockDisabled) return;
                  handleChangeAdminLocked(record.id, record.adminLocked);
                }}
                disabled={isLockDisabled}
              />
            </Tooltip>
          </Space>
        );
      },
    });
  }

  return (
    <div className="table-page-container">
      <Card className="table-card" style={{ height: "100%" }}>
        <div className="table-header">
          <div className="productManage-headerContainer">
            <Title level={3}>Quản lý đơn hàng</Title>
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

        {isIdle && (
          <div style={{ textAlign: "center", padding: 32 }}>
            <Spin size="large" />
            <div style={{ marginTop: 8 }}>
              <Text>Đang khởi tạo...</Text>
            </div>
          </div>
        )}

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
                {fetchError?.message || fetchError || "Đã xảy ra lỗi khi tải danh sách đơn hàng"}
              </Text>
            </div>
            <Space size="middle">
              <Button
                type="primary"
                size="large"
                onClick={handleRefreshData}
                icon={<ReloadOutlined />}
              >
                Thử lại
              </Button>
            </Space>
          </div>
        )}

        {(isSucceeded || isLoading) && (
          <>
            <div className="table-toolbar">
              <div className="table-search">
                <Input
                  placeholder="Tìm theo mã đơn, khách hàng, người bán"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  size="middle"
                  allowClear
                />
              </div>
              <div className="table-actions">
                {userRole === "seller" && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="middle"
                    disabled={isLoading}
                    onClick={handleAddOrder}
                  >
                    Thêm đơn hàng
                  </Button>
                )}
              </div>
            </div>

            <div className="custom-table">
              <Table
                columns={columns}
                dataSource={data}
                pagination={false}
                scroll={{ x: 900, y: "calc(100vh - 180px)" }}
                size="middle"
                loading={isLoading}
                onRow={(record) => ({
                  onClick: (e) => {
                    if (!e.target.closest("button")) handleRowClick(record);
                  },
                  style: { cursor: "pointer" },
                })}
              />
            </div>

            <div className="table-footer">
              <div style={{ flexWrap: "wrap", display: "flex", gap: 8, alignItems: "center" }}>
                <span className="summary-item">
                  Tổng số: {total} | Trang hiện tại: {data.length}
                </span>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <span
                    key={status}
                    className="summary-item mx-2"
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Tag
                      color={renderStatusTag(status).props.color}
                      size="small"
                      style={{ margin: "0 4px" }}
                    >
                      {renderStatusTag(status).props.children}
                    </Tag>
                    {count}
                  </span>
                ))}
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
                  pageSizeOptions={["5", "10", "20", "50", "100"]}
                  size="small"
                  disabled={isLoading}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      <SalesOrdersDetail
        visible={modalVisible}
        orderData={selectedOrder}
        onClose={handleModalClose}
      />

      <AddSalesOrdersModal
        visible={addModalVisible}
        onCancel={handleAddModalClose}
        onSuccess={handleAddSuccess}
      />

      <EditSalesOrdersModal
        visible={editModalVisible}
        onCancel={handleEditModalClose}
        onSuccess={handleEditSuccess}
        orderData={editingOrder}
      />
    </div>
  );
};

export default SalesOrdersManage;
