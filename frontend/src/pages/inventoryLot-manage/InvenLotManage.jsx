import React, { useEffect, useState } from "react";

import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  GoldOutlined,
  ImportOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
import "@assets/inventoryLot-manage/InvenLotManage.css";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import {
  deleteInventoryLot,
  fetchInventoryLotById,
  fetchListInventoryLots,
} from "@src/store/inventoryLotSlice";
import {
  Button,
  Card,
  Input,
  Modal,
  Pagination,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import AddInvenLotModal from "./AddInvenLotModal";
import EditInvenLotModal from "./EditInvenLotModal";
// import ExportInventoryExcelButton from "./ExportInventoryExcelButton";
import UnitConversion from "./UnitConversion";
// import ImportInventoryLotModal from "./ImportInventoryLotModal";

const { Title, Text } = Typography;

const InvenLotManage = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  // const [importModalVisible, setImportModalVisible] = useState(false);

  const dispatch = useDispatch();

  // inventoryLot slice selectors
  const inventoryList = useSelector((state) => state.inventoryLot.inventoryLots); // this is response.data from API (contains data + pagination)
  const inventoryLotById = useSelector((state) => state.inventoryLot.inventoryLotsById);

  const fetchByIdStatus = useSelector((state) => state.inventoryLot.fetchByIdStatus);
  const fetchByIdError = useSelector((state) => state.inventoryLot.fetchByIdError);
  const fetchListStatus = useSelector((state) => state.inventoryLot.fetchListStatus);
  const fetchListError = useSelector((state) => state.inventoryLot.fetchListError);
  const deleteError = useSelector((state) => state.inventoryLot.deleteError);

  const userRole = useSelector((state) => state.auth.user?.role);
  const [activeTab, setActiveTab] = useState("detail");

  // Get lotId from URL
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const lotIdFromUrl = queryParams.get("lotId");

  const isLoading = fetchListStatus === "loading";
  const isIdle = fetchListStatus === "idle";
  const isSucceeded = fetchListStatus === "succeeded";
  const isFailed = fetchListStatus === "failed";
  const navigate = useNavigate();

  // Fetch data with pagination/search
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText || undefined,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    dispatch(fetchListInventoryLots(requestParams));
  };
  useEffect(() => {
    if (fetchByIdStatus === "succeeded" && inventoryLotById && lotIdFromUrl) {
      setSelectedLot(inventoryLotById);
      // setModalVisible(true);
    }
  }, [fetchByIdStatus, inventoryLotById, lotIdFromUrl]);
  // Open modal if lotIdFromUrl changes and matches an existing lot
  useEffect(() => {
    if (lotIdFromUrl) {
      // Nếu chưa có, fetch riêng lô hàng này
      dispatch(fetchInventoryLotById(lotIdFromUrl))
        .unwrap()
        .then(() => {
          // setSelectedLot(inventoryLotById);
          setModalVisible(true);
        })
        .catch((err) => {
          notification.error({
            message: "Lỗi",
            description: `Không tìm thấy lô hàng với ID: ${lotIdFromUrl}.`,
            duration: 5,
          });
        });
    }
  }, [lotIdFromUrl, inventoryList, dispatch]);

  useEffect(() => {
    if (isIdle) {
      fetchData();
    }
  }, [dispatch, isIdle]); // initial fetch

  useEffect(() => {
    // fetch when paging or search changes
    if (!isIdle) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, pageSize, debouncedSearchText]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchText(searchText), 500);
    return () => clearTimeout(t);
  }, [searchText]);

  // update local table data when store changes
  useEffect(() => {
    if (isSucceeded && inventoryList) {
      const lots = inventoryList.data || [];
      const pagination = inventoryList.pagination || {};
      const dataWithKeys = lots.map((lot) => ({ ...lot, key: lot.id }));
      setData(dataWithKeys);
      setTotal(pagination.total || dataWithKeys.length);
    } else if (isSucceeded && !inventoryList) {
      setData([]);
      setTotal(0);
    }
  }, [inventoryList, isSucceeded]);

  // handlers
  const handleRefreshData = () => {
    fetchData({ q: undefined, limit: pageSize, offset: 0 });
    setCurrent(1);
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
    setSelectedLot(record);
    setModalVisible(true);
    setActiveTab("detail");
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedLot(null);
    setActiveTab("detail");
    // Remove lotId from URL without reloading
    if (lotIdFromUrl) {
      navigate("/inventory-lot", { replace: true });
    }
  };

  const handleAddInvenLot = () => setAddModalVisible(true);
  const handleAddModalClose = () => setAddModalVisible(false);
  const handleAddSuccess = () => fetchData();

  const handleEditInvenLot = (lot) => {
    setEditingLot(lot);
    setEditModalVisible(true);
  };
  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setEditingLot(null);
  };
  const handleEditSuccess = (updatedLot) => {
    if (!updatedLot) return;
    // cập nhật selectedLot nếu đang mở cùng 1 lot
    setSelectedLot((prev) =>
      prev && prev.id === updatedLot.id ? { ...prev, ...updatedLot } : prev
    );
    // cập nhật list
    setData((prev) => prev.map((it) => (it.id === updatedLot.id ? { ...it, ...updatedLot } : it)));
  };
  //handle delete
  const handleDeleteInvenLot = (lot) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: (
        <span>
          Bạn có chắc chắn muốn xóa lô hàng <strong>{lot.lotNo}</strong> không?
        </span>
      ),
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        dispatch(deleteInventoryLot(lot.id))
          .unwrap()
          .then(() => {
            notification.success({
              message: "Xóa lô hàng thành công",
              description: `Lô hàng "${lot.lotNo}" đã được xóa.`,
              duration: 5,
            });
            fetchData();
          })
          .catch((err) => {
            const description =
              err?.message || deleteError?.message || "Đã xảy ra lỗi khi xóa lô hàng.";
            notification.error({
              message: "Xóa lô hàng thất bại",
              description,
              duration: 5,
            });
          });
      },
    });
  };

  // expiry color helper
  const getExpiryTagColor = (expiryDate, nearExpiryDays) => {
    if (!expiryDate) return "default";
    const msPerDay = 24 * 60 * 60 * 1000;
    const today = new Date();
    // normalize both dates to local start of day to avoid time-of-day issues
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const expiry = new Date(expiryDate);
    const expiryStart = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    const diffDays = Math.floor((expiryStart - todayStart) / msPerDay);
    if (diffDays < 0) return "red";
    if (diffDays <= Number(nearExpiryDays || 0)) return "orange";
    return "green";
  };
  const columns = [
    {
      title: (
        <Space>
          Lô hàng
          <Tooltip title="Số lô">
            <QuestionCircleOutlined />
          </Tooltip>
        </Space>
      ),
      dataIndex: "lotNo",
      key: "lotNo",
      width: 180,
      render: (text) => (
        <Text
          style={{ maxWidth: 170, display: "inline-block", verticalAlign: "middle" }}
          ellipsis={{ tooltip: text }}
          strong
        >
          {text}
        </Text>
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
      width: 200,
      render: (text) => (
        <Text
          style={{ maxWidth: 180, display: "inline-block", verticalAlign: "middle" }}
          ellipsis={{ tooltip: text }}
        >
          {text}
        </Text>
      ),
    },
    {
      title: "Mã SKU",
      dataIndex: "skuCode",
      key: "skuCode",
      width: 140,
      render: (text) => (
        <Tag color="purple" style={{ marginLeft: 8 }}>
          {text}
        </Tag>
      ),
    },
    {
      title: "Kho / Cơ sở",
      dataIndex: "departmentName",
      key: "departmentName",
      width: 160,
      render: (text, record) => (
        <>
          {record.departmentCode && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {record.departmentCode}
            </Tag>
          )}
        </>
      ),
    },
    {
      title: "Tồn kho",
      dataIndex: "qtyOnHand",
      key: "qtyOnHand",
      width: 120,
      render: (val, record) => {
        const qty = Number(val || 0);
        const threshold = Number(record.lowStockThreshold || 0);
        let color = "green";
        if (qty <= threshold) color = "red";
        return (
          <Tag color={color} style={{ minWidth: 60, textAlign: "center" }}>
            {qty.toLocaleString("en-US")}
          </Tag>
        );
      },
    },
    {
      title: "Hạn sử dụng",
      dataIndex: "expiryDate",
      key: "expiryDate",
      width: 160,
      // onFilter: (value, record) => {
      //   if (!record.expiryDate) return false;
      //   const msPerDay = 24 * 60 * 60 * 1000;
      //   const today = new Date();
      //   const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      //   const expiry = new Date(record.expiryDate);
      //   const expiryStart = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
      //   const diffDays = Math.floor((expiryStart - todayStart) / msPerDay);
      //   if (value === "expired") return diffDays < 0;
      //   if (value === "near")
      //     return diffDays >= 0 && diffDays <= Number(record.nearExpiryDays || 0);
      //   if (value === "valid") return diffDays > Number(record.nearExpiryDays || 0);
      //   return false;
      // },
      // filters: [
      //   { text: "Đã hết hạn", value: "expired" },
      //   { text: "Gần hết hạn", value: "near" },
      //   { text: "Còn hạn", value: "valid" },
      // ],
      render: (val, record) => {
        if (!val) return <Text type="secondary">Không có</Text>;
        const color = getExpiryTagColor(val, record.nearExpiryDays);
        return (
          <Tag color={color}>
            {new Date(val).toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </Tag>
        );
      },
    },
  ];
  if (userRole === "admin" || userRole === "manager") {
    columns.push({
      title: "Thao tác",
      key: "actions",
      width: 80,
      render: (_, record) => (
        <Space size="small">
          {(userRole === "admin" || userRole === "manager") && (
            <>
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditInvenLot(record);
                }}
              />
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteInvenLot(record);
                }}
              />
            </>
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
  const handleLotUpdate = (updatedLotData) => {
    setSelectedLot(updatedLotData);
    if (selectedLot && selectedLot.id === updatedLotData.id) {
      setSelectedLot((prevLot) => ({
        ...prevLot,
        ...updatedLotData,
      }));
    }
    // Cập nhật data trong danh sách
    setData((prevData) =>
      prevData.map((item) =>
        item.id === updatedLotData.id ? { ...item, ...updatedLotData } : item
      )
    );
  };

  return (
    <div className="table-page-container">
      <Card className="table-card" style={{ height: "100%" }}>
        {/* Header */}
        <div className="table-header">
          <div className="invenLotManage-headerContainer">
            <Title level={3}>Danh sách lô hàng</Title>
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

        {/* Error state */}
        {isFailed && (
          <div className="invenLotManage-errorContainer">
            <div className="invenLotManage-errorIconContainer">
              <WarningOutlined className="invenLotManage-errorIcon" />
            </div>
            <div className="invenLotManage-errorContent">
              <Text type="danger" className="invenLotManage-errorTitle">
                Không thể tải dữ liệu
              </Text>
              <Text className="invenLotManage-errorDescription">
                {fetchListError?.message ||
                  fetchListError ||
                  "Đã xảy ra lỗi khi tải danh sách lô hàng."}
              </Text>
            </div>
            <Space size="middle">
              <Button
                type="primary"
                size="large"
                onClick={handleRefreshData}
                icon={<ReloadOutlined />}
                className="invenLotManage-retryButton"
              >
                Thử lại
              </Button>
              <Button
                size="large"
                onClick={() => window.location.reload()}
                className="invenLotManage-reloadButton"
              >
                Tải lại trang
              </Button>
            </Space>
          </div>
        )}

        {(isSucceeded || isLoading) && (
          <>
            <div className="table-toolbar">
              <div className="table-search">
                <Input
                  placeholder="Tìm theo mã SKU, tên sản phẩm, mã lô, cơ sở"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  size="middle"
                  allowClear
                />
              </div>
              <div className="table-actions">
                {(userRole === "admin" || userRole === "manager") && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="middle"
                    disabled={isLoading}
                    onClick={handleAddInvenLot}
                  >
                    Thêm lô hàng
                  </Button>
                )}
                {/* <Button
                  icon={<ImportOutlined />}
                  size="middle"
                  disabled={isLoading}
                  onClick={() => setImportModalVisible(true)}
                >
                  Nhập file
                </Button>
                <ExportInventoryExcelButton
                  selectedRows={data.filter((item) => selectedRowKeys.includes(item.key))}
                  loading={isLoading}
                /> */}
              </div>
            </div>

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
                    if (
                      !e.target.closest(".ant-checkbox-wrapper") &&
                      !e.target.closest("button") &&
                      !e.target.closest(".ant-popover")
                    ) {
                      handleRowClick(record);
                    }
                  },
                  style: { cursor: "pointer" },
                })}
              />
            </div>

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
                  showTotal={(t, range) => `${range[0]}-${range[1]} của ${t} mục`}
                  pageSizeOptions={["10", "20", "50", "100"]}
                  size="small"
                  disabled={isLoading}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        title={
          <div className="invenLotManage-modalTitleContainer">
            <GoldOutlined style={{ fontSize: 22, color: "#1677ff", flexShrink: 0 }} />
            <span className="invenLotManage-modalLotNo">Mã lô hàng: {selectedLot?.lotNo}</span>
            <Tag color="blue" className="invenLotManage-modalDepartmentName">
              {selectedLot?.departmentName}
            </Tag>
          </div>
        }
        className="invenLotManage-custom-modal"
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={700}
        loading={fetchByIdStatus === "loading"}
        style={{ top: 32 }}
      >
        {selectedLot && (
          <div className="lot-detail-modal">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: "detail",
                  label: "Chi tiết lô hàng",
                  children: (
                    <div className="lot-detail-grid">
                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">ID lô hàng:</Text>
                        <div className="lot-detail-value">{selectedLot.id}</div>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Mã lô hàng:</Text>
                        <div className="lot-detail-value" style={{ fontWeight: 600 }}>
                          {selectedLot.lotNo}
                        </div>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Tên sản phẩm:</Text>
                        <div className="lot-detail-value">{selectedLot.productName}</div>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Mã SKU:</Text>
                        <div className="lot-detail-value">{selectedLot.skuCode}</div>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Cơ sở:</Text>
                        <div className="lot-detail-value">
                          <Tag color="blue">{selectedLot.departmentName}</Tag>-{" "}
                          {selectedLot.departmentCode}
                        </div>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Số lượng tồn kho:</Text>
                        <div className="lot-detail-value">
                          <Tag
                            color={
                              Number(selectedLot.qtyOnHand || 0) <=
                              Number(selectedLot.lowStockThreshold || 0)
                                ? "red"
                                : "green"
                            }
                            style={{ minWidth: 60, textAlign: "center" }}
                          >
                            {Number(selectedLot.qtyOnHand || 0).toLocaleString("en-US")}
                          </Tag>
                        </div>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Hạn sử dụng:</Text>
                        <div className="lot-detail-value">
                          {selectedLot.expiryDate ? (
                            <Tag
                              color={getExpiryTagColor(
                                selectedLot.expiryDate,
                                selectedLot.nearExpiryDays
                              )}
                            >
                              {new Date(selectedLot.expiryDate).toLocaleDateString("vi-VN")}
                            </Tag>
                          ) : (
                            "Không có"
                          )}
                        </div>
                      </LiquidGlassPanel>
                    </div>
                  ),
                },
                {
                  key: "conversion",
                  label: "Tỉ lệ chuyển đổi đơn vị",
                  children: (
                    <div>
                      <UnitConversion lotId={selectedLot?.id} onUpdate={handleLotUpdate} />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      <AddInvenLotModal
        visible={addModalVisible}
        onCancel={handleAddModalClose}
        onSuccess={handleAddSuccess}
      />

      <EditInvenLotModal
        visible={editModalVisible}
        onCancel={handleEditModalClose}
        onSuccess={handleEditSuccess}
        invenLotData={editingLot}
      />
      {/* <ImportInventoryLotModal
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
      /> */}
    </div>
  );
};

export default InvenLotManage;
