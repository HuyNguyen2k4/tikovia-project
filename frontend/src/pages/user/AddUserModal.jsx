import React, { useEffect, useState } from "react";

import {
  BankOutlined, // Thêm icon cho department
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "@assets/user/AddUserModal.css";
import { fetchListAllDepartments, fetchListDepartments } from "@src/store/departmentSlice";
import { createUser } from "@src/store/userSlice";
// Import department action
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;
const { Option } = Select;

const AddUserModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [departmentSearchText, setDepartmentSearchText] = useState(""); // State cho search departments

  const dispatch = useDispatch();
  const createStatus = useSelector((state) => state.user.createStatus);
  const createError = useSelector((state) => state.user.createError);

  // Selectors for departments
  const departmentList = useSelector((state) => state.department.allDepartments);
  const departmentFetchStatus = useSelector((state) => state.department.fetchListAllStatus);

  const isLoading = createStatus === "loading";
  const isDepartmentLoading = departmentFetchStatus === "loading";

  // Reset form khi modal đóng/mở và fetch departments
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setDepartmentSearchText("");

      // Fetch departments nếu chưa có hoặc cần refresh
      if (!departmentList || departmentFetchStatus === "idle") {
        dispatch(fetchListAllDepartments()); // Fetch all departments
      }
    }
  }, [visible, form, dispatch, departmentList, departmentFetchStatus]);

  // Các role có thể chọn
  const roleOptions = [
    { value: "admin", label: "Quản trị viên", color: "red" },
    { value: "manager", label: "Quản lý", color: "blue" },
    { value: "accountant", label: "Kế toán", color: "purple" },
    { value: "picker", label: "Nhân viên lấy hàng", color: "green" },
    { value: "sup_picker", label: "Giám sát lấy hàng", color: "cyan" },
    { value: "shipper", label: "Nhân viên giao hàng", color: "orange" },
    { value: "sup_shipper", label: "Giám sát giao hàng", color: "gold" },
    { value: "seller", label: "Nhân viên bán hàng", color: "magenta" },
  ];

  // Filter departments based on search text
  const getFilteredDepartments = () => {
    if (!departmentList) return [];

    const departments = departmentList;
    if (!departmentSearchText) return departments;

    return departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(departmentSearchText.toLowerCase()) ||
        dept.code.toLowerCase().includes(departmentSearchText.toLowerCase()) ||
        dept.address?.toLowerCase().includes(departmentSearchText.toLowerCase())
    );
  };

  // Handle department search
  const handleDepartmentSearch = (value) => {
    setDepartmentSearchText(value);
  };

  // Render department option với thông tin chi tiết
  const renderDepartmentOption = (department) => (
    <div className="addUser-departmentOption">
      <div className="addUser-departmentMain">
        <BankOutlined className="addUser-departmentIcon" />
        <div className="addUser-departmentInfo">
          <div className="addUser-departmentName">{department.name}</div>
          <div className="addUser-departmentDetails">
            <span className="addUser-departmentCode">#{department.code}</span>
            {department.address && (
              <span className="addUser-departmentAddress">• {department.address}</span>
            )}
          </div>
        </div>
      </div>
      <div className={`addUser-departmentStatus addUser-departmentStatus--${department.status}`}>
        {department.status === "active" ? "Hoạt động" : "Không hoạt động"}
      </div>
    </div>
  );

  // Submit form
  const handleSubmit = (values) => {
    const userData = {
      email: values.email,
      username: values.username,
      fullName: values.fullName,
      phone: values.phone,
      role: values.role,
      departmentId: values.department, // Thêm departmentId
    };

    dispatch(createUser(userData))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Tạo tài khoản thành công",
          description: `Tài khoản đã được tạo. Vui lòng kiểm tra email để kích hoạt.`,
          duration: 5,
        });
        form.resetFields();
        onCancel();
        if (onSuccess) {
          onSuccess();
        }
      })
      .catch((createError) => {
        console.error("Error creating user:", createError);
        console.error("Create error details:", createError);
        notification.error({
          message: "Có lỗi xảy ra",
          description: createError || "Có lỗi xảy ra khi tạo tài khoản",
          duration: 5,
        });
      });
  };

  // Xử lý đóng modal
  const handleCancel = () => {
    form.resetFields();
    setDepartmentSearchText("");
    onCancel();
  };

  // Validation rules
  const validationRules = {
    email: [
      { required: true, message: "Vui lòng nhập email!" },
      { type: "email", message: "Email không hợp lệ!" },
    ],
    username: [
      { required: true, message: "Vui lòng nhập tên đăng nhập!" },
      { min: 3, message: "Tên đăng nhập phải có ít nhất 3 ký tự!" },
      { max: 50, message: "Tên đăng nhập không được quá 50 ký tự!" },
      {
        pattern: /^[a-zA-Z][a-zA-Z0-9_]{2,49}$/,
        message:
          "Tên đăng nhập phải bắt đầu bằng chữ cái, có 3-50 ký tự và chỉ chứa chữ cái, số, dấu gạch dưới!",
      },
    ],
    fullName: [
      { required: true, message: "Vui lòng nhập họ và tên!" },
      { min: 2, message: "Họ và tên phải có ít nhất 2 ký tự!" },
      {
        pattern: /^[^\d].*$/,
        message: "Họ và tên không được bắt đầu bằng số!",
      },
    ],
    phone: [
      { required: true, message: "Vui lòng nhập số điện thoại!" },
      {
        pattern: /^[0-9]{10,11}$/,
        message: "Số điện thoại phải có 10-11 chữ số!",
      },
    ],
    department: [{ required: true, message: "Vui lòng chọn cơ sở!" }],
    role: [{ required: true, message: "Vui lòng chọn chức danh!" }],
  };

  const filteredDepartments = getFilteredDepartments();

  return (
    <Modal
      title={
        <div className="addUser-titleContainer">
          <UserOutlined className="addUser-titleIcon" />
          <span style={{ fontSize: "18px" }}>Thêm tài khoản mới</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700} // Tăng width để accommodate department info
      destroyOnHidden
      centered={true}
      maskClosable={!isLoading}
      className="addUser-modal"
    >
      <div className="addUser-description">
        <Text type="secondary">
          Hệ thống sẽ tự động tạo mật khẩu và gửi email kích hoạt tài khoản đến người dùng.
        </Text>
      </div>

      <div className="addUser-noticeBox">
        <Text className="addUser-noticeText">
          <strong className="addUser-noticeIcon">💡</strong> <strong>Lưu ý:</strong> Sau khi tạo
          thành công, người dùng sẽ nhận được email chứa link kích hoạt tài khoản và thiết lập mật
          khẩu. Link có hiệu lực trong <strong>7 ngày.</strong>
        </Text>
      </div>

      <Divider className="addUser-divider" />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
        className="addUser-form"
      >
        <Form.Item label="Email" name="email" rules={validationRules.email}>
          <Input
            prefix={<MailOutlined className="addUser-inputIcon" />}
            placeholder="example@tikovia.com"
            size="large"
            className="addUser-input"
          />
        </Form.Item>

        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
          <Col span={12}>
            <Form.Item label="Tên đăng nhập" name="username" rules={validationRules.username}>
              <Input
                prefix={<UserOutlined className="addUser-inputIcon" />}
                placeholder="username123"
                size="large"
                className="addUser-input"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Họ và tên" name="fullName" rules={validationRules.fullName}>
              <Input
                prefix={<UserOutlined className="addUser-inputIcon" />}
                placeholder="Nguyễn Văn A"
                size="large"
                className="addUser-input"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Số điện thoại" name="phone" rules={validationRules.phone}>
          <Input
            prefix={<PhoneOutlined className="addUser-inputIcon" />}
            placeholder="0987654321"
            size="large"
            className="addUser-input"
          />
        </Form.Item>

        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
          <Col span={12}>
            <Form.Item label="Chức danh" name="role" rules={validationRules.role}>
              <Select
                placeholder="Chọn chức danh"
                size="large"
                suffixIcon={<TeamOutlined className="addUser-inputIcon" />}
                className="addUser-select"
              >
                {roleOptions.map((role) => (
                  <Option key={role.value} value={role.value}>
                    <div className="addUser-roleOption">
                      <div
                        className={`addUser-roleIndicator addUser-roleIndicator--${role.color}`}
                      />
                      {role.label}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Chọn cơ sở" name="department" rules={validationRules.department}>
              <Select
                placeholder="Tìm và chọn cơ sở"
                size="large"
                showSearch
                searchValue={departmentSearchText}
                onSearch={handleDepartmentSearch}
                filterOption={false}
                suffixIcon={<BankOutlined className="addUser-inputIcon" />}
                className="addUser-select"
                loading={isDepartmentLoading}
                // Custom render cho selected value
                optionLabelProp="label"
                notFoundContent={
                  isDepartmentLoading ? (
                    <div style={{ padding: "12px", textAlign: "center" }}>
                      <Spin size="small" />
                      <span style={{ marginLeft: 8 }}>Đang tải...</span>
                    </div>
                  ) : (
                    <div style={{ padding: "12px", textAlign: "center", color: "#999" }}>
                      {departmentSearchText ? "Không tìm thấy cơ sở phù hợp" : "Không có dữ liệu"}
                    </div>
                  )
                }
                styles={{
                  popup: {
                    root: { maxHeight: 300 },
                  },
                }}
              >
                {filteredDepartments.map((department) => (
                  <Option
                    key={department.id}
                    value={department.id}
                    label={department.name} // Simple label for selected value
                    disabled={department.status !== "active"}
                  >
                    {renderDepartmentOption(department)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item className="addUser-submitContainer">
          <Space className="addUser-buttonGroup">
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              size="large"
              className="addUser-cancelButton"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
              className="addUser-submitButton"
            >
              {isLoading ? "Đang tạo..." : "Tạo tài khoản"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddUserModal;
