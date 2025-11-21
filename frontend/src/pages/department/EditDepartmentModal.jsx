import React, { useEffect, useState } from "react";

import { BankOutlined, BarcodeOutlined, HomeOutlined } from "@ant-design/icons";
import "@assets/department/EditDepartmentModal.css";
import { updateDepartment } from "@src/store/departmentSlice";
// Cần thay đổi thành updateDepartment
import {
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;
const { Option } = Select;

const EditDepartmentModal = ({ visible, onCancel, onSuccess, departData }) => {
  const [form] = Form.useForm();

  const dispatch = useDispatch();
  const updateStatus = useSelector((state) => state.department.updateStatus);
  const updateError = useSelector((state) => state.department.updateError);

  const isLoading = updateStatus === "loading";

  // Reset và fill form khi modal mở/đóng hoặc departData thay đổi
  useEffect(() => {
    if (visible && departData) {
      form.setFieldsValue({
        code: departData.code,
        name: departData.name,
        address: departData.address,
        status: departData.status,
      });
    } else if (!visible) {
      form.resetFields();
    }
  }, [visible, departData, form]);

  // Các trạng thái có thể chọn
  const statusOptions = [
    { value: "active", label: "Hoạt động", color: "green" },
    { value: "disable", label: "Không hoạt động", color: "red" },
  ];

  // Submit form
  const handleSubmit = (values) => {
    const updateData = {
      code: values.code,
      name: values.name,
      address: values.address,
      status: values.status,
    };

    // Tạm thời dùng updateUser, cần thay thành updateDepartment
    dispatch(updateDepartment({ departmentId: departData.id, departmentData: updateData }))
      .unwrap()
      .then(() => {
        // Thành công
        notification.success({
          message: "Cập nhật thành công",
          description: `Thông tin cơ sở "${values.name}" đã được cập nhật.`,
          duration: 5,
        });
        form.resetFields();
        onCancel();
        if (onSuccess) {
          onSuccess();
        }
      })
      .catch((error) => {
        // Thất bại
        notification.error({
          message: "Có lỗi xảy ra",
          description: updateError || "Có lỗi xảy ra khi cập nhật thông tin cơ sở",
          duration: 5,
        });
      });
  };

  // Xử lý đóng modal
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // Validation rules
  const validationRules = {
    code: [
      { required: true, message: "Vui lòng nhập mã cơ sở!" },
      ///////////////////////////////////////////////////
      ///////////////Business rule department///////////////
      // code:
      // không dấu
      // không có kí tự đặc biệt (allow _)
      // không bắt đầu với số
      // tối thiểu 3 kí tự
      ///////////////////////////////////////////////////
      { min: 3, message: "Mã cơ sở phải có ít nhất 3 ký tự!" },
      {
        pattern: /^[A-Za-z_][A-Za-z0-9_]*$/,
        message:
          "Mã cơ sở không được chứa dấu, không bắt đầu bằng số và không có ký tự đặc biệt (ngoại trừ dấu gạch dưới)!",
      },
    ],
    name: [{ required: true, message: "Vui lòng nhập tên cơ sở!" }],
    // address: [{ required: true, message: "Vui lòng nhập địa chỉ!" }],
    status: [{ required: true, message: "Vui lòng chọn trạng thái!" }],
  };

  return (
    <Modal
      title={
        <div className="editDepart-titleContainer">
          <BankOutlined className="editDepart-titleIcon" />
          <span style={{ fontSize: "18px" }}>Chỉnh sửa thông tin cơ sở</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnHidden
      centered={true}
      maskClosable={!isLoading}
      className="editDepart-modal"
    >
      <div className="editDepart-description">
        <Text type="secondary">
          Cập nhật thông tin cơ sở. Các thay đổi sẽ có hiệu lực ngay lập tức.
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
        className="editDepart-form"
      >
        <Form.Item label="Mã cơ sở" name="code" rules={validationRules.code}>
          <Input
            prefix={<BarcodeOutlined className="editDepart-inputIcon" />}
            placeholder="HoaChau1"
            size="large"
            className="editDepart-input"
          />
        </Form.Item>

        <Form.Item label="Tên cơ sở" name="name" rules={validationRules.name}>
          <Input
            prefix={<HomeOutlined className="editDepart-inputIcon" />}
            placeholder="Phòng Công nghệ thông tin"
            size="large"
            className="editDepart-input"
          />
        </Form.Item>

        <Form.Item label="Địa chỉ" name="address">
          <Input.TextArea
            placeholder="Tầng 3, Tòa nhà A, 123 Nguyễn Văn Linh"
            size="large"
            className="editDepart-input"
            rows={3}
            showCount
            maxLength={200}
          />
        </Form.Item>

        <Form.Item label="Trạng thái" name="status" rules={validationRules.status}>
          <Select placeholder="Chọn trạng thái" size="large" className="editDepart-select">
            {statusOptions.map((status) => (
              <Option key={status.value} value={status.value}>
                <div className="editDepart-statusOption">
                  <div
                    className={`editDepart-statusIndicator editDepart-statusIndicator--${status.color}`}
                  />
                  {status.label}
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item className="editDepart-submitContainer">
          <Space className="editDepart-buttonGroup">
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              size="large"
              className="editDepart-cancelButton"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
              className="editDepart-submitButton"
            >
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditDepartmentModal;
