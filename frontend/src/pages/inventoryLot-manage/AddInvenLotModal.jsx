import React, { useEffect, useState } from "react";

import { GoldOutlined } from "@ant-design/icons";
import "@assets/inventoryLot-manage/AddInvenLotModal.css";
import { fetchListAllDepartments } from "@src/store/departmentSlice";
import { createInventoryLot } from "@src/store/inventoryLotSlice";
import { fetchListAllProducts, fetchProductById } from "@src/store/productSlice";
import {
  Button,
  Col,
  DatePicker,
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
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

const { Option } = Select;
const { Text } = Typography;

const AddInvenLotModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  
  // Redux selectors
  const createStatus = useSelector((state) => state.inventoryLot.createStatus);
  const createError = useSelector((state) => state.inventoryLot.createError);
  const productList = useSelector((state) => state.product.allProducts);
  const departmentList = useSelector((state) => state.department.allDepartments);
  const productFetchStatus = useSelector((state) => state.product.fetchListAllStatus);
  const departmentFetchStatus = useSelector((state) => state.department.fetchListAllStatus);
  const selectedProduct = useSelector((state) => state.product.product);
  const fetchProductStatus = useSelector((state) => state.product.fetchProductByIdStatus);

  // Local state
  const [selectedProductId, setSelectedProductId] = useState(null);
  const isLoading = createStatus === "loading";

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSelectedProductId(null);
      // Fetch products and departments if not available
      dispatch(fetchListAllProducts());
      dispatch(fetchListAllDepartments());
    }
  }, [visible, form, dispatch]);

  // Fetch product details when product is selected
  useEffect(() => {
    if (selectedProductId) {
      dispatch(fetchProductById(selectedProductId));
    }
  }, [selectedProductId, dispatch]);

  // Update conversion rate default when product changes
  useEffect(() => {
    if (selectedProduct && selectedProduct.id === selectedProductId) {
      // Set default conversion rate to 1 when product is loaded
      form.setFieldsValue({
        conversionRate: 1
      });
    }
  }, [selectedProduct, selectedProductId, form]);

  const validationRules = {
    lotNo: [{ required: true, message: "Vui lòng nhập số lô!" }],
    productId: [{ required: true, message: "Vui lòng chọn sản phẩm!" }],
    departmentId: [{ required: true, message: "Vui lòng chọn cơ sở / kho!" }],
    expiryDate: [{ required: true, message: "Vui lòng chọn ngày hết hạn!" }],
    qtyOnHand: [{ required: true, message: "Vui lòng nhập số lượng tồn!" }],
    conversionRate: [
      { required: true, message: "Vui lòng nhập tỉ lệ chuyển đổi!" },
      { 
        validator: (_, value) => {
          if (!value || value <= 0) {
            return Promise.reject(new Error('Tỉ lệ chuyển đổi phải lớn hơn 0'));
          }
          return Promise.resolve();
        }
      }
    ],
  };

  const handleProductChange = (productId) => {
    setSelectedProductId(productId);
    // Reset conversion rate when product changes
    form.setFieldsValue({
      conversionRate: undefined
    });
  };

  const handleSubmit = async (values) => {
    const payload = {
      lotNo: values.lotNo,
      productId: values.productId,
      departmentId: values.departmentId,
      expiryDate: values.expiryDate ? values.expiryDate.toISOString() : undefined,
      qtyOnHand: Number(values.qtyOnHand || 0),
      conversionRate: Number(values.conversionRate || 1),
    };

    try {
      await dispatch(createInventoryLot(payload)).unwrap();
      notification.success({
        message: "Tạo lô hàng thành công",
        description: `Lô ${payload.lotNo} đã được tạo.`,
      });
      form.resetFields();
      setSelectedProductId(null);
      onCancel();
      if (onSuccess) onSuccess();
    } catch (err) {
      notification.error({
        message: "Tạo lô hàng thất bại",
        description: createError?.message || err?.message || "Có lỗi xảy ra khi tạo lô hàng.",
      });
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedProductId(null);
    onCancel();
  };

  // Render product info section
  const renderProductInfo = () => {
    if (!selectedProductId) return null;

    if (fetchProductStatus === "loading") {
      return (
        <div style={{ padding: "12px", textAlign: "center", background: "#f8f9fa", borderRadius: "6px", marginBottom: "16px" }}>
          <Spin size="small" /> <Text type="secondary">Đang tải thông tin sản phẩm...</Text>
        </div>
      );
    }

    if (selectedProduct && selectedProduct.id === selectedProductId) {
      return (
        <div style={{ 
          padding: "12px", 
          background: "#f0f9ff", 
          border: "1px solid #bae6fd", 
          borderRadius: "6px", 
          marginBottom: "16px" 
        }}>
          <Row gutter={16}>
            <Col span={8}>
              <Text strong>Đóng gói:</Text>
              <br />
              <Text style={{ color: "#1890ff" }}>{selectedProduct.packUnit || "Chưa có"}</Text>
            </Col>
            <Col span={8}>
              <Text strong>Đơn vị chính:</Text>
              <br />
              <Text style={{ color: "#1890ff" }}>{selectedProduct.mainUnit || "Chưa có"}</Text>
            </Col>
            <Col span={8}>
              <Text strong>SKU:</Text>
              <br />
              <Text style={{ color: "#1890ff" }}>{selectedProduct.skuCode}</Text>
            </Col>
          </Row>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      title={
        <div className="addInvenLot-titleContainer">
          <GoldOutlined className="addInvenLot-titleIcon" />
          <span style={{ fontSize: "18px" }}>Thêm lô hàng</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnHidden
      centered={true}
      maskClosable={!isLoading}
      className="addInvenLot-modal"
    >
      <Divider className="addInvenLot-divider" />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
        className="addInvenLot-form"
      >
        <Form.Item label="Số lô (Lot No)" name="lotNo" rules={validationRules.lotNo}>
          <Input placeholder="Nhập số lô" size="large" className="addInvenLot-input" />
        </Form.Item>

        <Form.Item label="Sản phẩm" name="productId" rules={validationRules.productId}>
          <Select
            placeholder="Chọn sản phẩm"
            showSearch
            loading={productFetchStatus === "loading"}
            optionFilterProp="children"
            size="large"
            allowClear
            onChange={handleProductChange}
          >
            {productList?.map((p) => (
              <Option key={p.id} value={p.id}>
                {p.name} — {p.skuCode}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Hiển thị thông tin sản phẩm */}
        {renderProductInfo()}

        <Form.Item label="Kho / Cơ sở" name="departmentId" rules={validationRules.departmentId}>
          <Select
            placeholder="Chọn cơ sở/kho"
            showSearch
            optionFilterProp="children"
            size="large"
            loading={departmentFetchStatus === "loading"}
            allowClear
          >
            {departmentList?.map((d) => (
              <Option key={d.id} value={d.id}>
                {d.name} — {d.code || d.departmentCode || ""}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Ngày hết hạn" name="expiryDate" rules={validationRules.expiryDate}>
          <DatePicker
            placeholder="Chọn ngày hết hạn"
            style={{ width: "100%" }}
            size="large"
            format={"DD/MM/YYYY"}
            disabledDate={(current) => current && current < dayjs().startOf("day")}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Số lượng sản phẩm trong lô"
              name="qtyOnHand"
              rules={validationRules.qtyOnHand}
            >
              <InputNumber 
                style={{ width: "100%" }} 
                placeholder="0" 
                step={0.001} 
                size="large" 
                min={0}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={
                <Space>
                  <span>Tỉ lệ quy đổi</span>
                  {selectedProduct && selectedProduct.id === selectedProductId && (
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      (1 {selectedProduct.packUnit} = ? {selectedProduct.mainUnit})
                    </Text>
                  )}
                </Space>
              }
              name="conversionRate"
              rules={validationRules.conversionRate}
            >
              <InputNumber 
                style={{ width: "100%" }} 
                placeholder="1" 
                min={0.001} 
                step={0.001} 
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item className="addInvenLot-submitContainer">
          <Space className="addInvenLot-buttonGroup">
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              size="large"
              className="addInvenLot-cancelButton"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
              className="addInvenLot-submitButton"
            >
              {isLoading ? "Đang tạo..." : "Tạo lô hàng"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddInvenLotModal;