import React, { useEffect, useState } from "react";
import {
  ShopOutlined,
  BarcodeOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  TagOutlined,
} from "@ant-design/icons";
import "@assets/supplier/AddSupplierModal.css";
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Typography,
  Divider,
  notification,
  Row,
  Col,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { createSupplier } from "@src/store/supplierSlice";

const { Text } = Typography;

const AddSupplierModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const createStatus = useSelector((state) => state.supplier.createStatus);
  const createError = useSelector((state) => state.supplier.createError);
  const isLoading = createStatus === "loading";

  useEffect(() => {
    if (visible) form.resetFields();
  }, [visible, form]);

  const handleSubmit = (values) => {
    const supplierData = {
      code: values.code,
      name: values.name,
      phone: values.phone,
      email: values.email,
      address: values.address,
      taxCode: values.taxCode,
      note: values.note,
    };

    dispatch(createSupplier(supplierData))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Tạo nhà cung cấp thành công",
          description: `Nhà cung cấp "${values.name}" đã được thêm mới.`,
        });
        form.resetFields();
        onCancel();
        onSuccess?.();
      })
      .catch((err) => {
        notification.error({
          message: "Lỗi khi tạo nhà cung cấp",
          description: err || createError,
        });
      });
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const validationRules = {
    code: [
      { required: true, message: "Vui lòng nhập mã nhà cung cấp!" },
      { min: 3, message: "Mã phải có ít nhất 3 ký tự!" },
      {
        pattern: /^[A-Za-z_][A-Za-z0-9_]*$/,
        message:
          "Không chứa dấu, không bắt đầu bằng số và không có ký tự đặc biệt (trừ gạch dưới)!",
      },
    ],
    name: [{ required: true, message: "Vui lòng nhập tên nhà cung cấp!" }],
    email: [{ type: "email", message: "Email không hợp lệ!" }],
    phone: [
      {
        pattern: /^[0-9]{9,11}$/,
        message: "Số điện thoại không hợp lệ!",
      },
    ],
  };

  return (
    <Modal
      title={
        <div className="addSupplier-titleContainer">
          <ShopOutlined className="addSupplier-titleIcon" />
          <span style={{ fontSize: 18 }}>Thêm nhà cung cấp mới</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={720}
      destroyOnHidden
      maskClosable={!isLoading}
      className="addSupplier-modal"
      style={{ top: 50 }}
    >
      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
        className="addSupplier-form"
      >
        {/* ============ GRID 2 CỘT ============ */}
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item label="Mã nhà cung cấp" name="code" rules={validationRules.code}>
              <Input
                prefix={<BarcodeOutlined />}
                placeholder="VD: SUP001"
                size="large"
              />
            </Form.Item>

            <Form.Item label="Tên nhà cung cấp" name="name" rules={validationRules.name}>
              <Input
                prefix={<ShopOutlined />}
                placeholder="Tên nhà cung cấp"
                size="large"
              />
            </Form.Item>

            <Form.Item label="Số điện thoại" name="phone" rules={validationRules.phone}>
              <Input
                prefix={<PhoneOutlined />}
                placeholder="0364173531"
                size="large"
              />
            </Form.Item>

            <Form.Item label="Email" name="email" rules={validationRules.email}>
              <Input
                prefix={<MailOutlined />}
                placeholder="example@email.com"
                size="large"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Mã số thuế" name="taxCode">
              <Input
                prefix={<TagOutlined />}
                placeholder="Mã số thuế (nếu có)"
                size="large"
              />
            </Form.Item>

            <Form.Item label="Địa chỉ" name="address">
              <Input.TextArea
                prefix={<EnvironmentOutlined />}
                placeholder="Địa chỉ nhà cung cấp"
                size="large"
                rows={3}
                showCount
                maxLength={200}
              />
            </Form.Item>

            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea
                prefix={<FileTextOutlined />}
                placeholder="Ghi chú thêm"
                rows={3}
                size="large"
                maxLength={200}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ============ NÚT SUBMIT ============ */}
        <Form.Item className="addSupplier-submitContainer" style={{ textAlign: "right" }}>
          <Space className="addSupplier-buttonGroup">
            <Button onClick={handleCancel} size="large" disabled={isLoading}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
            >
              {isLoading ? "Đang tạo..." : "Tạo nhà cung cấp"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddSupplierModal;
