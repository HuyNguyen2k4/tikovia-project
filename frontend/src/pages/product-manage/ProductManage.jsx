import React, { useEffect, useState } from "react";

import {
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  LockOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnlockOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
import "@assets/product-manage/product-manage.css";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import {
  fetchListProducts,
  fetchProductById,
  refreshAllProductStatuses,
  refreshProductStatus,
  updateProductAdminLocked,
  updateProductStatus,
} from "@src/store/productSlice";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Image,
  Input,
  Modal,
  Pagination,
  Row,
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

import AddProductModal from "./AddProductModal";
import EditProductModal from "./EditProductModal";
import ExportInventoryExcelButton from "./ExportInventoryExcelButton";
import ImportProductModal from "./ImportProductModal";
import InventoryLotByProduct from "./InventoryLotByProduct";

const { Title, Text } = Typography;

const ProductManage = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [activeTabKey, setActiveTabKey] = useState("1");

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [refreshingStates, setRefreshingStates] = useState({}); // trạng thái loading cho từng sản phẩm
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // take product data from redux
  const productList = useSelector((state) => state.product.products);
  const status = useSelector((state) => state.product.fetchStatus);
  const error = useSelector((state) => state.product.fetchError);
  const productById = useSelector((state) => state.product.product);
  const fetchProductByIdStatus = useSelector((state) => state.product.fetchProductByIdStatus);
  // take user role from redux
  const userRole = useSelector((state) => state.auth.user?.role);
  // trạng thái loading cho refresh status từng sản phẩm
  const refreshAllLoading = useSelector((state) => state.product.refreshAllStatus === "loading");

  const isLoading = status === "loading";
  const isIdle = status === "idle";
  const isSucceeded = status === "succeeded";
  const isFailed = status === "failed";

  // Get productId from URL
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const productIdFromUrl = queryParams.get("productId");
  // Fetch data với pagination parameters
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    dispatch(fetchListProducts(requestParams));
  };
  // Open modal if productIdFromUrl changes and matches an existing product
  useEffect(() => {
    if (productIdFromUrl) {
      const matchingProduct = data.find((item) => item.id === productIdFromUrl);
      if (matchingProduct) {
        setSelectedProduct(matchingProduct);
        setModalVisible(true);
      } else {
        // Nếu chưa có, fetch riêng product này
        dispatch(fetchProductById(productIdFromUrl))
          .unwrap()
          .then(() => {
            setSelectedProduct(productById);
            setModalVisible(true);
          })
          .catch(() => {
            notification.error({
              message: "Lỗi",
              description: "Không thể tìm thấy sản phẩm.",
              duration: 5,
            });
          });
      }
    }
  }, [productIdFromUrl, data]);

  // Fetch data khi component mount
  useEffect(() => {
    if (status === "idle") {
      fetchData();
    }
  }, []);

  // Fetch data khi pagination hoặc search thay đổi
  useEffect(() => {
    if (status !== "idle") {
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
    if (isSucceeded && productList) {
      const products = productList.data || [];
      const pagination = productList.pagination || {};
      const dataWithKeys = products.map((product, index) => ({
        ...product,
        key: product.id || index.toString(),
      }));
      setData(dataWithKeys);
      setTotal(pagination.total || 0);
    } else if (isSucceeded && !productList) {
      setData([]);
      setTotal(0);
    }
  }, [productList, isSucceeded]);
  //Mở form add bằng URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("add") === "true") {
      setAddModalVisible(true);
    }
  }, [location.search]);

  // Add product handlers
  const handleAddProduct = () => {
    // setAddModalVisible(true);
    navigate("/products?add=true");
  };
  const handleAddModalClose = () => {
    setAddModalVisible(false);
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("add") === "true") {
      navigate("/products", { replace: true });
    }
  };
  const handleAddProductSuccess = () => {
    fetchData();
  };

  // Edit product handlers
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditModalVisible(true);
  };
  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setEditingProduct(null);
  };
  const handleEditProductSuccess = () => {
    fetchData();
  };

  // Refresh data
  const handleRefreshData = () => {
    fetchData();
  };

  // Xử lý tìm kiếm với debounce
  const handleSearch = (value) => {
    setSearchText(value);
    setSelectedRowKeys([]);
  };

  // Xử lý thay đổi pagination
  const handlePageChange = (page, size) => {
    if (size !== pageSize) {
      setPageSize(size);
      setCurrent(1);
    } else {
      setCurrent(page);
    }
    setSelectedRowKeys([]);
  };

  // Xử lý click vào hàng
  const handleRowClick = (record) => {
    setSelectedProduct(record);
    setModalVisible(true);
  };
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedProduct(null);
    // Xoá productId khỏi URL khi đóng modal
    if (productIdFromUrl) {
      navigate("/products", { replace: true });
    }
  };
  // Cập nhật trạng thái adminLocked
  const handleToggleAdminLocked = async (product) => {
    const productId = product.id;
    const newAdminLockedStatus = !product.adminLocked;
    Modal.confirm({
      title: newAdminLockedStatus ? "Khóa sản phẩm?" : "Mở khóa sản phẩm?",
      content: (
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
            Bạn có chắc chắn muốn {newAdminLockedStatus ? "khóa" : "mở khóa"} sản phẩm này?
          </div>
          <div style={{ color: "#666", fontSize: 13, marginBottom: 8 }}>
            {newAdminLockedStatus
              ? "Sau khi khóa, sản phẩm sẽ không thể bán được."
              : "Sau khi mở khóa, sản phẩm sẽ có thể bán trở lại."}
          </div>
          <div style={{ color: "#d4380d", fontSize: 13 }}>
            Thao tác này sẽ ảnh hưởng trực tiếp đến việc kinh doanh sản phẩm!
          </div>
        </div>
      ),
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: async () => {
        dispatch(updateProductAdminLocked({ productId, adminLocked: newAdminLockedStatus }))
          .unwrap()
          .then(() => {
            notification.success({
              message: newAdminLockedStatus
                ? "Khóa sản phẩm thành công"
                : "Mở khóa sản phẩm thành công",
              description: `Sản phẩm đã được ${newAdminLockedStatus ? "khóa" : "mở khóa"}.`,
              duration: 5,
            });
            // Cập nhật lại trạng thái loading
            fetchData();
            setLoadingStates((prev) => ({ ...prev, [productId]: false }));
          })
          .catch(() => {
            notification.error({
              message: "Có lỗi xảy ra",
              description: `Không thể ${newAdminLockedStatus ? "khóa" : "mở khóa"} sản phẩm.`,
              duration: 5,
            });
            // Cập nhật lại trạng thái loading
            setLoadingStates((prev) => ({ ...prev, [productId]: false }));
          });
      },
    });
  };
  // Cập nhật trạng thái của một sản phẩm
  const handleRefreshSingleStatus = (product) => {
    setRefreshingStates((prev) => ({ ...prev, [product.id]: true }));
    dispatch(refreshProductStatus(product.id))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Làm mới trạng thái thành công",
          description: `Trạng thái sản phẩm đã được cập nhật.`,
          duration: 3,
        });
      })
      .catch(() => {
        notification.error({
          message: "Lỗi",
          description: "Không thể làm mới trạng thái sản phẩm.",
          duration: 3,
        });
      })
      .finally(() => {
        setRefreshingStates((prev) => ({ ...prev, [product.id]: false }));
      });
  };
  // Cập nhật trạng thái của tất cả sản phẩm
  const handleRefreshAllStatus = () => {
    Modal.confirm({
      title: "Làm mới trạng thái tất cả sản phẩm?",
      content: "Thao tác này sẽ cập nhật lại trạng thái cho toàn bộ sản phẩm. Bạn có chắc chắn?",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        dispatch(refreshAllProductStatuses())
          .unwrap()
          .then((res) => {
            notification.success({
              message: "Làm mới trạng thái tất cả sản phẩm thành công",
              description: res?.message || "",
              duration: 3,
            });
            fetchData(); // fetch lại toàn bộ danh sách sản phẩm
          })
          .catch((err) => {
            notification.error({
              message: "Lỗi",
              description: err?.message || "Không thể làm mới trạng thái tất cả sản phẩm.",
              duration: 3,
            });
          });
      },
    });
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

  // Render status tag
  const renderStatusTag = (status) => {
    const statusConfig = {
      active: { color: "green", text: "Đang bán" },
      disable: { color: "red", text: "Ngừng bán" },
      warning: { color: "orange", text: "Cảnh báo" },
    };
    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Định nghĩa các cột của bảng
  const columns = [
    {
      title: (
        <Space>
          Mã SKU
          <Tooltip title="Mã SKU sản phẩm">
            <QuestionCircleOutlined className="productManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "skuCode",
      key: "skuCode",
      width: 120,
      minWidth: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
      sorter: (a, b) => a.skuCode.localeCompare(b.skuCode),
    },
    {
      title: (
        <Space>
          Tên sản phẩm
          <Tooltip title="Tên sản phẩm">
            <QuestionCircleOutlined className="productManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "name",
      key: "name",
      width: 180,
      minWidth: 180,
      render: (text) => <span>{text}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: (
        <Space>
          Danh mục
          <Tooltip title="Tên danh mục sản phẩm">
            <QuestionCircleOutlined className="productManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "categoryName",
      key: "categoryName",
      width: 140,
      minWidth: 140,
      render: (text) => <Tag color="purple">{text}</Tag>,
      sorter: (a, b) => a.categoryName.localeCompare(b.categoryName),
    },
    {
      title: <Space>Trạng thái</Space>,
      dataIndex: "status",
      key: "status",
      width: 100,
      minWidth: 100,
      render: renderStatusTag,
      filters: [
        { text: "Đang bán", value: "active" },
        { text: "Ngừng bán", value: "disable" },
        { text: "Cảnh báo", value: "warning" },
      ],
      onFilter: (value, record) => record.status === value,
      sorter: (a, b) => a.status.localeCompare(b.status),
    },
  ];
  if (userRole === "admin" || userRole === "manager") {
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
                handleEditProduct(record);
              }}
              disabled={loadingStates[record.id] || false}
            />
          </Tooltip>
          <Tooltip title={record.adminLocked ? "Mở khóa" : "Khóa sản phẩm"}>
            <Button
              type="text"
              icon={record.adminLocked ? <UnlockOutlined /> : <LockOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAdminLocked(record);
              }}
              disabled={loadingStates[record.id] || false}
            />
          </Tooltip>
          <Tooltip title="Làm mới trạng thái">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              size="small"
              loading={!!refreshingStates[record.id]}
              onClick={(e) => {
                e.stopPropagation();
                handleRefreshSingleStatus(record);
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
    onSelectAll: (selected, selectedRows, changeRows) => {
      if (selected) {
        setSelectedRowKeys(data.map((item) => item.key));
      } else {
        setSelectedRowKeys([]);
      }
    },
    getCheckboxProps: (record) => ({
      onClick: (e) => e.stopPropagation(),
    }),
  };

  // Summary cho trang hiện tại
  const getSummaryByStatus = () => {
    const counts = {};
    data.forEach((product) => {
      counts[product.status] = (counts[product.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getSummaryByStatus();

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
          <div className="productManage-headerContainer">
            <Title level={3}>Danh sách sản phẩm</Title>
            <div>
              {userRole === "admin" && (
                <>
                  <Button
                    size="middle"
                    style={{ marginRight: 12 }}
                    icon={<ReloadOutlined />}
                    loading={refreshAllLoading}
                    disabled={refreshAllLoading}
                    onClick={handleRefreshAllStatus}
                  >
                    Làm mới toàn bộ trạng thái
                  </Button>
                </>
              )}
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

        {/* Loading state khi idle */}
        {isIdle && (
          <div className="productManage-loadingContainer">
            <Spin size="large" />
            <div className="productManage-loadingText">
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
                {error?.message || "Đã xảy ra lỗi khi tải danh sách sản phẩm"}
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
              <Button
                size="large"
                onClick={() => window.location.reload()}
                className="productManage-reloadButton"
              >
                Tải lại trang
              </Button>
            </Space>
          </div>
        )}

        {/* Toolbar */}
        {(isSucceeded || isLoading) && (
          <div className="table-toolbar">
            <div className="table-search">
              <Input
                placeholder="Theo tên, mã SKU, danh mục"
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
                  onClick={handleAddProduct}
                >
                  Thêm sản phẩm
                </Button>
              )}
              <Button
                icon={<ImportOutlined />}
                size="middle"
                disabled={isLoading}
                onClick={() => setImportModalVisible(true)}
              >
                Nhập file
              </Button>
              {/* <Button icon={<ExportOutlined />} size="middle" disabled={isLoading}>
                Xuất file
              </Button> */}
              <ExportInventoryExcelButton
                selectedRows={data
                  .filter((item) => selectedRowKeys.includes(item.key))
                  .map((item) => ({
                    ...item,
                    productId: item.id, // Thêm productId cho đúng định dạng backend yêu cầu
                  }))}
                loading={isLoading}
              />
            </div>
          </div>
        )}

        {/* Table */}
        {(isSucceeded || isLoading) && (
          <>
            <div className="custom-table">
              <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={data}
                pagination={false}
                scroll={{ x: 1000, y: "calc(100vh - 280px)" }}
                tableLayout="fixed"
                size="middle"
                loading={isLoading}
                onRow={(record) => ({
                  onClick: (e) => {
                    if (
                      !e.target.closest(".ant-checkbox-wrapper") &&
                      !e.target.closest("button") &&
                      !e.target.closest(".ant-popover")
                    ) {
                      setSelectedProduct(record);
                      setActiveTabKey("1");
                      setModalVisible(true);
                    }
                  },
                  style: { cursor: "pointer" },
                })}
              />
            </div>
            {/* Summary và Pagination */}
            <div className="table-footer">
              <div style={{ flexWrap: "wrap" }}>
                <span className="summary-item">
                  Tổng số: {total} | Trang hiện tại: {data.length}
                </span>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <span key={status} className="summary-item mx-2" style={{ flexGrow: 1 }}>
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

      {/* Modal hiển thị chi tiết sản phẩm */}
      <Modal
        title={
          <div className="productManage-modalTitle">
            <span className="productManage-modalFullName">{selectedProduct?.name}</span>
            {selectedProduct && renderStatusTag(selectedProduct.status)}
          </div>
        }
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={1000}
        className="custom-modal"
        loading={fetchProductByIdStatus === "loading"}
        style={{ top: 20 }}
      >
        {selectedProduct && (
          <div>
            <div className="">
              <Row>
                <Col span={12}>
                  <div>
                    <Text strong>Mã SKU: </Text>
                    <Text>{selectedProduct.skuCode}</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text strong>Tên sản phẩm: </Text>
                    <Text>{selectedProduct.name}</Text>
                  </div>
                </Col>
              </Row>
            </div>
            <Tabs
              activeKey={activeTabKey}
              onChange={(key) => setActiveTabKey(key)}
              items={[
                {
                  key: "1",
                  label: "Thông tin chi tiết",
                  children: (
                    <div className="productManage-tabContent">
                      <Row gutter={[24, 16]}>
                        <Col xs={24} sm={8} md={7} lg={7} xl={7}>
                          <div
                            className="productManage-imageContainer"
                            style={{ textAlign: "center" }}
                          >
                            <Image
                              src={selectedProduct.imgUrl}
                              alt={selectedProduct.name}
                              className="productManage-image"
                              style={{ maxWidth: "100%", maxHeight: 220, objectFit: "cover" }}
                            />
                          </div>
                        </Col>
                        <Col xs={24} sm={16} md={17} lg={17} xl={17}>
                          <div className="productManage-detailGrid">
                            {/* <div className="productManage-detailGridItem"> */}
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>ID sản phẩm:</Text>
                              <br />
                              <Text className="productManage-idText">{selectedProduct.id}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Mã SKU:</Text>
                              <br />
                              <Text>{selectedProduct.skuCode}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Tên sản phẩm:</Text>
                              <br />
                              <Text>{selectedProduct.name}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Danh mục:</Text>
                              <br />
                              <Text>{selectedProduct.categoryName}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Trạng thái:</Text>
                              <br />
                              {renderStatusTag(selectedProduct.status)}
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Ngày tạo:</Text>
                              <br />
                              <Text>{formatDate(selectedProduct.createdAt)}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Cập nhật lần cuối:</Text>
                              <br />
                              <Text>{formatDate(selectedProduct.updatedAt)}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Ngưỡng cảnh báo gần hết hàng:</Text>
                              <br />
                              <Text>{selectedProduct.lowStockThreshold}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Ngưỡng cảnh báo gần hết hạn:</Text>
                              <br />
                              <Text>{selectedProduct.nearExpiryDays}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Trạng thái khóa sản phẩm:</Text>
                              <br />
                              <Text>{selectedProduct.adminLocked ? "Đã khóa" : "Không khóa"}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Đơn vị đóng gói:</Text>
                              <br />
                              <Text>{selectedProduct.packUnit}</Text>
                            </LiquidGlassPanel>
                            <LiquidGlassPanel padding={12} radius={12}>
                              <Text strong>Đơn vị chính:</Text>
                              <br />
                              <Text>{selectedProduct.mainUnit}</Text>
                            </LiquidGlassPanel>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  ),
                },
                {
                  key: "2",
                  label: "Danh sách lô hàng",
                  children: (
                    <>
                      <InventoryLotByProduct
                        productId={selectedProduct.id}
                        lowStockThreshold={selectedProduct.lowStockThreshold}
                        nearExpiryDays={selectedProduct.nearExpiryDays}
                      />
                    </>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Modal thêm sản phẩm */}
      <AddProductModal
        visible={addModalVisible}
        onCancel={handleAddModalClose}
        onSuccess={handleAddProductSuccess}
      />

      {/* Modal edit sản phẩm */}
      <EditProductModal
        visible={editModalVisible}
        onCancel={handleEditModalClose}
        onSuccess={handleEditProductSuccess}
        productData={editingProduct}
      />
      <ImportProductModal
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};

export default ProductManage;
