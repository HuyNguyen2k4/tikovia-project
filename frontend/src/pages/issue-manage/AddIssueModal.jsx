import React, { useEffect, useRef, useState } from "react";

import { FileAddOutlined, UploadOutlined, UserAddOutlined, UserOutlined } from "@ant-design/icons";
import apiClient from "@src/services/apiClient";
import { getListUsers } from "@src/services/userService";
import { createIssue } from "@src/store/issueSlice";
import { fetchListUsers } from "@src/store/userSlice";
import MDEditor from "@uiw/react-md-editor";
import {
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;
const { Option } = Select;

const AddIssueModal = ({ visible, onCancel, onSuccess }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const mdEditorRef = useRef(null);

  // const users = useSelector((state) => state.user.users?.data || []);
  const currentUser = useSelector((state) => state.auth.user);

  // State cho User lazy loading
  const [userOptions, setUserOptions] = useState([]);
  const userPageRef = useRef(0);
  const userHasMoreRef = useRef(true);
  const [userLoading, setUserLoading] = useState(false);
  const userSearchRef = useRef("");

  useEffect(() => {
    if (visible) {
      // dispatch(fetchListUsers());
      form.resetFields();
      setDescription("");
      setFileUrl("");
      // Reset user lazy load state
      setUserOptions([]);
      userPageRef.current = 0;
      userHasMoreRef.current = true;
      userSearchRef.current = "";
      loadUsers();
    }
  }, [visible]);
  // Load Users với lazy loading
  const loadUsers = async (search = "", append = false) => {
    if (!userHasMoreRef.current && append) return;

    setUserLoading(true);
    try {
      const response = await getListUsers({
        q: search,
        limit: 20,
        offset: append ? userPageRef.current * 20 : 0,
      });

      const data = response.data?.data || [];
      const hasMore = response.data?.pagination?.hasMore || false;

      if (append) {
        setUserOptions((prev) => {
          const existedIds = new Set(prev.map((u) => u.id));
          // chỉ thêm user mới chưa có id trong existedIds
          return [...prev, ...data.filter((u) => !existedIds.has(u.id))];
        });
      } else {
        setUserOptions(data);
      }

      userHasMoreRef.current = hasMore;
      if (append) userPageRef.current += 1;
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setUserLoading(false);
    }
  };

  /** 🧩 Upload ảnh lên Cloudflare R2 */
  const uploadImageToR2 = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.url;
  };

  /** 🖼️ Xử lý dán ảnh vào Markdown Editor */
  const handlePaste = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;

        notification.info({
          message: "Đang tải ảnh...",
          description: file.name,
          duration: 1.5,
        });

        try {
          const imageUrl = await uploadImageToR2(file);
          const markdownImage = `\n![](${imageUrl})\n`;
          setDescription((prev) => (prev ? prev + markdownImage : markdownImage));

          notification.success({
            message: "Tải ảnh thành công!",
            description: "Ảnh đã được chèn vào phần mô tả.",
          });
        } catch (err) {
          console.error("Upload image failed:", err);
          notification.error({
            message: "Lỗi tải ảnh",
            description: err?.message || "Không thể upload ảnh.",
          });
        }
      }
    }
  };

  useEffect(() => {
    // Gắn listener cho sự kiện paste trong MDEditor
    const editorEl = document.querySelector(".w-md-editor-text-input");
    if (editorEl) {
      editorEl.addEventListener("paste", handlePaste);
    }
    return () => {
      if (editorEl) editorEl.removeEventListener("paste", handlePaste);
    };
  }, [visible]);

  /** 🧾 Gửi form */
  const handleSubmit = async (values) => {
    if (!description.trim()) {
      return notification.warning({ message: "Vui lòng nhập mô tả issue!" });
    }

    const payload = {
      title: values.title,
      isPublic: values.isPublic || false,
      type: values.type,
      severity: values.severity,
      description,
      mediaUrl: fileUrl,
      tags: values.tags || [],
    };

    setLoading(true);
    try {
      await dispatch(createIssue(payload)).unwrap();
      notification.success({ message: "Tạo issue thành công!" });
      onSuccess?.();
      onCancel();
    } catch (err) {
      notification.error({
        message: "Không thể tạo issue",
        description: err?.message || "Đã xảy ra lỗi không xác định.",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!visible) {
      document.body.style.overflow = "";
      document.body.style.overflowY = "";
    }
  }, [visible]);
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={850}
      destroyOnHidden
      centered
      title={
        <div style={{ display: "flex", alignItems: "center" }}>
          <FileAddOutlined style={{ color: "#1677ff", fontSize: 20, marginRight: 8 }} />
          <span style={{ fontSize: 18 }}>Tạo Issue mới</span>
        </div>
      }
    >
      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        {/* 🟦 Title */}
        <Form.Item
          label="Tiêu đề"
          name="title"
          rules={[{ required: true, message: "Vui lòng nhập tiêu đề!" }]}
        >
          <Input placeholder="Nhập tiêu đề issue (ví dụ: Lỗi không hiển thị sản phẩm...)" />
        </Form.Item>

        {/* 🟩 Description */}
        <div style={{ marginBottom: 16 }}>
          <Text strong>Mô tả chi tiết (Markdown supported)</Text>
          <div style={{ marginTop: 8 }} ref={mdEditorRef}>
            <MDEditor
              height={300}
              value={description}
              onChange={setDescription}
              preview="edit"
              visibleDragbar={false}
            />
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Có thể dán ảnh trực tiếp vào đây — hệ thống sẽ tự upload và chèn link vào nội dung.
          </Text>
        </div>

        {/* 🟨 Type + Severity + Tags trên 1 dòng */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Loại issue"
              name="type"
              rules={[{ required: true, message: "Vui lòng nhập loại issue!" }]}
            >
              <Input type="text" placeholder="Nhập loại issue (ví dụ: bug, feature...)" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Mức độ nghiêm trọng"
              name="severity"
              rules={[{ required: true, message: "Chọn mức độ!" }]}
            >
              <Select placeholder="Chọn mức độ">
                <Option value="low">Thấp</Option>
                <Option value="medium">Trung bình</Option>
                <Option value="high">Cao</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Tag người dùng" name="tags">
              <Select
                mode="multiple"
                placeholder="Gắn người dùng"
                optionLabelProp="label"
                showSearch
                allowClear
                loading={userLoading}
                onPopupScroll={(e) => {
                  const target = e.target;
                  if (
                    target.scrollTop + target.offsetHeight === target.scrollHeight &&
                    userHasMoreRef.current
                  ) {
                    loadUsers(userSearchRef.current, true);
                  }
                }}
                onSearch={(value) => {
                  userSearchRef.current = value;
                  userPageRef.current = 0;
                  loadUsers(value, false);
                }}
                filterOption={(input, option) =>
                  option?.label?.toLowerCase()?.includes(input.toLowerCase()) ||
                  option?.username?.toLowerCase()?.includes(input.toLowerCase())
                }
                style={{ width: "100%" }}
              >
                {userOptions
                  .map((u) => (
                    <Option
                      key={u.id}
                      value={u.id}
                      label={u.full_name || u.username}
                      username={u.username}
                      disabled={u.id === currentUser?.id}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 0",
                        }}
                      >
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.username}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <UserOutlined
                            style={{
                              fontSize: 20,
                              color: "#999",
                              background: "#f0f0f0",
                              borderRadius: "50%",
                              padding: 2,
                            }}
                          />
                        )}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 500 }}>{u.full_name || u.username}</span>
                          <span style={{ fontSize: 12, color: "#888" }}>@{u.username}</span>
                        </div>
                      </div>
                    </Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* 🔓 Công khai */}
        <Form.Item label="Công khai" name="isPublic" valuePropName="checked">
          <Switch checkedChildren="Public" unCheckedChildren="Private" />
        </Form.Item>

        {/* 🖼️ Upload hình minh họa riêng (tuỳ chọn) */}
        {/* <Form.Item label="Ảnh minh họa (tùy chọn)">
          <Upload
            beforeUpload={(file) => {
              handleUpload(file);
              return false;
            }}
            showUploadList={false}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>Tải ảnh lên</Button>
          </Upload>
          {fileUrl && (
            <div style={{ marginTop: 8 }}>
              <img src={fileUrl} alt="preview" style={{ maxWidth: "100%", borderRadius: 6 }} />
            </div>
          )}
        </Form.Item> */}

        {/* 🟦 Footer */}
        <div style={{ textAlign: "right", marginTop: 24 }}>
          <Space>
            <Button onClick={onCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Tạo Issue
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default AddIssueModal;
