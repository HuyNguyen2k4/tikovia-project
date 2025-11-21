import React, { useEffect, useState } from "react";

import {
  BankOutlined,
  BarcodeOutlined,
  EnvironmentOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import "@assets/department/AddDepartmentModal.css";
import { createDepartment } from "@src/store/departmentSlice";
import { Button, Divider, Form, Input, Modal, Select, Space, Typography, notification } from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;
const { Option } = Select;

const AddDepartmentModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const createStatus = useSelector((state) => state.department.createStatus);
  const createError = useSelector((state) => state.department.createError);

  const isLoading = createStatus === "loading";

  // Reset form khi modal đóng/mở
  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  // Submit form - giữ nguyên logic hiện tại
  const handleSubmit = (values) => {
    const departmentData = {
      code: values.code,
      name: values.name,
      address: values.address,
    };

    const result = dispatch(createDepartment(departmentData))
      .unwrap()
      .then(() => {
        // Thành công;
        notification.success({
          message: "Tạo cơ sở thành công",
          description: `Cơ sở đã được tạo thành công.`,
          duration: 5,
        });
        form.resetFields();
        onCancel();
        if (onSuccess) {
          onSuccess();
        }
      })
      .catch((createError) => {
        // Thất bại;
        notification.error({
          message: "Có lỗi xảy ra",
          description: createError || "Có lỗi xảy ra khi tạo cơ sở.",
          duration: 5,
        });
      });
  };

  // Xử lý đóng modal - giữ nguyên logic hiện tại
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
  };

  return (
    <Modal
      title={
        <div className="addDepart-titleContainer">
          <BankOutlined className="addDepart-titleIcon" />
          <span style={{ fontSize: "18px" }}>Thêm cơ sở mới</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnHidden
      centered={true}
      maskClosable={!isLoading}
      className="addDepart-modal"
    >
      <Divider className="addDepart-divider" />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
        className="addDepart-form"
      >
        <Form.Item label="Mã cơ sở" name="code" rules={validationRules.code}>
          <Input
            prefix={<BarcodeOutlined className="addDepart-inputIcon" />}
            placeholder="HoaChau1"
            size="large"
            className="addDepart-input"
          />
        </Form.Item>
        <Form.Item label="Tên cơ sở" name="name" rules={validationRules.name}>
          <Input
            prefix={<HomeOutlined className="addDepart-inputIcon" />}
            placeholder="Tên cơ sở"
            size="large"
            className="addDepart-input"
          />
        </Form.Item>

        <Form.Item label="Address" name="address">
          <Input.TextArea
            prefix={<EnvironmentOutlined className="addDepart-inputIcon" />}
            placeholder="Địa chỉ cơ sở"
            size="large"
            rows={3}
            maxLength={200}
            showCount
            className="addDepart-input"
          />
        </Form.Item>

        <Form.Item className="addDepart-submitContainer">
          <Space className="addDepart-buttonGroup">
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              size="large"
              className="addDepart-cancelButton"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
              className="addDepart-submitButton"
            >
              {isLoading ? "Đang tạo..." : "Tạo cơ sở"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddDepartmentModal;
