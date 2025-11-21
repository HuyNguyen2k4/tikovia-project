import React, { useEffect } from "react";
import {
  ShopOutlined,
  BarcodeOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  TagOutlined,
} from "@ant-design/icons";
import "@assets/supplier/EditSupplierModal.css";
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
import { updateSupplier } from "@src/store/supplierSlice";

const { Text } = Typography;

const EditSupplierModal = ({ visible, onCancel, onSuccess, supplierData }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const updateStatus = useSelector((state) => state.supplier.updateStatus);
  const updateError = useSelector((state) => state.supplier.updateError);
  const isLoading = updateStatus === "loading";

  useEffect(() => {
    if (visible && supplierData) {
      form.setFieldsValue({
        code: supplierData.code,
        name: supplierData.name,
        phone: supplierData.phone,
        email: supplierData.email,
        address: supplierData.address,
        taxCode: supplierData.taxCode,
        note: supplierData.note,
      });
    } else if (!visible) {
      form.resetFields();
    }
  }, [visible, supplierData, form]);

  const handleSubmit = (values) => {
    const updateData = {
      code: values.code,
      name: values.name,
      phone: values.phone,
      email: values.email,
      address: values.address,
      taxCode: values.taxCode,
      note: values.note,
    };

    dispatch(updateSupplier({ supplierId: supplierData.id, supplierData: updateData }))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Cập nhật thành công",
          description: `Nhà cung cấp "${values.name}" đã được cập nhật.`,
        });
        form.resetFields();
        onCancel();
        onSuccess?.();
      })
      .catch((err) => {
        notification.error({
          message: "Cập nhật thất bại",
          description: err || updateError,
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
        <div className="editSupplier-titleContainer">
          <ShopOutlined className="editSupplier-titleIcon" />
          <span style={{ fontSize: 18 }}>Chỉnh sửa nhà cung cấp</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={720}
      destroyOnHidden
      maskClosable={!isLoading}
      className="editSupplier-modal"
      style={{ top: 50 }}
    >
      <Divider />
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Cập nhật thông tin nhà cung cấp. Các thay đổi sẽ được lưu ngay lập tức.
      </Text>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
        className="editSupplier-form"
      >
        {/* ✅ GRID 2 CỘT */}
        <Row gutter={[16, 0]}>
          {/* --- Cột trái --- */}
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
                placeholder="Tên NCC"
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

          {/* --- Cột phải --- */}
          <Col xs={24} md={12}>
            <Form.Item label="Mã số thuế" name="taxCode">
              <Input
                prefix={<TagOutlined />}
                placeholder="Mã số thuế"
                size="large"
              />
            </Form.Item>
            
            <Form.Item label="Địa chỉ" name="address">
              <Input.TextArea
                prefix={<EnvironmentOutlined />}
                placeholder="Địa chỉ NCC"
                rows={3}
                size="large"
                showCount
                maxLength={200}
              />
            </Form.Item>

            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea
                prefix={<FileTextOutlined />}
                placeholder="Ghi chú"
                rows={3}
                size="large"
                maxLength={200}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ✅ Nút hành động */}
        <Form.Item
          className="editSupplier-submitContainer"
          style={{ textAlign: "right", marginTop: 12 }}
        >
          <Space className="editSupplier-buttonGroup">
            <Button onClick={handleCancel} size="large" disabled={isLoading}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isLoading}
            >
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditSupplierModal;
