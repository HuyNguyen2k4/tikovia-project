import React, { useEffect, useState } from "react";

import {
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
import {
  fetchDeliveryRunById,
  fetchDeliveryRuns,
  resetDeliveryRunById,
  resetDeliveryRuns,
} from "@src/store/deliveryRunsSlice";
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

import AddDeliveryRunModal from "./AddDeliveryRunModal";
import DeliveryRunDetail from "./DeliveryRunDetail";
import EditDeliveryRunModal from "./EditDeliveryRunModal";

const { Title, Text } = Typography;

const DeliveryRunsManage = () => {
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  // const [selectedRun, setSelectedRun] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  const dispatch = useDispatch();

  const runsState = useSelector((state) => state.deliveryRuns.deliveryRuns) || {
    data: [],
    pagination: {},
  };
  const fetchStatus = useSelector((state) => state.deliveryRuns.fetchStatus);
  const fetchError = useSelector((state) => state.deliveryRuns.fetchError);
  const { deliveryRunById } = useSelector((state) => state.deliveryRuns);
  const userRole = useSelector((state) => state.auth.user?.role);
  const userId = useSelector((state) => state.auth.user?.id);
  const isLoading = fetchStatus === "loading";
  const isIdle = fetchStatus === "idle";
  const isSucceeded = fetchStatus === "succeeded";
  const isFailed = fetchStatus === "failed";

  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText || undefined,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      shipperId: userRole === "shipper" ? userId : undefined,
      ...params,
    };
    dispatch(fetchDeliveryRuns(requestParams));
  };

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
    if (isSucceeded && runsState) {
      const runs = runsState.data || [];
      const pagination = runsState.pagination || {};
      const dataWithKeys = runs.map((run, index) => ({
        ...run,
        key: run.id || index.toString(),
      }));
      setData(dataWithKeys);
      setTotal(pagination.total || runs.length || 0);
    }
  }, [runsState, isSucceeded]);

  const handleRefreshData = () => {
    // 1. Tải lại danh sách (giữ nguyên)
    fetchData();
    // 2. Tải lại dữ liệu chi tiết cho modal đang mở
    if (selectedRunId) {
      // 👈 THÊM LOGIC NÀY
      dispatch(fetchDeliveryRunById(selectedRunId));
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setCurrent(1);
  };

  const handlePageChange = (page, size) => {
    if (size !== pageSize) {
      setPageSize(size);
      setCurrent(1);
    } else {
      setCurrent(page);
    }
  };

  const handleRowClick = (record) => {
    // setSelectedRun(record);
    setSelectedRunId(record.id);
    dispatch(fetchDeliveryRunById(record.id));
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    // setSelectedRun(null);
    setSelectedRunId(null);
    dispatch(resetDeliveryRunById());
  };

  const handleAddRun = () => setAddModalVisible(true);
  const handleAddModalClose = () => setAddModalVisible(false);
  const handleAddSuccess = () => fetchData();

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

  const renderStatusTag = (status) => {
    const statusMap = {
      assigned: { color: "blue", text: "Đã phân công", icon: <ClockCircleOutlined /> },
      in_progress: { color: "processing", text: "Đang giao", icon: <CarOutlined /> },
      completed: { color: "success", text: "Hoàn thành", icon: <CheckCircleOutlined /> },
      cancelled: { color: "error", text: "Đã hủy", icon: <CloseCircleOutlined /> },
    };
    const cfg = statusMap[status] || { color: "default", text: status || "-" };
    return (
      <Tag color={cfg.color} icon={cfg.icon}>
        {cfg.text}
      </Tag>
    );
  };

  const getSummaryByStatus = () => {
    const counts = {};
    data.forEach((run) => {
      const s = run.status || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getSummaryByStatus();

  const columns = [
    {
      title: "Mã chuyến",
      dataIndex: "deliveryNo",
      key: "deliveryNo",
      width: 125,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Biển số xe",
      dataIndex: "vehicleNo",
      key: "vehicleNo",
      width: 120,
      render: (text) => (
        <div className="vehicle-info">
          <CarOutlined />
          <span className="vehicle-no">{text}</span>
        </div>
      ),
    },
    {
      title: "Giám sát",
      dataIndex: "supervisorName",
      key: "supervisorName",
      width: 160,
    },
    {
      title: "Người giao",
      dataIndex: "shipperName",
      key: "shipperName",
      width: 160,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (s) => renderStatusTag(s),
    },
    {
      title: "Số đơn",
      key: "ordersCount",
      width: 100,
      render: (_, record) => (
        <div className="orders-count">
          <span className="orders-count-badge">{record.orders?.length || 0} đơn</span>
        </div>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (d) => formatDate(d),
    },
  ];
  if (userRole === "admin" || userRole === "sup_shipper") {
    columns.push({
      title: "Thao tác",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        // chỉ khi status là completed hoặc cancelled mới không cho sửa
        <>
          {["completed", "cancelled"].includes(record.status) ? (
            <Tooltip title="Chuyến giao đã hoàn thành hoặc hủy, không thể sửa">
              <Button type="text" disabled>
                <EditOutlined />
              </Button>
            </Tooltip>
          ) : (
            <Button
              type="text"
              onClick={(e) => {
                e.stopPropagation();
                // setSelectedRun(record);
                setSelectedRunId(record.id); // 👈 THÊM DÒNG NÀY
                dispatch(fetchDeliveryRunById(record.id)); // 👈 THÊM DÒNG NÀY
                setEditModalVisible(true);
              }}
            >
              <EditOutlined />
            </Button>
          )}
        </>
      ),
    });
  }

  return (
    <div className="table-page-container">
      <Card className="table-card" style={{ height: "100%" }}>
        <div className="table-header">
          <div className="productManage-headerContainer">
            <Title level={3}>Quản lý chuyến giao hàng</Title>
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
                {fetchError?.message ||
                  fetchError ||
                  "Đã xảy ra lỗi khi tải danh sách chuyến giao hàng"}
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
                  placeholder="Tìm theo mã chuyến, biển số xe, người giao"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  size="middle"
                  allowClear
                />
              </div>
              <div className="table-actions">
                {(userRole === "admin" || userRole === "sup_shipper") && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="middle"
                    disabled={isLoading}
                    onClick={handleAddRun}
                  >
                    Thêm chuyến giao hàng
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

      <AddDeliveryRunModal
        visible={addModalVisible}
        onCancel={handleAddModalClose}
        onSuccess={handleAddSuccess}
      />

      {/* SỬA LẠI KHỐI NÀY */}
      {modalVisible && deliveryRunById && deliveryRunById.id === selectedRunId && (
        <DeliveryRunDetail
          visible={modalVisible}
          runData={deliveryRunById} // 👈 SỬA DÒNG NÀY
          onClose={handleModalClose}
          onRefresh={handleRefreshData}
        />
      )}

      {/* SỬA LẠI KHỐI NÀY */}
      {editModalVisible && deliveryRunById && deliveryRunById.id === selectedRunId && (
        <EditDeliveryRunModal
          visible={editModalVisible}
          runData={deliveryRunById} // 👈 SỬA DÒNG NÀY
          onCancel={() => setEditModalVisible(false)}
          onSuccess={() => {
            setEditModalVisible(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default DeliveryRunsManage;
