// src/components/common/UserProfile.jsx
import React, { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Typography,
  Upload,
  notification,
} from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { updateUserAsync, changePasswordAsync } from "@src/store/authSlice";

const { Title } = Typography;

const UserProfile = () => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const dispatch = useDispatch();
  const [isDirty, setIsDirty] = useState(false);

  const currentUser = useSelector(
    (state) => state.auth?.user || state.auth?.currentUser
  );

  useEffect(() => {
    if (currentUser) {
      profileForm.setFieldsValue({
        username: currentUser.username,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        bio: currentUser.bio,
        departmentName: currentUser.departmentName,
        departmentCode: currentUser.departmentCode,
      });
      setIsDirty(false);
    }
  }, [currentUser, profileForm]);

  // Save profile
  const handleSaveProfile = async (values) => {
    try {
      await dispatch(updateUserAsync(values)).unwrap();
      notification.success({ message: "Cập nhật profile thành công" });
      setIsDirty(false);
    } catch (err) {
      notification.error({
        message: "Cập nhật thất bại",
        description: err || "Username hoặc email có thể đã tồn tại",
      });
    }
  };

  // Change password
  const handleChangePassword = async (values) => {
    try {
      await dispatch(changePasswordAsync(values)).unwrap();
      notification.success({ message: "Đổi mật khẩu thành công" });
      passwordForm.resetFields();
    } catch (err) {
      notification.error({
        message: "Đổi mật khẩu thất bại",
        description: err,
      });
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Profile Info */}
      <Card bordered style={{ maxWidth: 900, margin: "0 auto", marginBottom: 32 }}>
        <Title level={3} style={{ marginBottom: 24 }}>
          Quản lý thông tin cá nhân
        </Title>

        <Form
          layout="vertical"
          form={profileForm}
          onFinish={handleSaveProfile}
          onValuesChange={() => setIsDirty(true)}
        >
          <Row gutter={24}>
            {/* Avatar */}
            <Col span={6} style={{ textAlign: "center" }}>
              <Avatar
                size={120}
                src={currentUser?.avatar}
                icon={<UserOutlined />}
                style={{ marginBottom: 12 }}
              />
              <Form.Item name="avatar" valuePropName="file">
                <Upload
                  listType="picture"
                  maxCount={1}
                  beforeUpload={() => false}
                  onChange={(info) => {
                    if (info.fileList.length > 0) {
                      const file = info.fileList[0].originFileObj;
                      const url = URL.createObjectURL(file);
                      profileForm.setFieldValue("avatar", url);
                      setIsDirty(true); // bật Save Profile khi upload ảnh
                    } else {
                      profileForm.setFieldValue("avatar", null);
                    }
                  }}
                >
                  <Button icon={<UploadOutlined />}>Tải ảnh lên</Button>
                </Upload>
              </Form.Item>
            </Col>

            {/* Profile info */}
            <Col span={18}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Tên đăng nhập" name="username">
                    <Input disabled style={{ color: "black" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Họ và tên" name="fullName">
                    <Input disabled style={{ color: "black" }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Email" name="email">
                    <Input disabled style={{ color: "black" }} />
                  </Form.Item>
                </Col>

                {/* Phone + Save Profile trên cùng một hàng */}
                <Col span={12}>
                  <Row gutter={8}>
                    <Col span={19}>
                      <Form.Item label="Số điện thoại" name="phone">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={5} style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
                      <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" disabled={!isDirty}>
                          Lưu
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
              </Row>

              {/* Department Info */}
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Tên phòng ban" name="departmentName">
                    <Input disabled style={{ color: "black" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Mã phòng ban" name="departmentCode">
                    <Input disabled style={{ color: "black" }} />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Change Password */}
      <Card bordered style={{ maxWidth: 900, margin: "0 auto" }}>
        <Title level={4} style={{ marginBottom: 24 }}>
          Đổi mật khẩu
        </Title>

        <Form
          layout="vertical"
          form={passwordForm}
          onFinish={handleChangePassword}
        >
          <Form.Item
            label="Mật khẩu cũ"
            name="oldPassword"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu cũ" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu không khớp!"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default UserProfile;
