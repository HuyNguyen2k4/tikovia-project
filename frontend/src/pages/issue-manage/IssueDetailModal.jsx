import React, { useEffect, useState } from "react";

import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  LockOutlined,
  MoreOutlined,
  RedoOutlined,
  SendOutlined,
  UnlockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  addIssueComment,
  deleteIssueComment,
  fetchIssueById,
  updateIssue,
  updateIssueComment,
  updateIssueStatus,
} from "@src/store/issueSlice";
import MDEditor from "@uiw/react-md-editor";
import {
  Alert,
  Avatar,
  Button,
  Divider,
  Dropdown,
  Menu,
  Modal,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import { RefreshCcwDot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useDispatch, useSelector } from "react-redux";

const { Title, Text } = Typography;

const IssueDetailModal = ({ visible, issueId, onCancel }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [issue, setIssue] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [tab, setTab] = useState("write");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const currentUser = useSelector((s) => s.auth.user);

  /* ----------------- LOAD ISSUE ----------------- */
  const loadIssue = async () => {
    if (!issueId) return;
    setLoading(true);
    try {
      const res = await dispatch(fetchIssueById(issueId)).unwrap();
      setIssue(res.data || res);
    } catch (err) {
      notification.error({
        message: "Không thể tải chi tiết issue",
        description: err?.message || "Lỗi không xác định.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && issueId) loadIssue();
  }, [visible, issueId]);

  /* ----------------- ADD COMMENT ----------------- */
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      return notification.warning({ message: "Vui lòng nhập bình luận!" });
    }
    setSubmitting(true);
    try {
      await dispatch(addIssueComment({ issueId, data: { content: newComment } })).unwrap();
      setNewComment("");
      await loadIssue();
      notification.success({ message: "Đã thêm bình luận!" });
    } catch (err) {
      notification.error({
        message: "Không thể thêm bình luận",
        description: err?.message || "Đã xảy ra lỗi không xác định.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------- CLOSE ISSUE ----------------- */
  const handleCloseIssue = async () => {
    try {
      await dispatch(updateIssue({ id: issueId, data: { status: "closed" } })).unwrap();
      notification.success({ message: "Đã đóng issue" });
      await loadIssue();
    } catch (err) {
      notification.error({ message: "Lỗi khi đóng issue", description: err?.message });
    }
  };

  /* ----------------- SAVE COMMENT EDIT ----------------- */
  const handleSaveEdit = async (commentId) => {
    if (!editValue.trim()) {
      return notification.warning({ message: "Nội dung không được để trống!" });
    }
    setSaving(true);
    try {
      await dispatch(
        updateIssueComment({ issueId, commentId, data: { content: editValue } })
      ).unwrap();
      setEditingCommentId(null);
      await loadIssue();
      notification.success({ message: "Đã cập nhật bình luận!" });
    } catch (err) {
      notification.error({
        message: "Không thể cập nhật bình luận",
        description: err?.message || "Lỗi không xác định",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ----------------- DELETE COMMENT ----------------- */
  const handleDeleteComment = async (commentId) => {
    Modal.confirm({
      title: "Xoá bình luận này?",
      content: "Thao tác này không thể hoàn tác.",
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      centered: true,
      async onOk() {
        try {
          await dispatch(deleteIssueComment({ issueId, commentId })).unwrap();
          await loadIssue();
          notification.success({ message: "Đã xoá bình luận!" });
        } catch (err) {
          notification.error({
            message: "Không thể xoá bình luận",
            description: err?.message || "Lỗi không xác định",
          });
        }
      },
    });
  };

  const statusLabelMap = {
    open: "Mở",
    in_progress: "Đang xử lý",
    resolved: "Đã xử lý", // ✅ CHỈ ĐỔI LABEL
    closed: "Đóng",
  };

  /* ----------------- UPDATE ISSUE STATUS ----------------- */
  const handleChangeStatus = async (nextStatus) => {
    Modal.confirm({
      title: `Chuyển trạng thái sang "${statusLabelMap[nextStatus] || nextStatus}"?`,
      okText: "Xác nhận",
      cancelText: "Huỷ",
      centered: true,
      async onOk() {
        try {
          await dispatch(updateIssueStatus({ id: issueId, status: nextStatus })).unwrap();
          notification.success({
            message: `Đã chuyển trạng thái sang ${statusLabelMap[nextStatus] || nextStatus}`,
            duration: 3,
          });
          await loadIssue();
        } catch (err) {
          notification.error({
            message: "Không thể cập nhật trạng thái",
            description: err?.message || "Lỗi không xác định",
          });
        }
      },
    });
  };

  /* ----------------- MAPPING HELPERS ----------------- */
  const renderStatusTag = (status) => {
    const map = {
      open: { color: "blue", label: "Mở" },
      in_progress: { color: "gold", label: "Đang xử lý" },
      resolved: { color: "green", label: "Đã xử lý" }, // ✅ CHỈ ĐỔI LABEL
      closed: { color: "gray", label: "Đóng" },
    };
    const s = map[status] || { color: "default", label: status };
    return (
      <Tag color={s.color} style={{ minWidth: 90, textAlign: "center" }}>
        {s.label}
      </Tag>
    );
  };

  const renderSeverityTag = (sev) => {
    const map = {
      low: { color: "green", label: "Thấp" },
      medium: { color: "orange", label: "Trung bình" },
      high: { color: "red", label: "Cao" },
    };
    const s = map[sev] || { color: "default", label: sev };
    return (
      <Tag color={s.color} style={{ minWidth: 90, textAlign: "center" }}>
        {s.label}
      </Tag>
    );
  };

  const renderTypeTag = (type) => {
    const map = {
      bug: { color: "red", label: "Bug" },
      feature: { color: "blue", label: "Feature" },
      task: { color: "geekblue", label: "Task" },
      other: { color: "default", label: "Khác" },
    };
    const s = map[type] || { color: "default", label: type };
    return (
      <Tag color={s.color} style={{ minWidth: 90, textAlign: "center" }}>
        {s.label}
      </Tag>
    );
  };

  const canChangeStatus = () => {
    if (!issue || !currentUser) return false;
    const isCreator = issue.createdBy === currentUser.id;
    const isTagged = issue.tags?.some((t) => t.userId === currentUser.id);
    return { isCreator, isTagged };
  };

  // ✅ CẬP NHẬT: Cho phép resolved -> reopened trực tiếp
  const nextStatusMap = {
    open: ["in_progress"],
    in_progress: ["resolved", "closed"],
    resolved: ["closed", "open"], // ✅
    reopened: ["in_progress"], // ✅
  };

  const { isCreator, isTagged } = canChangeStatus();
  const nextStatus = nextStatusMap[issue?.status] || [];
  const canTransition =
    (isCreator && nextStatus) ||
    (isTagged && ["open", "in_progress", "reopened"].includes(issue?.status));

  // ✅ THÊM: Kiểm tra có thể comment không
  const canAddComment = issue?.status !== "resolved" && issue?.status !== "closed";
  useEffect(() => {
    if (!visible) {
      document.body.style.overflow = "";
      document.body.style.overflowY = "";
    }
  }, [visible]);
  /* ----------------- RENDER ----------------- */
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      centered
      destroyOnHidden={true}
      styles={{
        body: {
          background: "#fff",
          borderRadius: 8,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
        },
      }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : issue ? (
        <>
          {/* ================= HEADER ================= */}
          <div
            style={{
              margin: "16px 24px",
              paddingBottom: 12,
              borderBottom: "1px solid #e1e4e8",
              position: "sticky",
              top: 0,
              background: "#fff",
              zIndex: 2,
            }}
          >
            {/* ✅ FIX: Layout kiểu GitHub - title trái, buttons phải */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start", // Align top để title có thể wrap
                justifyContent: "space-between",
                gap: 16,
                minHeight: "40px", // Đảm bảo chiều cao tối thiểu
              }}
            >
              {/* ===== LEFT: Title + Metadata (có thể wrap) ===== */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0, // Cho phép shrink
                  marginRight: 16,
                }}
              >
                {/* Title Line */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <Title
                    level={3}
                    style={{
                      margin: 0,
                      wordBreak: "break-word",
                      lineHeight: 1.3,
                    }}
                  >
                    {issue.title}
                  </Title>

                  {/* Ticket number - có thể xuống dòng nếu title quá dài */}
                  <Text type="secondary" style={{ fontSize: "16px", fontWeight: 400 }}>
                    #{issue.ticketNo}
                  </Text>
                </div>

                {/* Metadata Line */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginTop: 4,
                  }}
                >
                  {/* Status */}
                  {renderStatusTag(issue.status)}

                  {/* Public/Private Status */}
                  {issue.isPublic ? (
                    <Tooltip title="Issue công khai">
                      <Tag icon={<UnlockOutlined />} color="success" style={{ margin: 0 }}>
                        Công khai
                      </Tag>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Issue riêng tư">
                      <Tag icon={<LockOutlined />} color="error" style={{ margin: 0 }}>
                        Riêng tư
                      </Tag>
                    </Tooltip>
                  )}

                  {/* Creator Info */}
                  <Text type="secondary" style={{ fontSize: "14px" }}>
                    được tạo bởi <strong>{issue.createdByName || "Unknown"}</strong>{" "}
                    {new Date(issue.createdAt).toLocaleDateString("vi-VN")}
                  </Text>
                </div>
              </div>

              {/* ===== RIGHT: Action Buttons (KHÔNG BAO GIỜ wrap) ===== */}
              <div
                style={{
                  flexShrink: 0, // Không cho co lại
                  display: "flex",
                  alignItems: "flex-start", // Align top với title
                  gap: 8,
                }}
              >
                <Space direction="horizontal" size="small" wrap={false}>
                  {/* Status Transition Buttons */}
                  {canTransition && nextStatus.length > 0 && (
                    <>
                      {nextStatus.map((status) => {
                        const buttonConfig = {
                          in_progress: {
                            label: "Bắt đầu xử lý",
                            type: "default",
                            style: { borderColor: "#1890ff", color: "#1890ff" },
                          },
                          resolved: {
                            label: "Đã giải quyết",
                            type: "primary",
                            style: { backgroundColor: "#52c41a", borderColor: "#52c41a" },
                          },
                          closed: {
                            label: "Đóng issue",
                            type: "default",
                            style: { borderColor: "#8c8c8c", color: "#8c8c8c" },
                          },
                          open: {
                            label: "Mở lại",
                            type: "primary",
                            style: { backgroundColor: "#722ed1", borderColor: "#722ed1" },
                          },
                        };

                        const config = buttonConfig[status] || {
                          label: status,
                          type: "default",
                          style: {},
                        };

                        return (
                          <Button
                            key={status}
                            type={config.type}
                            size="middle"
                            onClick={() => handleChangeStatus(status)}
                            style={{
                              ...config.style,
                              fontWeight: 500,
                              borderRadius: "6px",
                            }}
                          >
                            {config.label}
                          </Button>
                        );
                      })}
                    </>
                  )}

                  {/* Reopen Button for Closed Issues */}
                  {issue.status === "closed" && (
                    <Button
                      type="primary"
                      size="middle"
                      onClick={() => handleChangeStatus("open")}
                      icon={<RefreshCcwDot size={16} />}
                      style={{
                        backgroundColor: "#722ed1",
                        borderColor: "#722ed1",
                        fontWeight: 500,
                        borderRadius: "6px",
                      }}
                    >
                      Mở lại issue
                    </Button>
                  )}
                </Space>
              </div>
            </div>
          </div>

          {/* ================= CONTENT ================= */}
          <div
            style={{
              padding: "20px 28px",
              overflowY: "auto",
              display: "flex",
              gap: 24,
            }}
          >
            {/* ====== LEFT COLUMN: Issue description + comments ====== */}
            <div style={{ flex: 2, minWidth: 0 }}>
              {/* ISSUE DESCRIPTION */}
              <div
                style={{
                  border: "1px solid #b6e3ff",
                  borderRadius: 8,
                  marginBottom: 20,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#ddf4ff",
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #b6e3ff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar
                      size={36}
                      icon={<UserOutlined />}
                      src={issue.creator.avatar || undefined}
                    />
                    <Text strong style={{ fontSize: 13 }}>
                      {issue.createdByName || "Unknown"}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    opened {new Date(issue.createdAt).toLocaleString("vi-VN")}
                  </Text>
                </div>

                <div style={{ padding: 16 }}>
                  <ReactMarkdown>{issue.description}</ReactMarkdown>
                </div>
              </div>

              {/* COMMENTS */}
              {issue.comments?.map((c) => {
                const canModify =
                  issue.status !== "closed" &&
                  (c.userId === currentUser?.id ||
                    ["admin", "manager"].includes(currentUser?.role));

                const menu = (
                  <Menu
                    items={[
                      {
                        key: "edit",
                        label: "Chỉnh sửa",
                        onClick: () => {
                          setEditingCommentId(c.id);
                          setEditValue(c.content);
                        },
                      },
                      {
                        key: "delete",
                        danger: true,
                        label: "Xoá",
                        onClick: () => handleDeleteComment(c.id),
                      },
                    ]}
                  />
                );

                return (
                  <div
                    key={c.id}
                    style={{
                      border: "1px solid #b6e3ff",
                      borderRadius: 8,
                      marginBottom: 16,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        background: "#ddf4ff",
                        padding: "10px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #b6e3ff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar
                          size={36}
                          icon={<UserOutlined />}
                          src={c.user.avatar || undefined}
                        />
                        <Text strong style={{ fontSize: 13 }}>
                          {c.userName}
                        </Text>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(c.createdAt).toLocaleString("vi-VN")}
                        </Text>

                        {canModify && (
                          <Dropdown overlay={menu} trigger={["click"]}>
                            <Button
                              type="text"
                              icon={<MoreOutlined />}
                              style={{ color: "#57606a" }}
                            />
                          </Dropdown>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: 16 }}>
                      {editingCommentId === c.id ? (
                        <>
                          <MDEditor
                            height={180}
                            value={editValue}
                            onChange={setEditValue}
                            preview="edit"
                            visibleDragbar={false}
                          />
                          <Space style={{ marginTop: 8 }}>
                            <Button
                              type="primary"
                              size="small"
                              loading={saving}
                              onClick={() => handleSaveEdit(c.id)}
                            >
                              Lưu
                            </Button>
                            <Button size="small" onClick={() => setEditingCommentId(null)}>
                              Huỷ
                            </Button>
                          </Space>
                        </>
                      ) : (
                        <ReactMarkdown>{c.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ADD COMMENT - ✅ CHỈ HIỂN THỊ KHI CÓ THỂ COMMENT */}
              {canAddComment ? (
                <div
                  style={{
                    border: "1px solid #b6e3ff",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginTop: 24,
                  }}
                >
                  <div
                    style={{
                      background: "#ddf4ff",
                      padding: "10px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #b6e3ff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar
                        size={36}
                        icon={<UserOutlined />}
                        src={currentUser.avatar || undefined}
                      />
                      <Text strong style={{ fontSize: 13 }}>
                        Thêm bình luận mới
                      </Text>
                    </div>
                  </div>

                  <div style={{ padding: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        borderBottom: "1px solid #d0d7de",
                        marginBottom: 12,
                      }}
                    >
                      {["write", "preview"].map((key) => (
                        <div
                          key={key}
                          onClick={() => setTab(key)}
                          style={{
                            padding: "6px 12px",
                            cursor: "pointer",
                            borderBottom:
                              tab === key ? "2px solid #0969da" : "2px solid transparent",
                            color: tab === key ? "#0969da" : "#57606a",
                            fontWeight: tab === key ? 600 : 500,
                            transition: "all 0.2s ease",
                          }}
                        >
                          {key === "write" ? "Write" : "Preview"}
                        </div>
                      ))}
                    </div>

                    {tab === "write" ? (
                      <MDEditor
                        height={200}
                        value={newComment}
                        onChange={setNewComment}
                        preview="edit"
                        visibleDragbar={false}
                        style={{ background: "#fff", color: "#000" }}
                      />
                    ) : (
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #d0d7de",
                          borderRadius: 6,
                          padding: 12,
                          minHeight: 150,
                        }}
                      >
                        <ReactMarkdown>{newComment || "_Không có gì để xem trước._"}</ReactMarkdown>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 8,
                        color: "#57606a",
                        fontSize: 13,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>Dán, thả hoặc nhấp để thêm tệp</span>
                      <Space>
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          onClick={handleAddComment}
                          loading={submitting}
                          style={{ background: "#2da44e" }}
                        >
                          Bình luận
                        </Button>
                      </Space>
                    </div>
                  </div>
                </div>
              ) : (
                // ✅ THÊM: Thông báo khi không thể comment
                <Alert
                  message="Không thể thêm bình luận"
                  description={
                    issue.status === "resolved"
                      ? "Issue đã được giải quyết. Không thể thêm bình luận mới."
                      : "Issue đã đóng. Không thể thêm bình luận mới."
                  }
                  type="info"
                  icon={<InfoCircleOutlined />}
                  showIcon
                  style={{
                    marginTop: 24,
                    borderRadius: 8,
                  }}
                />
              )}
            </div>
            <Divider type="vertical" style={{ margin: 0, height: "auto" }} />

            {/* ====== RIGHT COLUMN: Issue metadata ====== */}
            <div
              style={{
                flex: 1,
                minWidth: 150,
                maxWidth: 180,
                // background: "#fafafa",
                // border: "1px solid #f0f0f0",
                // borderRadius: 8,
                // padding: 16,
                height: "fit-content",
              }}
            >
              {/* ✅ THÊM: Hiển thị trạng thái công khai */}
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">Trạng thái công khai:</Text>
                <div>
                  {issue.isPublic ? (
                    <Tag icon={<UnlockOutlined />} color="success">
                      Công khai
                    </Tag>
                  ) : (
                    <Tag icon={<LockOutlined />} color="error">
                      Riêng tư
                    </Tag>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">Trạng thái:</Text>
                <div>{renderStatusTag(issue.status)}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">Loại:</Text>
                <div>{renderTypeTag(issue.type)}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">Mức độ nghiêm trọng:</Text>
                <div>{renderSeverityTag(issue.severity)}</div>
              </div>

              {issue.tags?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                    Người được tag
                  </Text>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {issue.tags.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          background: "#fff",
                          border: "1px solid #f0f0f0",
                          borderRadius: 16,
                          padding: "4px 8px",
                          gap: 6,
                        }}
                      >
                        <Avatar
                          size={28}
                          icon={<UserOutlined />}
                          src={t.user.avatar || undefined}
                          style={{ backgroundColor: "#d9d9d9" }}
                        />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {t.userName || "Người dùng"}
                          </span>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            bởi {t.taggedByName || "ẩn danh"}
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <Text>Không tìm thấy issue.</Text>
      )}
    </Modal>
  );
};

export default IssueDetailModal;
