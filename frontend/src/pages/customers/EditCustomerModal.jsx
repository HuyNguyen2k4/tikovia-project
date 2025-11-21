// src/pages/CustomerList/EditCustomerModal.jsx
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
import "@assets/user/EditUserModal.css";
// Tái sử dụng CSS
import { updateCustomer } from "@src/store/customerSlice";
import { fetchListAllSellers } from "@src/store/userSlice";
// Giả định
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

const EditCustomerModal = ({ visible, onCancel, onSuccess, customerData }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const updateStatus = useSelector((state) => state.customer.updateStatus);
  const user = useSelector((state) => state.auth.user);
  const isLoading = updateStatus === "loading";

  // Lấy danh sách seller (user có role 'seller' hoặc 'admin')
  const sellerList = useSelector((state) => state.user.sellerList);
  const sellerFetchStatus = useSelector((state) => state.user.sellerFetchStatus);
  const isSellerLoading = sellerFetchStatus === "loading";

  useEffect(() => {
    if (visible) {
      if (customerData) {
        form.setFieldsValue(customerData);
      }
      // Chỉ fetch sellerList nếu role là admin, manager hoặc accountant
      if (
        (user.role === "admin" || user.role === "manager" || user.role === "accountant") &&
        (!sellerList || sellerFetchStatus === "idle")
      ) {
        dispatch(fetchListAllSellers());
      }
    }
  }, [visible, customerData, form, dispatch, sellerList, sellerFetchStatus, user.role]);

  // Submit form
  const handleSubmit = (values) => {
    dispatch(updateCustomer({ customerId: customerData.id, customerData: values }))
      .unwrap()
      .then(() => {
        notification.success({ message: "Cập nhật khách hàng thành công" });
        onSuccess();
      })
      .catch((err) => {
        notification.error({
          message: "Cập nhật thất bại",
          description: err || "Mã, SĐT hoặc Email có thể đã tồn tại.",
        });
      });
  };

  const validationRules = {
    // code: [{ required: true, message: "Vui lòng nhập mã khách hàng!" }],
    name: [{ required: true, message: "Vui lòng nhập tên khách hàng!" }],
    phone: [{ required: true, message: "Vui lòng nhập số điện thoại!" }],
    email: [{ type: "email", message: "Email không hợp lệ!" }],
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          Chỉnh sửa thông tin khách hàng
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnHidden={true}
      centered
      maskClosable={!isLoading}
      className="editUser-modal" // Tái sử dụng class
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={isLoading}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Mã khách hàng" name="code" rules={validationRules.code}>
              <Input
                prefix={<NumberOutlined className="editUser-inputIcon" />}
                placeholder="KH001"
                size="large"
                disabled
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Tên khách hàng" name="name" rules={validationRules.name}>
              <Input
                prefix={<UserOutlined className="editUser-inputIcon" />}
                placeholder="Nguyễn Văn A"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Số điện thoại" name="phone" rules={validationRules.phone}>
              <Input
                prefix={<PhoneOutlined className="editUser-inputIcon" />}
                placeholder="0987654321"
                size="large"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Email" name="email" rules={validationRules.email}>
              <Input
                prefix={<MailOutlined className="editUser-inputIcon" />}
                placeholder="example@gmail.com"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Địa chỉ" name="address">
          <Input
            prefix={<EnvironmentOutlined className="editUser-inputIcon" />}
            placeholder="Số 1, đường ABC, quận XYZ..."
            size="large"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Mã số thuế" name="taxCode">
              <Input
                prefix={<SolutionOutlined className="editUser-inputIcon" />}
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
            prefix={<DollarCircleOutlined className="editUser-inputIcon" />}
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
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditCustomerModal;
