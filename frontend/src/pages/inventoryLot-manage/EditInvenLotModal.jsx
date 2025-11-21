import React, { useEffect, useState } from "react";

import { GoldOutlined } from "@ant-design/icons";
import "@assets/inventoryLot-manage/EditInvenLotModal.css";
import { fetchListAllDepartments } from "@src/store/departmentSlice";
import { fetchInventoryLotById, updateInventoryLot } from "@src/store/inventoryLotSlice";
import { fetchListAllProducts, fetchProductById } from "@src/store/productSlice";
import {
  Button,
  Col,
  DatePicker,
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

const { Text } = Typography;
const { Option } = Select;

const EditInvenLotModal = ({ visible, onCancel, onSuccess, invenLotData }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  // Redux selectors
  const updateStatus = useSelector((state) => state.inventoryLot.updateStatus);
  const updateError = useSelector((state) => state.inventoryLot.updateError);
  const productList = useSelector((state) => state.product.allProducts);
  const departmentList = useSelector((state) => state.department.allDepartments);
  const productFetchStatus = useSelector((state) => state.product.fetchListAllStatus);
  const departmentFetchStatus = useSelector((state) => state.department.fetchListAllStatus);
  const selectedProduct = useSelector((state) => state.product.product);
  const fetchProductStatus = useSelector((state) => state.product.fetchProductByIdStatus);

  const [selectedProductId, setSelectedProductId] = useState(null);
  const isLoading = updateStatus === "loading";

  /** Khi mở modal → load dữ liệu cần thiết */
  useEffect(() => {
    if (visible) {
      dispatch(fetchListAllProducts());
      dispatch(fetchListAllDepartments());
      if (invenLotData) {
        form.setFieldsValue({
          lotNo: invenLotData.lotNo,
          productId: invenLotData.productId,
          departmentId: invenLotData.departmentId,
          expiryDate: invenLotData.expiryDate ? dayjs(invenLotData.expiryDate) : undefined,
          qtyOnHand: invenLotData.qtyOnHand,
          conversionRate: invenLotData.conversionRate || 1,
        });
        setSelectedProductId(invenLotData.productId);
      }
    } else {
      form.resetFields();
      setSelectedProductId(null);
    }
  }, [visible, invenLotData, form, dispatch]);

  /** Khi chọn sản phẩm → fetch thông tin chi tiết */
  useEffect(() => {
    if (selectedProductId) {
      dispatch(fetchProductById(selectedProductId));
    }
  }, [selectedProductId, dispatch]);

  /** Validation rules */
  const validationRules = {
    lotNo: [{ required: true, message: "Vui lòng nhập mã lô hàng!" }],
    productId: [{ required: true, message: "Vui lòng chọn sản phẩm!" }],
    departmentId: [{ required: true, message: "Vui lòng chọn kho / cơ sở!" }],
    expiryDate: [{ required: true, message: "Vui lòng chọn ngày hết hạn!" }],
    qtyOnHand: [{ required: true, message: "Vui lòng nhập số lượng tồn!" }],
    conversionRate: [
      { required: true, message: "Vui lòng nhập tỉ lệ quy đổi!" },
      {
        validator: (_, value) => {
          if (!value || value <= 0) {
            return Promise.reject(new Error("Tỉ lệ quy đổi phải lớn hơn 0"));
          }
          return Promise.resolve();
        },
      },
    ],
  };

  /** Khi đổi sản phẩm */
  const handleProductChange = (productId) => {
    setSelectedProductId(productId);
    form.setFieldsValue({ conversionRate: undefined });
  };

  /** Cập nhật lô hàng */
  const handleSubmit = async (values) => {
    const updateData = {
      lotNo: values.lotNo,
      productId: values.productId,
      departmentId: values.departmentId,
      expiryDate: values.expiryDate ? values.expiryDate.toISOString() : undefined,
      qtyOnHand: Number(values.qtyOnHand || 0),
      conversionRate: Number(values.conversionRate || 1),
    };

    try {
      const response = await dispatch(
        updateInventoryLot({ inventoryLotId: invenLotData.id, data: updateData })
      ).unwrap();
      notification.success({
        message: "Cập nhật thành công",
        description: `Thông tin lô "${values.lotNo}" đã được cập nhật.`,
      });
      dispatch(fetchInventoryLotById(invenLotData.id));
      onCancel();
      form.resetFields();
      if (onSuccess) onSuccess(response);
    } catch (error) {
      notification.error({
        message: "Cập nhật thất bại",
        description:
          updateError?.message || error?.message || "Có lỗi xảy ra khi cập nhật lô hàng.",
      });
    }
  };

  /** Hiển thị thông tin sản phẩm */
  const renderProductInfo = () => {
    if (!selectedProductId) return null;

    if (fetchProductStatus === "loading") {
      return (
        <div
          style={{
            padding: "12px",
            textAlign: "center",
            background: "#f8f9fa",
            borderRadius: "6px",
            marginBottom: "16px",
          }}
        >
          <Spin size="small" /> <Text type="secondary">Đang tải thông tin sản phẩm...</Text>
        </div>
      );
    }

    if (selectedProduct && selectedProduct.id === selectedProductId) {
      return (
        <div
          style={{
            padding: "12px",
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "6px",
            marginBottom: "16px",
          }}
        >
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
        <div className="editInvenLot-titleContainer">
          <GoldOutlined className="editInvenLot-titleIcon" />
          <span style={{ fontSize: "18px" }}>Chỉnh sửa lô hàng</span>
        </div>
      }
      open={visible}
      onCancel={() => {
        form.resetFields();
        setSelectedProductId(null);
        onCancel();
      }}
      footer={null}
      width={700}
      destroyOnHidden
      centered
      maskClosable={!isLoading}
      className="editInvenLot-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
        className="editInvenLot-form"
      >
        <Form.Item label="Số lô (Lot No)" name="lotNo" rules={validationRules.lotNo}>
          <Input placeholder="Nhập số lô" size="large" />
        </Form.Item>

        <Form.Item label="Sản phẩm" name="productId" rules={validationRules.productId}>
          <Select
            placeholder="Chọn sản phẩm"
            showSearch
            optionFilterProp="children"
            size="large"
            allowClear
            loading={productFetchStatus === "loading"}
            onChange={handleProductChange}
          >
            {productList?.map((p) => (
              <Option key={p.id} value={p.id}>
                {p.name} — {p.skuCode}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {renderProductInfo()}

        <Form.Item label="Kho / Cơ sở" name="departmentId" rules={validationRules.departmentId}>
          <Select
            placeholder="Chọn cơ sở/kho"
            showSearch
            optionFilterProp="children"
            size="large"
            allowClear
            loading={departmentFetchStatus === "loading"}
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
            format="DD/MM/YYYY"
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
              <InputNumber style={{ width: "100%" }} placeholder="0" step={0.001} size="large" />
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
                // step={0.001}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item className="editInvenLot-submitContainer">
          <Space className="editInvenLot-buttonGroup">
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

export default EditInvenLotModal;
