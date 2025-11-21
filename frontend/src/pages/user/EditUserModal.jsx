import React, { useEffect, useState } from "react";

import {
  BankOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "@assets/user/EditUserModal.css";
import { fetchListAllDepartments, fetchListDepartments } from "@src/store/departmentSlice";
import { updateUser } from "@src/store/userSlice";
import {
  Button,
  Col,
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

const EditUserModal = ({ visible, onCancel, onSuccess, userData }) => {
  const [form] = Form.useForm();
  const [departmentSearchText, setDepartmentSearchText] = useState("");
  const [originalEmail, setOriginalEmail] = useState(""); // Thêm state để lưu email gốc

  const dispatch = useDispatch();
  const updateStatus = useSelector((state) => state.user.updateStatus);
  const updateError = useSelector((state) => state.user.updateError);

  // Selectors for departments
  const departmentList = useSelector((state) => state.department.allDepartments);
  const departmentFetchStatus = useSelector((state) => state.department.fetchListAllStatus);

  const isLoading = updateStatus === "loading";
  const isDepartmentLoading = departmentFetchStatus === "loading";

  // Reset form khi modal đóng/mở và fetch departments
  useEffect(() => {
    if (visible) {
      setDepartmentSearchText("");
      // Fetch departments nếu chưa có hoặc cần refresh
      if (!departmentList || departmentFetchStatus === "idle") {
        dispatch(fetchListAllDepartments()); // Fetch all departments
      }
    }
  }, [visible, dispatch, departmentList, departmentFetchStatus]);

  // Reset và fill form khi modal mở/đóng hoặc userData thay đổi
  useEffect(() => {
    if (visible && userData) {
      // Lưu email gốc khi modal mở
      setOriginalEmail(userData.email);
      form.setFieldsValue({
        email: userData.email,
        username: userData.username,
        fullName: userData.fullName,
        phone: userData.phone,
        role: userData.role,
        status: userData.status,
        departmentId: userData.departmentId || userData.department?.id, // Handle both cases
      });
    } else if (!visible) {
      form.resetFields();
      setOriginalEmail(""); // Reset email gốc khi modal đóng
    }
  }, [visible, userData, form]);

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

  // Các trạng thái có thể chọn
  const statusOptions = [
    { value: "active", label: "Hoạt động", color: "green" },
    { value: "disable", label: "Vô hiệu hóa", color: "red" },
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
    <div className="editUser-departmentOption">
      <div className="editUser-departmentMain">
        <BankOutlined className="editUser-departmentIcon" />
        <div className="editUser-departmentInfo">
          <div className="editUser-departmentName">{department.name}</div>
          <div className="editUser-departmentDetails">
            <span className="editUser-departmentCode">#{department.code}</span>
            {department.address && (
              <span className="editUser-departmentAddress">• {department.address}</span>
            )}
          </div>
        </div>
      </div>
      <div className={`editUser-departmentStatus editUser-departmentStatus--${department.status}`}>
        {department.status === "active" ? "Hoạt động" : "Không hoạt động"}
      </div>
    </div>
  );

  // Submit form
  const handleSubmit = (values) => {
    const updateData = {
      email: values.email,
      username: values.username,
      fullName: values.fullName,
      phone: values.phone,
      role: values.role,
      status: values.status,
      departmentId: values.departmentId, // Đảm bảo field name đúng
    };
    // Kiểm tra xem email có thay đổi không
    const isEmailChanged = values.email !== originalEmail;
    dispatch(updateUser({ userId: userData.id, userData: updateData }))
      .unwrap()
      .then(() => {
        if (isEmailChanged) {
          notification.success({
            message: "Cập nhật thành công",
            description: `Chúng tôi đã gửi một email xác nhận đến địa chỉ mới "${values.email}". Vui lòng kiểm tra email để xác nhận thay đổi.`,
            duration: 5,
          });
        } else {
          notification.success({
            message: "Cập nhật thành công",
            description: `Thông tin người dùng đã được cập nhật.`,
            duration: 5,
          });
        }
        form.resetFields();
        onCancel();
        if (onSuccess) {
          onSuccess();
        }
      })
      .catch((error) => {
        console.error("Error updating user:", error);
        notification.error({
          message: "Có lỗi xảy ra",
          description: updateError || error || "Có lỗi xảy ra khi cập nhật thông tin người dùng",
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
    departmentId: [{ required: true, message: "Vui lòng chọn cơ sở!" }],
    role: [{ required: true, message: "Vui lòng chọn chức danh!" }],
    status: [{ required: true, message: "Vui lòng chọn trạng thái!" }],
  };

  const filteredDepartments = getFilteredDepartments();

  return (
    <Modal
      title={
        <div className="editUser-titleContainer">
          <UserOutlined className="editUser-titleIcon" />
          <span>Chỉnh sửa thông tin người dùng</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700} // Tăng width để accommodate department info
      destroyOnHidden
      centered={true}
      maskClosable={!isLoading}
      className="editUser-modal"
    >
      <div className="editUser-description">
        <Text type="secondary">
          Cập nhật thông tin người dùng. Các thay đổi sẽ có hiệu lực ngay lập tức.
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
        className="editUser-form"
      >
        <Form.Item label="Email" name="email" rules={validationRules.email}>
          <Input
            prefix={<MailOutlined className="editUser-inputIcon" />}
            placeholder="example@tikovia.com"
            size="large"
            className="editUser-input"
          />
        </Form.Item>

        <Row gutter={{ xs: 8, sm: 16, md: 16, lg: 32 }}>
          <Col span={12}>
            <Form.Item label="Tên đăng nhập" name="username" rules={validationRules.username}>
              <Input
                prefix={<UserOutlined className="editUser-inputIcon" />}
                placeholder="username123"
                size="large"
                className="editUser-input"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Họ và tên" name="fullName" rules={validationRules.fullName}>
              <Input
                prefix={<UserOutlined className="editUser-inputIcon" />}
                placeholder="Nguyễn Văn A"
                size="large"
                className="editUser-input"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Số điện thoại" name="phone" rules={validationRules.phone}>
          <Input
            prefix={<PhoneOutlined className="editUser-inputIcon" />}
            placeholder="0987654321"
            size="large"
            className="editUser-input"
          />
        </Form.Item>

        <Row gutter={{ xs: 8, sm: 16, md: 16, lg: 32 }}>
          <Col span={12}>
            <Form.Item label="Chức danh" name="role" rules={validationRules.role}>
              <Select
                placeholder="Chọn chức danh"
                size="large"
                suffixIcon={<TeamOutlined className="editUser-inputIcon" />}
                className="editUser-select"
              >
                {roleOptions.map((role) => (
                  <Option key={role.value} value={role.value}>
                    <div className="editUser-roleOption">
                      <div
                        className={`editUser-roleIndicator editUser-roleIndicator--${role.color}`}
                      />
                      {role.label}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Cơ sở"
              name="departmentId" // Sửa từ "department" thành "departmentId"
              rules={validationRules.departmentId}
            >
              <Select
                placeholder="Tìm và chọn cơ sở"
                size="large"
                showSearch
                searchValue={departmentSearchText}
                onSearch={handleDepartmentSearch}
                filterOption={false}
                suffixIcon={<BankOutlined className="editUser-inputIcon" />}
                className="editUser-select"
                loading={isDepartmentLoading}
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
                    label={department.name}
                    disabled={department.status !== "active"}
                  >
                    {renderDepartmentOption(department)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Trạng thái" name="status" rules={validationRules.status}>
          <Select placeholder="Chọn trạng thái" size="large" className="editUser-select">
            {statusOptions.map((status) => (
              <Option key={status.value} value={status.value}>
                <div className="editUser-statusOption">
                  <div
                    className={`editUser-statusIndicator editUser-statusIndicator--${status.color}`}
                  />
                  {status.label}
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item className="editUser-submitContainer">
          <Space className="editUser-buttonGroup">
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              size="large"
              className="editUser-cancelButton"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
              className="editUser-submitButton"
            >
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditUserModal;
