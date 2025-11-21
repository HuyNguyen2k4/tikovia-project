import React, { useEffect, useState } from "react";

import {
  CalendarOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/task/TaskManage.css";
import { fetchTasks, updateTaskStatus } from "@src/store/taskSlice";
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

import AddTaskModal from "./AddTaskModal";
import TaskDetailModal from "./TaskDetailModal";
import UpdateTaskModal from "./UpdateTaskModal";

const { Title, Text } = Typography;
const { confirm } = Modal;

const TaskManage = () => {
  const dispatch = useDispatch();

  /* -------------------- STATE -------------------- */
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role;

  const taskList = useSelector((state) => state.task.tasks);
  const status = useSelector((state) => state.task.fetchStatus);
  const error = useSelector((state) => state.task.fetchError);

  const [updateVisible, setUpdateVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const isLoading = status === "loading";
  const isSucceeded = status === "succeeded";
  const isFailed = status === "failed";
  const isIdle = status === "idle";

  const isPicker = userRole !== "picker";

  /* -------------------- FETCH DATA -------------------- */
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      status: statusFilter || undefined,
      ...params,
    };
    dispatch(fetchTasks(requestParams));
  };

  // load lần đầu
  useEffect(() => {
    if (isIdle) fetchData();
  }, [isIdle]);

  // load khi đổi trang hoặc tìm kiếm
  useEffect(() => {
    if (!isIdle) fetchData();
  }, [current, pageSize, debouncedSearchText, statusFilter]);

  // debounce input tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText), 700);
    return () => clearTimeout(timer);
  }, [searchText]);

  /* -------------------- FORMAT DATA -------------------- */
  useEffect(() => {
    if (!isSucceeded || !taskList) return;

    const list = Array.isArray(taskList.data)
      ? taskList.data
      : Array.isArray(taskList)
        ? taskList
        : [];

    const pagination = taskList.pagination || {};
    setData(
      list.map((t, i) => ({
        ...t,
        key: t.id || i.toString(),
      }))
    );

    // ✅ Nếu backend có total thì dùng, nếu không thì lấy list.length
    setTotal(pagination.total ?? list.length);
  }, [taskList, isSucceeded]);

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

  const handleRowClick = (record) => {
    setSelectedTask(record);
    setDetailVisible(true);
  };

  const handleEditTask = (record) => {
    setEditingTask(record);
    setUpdateVisible(true);
  };

  const handleAdd = () => setAddVisible(true);

  const handleCancelTask = (record) => {
    confirm({
      title: "Xác nhận huỷ nhiệm vụ",
      icon: <ExclamationCircleOutlined />,
      content: `Bạn có chắc muốn huỷ nhiệm vụ này?`,
      okText: "Huỷ nhiệm vụ",
      okType: "danger",
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await dispatch(updateTaskStatus({ id: record.id, status: "cancelled" })).unwrap();

          notification.success({
            message: "Đã huỷ nhiệm vụ",
            description: `Nhiệm vụ đã được chuyển sang trạng thái "cancelled".`,
          });

          fetchData();
        } catch (err) {
          notification.error({
            message: "Lỗi huỷ nhiệm vụ",
            description: err?.message || "Không thể huỷ nhiệm vụ.",
          });
        }
      },
    });
  };

  /* -------------------- TABLE COLUMNS -------------------- */
  const columns = [
    {
      title: "Mã nhiệm vụ",
      dataIndex: "id",
      key: "id",
      render: (text) => <Tag color="blue">{text?.slice(0, 8)}</Tag>,
      width: 100,
    },
    {
      title: "Đơn hàng",
      dataIndex: ["salesOrder", "orderNo"], // nested path
      key: "orderNo",
      render: (orderNo, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{orderNo || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.salesOrder?.customerName || ""}
          </Text>
        </Space>
      ),
      width: 200,
    },
    {
      title: "Người giám sát",
      dataIndex: "supervisorName",
      key: "supervisorName",
      render: (text) => (
        <Space>
          <UserOutlined />
          {text || "Không có"}
        </Space>
      ),
      width: 180,
    },
    // ✅ Chỉnh lại: Chỉ hiển thị khi KHÔNG phải picker
    ...(userRole !== "picker"
      ? [
          {
            title: "Người đóng gói",
            dataIndex: "packerName",
            key: "packerName",
            render: (text) => (
              <Space>
                <TeamOutlined />
                {text || "Không có"}
              </Space>
            ),
            width: 180,
          },
        ]
      : []),
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colorMap = {
          assigned: "blue",
          in_progress: "gold",
          pending_review: "orange",
          completed: "green",
          cancelled: "red",
        };

        const labelMap = {
          assigned: "Đã phân công",
          in_progress: "Đang thực hiện",
          pending_review: "Chờ duyệt",
          completed: "Hoàn thành",
          cancelled: "Đã huỷ",
        };

        return <Tag color={colorMap[status] || "default"}>{labelMap[status] || status}</Tag>;
      },
      width: 140,
    },
    {
      title: "Hạn chót",
      dataIndex: "deadline",
      key: "deadline",
      render: (date) => (
        <Space>
          <CalendarOutlined />
          {date ? new Date(date).toLocaleString("vi-VN") : "—"}
        </Space>
      ),
      width: 200,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text>{text || "-"}</Text>
        </Tooltip>
      ),
      width: 220,
    },
    ...(userRole !== "picker"
      ? [
          {
            title: "Thao tác",
            key: "actions",
            width: 150,
            render: (_, record) => {
              const isAssigned = record.status === "assigned";
              const tooltipMsg = isAssigned
                ? null
                : "Chỉ có thể cập nhật hoặc huỷ khi nhiệm vụ đang ở trạng thái 'assigned'.";

              return (
                <Space size="small">
                  <Tooltip title={tooltipMsg || "Cập nhật nhiệm vụ"}>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      size="small"
                      disabled={!isAssigned}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAssigned) handleEditTask(record);
                      }}
                    />
                  </Tooltip>

                  <Tooltip title={tooltipMsg || "Huỷ nhiệm vụ"}>
                    <Button
                      type="text"
                      icon={<ExclamationCircleOutlined />}
                      size="small"
                      danger
                      disabled={!isAssigned}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAssigned) handleCancelTask(record);
                      }}
                    />
                  </Tooltip>
                </Space>
              );
            },
          },
        ]
      : []),
  ].filter(Boolean); // lọc bỏ các cột undefined

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
            <Title level={3}>Danh sách nhiệm vụ chuẩn bị hàng</Title>
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
            <Text>{error}</Text>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Thử lại
            </Button>
          </div>
        )}

        {(isSucceeded || isLoading) && (
          <>
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
                  placeholder="Tìm kiếm theo mã đơn, giám sát, packer..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={handleSearch}
                  allowClear
                  size="middle"
                  style={{ width: "300px" }}
                />

                {/* Filter theo trạng thái */}
                <Select
                  value={statusFilter || "all"}
                  style={{ width: 180 }}
                  onChange={(v) => setStatusFilter(v === "all" ? "" : v)}
                  options={[
                    { label: "Tất cả trạng thái", value: "all" },
                    { label: "Đã phân công", value: "assigned" },
                    { label: "Đang thực hiện", value: "in_progress" },
                    { label: "Chờ duyệt", value: "pending_review" },
                    { label: "Hoàn thành", value: "completed" },
                    { label: "Đã huỷ", value: "cancelled" },
                  ]}
                />
              </Space>
              {userRole !== "picker" && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  disabled={isLoading}
                >
                  Thêm nhiệm vụ
                </Button>
              )}
            </div>

            <div style={{ width: "100%", overflowX: "auto" }}>
              <Table
                columns={columns}
                dataSource={data}
                pagination={false}
                loading={isLoading}
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  style: { cursor: "pointer" },
                })}
                scroll={{ x: "max-content" }}
                tableLayout="fixed"
              />
            </div>

            {/* =================== FOOTER =================== */}
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
                {/* === Summary section (tổng số + theo trạng thái) === */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className="summary-item">
                    Tổng số: {total} | Trang hiện tại: {data.length}
                  </span>

                  {/** === Đếm số nhiệm vụ theo trạng thái === */}
                  {Object.entries(
                    data.reduce((acc, t) => {
                      const s = t.status || "unknown";
                      acc[s] = (acc[s] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([status, count]) => {
                    const colorMap = {
                      assigned: "blue",
                      in_progress: "gold",
                      pending_review: "orange",
                      completed: "green",
                      cancelled: "red",
                    };
                    const labelMap = {
                      assigned: "Đã phân công",
                      in_progress: "Đang thực hiện",
                      pending_review: "Chờ duyệt",
                      completed: "Hoàn thành",
                      cancelled: "Đã huỷ",
                      unknown: "Không rõ",
                    };
                    return (
                      <span
                        key={status}
                        className="summary-item"
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Tag color={colorMap[status] || "default"}>
                          {labelMap[status] || status}
                        </Tag>
                        {count}
                      </span>
                    );
                  })}
                </div>

                {/* === Pagination section === */}
                <div className="pagination-section">
                  <Pagination
                    current={current}
                    pageSize={pageSize}
                    total={total}
                    onChange={handlePageChange}
                    onShowSizeChange={handlePageChange}
                    showSizeChanger={true}
                    showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} nhiệm vụ`}
                    pageSizeOptions={["5", "10", "20", "50", "100"]}
                    size="small"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <TaskDetailModal
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        task={selectedTask}
        onRefresh={fetchData}
      />

      <AddTaskModal
        visible={addVisible}
        onCancel={() => setAddVisible(false)}
        onSuccess={fetchData}
      />

      <UpdateTaskModal
        visible={updateVisible}
        onCancel={() => setUpdateVisible(false)}
        task={editingTask}
        onSuccess={() => {
          fetchData();
          setUpdateVisible(false);
        }}
      />
    </div>
  );
};

export default TaskManage;
