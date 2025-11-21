import React, { useEffect, useState } from "react";

import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExportOutlined,
  ImportOutlined,
  NumberOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
import "@assets/department/DepartmentManage.css";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import {
  deleteDepartment,
  fetchListDepartments,
  updateDepartmentStatus,
} from "@src/store/departmentSlice";
import {
  Button,
  Card,
  Input,
  Modal,
  Pagination,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

import AddDepartmentModal from "./AddDepartmentModal";
import EditDepartmentModal from "./EditDepartmentModal";

const { Title, Text } = Typography;

const DepartmentManage = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Chuyển từ const thành state
  const [total, setTotal] = useState(0); // Thêm state cho total

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  // Mapping màu cho từng mã cơ sở
  const departmentColorMap = {
    IT: "blue",
    HR: "green",
    ACC: "purple",
    SALE: "orange",
    MKT: "magenta",
    ADMIN: "red",
    LOGIS: "cyan",
    SHIP: "gold",
    SUPP: "lime",
    PICK: "volcano",
    DEFAULT: "geekblue",
  };

  // Mapping màu cho status
  const statusColorMap = {
    active: "green",
    disable: "red",
  };

  // Mapping label cho status
  const statusLabelMap = {
    active: "Hoạt động",
    disable: "Không hoạt động",
  };

  // Helper functions
  const getDepartmentColor = (code) => {
    return departmentColorMap[code] || departmentColorMap.DEFAULT;
  };

  const getStatusColor = (status) => {
    return statusColorMap[status] || "default";
  };

  const getStatusLabel = (status) => {
    return statusLabelMap[status] || status;
  };

  const dispatch = useDispatch();
  const departmentList = useSelector((state) => state.department.departments);
  const status = useSelector((state) => state.department.fetchStatus);
  const error = useSelector((state) => state.department.fetchError);
  const updateDepartmentStatusError = useSelector(
    (state) => state.department.updateDepartmentStatusError
  );

  // Xác định các trạng thái loading
  const isLoading = status === "loading";
  const isIdle = status === "idle";
  const isSucceeded = status === "succeeded";
  const isFailed = status === "failed";

  // Fetch data với pagination parameters
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    dispatch(fetchListDepartments(requestParams));
  };

  // Fetch data khi component mount
  useEffect(() => {
    if (status === "idle") {
      fetchData();
    }
  }, [dispatch, status]);

  // Fetch data khi pagination parameters thay đổi
  useEffect(() => {
    if (status !== "idle") {
      fetchData();
    }
  }, [current, pageSize, debouncedSearchText]);

  // Fetch data khi search text thay đổi với debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [searchText]);
  useEffect(() => {
    if (debouncedSearchText !== searchText) return; // Chờ debounce hoàn thành

    if (current !== 1) {
      setCurrent(1);
    }
  }, [debouncedSearchText]);

  // Cập nhật data khi response từ API thay đổi
  useEffect(() => {
    if (isSucceeded && departmentList) {
      // Xử lý response từ backend
      const departments = departmentList.data || [];
      const pagination = departmentList.pagination || {};

      const dataWithKeys = departments.map((dept, index) => ({
        ...dept,
        key: dept.id || index.toString(),
      }));

      setData(dataWithKeys);
      setTotal(pagination.total || 0);
    } else if (isSucceeded && !departmentList) {
      setData([]);
      setTotal(0);
    }
  }, [departmentList, isSucceeded]);

  // Add department handlers
  const handleAddDepartment = () => {
    setAddModalVisible(true);
  };

  const handleAddModalClose = () => {
    setAddModalVisible(false);
  };

  const handleAddDepartmentSuccess = () => {
    fetchData(); // Refresh current page
  };

  // Edit department handlers
  const handleEditDepartment = (department) => {
    setEditingDepartment(department);
    setEditModalVisible(true);
  };

  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setEditingDepartment(null);
  };

  const handleEditDepartmentSuccess = () => {
    fetchData(); // Refresh current page
  };

  // Refresh data
  const handleRefreshData = () => {
    fetchData();
  };

  // Xử lý tìm kiếm
  const handleSearch = (value) => {
    setSearchText(value);
    setSelectedRowKeys([]); // Reset selected rows
  };

  // Xử lý thay đổi pagination
  const handlePageChange = (page, size) => {
    if (size !== pageSize) {
      setPageSize(size);
      setCurrent(1); // Reset về trang 1 khi thay đổi page size
    } else {
      setCurrent(page);
    }
    setSelectedRowKeys([]); // Reset selected rows
  };

  // Xử lý click vào hàng
  const handleRowClick = (record) => {
    setSelectedDepartment(record);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedDepartment(null);
  };

  // Hàm xử lý thay đổi trạng thái
  const handleStatusChange = (record, checked) => {
    const newStatus = checked ? "active" : "disable";
    const actionText = checked ? "kích hoạt" : "vô hiệu hóa";

    Modal.confirm({
      title: `Xác nhận ${actionText} cơ sở`,
      content: `Bạn có chắc chắn muốn ${actionText} cơ sở "${record.name}" không?`,
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        setLoadingStates((prev) => ({
          ...prev,
          [record.id]: true,
        }));
        dispatch(updateDepartmentStatus({ departmentId: record.id, status: newStatus }))
          .unwrap()
          .then(() => {
            notification.success({
              message: `${checked ? "Kích hoạt" : "Vô hiệu hóa"} thành công`,
              description: `Cơ sở "${record.name}" đã được ${actionText}.`,
              duration: 3,
            });
            // Refresh current page
            fetchData();
          })
          .catch((error) => {
            notification.error({
              message: "Cập nhật trạng thái thất bại",
              description:
                updateDepartmentStatusError || `Không thể ${actionText} cơ sở "${record.name}".`,
              duration: 5,
            });
          })
          .finally(() => {
            setLoadingStates((prev) => ({
              ...prev,
              [record.id]: false,
            }));
          });
      },
    });
  };
  const handleDeleteDepartment = (record) => {
    Modal.confirm({
      title: "Xác nhận xóa cơ sở",
      content: `Bạn có chắc chắn muốn xóa cơ sở "${record.name}" không? Hành động này không thể hoàn tác.`,
      okText: "Xác nhận",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        // Dispatch action xóa cơ sở ở đây
        dispatch(deleteDepartment(record.id))
          .unwrap()
          .then(() => {
            notification.success({
              message: "Xóa cơ sở thành công",
              description: `Cơ sở "${record.name}" đã được xóa.`,
              duration: 3,
            });
            // Refresh current page
            fetchData();
          })
          .catch((error) => {
            notification.error({
              message: "Xóa cơ sở thất bại",
              description: error || `Không thể xóa cơ sở "${record.name}".`,
              duration: 5,
            });
          });
      },
    });
  };

  // Định nghĩa các cột của bảng
  const columns = [
    {
      title: (
        <Space>
          Mã cơ sở
          <Tooltip title="Mã viết tắt của cơ sở">
            <QuestionCircleOutlined className="departManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (text) => (
        <Tag color={getDepartmentColor(text)} className="department-code-tag">
          {text}
        </Tag>
      ),
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: (
        <Space>
          Tên cơ sở
          <Tooltip title="Tên đầy đủ của cơ sở">
            <QuestionCircleOutlined className="departManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (text) => <span className="supplier-name-link">{text}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: (
        <Space>
          Địa chỉ
          <Tooltip title="Địa chỉ văn phòng của cơ sở">
            <QuestionCircleOutlined className="departManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "address",
      key: "address",
      width: 350,
      render: (text) => (
        <Tooltip title={text}>
          <span
            style={{
              maxWidth: "330px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "inline-block",
            }}
          >
            {text || "Chưa có địa chỉ"}
          </span>
        </Tooltip>
      ),
    },
    {
      title: (
        <Space>
          Trạng thái
          <Tooltip title="Trạng thái hoạt động của cơ sở">
            <QuestionCircleOutlined className="departManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>,
      sorter: (a, b) => a.status.localeCompare(b.status),
      filters: [
        { text: "Hoạt động", value: "active" },
        { text: "Không hoạt động", value: "disable" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditDepartment(record);
              }}
            />
          </Tooltip>
          <Tooltip title={record.status === "active" ? "Vô hiệu hóa" : "Kích hoạt"}>
            <Switch
              size="small"
              checked={record.status === "active"}
              // onChange={(checked) => handleStatusChange(record, checked)}
              // onClick={(e) => {
              //   e.stopPropagation();
              // }}
              onChange={(checked, event) => {
                // event có thể undefined trong một số trường hợp
                if (event) {
                  event.stopPropagation();
                }
                handleStatusChange(record, checked);
              }}
              loading={loadingStates[record.id] || false}
              disabled={loadingStates[record.id] || false}
            />
          </Tooltip>
          <Tooltip title="Xóa cơ sở">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteDepartment(record);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

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
    data.forEach((dept) => {
      counts[dept.status] = (counts[dept.status] || 0) + 1;
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
          <div className="departManage-headerContainer">
            <Title level={3}>Danh sách cơ sở</Title>
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

        {/* Loading state khi idle */}
        {isIdle && (
          <div className="departManage-loadingContainer">
            <Spin size="large" />
            <div className="departManage-loadingText">
              <Text>Đang khởi tạo...</Text>
            </div>
          </div>
        )}

        {/* Error state */}
        {isFailed && (
          <div className="departManage-errorContainer">
            <div className="departManage-errorIconContainer">
              <WarningOutlined className="departManage-errorIcon" />
            </div>
            <div className="departManage-errorContent">
              <Text type="danger" className="departManage-errorTitle">
                Không thể tải dữ liệu
              </Text>
              <Text className="departManage-errorDescription">
                {error || "Đã xảy ra lỗi khi tải danh sách cơ sở"}
              </Text>
            </div>
            <Space size="middle">
              <Button
                type="primary"
                size="large"
                onClick={handleRefreshData}
                icon={<ReloadOutlined />}
                className="departManage-retryButton"
              >
                Thử lại
              </Button>
              <Button
                size="large"
                onClick={() => window.location.reload()}
                className="departManage-reloadButton"
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
                placeholder="Tìm theo tên, mã cơ sở, địa chỉ hoặc trạng thái"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                size="middle"
                allowClear
                // disabled={isLoading}
              />
            </div>
            <div className="table-actions">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="middle"
                disabled={isLoading}
                onClick={handleAddDepartment}
              >
                Thêm cơ sở
              </Button>
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
                dataSource={data} // Sử dụng data trực tiếp từ API
                pagination={false} // Tắt pagination built-in
                scroll={{ x: 900, y: "calc(100vh - 280px)" }}
                size="middle"
                loading={isLoading}
                onRow={(record) => ({
                  onClick: (e) => {
                    if (
                      !e.target.closest(".ant-checkbox-wrapper") &&
                      !e.target.closest("button") &&
                      !e.target.closest(".ant-popover") &&
                      !e.target.closest(".ant-switch")
                    ) {
                      handleRowClick(record);
                    }
                  },
                  style: { cursor: "pointer" },
                })}
              />
            </div>

            {/* Summary và Pagination */}
            <div className="table-footer">
              <div className="summary-section">
                <span className="summary-item">
                  Tổng số: {total} | Trang hiện tại: {data.length}
                </span>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <span key={status} className="summary-item">
                    <Tag color={getStatusColor(status)} size="small" style={{ margin: "0 4px" }}>
                      {getStatusLabel(status)}
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

      {/* Modal hiển thị chi tiết cơ sở */}
      <Modal
        title={
          <div className="departManage-modalTitle">
            <BankOutlined style={{ fontSize: "24px", color: "#1890ff", marginRight: "8px" }} />
            <span className="departManage-modalFullName">{selectedDepartment?.name}</span>
            <Tag color={getStatusColor(selectedDepartment?.status)} style={{ marginLeft: "8px" }}>
              {getStatusLabel(selectedDepartment?.status)}
            </Tag>
          </div>
        }
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={700}
        style={{ top: 20 }}
        className="custom-modal"
      >
        {selectedDepartment && (
          <div>
            {/* Thông tin tổng quan */}
            {/* <div className="departManage-summaryContainer">
              <div>
                <Text strong>Mã cơ sở: </Text>
                <Tag color={getDepartmentColor(selectedDepartment.code)}>
                  {selectedDepartment.code}
                </Tag>
              </div>
              <div>
                <Text strong>Tên cơ sở: </Text>
                <Text>{selectedDepartment.name}</Text>
              </div>
              <div>
                <Text strong>Trạng thái: </Text>
                <Tag color={getStatusColor(selectedDepartment.status)}>
                  {getStatusLabel(selectedDepartment.status)}
                </Tag>
              </div>
            </div> */}

            {/* Tabs */}
            <Tabs
              defaultActiveKey="1"
              items={[
                {
                  key: "1",
                  label: "Thông tin chi tiết",
                  children: (
                    <div className="departManage-tabContent">
                      <Title level={5}>Thông tin cơ sở</Title>
                      <div className="departManage-detailGrid">
                        <LiquidGlassPanel>
                          <Text strong>ID cơ sở:</Text>
                          <br />
                          <Text className="departManage-idText">{selectedDepartment.id}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>Mã cơ sở:</Text>
                          <br />
                          <Tag color={getDepartmentColor(selectedDepartment.code)}>
                            {selectedDepartment.code}
                          </Tag>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>Tên cơ sở:</Text>
                          <br />
                          <Text>{selectedDepartment.name}</Text>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel>
                          <Text strong>Trạng thái:</Text>
                          <br />
                          <Tag color={getStatusColor(selectedDepartment.status)}>
                            {getStatusLabel(selectedDepartment.status)}
                          </Tag>
                        </LiquidGlassPanel>
                        <LiquidGlassPanel style={{ gridColumn: "1 / -1" }}>
                          <Text strong>Địa chỉ:</Text>
                          <br />
                          <Space>
                            <EnvironmentOutlined />
                            <Text>{selectedDepartment.address || "Chưa có địa chỉ"}</Text>
                          </Space>
                        </LiquidGlassPanel>
                      </div>
                    </div>
                  ),
                },
                // {
                //   key: "2",
                //   label: "Danh sách nhân viên",
                //   children: (
                //     <div className="departManage-developingFeature">
                //       <Text type="secondary">Chức năng đang được phát triển</Text>
                //     </div>
                //   ),
                // },
                // {
                //   key: "3",
                //   label: "Thống kê",
                //   children: (
                //     <div className="departManage-developingFeature">
                //       <Text type="secondary">Chức năng đang được phát triển</Text>
                //     </div>
                //   ),
                // },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Modal thêm department */}
      <AddDepartmentModal
        visible={addModalVisible}
        onCancel={handleAddModalClose}
        onSuccess={handleAddDepartmentSuccess}
      />

      {/* Modal edit department */}
      <EditDepartmentModal
        visible={editModalVisible}
        onCancel={handleEditModalClose}
        onSuccess={handleEditDepartmentSuccess}
        departData={editingDepartment}
      />
    </div>
  );
};

export default DepartmentManage;
