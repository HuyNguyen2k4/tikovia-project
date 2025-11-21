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
import "@assets/user/UserManage.css";
import CircleStatus from "@src/components/common/CircleStatus";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import { fetchListAllDepartments, fetchListDepartments } from "@src/store/departmentSlice";
import { fetchListUsers, updateUserStatus } from "@src/store/userSlice";
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
  Tabs,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import UserDetailModal from "./UserDetailModal";

const { Title, Text } = Typography;

const UserManage = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  const dispatch = useDispatch();
  const userList = useSelector((state) => state.user.users);
  const status = useSelector((state) => state.user.fetchStatus);
  const error = useSelector((state) => state.user.fetchError);
  const updateStatusError = useSelector((state) => state.user.updateStatusError);

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
    dispatch(fetchListUsers(requestParams));
  };

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
    if (isSucceeded && userList) {
      // Xử lý response từ backend
      const users = userList.data || [];
      const pagination = userList.pagination || {};

      const dataWithKeys = users.map((user, index) => ({
        ...user,
        key: user.id || index.toString(),
      }));

      setData(dataWithKeys);
      setTotal(pagination.total || 0);
    } else if (isSucceeded && !userList) {
      setData([]);
      setTotal(0);
    }
  }, [userList, isSucceeded]);

  // Add user handlers
  const handleAddUser = () => {
    setAddModalVisible(true);
  };

  const handleAddModalClose = () => {
    setAddModalVisible(false);
  };

  const handleAddUserSuccess = () => {
    fetchData();
  };

  // Edit user handlers
  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditModalVisible(true);
  };

  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setEditingUser(null);
  };

  const handleEditUserSuccess = () => {
    fetchData();
  };

  // Refresh data
  const handleRefreshData = () => {
    fetchData();
  };

  // Xử lý tìm kiếm với debounce
  const handleSearch = (value) => {
    setSearchText(value);
    setSelectedRowKeys([]); // Reset selected rows
  };

  // Xử lý thay đổi pagination
  const handlePageChange = (page, size) => {
    if (size !== pageSize) {
      // Thay đổi page size
      setPageSize(size);
      setCurrent(1); // Reset về trang 1
    } else {
      // Chỉ thay đổi trang
      setCurrent(page);
    }
    setSelectedRowKeys([]); // Reset selected rows
  };

  // Xử lý click vào hàng
  const handleRowClick = (record) => {
    setSelectedUser(record);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedUser(null);
  };
  const departmentList = useSelector((state) => state.department.allDepartments);
  useEffect(() => {
    if (!departmentList || departmentList.length === 0) {
      dispatch(fetchListAllDepartments());
    }
  }, []);
  const getDepartmentName = (user) => {
    if (!user) return "Chưa có";

    // Trường hợp 1: user có department object
    if (user.department && user.department.name) {
      return user.department.name;
    }

    // Trường hợp 2: user có departmentId, cần lookup từ departmentList
    if (user.departmentId && departmentList) {
      const department = departmentList.find((dept) => dept.id === user.departmentId);
      return department ? department.name : "Chưa có";
    }

    // Trường hợp 3: user có department_id (snake_case)
    if (user.department_id && departmentList) {
      const department = departmentList.find((dept) => dept.id === user.department_id);
      return department ? department.name : "Chưa có";
    }

    return "Chưa có";
  };
  const getDepartmentInfo = (user) => {
    if (!user) return null;

    // Trường hợp 1: user có department object
    if (user.department && user.department.name) {
      return user.department;
    }

    // Trường hợp 2: user có departmentId, cần lookup từ departmentList
    if (user.departmentId && departmentList) {
      return departmentList.find((dept) => dept.id === user.departmentId);
    }

    // Trường hợp 3: user có department_id (snake_case)
    if (user.department_id && departmentList) {
      return departmentList.find((dept) => dept.id === user.department_id);
    }

    return null;
  };
  // Xử lý thay đổi trạng thái người dùng - sử dụng API
  const handleToggleStatus = (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "disable" : "active";
    const user = data.find((u) => u.id === userId);

    Modal.confirm({
      title: "Xác nhận thay đổi trạng thái",
      content: (
        <div>
          <p>
            Bạn có chắc chắn muốn {newStatus === "active" ? "kích hoạt" : "vô hiệu hóa"} tài khoản{" "}
            <strong>{user?.username}</strong>?
          </p>
          <p style={{ color: "#666", fontSize: "13px" }}>
            {newStatus === "active"
              ? "Người dùng sẽ có thể đăng nhập và sử dụng hệ thống."
              : "Người dùng sẽ không thể đăng nhập vào hệ thống."}
          </p>
        </div>
      ),
      okText: newStatus === "active" ? "Kích hoạt" : "Vô hiệu hóa",
      cancelText: "Hủy",
      okType: newStatus === "active" ? "primary" : "danger",
      onOk: () => {
        setLoadingStates((prev) => ({ ...prev, [userId]: true }));
        dispatch(updateUserStatus({ userId, status: newStatus }))
          .unwrap()
          .then(() => {
            notification.success({
              message: "Cập nhật trạng thái thành công",
              description: `Tài khoản ${user?.username} đã được ${newStatus === "active" ? "kích hoạt" : "vô hiệu hóa"}.`,
              duration: 4,
            });
            fetchData();
          })
          .catch((error) => {
            console.error("Error updating user status:", error);
            console.error("Update status error from Redux state:", updateStatusError);
            notification.error({
              message: "Cập nhật trạng thái thất bại",
              description: updateStatusError || "Có lỗi xảy ra khi cập nhật trạng thái người dùng",
              duration: 5,
            });
          })
          .finally(() => {
            setLoadingStates((prev) => ({ ...prev, [userId]: false }));
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

  // Render role tag
  const renderRoleTag = (role) => {
    const roleConfig = {
      admin: { color: "red", text: "Quản trị viên" },
      manager: { color: "blue", text: "Quản lý" },
      accountant: { color: "purple", text: "Kế toán" },
      picker: { color: "green", text: "Nhân viên lấy hàng" },
      sup_picker: { color: "cyan", text: "Giám sát lấy hàng" },
      shipper: { color: "orange", text: "Nhân viên giao hàng" },
      sup_shipper: { color: "gold", text: "Giám sát giao hàng" },
      seller: { color: "magenta", text: "Nhân viên bán hàng" },
    };
    const config = roleConfig[role] || { color: "default", text: role };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Render status tag
  const renderStatusTag = (status) => {
    const statusConfig = {
      active: { color: "green", text: "Hoạt động" },
      disable: { color: "orange", text: "Vô hiệu hóa" },
    };
    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Định nghĩa các cột của bảng
  const columns = [
    {
      title: (
        <Space>
          Cơ sở
          <Tooltip title="Mã cơ sở làm việc của người dùng">
            <QuestionCircleOutlined className="userManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "departmentId",
      key: "departmentId",
      width: 120,
      minWidth: 120,
      // take department code
      render: (text, record) => {
        const department = getDepartmentInfo(record);
        return department ? (
          <Tooltip title={department.name}>
            <span>{department.code || "Chưa có"}</span>
          </Tooltip>
        ) : (
          <span>Chưa có</span>
        );
      },
      // add filter follow code display name
      filters: departmentList
        ? departmentList.map((dept) => ({
            text: dept.name,
            value: dept.id,
          }))
        : [],
      onFilter: (value, record) => {
        const department = getDepartmentInfo(record);
        return department ? department.id === value : false;
      },
      sorter: (a, b) => {
        const deptA = getDepartmentInfo(a);
        const deptB = getDepartmentInfo(b);
        const nameA = deptA ? deptA.name : "";
        const nameB = deptB ? deptB.name : "";
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: (
        <Space>
          Họ và tên
          <Tooltip title="Họ và tên đầy đủ của người dùng">
            <QuestionCircleOutlined className="userManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "fullName",
      key: "fullName",
      width: 150,
      minWidth: 150,
      render: (text, record) => (
        <span>
          <CircleStatus online={record.online} />
          <span className="supplier-name-link">{text}</span>
        </span>
      ),
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
      minWidth: 180,
    },
    {
      title: (
        <Space>
          Số điện thoại
          <Tooltip title="Số điện thoại liên hệ">
            <QuestionCircleOutlined className="userManage-questionIcon" />
          </Tooltip>
        </Space>
      ),
      dataIndex: "phone",
      key: "phone",
      width: 100,
      minWidth: 100,
    },
    {
      title: (
        <Space>
          Chức danh
          {/* <Tooltip title="Vai trò của người dùng trong hệ thống">
            <QuestionCircleOutlined className="userManage-questionIcon" />
          </Tooltip> */}
        </Space>
      ),
      dataIndex: "role",
      key: "role",
      width: 100,
      minWidth: 100,
      render: renderRoleTag,
      filters: [
        { text: "Quản trị viên", value: "admin" },
        { text: "Quản lý", value: "manager" },
        { text: "Kế toán", value: "accountant" },
        { text: "Nhân viên lấy hàng", value: "picker" },
        { text: "Giám sát lấy hàng", value: "sup_picker" },
        { text: "Nhân viên giao hàng", value: "shipper" },
        { text: "Giám sát giao hàng", value: "sup_shipper" },
        { text: "Nhân viên bán hàng", value: "seller" },
      ],
      onFilter: (value, record) => record.role === value,
      sorter: (a, b) => a.role.localeCompare(b.role),
    },
    {
      title: (
        <Space>
          Trạng thái
          {/* <Tooltip title="Trạng thái hoạt động của tài khoản"> */}
          {/* <QuestionCircleOutlined className="userManage-questionIcon" /> */}
          {/* </Tooltip> */}
        </Space>
      ),
      dataIndex: "status",
      key: "status",
      width: 100,
      minWidth: 100,
      render: renderStatusTag,
      sorter: (a, b) => a.status.localeCompare(b.status),
      filters: [
        { text: "Hoạt động", value: "active" },
        { text: "Vô hiệu hóa", value: "disable" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      minWidth: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditUser(record);
              }}
              disabled={loadingStates[record.id] || false}
            />
          </Tooltip>
          <Tooltip title={record.status === "active" ? "Vô hiệu hóa" : "Kích hoạt"}>
            <Button
              type="text"
              icon={record.status === "active" ? <LockOutlined /> : <UnlockOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus(record.id, record.status);
              }}
              loading={loadingStates[record.id] || false}
              disabled={loadingStates[record.id] || false}
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
    data.forEach((user) => {
      counts[user.status] = (counts[user.status] || 0) + 1;
    });
    return counts;
  };

  const getSummaryByRole = () => {
    const counts = {};
    data.forEach((user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getSummaryByStatus();
  const roleCounts = getSummaryByRole();

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
          <div className="userManage-headerContainer">
            <Title level={3}>Danh sách người dùng</Title>
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
          <div className="userManage-loadingContainer">
            <Spin size="large" />
            <div className="userManage-loadingText">
              <Text>Đang khởi tạo...</Text>
            </div>
          </div>
        )}

        {/* Error state */}
        {isFailed && (
          <div className="userManage-errorContainer">
            <div className="userManage-errorIconContainer">
              <WarningOutlined className="userManage-errorIcon" />
            </div>

            <div className="userManage-errorContent">
              <Text type="danger" className="userManage-errorTitle">
                Không thể tải dữ liệu
              </Text>
              <Text className="userManage-errorDescription">
                {error || "Đã xảy ra lỗi khi tải danh sách người dùng"}
              </Text>
            </div>

            <Space size="middle">
              <Button
                type="primary"
                size="large"
                onClick={handleRefreshData}
                icon={<ReloadOutlined />}
                className="userManage-retryButton"
              >
                Thử lại
              </Button>
              <Button
                size="large"
                onClick={() => window.location.reload()}
                className="userManage-reloadButton"
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
                placeholder="Theo tên, tên đăng nhập, email, số điện thoại"
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
                onClick={handleAddUser}
              >
                Thêm tài khoản
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
                <span className="summary-item">Admin: {roleCounts.admin || 0}</span>
                <span className="summary-item">Seller: {roleCounts.seller || 0}</span>
              </div>

              <div className="pagination-section">
                <Pagination
                  current={current}
                  pageSize={pageSize}
                  total={total}
                  onChange={handlePageChange}
                  onShowSizeChange={handlePageChange}
                  showSizeChanger={true}
                  // showQuickJumper={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} mục`}
                  pageSizeOptions={["2", "5", "10", "20", "50", "100"]}
                  size="small"
                  disabled={isLoading}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modal hiển thị chi tiết người dùng */}
      <UserDetailModal
        visible={modalVisible}
        onCancel={handleModalClose}
        user={selectedUser}
        getDepartmentName={getDepartmentName}
        getDepartmentInfo={getDepartmentInfo}
        renderStatusTag={renderStatusTag}
        renderRoleTag={renderRoleTag}
        formatDate={formatDate}
      />

      {/* Modal thêm user */}
      <AddUserModal
        visible={addModalVisible}
        onCancel={handleAddModalClose}
        onSuccess={handleAddUserSuccess}
      />

      {/* Modal edit user */}
      <EditUserModal
        visible={editModalVisible}
        onCancel={handleEditModalClose}
        onSuccess={handleEditUserSuccess}
        userData={editingUser}
      />
    </div>
  );
};

export default UserManage;
