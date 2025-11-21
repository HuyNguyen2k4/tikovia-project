// src/pages/CustomerList/AddCustomerModal.jsx
import React, { useEffect, useState } from "react";

import {
  BankOutlined,
  DollarCircleOutlined,
  EnvironmentOutlined,
  MailOutlined,
  NumberOutlined,
  PhoneOutlined,
  SolutionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "@assets/user/AddUserModal.css";
// Tái sử dụng CSS
import { createCustomer } from "@src/store/customerSlice";
import { fetchListAllSellers } from "@src/store/userSlice";
// Giả định thunk này tồn tại
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
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
const { TextArea } = Input;

const AddCustomerModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const createStatus = useSelector((state) => state.customer.createStatus);
  const user = useSelector((state) => state.auth.user);
  const isLoading = createStatus === "loading";

  // Lấy danh sách seller (user có role 'seller' hoặc 'admin')
  const sellerList = useSelector((state) => state.user.sellerList); // <-- Sửa tên state
  const sellerFetchStatus = useSelector((state) => state.user.sellerFetchStatus); // <-- Sửa tên state
  const isSellerLoading = sellerFetchStatus === "loading";

  useEffect(() => {
    if (visible) {
      form.resetFields();

      // Nếu role là seller, set managedBy mặc định
      if (user.role === "seller") {
        form.setFieldsValue({ managedBy: user.id });
      }

      // Chỉ fetch sellerList nếu role là admin, manager hoặc accountant
      if (
        (user.role === "admin" || user.role === "manager" || user.role === "accountant") &&
        (!sellerList || sellerList.length === 0) &&
        sellerFetchStatus === "idle"
      ) {
        dispatch(fetchListAllSellers());
      }
    }
  }, [visible, form, dispatch, sellerList, sellerFetchStatus, user.role, user.id]);

  // Submit form
  const handleSubmit = (values) => {
    dispatch(createCustomer(values))
      .unwrap()
      .then(() => {
        notification.success({ message: "Tạo khách hàng thành công" });
        onSuccess();
      })
      .catch((err) => {
        notification.error({
          message: "Tạo thất bại",
          description: err || "Mã, SĐT hoặc Email có thể đã tồn tại.",
        });
      });
  };

  const validationRules = {
    // code: [{ required: true, message: "Vui lòng nhập mã khách hàng!" }],
    name: [{ required: true, message: "Vui lòng nhập tên doanh nghiệp!" }],
    phone: [{ required: true, message: "Vui lòng nhập số điện thoại!" }],
    email: [{ type: "email", message: "Email không hợp lệ!" }],
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          Thêm khách hàng mới
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnHidden={true}
      centered
      maskClosable={!isLoading}
      className="addUser-modal" // Tái sử dụng class
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={isLoading}>
        <Form.Item label="Tên doanh nghiệp" name="name" rules={validationRules.name}>
          <Input
            prefix={<UserOutlined className="addUser-inputIcon" />}
            placeholder="Nguyễn Văn A"
            size="large"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Số điện thoại" name="phone" rules={validationRules.phone}>
              <Input
                prefix={<PhoneOutlined className="addUser-inputIcon" />}
                placeholder="0987654321"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Email" name="email" rules={validationRules.email}>
              <Input
                prefix={<MailOutlined className="addUser-inputIcon" />}
                placeholder="example@gmail.com"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Địa chỉ" name="address">
          <Input
            prefix={<EnvironmentOutlined className="addUser-inputIcon" />}
            placeholder="Số 1, đường ABC, quận XYZ..."
            size="large"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Mã số thuế của doanh nghiệp" name="taxCode">
              <Input
                prefix={<SolutionOutlined className="addUser-inputIcon" />}
                placeholder="0123456789"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Người quản lý">
              {user.role === "seller" ? (
                <>
                  {/* Hidden field giữ id để submit */}
                  <Form.Item name="managedBy" initialValue={user.id} hidden>
                    <Input />
                  </Form.Item>
                  {/* Hiển thị tên - không bị Form override */}
                  <Input
                    value={`${user.fullName || ""} (${user.username || ""})`}
                    disabled
                    size="large"
                  />
                </>
              ) : (
                <Form.Item name="managedBy" noStyle>
                  <Select
                    placeholder="Chọn người quản lý"
                    size="large"
                    showSearch
                    loading={isSellerLoading}
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={sellerList?.map((seller) => ({
                      value: seller.id,
                      label: `${seller.fullName} (${seller.username})`,
                    }))}
                  />
                </Form.Item>
              )}
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Hạn mức tín dụng" name="creditLimit">
          <InputNumber
            prefix={<DollarCircleOutlined className="addUser-inputIcon" />}
            style={{ width: "100%" }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
            placeholder="0"
            size="large"
            min={0}
          />
        </Form.Item>

        <Form.Item label="Ghi chú" name="note">
          <TextArea rows={3} placeholder="Thông tin thêm về khách hàng..." />
        </Form.Item>

        <Divider />

        <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
          <Space>
            <Button onClick={onCancel} disabled={isLoading} size="large">
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={isLoading} size="large">
              {isLoading ? "Đang lưu..." : "Lưu"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddCustomerModal;
