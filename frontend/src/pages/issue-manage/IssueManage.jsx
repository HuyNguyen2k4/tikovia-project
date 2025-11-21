import React, { useEffect, useState } from "react";

import {
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagOutlined,
  // ✅ THÊM
  UnlockOutlined,
  // ✅ THÊM
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/task/TaskManage.css";
import {
  addIssueComment,
  addIssueTag,
  createIssue,
  deleteIssue,
  fetchIssues,
  updateIssue,
} from "@src/store/issueSlice";
import {
  Button,
  Card,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

import AddIssueModal from "./AddIssueModal";
import IssueDetailModal from "./IssueDetailModal";
import UpdateIssueModal from "./UpdateIssueModal";

// dùng lại style chung
const { Title, Text } = Typography;
const { confirm } = Modal;

const IssueManage = () => {
  const dispatch = useDispatch();

  /* -------------------- STATE -------------------- */
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [addVisible, setAddVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);

  const { issues, fetchStatus, fetchError } = useSelector((state) => state.issue);
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role;

  const isLoading = fetchStatus === "loading";
  const isSucceeded = fetchStatus === "succeeded";
  const isFailed = fetchStatus === "failed";
  const isIdle = fetchStatus === "idle";

  /* -------------------- FETCH DATA -------------------- */
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      severity: severityFilter || undefined,
      status: statusFilter || undefined,
      ...params,
    };
    dispatch(fetchIssues(requestParams));
  };

  useEffect(() => {
    if (isIdle) fetchData();
  }, [isIdle]);

  useEffect(() => {
    if (!isIdle) fetchData();
  }, [current, pageSize, debouncedSearchText, severityFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText), 700);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!isSucceeded || !issues) return;
    const list = Array.isArray(issues.data) ? issues.data : Array.isArray(issues) ? issues : [];
    setData(
      list.map((i, idx) => ({
        ...i,
        key: i.id || idx.toString(),
      }))
    );
    setTotal(list.length);
  }, [issues, isSucceeded]);

  /* -------------------- HANDLERS -------------------- */
  const handleRefresh = () => fetchData();
  const handleSearch = (e) => setSearchText(e.target.value);
  const handlePageChange = (page, size) => {
    if (size !== pageSize) {
      setPageSize(size);
      setCurrent(1);
    } else {
      setCurrent(page);
    }
  };

  const handleDelete = (record) => {
    confirm({
      title: "Xác nhận xóa Issue",
      icon: <ExclamationCircleOutlined />,
      content: `Bạn có chắc muốn xóa issue ${record.ticketNo}?`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await dispatch(deleteIssue(record.id)).unwrap();
          notification.success({
            message: "Đã xóa Issue",
            description: `Issue ${record.ticketNo} đã bị xóa.`,
          });
          fetchData();
        } catch (err) {
          notification.error({
            message: "Lỗi khi xóa Issue",
            description: err?.message || "Không thể xóa issue.",
          });
        }
      },
    });
  };

  const handleEdit = (record) => {
    setEditingIssue(record);
    setEditVisible(true);
  };

  const handleAdd = () => {
    Modal.info({
      title: "Tạo Issue mới",
      icon: <PlusOutlined />,
      content: (
        <div>
          <Text type="secondary">Tính năng form tạo Issue mới sẽ đặt ở đây (Add Issue Modal)</Text>
        </div>
      ),
    });
  };

  /* -------------------- TABLE COLUMNS -------------------- */
  const columns = [
    {
      title: "Ticket No",
      dataIndex: "ticketNo",
      key: "ticketNo",
      render: (text) => <Tag color="blue">{text}</Tag>,
      width: 117,
      minWidth: 117,
      maxWidth: 130,
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      width: 280,
      minWidth: 200,
      maxWidth: 300,
      // Không cần 'width' ở đây để nó responsive
      render: (text, record) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            overflow: "hidden",
          }}
        >
          <Text
            strong
            style={{
              flex: 1,
              marginRight: 8,
              minWidth: 0, // 👈 ✨ THÊM DÒNG NÀY
            }}
            ellipsis={{
              tooltip: text || "-",
            }}
          >
            {text || "-"}
          </Text>

          {/* Icon sẽ luôn hiển thị */}
          {record.isPublic ? (
            <Tooltip title="Issue công khai">
              <UnlockOutlined style={{ color: "#52c41a", flexShrink: 0 }} />
            </Tooltip>
          ) : (
            <Tooltip title="Issue riêng tư">
              <LockOutlined style={{ color: "#ff4d4f", flexShrink: 0 }} />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "Người tạo",
      dataIndex: "createdByName",
      key: "createdByName",
      render: (text) => (
        <Space>
          <UserOutlined />
          {text || "—"}
        </Space>
      ),
      width: 180,
      // ✅ THÊM: Ẩn cột này trên màn hình nhỏ (dưới 1600px)
      responsive: ["xxl"],
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      render: (text) => <Tag color="geekblue">{text}</Tag>,
      width: 100,
      minWidth: 100,
      maxWidth: 140,
      // ✅ THÊM: Ẩn cột này trên màn hình nhỏ (dưới 768px)
      responsive: ["md"],
    },
    {
      title: "Mức độ",
      dataIndex: "severity",
      key: "severity",
      render: (sev) => {
        const colorMap = { low: "green", medium: "orange", high: "red" };
        const labelMap = { low: "Thấp", medium: "Trung bình", high: "Cao" };
        return <Tag color={colorMap[sev]}>{labelMap[sev] || sev}</Tag>;
      },
      width: 80,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colorMap = {
          open: "blue",
          in_progress: "gold",
          resolved: "green", // ✅ GIỮ NGUYÊN "resolved"
          closed: "gray",
        };
        const labelMap = {
          open: "Mở",
          in_progress: "Đang xử lý",
          resolved: "Đã xử lý", // ✅ CHỈ ĐỔI LABEL
          closed: "Đóng",
        };
        return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>;
      },
      width: 90,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleString("vi-VN"),
      width: 180,
      // ✅ THÊM: Ẩn cột này trên màn hình nhỏ (dưới 768px)
      responsive: ["xxl"],
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 80,
      render: (_, record) => {
        const canModify = record.createdBy === user?.id || ["admin", "manager"].includes(userRole);

        return (
          <Space size="small">
            <Tooltip title="Sửa">
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEdit(record)}
                disabled={!canModify}
              />
            </Tooltip>
            {userRole === "admin" && (
              <Tooltip title="Xóa">
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  size="small"
                  onClick={() => handleDelete(record)}
                  disabled={!canModify}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  /* -------------------- RENDER -------------------- */
  return (
    <div className="table-page-container">
      <Card
        className="table-card"
        styles={{
          body: { padding: "16px", display: "flex", flexDirection: "column", height: "100%" },
        }}
      >
        <div className="table-header">
          <div className="departManage-headerContainer">
            <Title level={3}>Danh sách Issue (Vấn đề / Báo lỗi)</Title>
            <Button
              onClick={handleRefresh}
              icon={<ReloadOutlined />}
              loading={isLoading}
              disabled={isLoading}
            >
              Làm mới
            </Button>
          </div>
        </div>

        {isFailed && (
          <div className="departManage-errorContainer">
            <WarningOutlined className="departManage-errorIcon" />
            <Text type="danger">Không thể tải dữ liệu</Text>
            <Text>{fetchError}</Text>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Thử lại
            </Button>
          </div>
        )}

        {(isSucceeded || isLoading) && (
          <>
            {/* ========== TOOLBAR ========== */}
            <div
              className="table-toolbar"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Space wrap>
                <Input
                  placeholder="Tìm kiếm theo mô tả, người tạo, loại issue..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={handleSearch}
                  allowClear
                  size="middle"
                  style={{ width: "300px" }}
                />

                <Select
                  value={severityFilter || "all"}
                  style={{ width: 160 }}
                  onChange={(v) => setSeverityFilter(v === "all" ? "" : v)}
                  options={[
                    { label: "Tất cả mức độ", value: "all" },
                    { label: "Thấp", value: "low" },
                    { label: "Trung bình", value: "medium" },
                    { label: "Cao", value: "high" },
                  ]}
                />

                <Select
                  value={statusFilter || "all"}
                  style={{ width: 160 }}
                  onChange={(v) => setStatusFilter(v === "all" ? "" : v)}
                  options={[
                    { label: "Tất cả trạng thái", value: "all" },
                    { label: "Mở", value: "open" },
                    { label: "Đang xử lý", value: "in_progress" },
                    { label: "Đã xử lý", value: "resolved" }, // ✅ CHỈ ĐỔI LABEL
                    { label: "Đóng", value: "closed" },
                  ]}
                />
              </Space>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddVisible(true)}
                disabled={isLoading}
              >
                Tạo Issue
              </Button>
            </div>

            {/* ========== TABLE ========== */}
            <div style={{ width: "100%", overflowX: "auto" }}>
              <Table
                columns={columns}
                dataSource={data}
                pagination={false}
                loading={isLoading}
                // scroll={{ x: "max-content" }}
                tableLayout="fixed"
                onRow={(record) => ({
                  onClick: (e) => {
                    const isButton =
                      e.target.closest("button") ||
                      e.target.closest(".ant-btn") ||
                      e.target.closest(".ant-dropdown");
                    if (!isButton) {
                      setSelectedIssueId(record.id);
                      setDetailVisible(true);
                    }
                  },
                })}
                rowClassName="clickable-row"
              />
            </div>

            {/* ========== FOOTER ========== */}
            <div className="table-footer">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  Tổng số: {total} | Trang hiện tại: {data.length}
                </div>
                <Pagination
                  current={current}
                  pageSize={pageSize}
                  total={total}
                  onChange={handlePageChange}
                  onShowSizeChange={handlePageChange}
                  showSizeChanger={true}
                  showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} issue`}
                  pageSizeOptions={["5", "10", "20", "50"]}
                  size="small"
                  disabled={isLoading}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      <AddIssueModal
        visible={addVisible}
        onCancel={() => setAddVisible(false)}
        onSuccess={fetchData}
      />

      <IssueDetailModal
        visible={detailVisible}
        issueId={selectedIssueId}
        onCancel={() => setDetailVisible(false)}
      />

      <UpdateIssueModal
        visible={editVisible}
        onCancel={() => setEditVisible(false)}
        issueData={editingIssue}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default IssueManage;
