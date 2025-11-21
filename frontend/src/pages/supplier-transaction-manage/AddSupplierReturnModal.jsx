import React, { useEffect, useState } from "react";

import { ApartmentOutlined, FileAddOutlined, ShopOutlined } from "@ant-design/icons";
import "@assets/supplier/AddSupplierModal.css";
import { fetchListDepartments } from "@src/store/departmentSlice";
import { fetchListSuppliers } from "@src/store/supplierSlice";
import {
  clearTransactionInList,
  createSupplierTransaction,
  createTransactionWithoutPrice,
} from "@src/store/supplierTransactionCombineSlice";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  notification,
} from "antd";
import locale from "antd/es/date-picker/locale/vi_VN";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

import RenderTransactionInList from "./RenderTransactionInList";
import RenderTransactionProductForm from "./RenderTransactionProductForm";

const { Text } = Typography;
const { Option } = Select;

const AddSupplierReturnModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("1");

  const [selectedImport, setSelectedImport] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState();
  // Redux selectors
  const createStatus = useSelector((state) => state.supplierTransactionCombined.createStatus);
  const createError = useSelector((state) => state.supplierTransactionCombined.createError);
  const createTransactionWithoutPriceStatus = useSelector(
    (state) => state.supplierTransactionCombined.createTransactionWithoutPriceStatus
  );
  const createTransactionWithoutPriceError = useSelector(
    (state) => state.supplierTransactionCombined.createTransactionWithoutPriceError
  );

  const userRole = useSelector((state) => state.auth.user?.role);
  const suppliers = useSelector((state) => state.supplier.suppliers?.data) || [];
  const departments = useSelector((state) => state.department.departments?.data) || [];

  // Switch status cho từng row

  const isLoading = createStatus === "loading" || createTransactionWithoutPriceStatus === "loading";
  const createErrorFinal = createError || createTransactionWithoutPriceError;

  useEffect(() => {
    if (visible) {
      if (!suppliers?.length) dispatch(fetchListSuppliers());
      if (!departments?.length) dispatch(fetchListDepartments());
      setSelectedSupplierId(null);
      setSelectedDepartmentId(null);
      setReturnItems([]);
      dispatch(clearTransactionInList());
      setActiveTab("1");
      setSelectedImport(null);
      form.resetFields();
    }
    // eslint-disable-next-line
  }, [visible, suppliers?.length, departments?.length, dispatch]);

  /** === XỬ LÝ SUBMIT === */
  const handleSubmit = (values) => {
    if (returnItems.length === 0) {
      notification.warning({ message: "Vui lòng thêm ít nhất 1 sản phẩm" });
      return;
    }
    //Kiểm tra qty nhập > 0
    const invalidQtyItems = returnItems.filter((i) => i.qty <= 0);

    if (invalidQtyItems.length > 0) {
      notification.warning({
        message: "Số lượng không hợp lệ",
        description: "Vui lòng nhập số lượng lớn hơn 0 cho các sản phẩm.",
      });
      return;
    }

    const filledItems = returnItems.filter(
      (i) => i.productId || i.qty > 0 || i.unitPrice >= 0 || i.lotId
    );

    if (filledItems.length === 0) {
      notification.warning({
        message: "Không có sản phẩm hợp lệ",
        description: "Vui lòng nhập ít nhất một sản phẩm có thông tin đầy đủ.",
      });
      return;
    }

    const invalidItems = filledItems.filter((i) => {
      if (!i.productId || !i.qty) return true;
      if (userRole !== "manager" && i.unitPrice == null) return true;
      if (!i.lotId) return true;
      return false;
    });

    if (invalidItems.length > 0) {
      notification.warning({
        message: "Thiếu thông tin sản phẩm",
        description:
          "Một số sản phẩm chưa điền đủ thông tin (tên, số lượng, đơn giá hoặc lô hàng).",
      });
      return;
    }

    const data = {
      supplierId: values.supplierId,
      departmentId: values.departmentId,
      note: values.note,
      type: "out", // hardcode
      transDate: values.transDate?.toISOString(),
      dueDate: values.dueDate?.toISOString(),
      items: filledItems.map((i) => ({
        productId: i.productId,
        mainQty: i.mainQty || i.qty,
        unitPrice: userRole === "manager" ? 0 : i.unitPrice,
        lotId: i.lotId,
      })),
    };
    const apiCall =
      userRole === "manager" ? createTransactionWithoutPrice : createSupplierTransaction;

    dispatch(apiCall(data))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Thêm giao dịch thành công",
          description: "Giao dịch trả đã được tạo.",
        });
        onSuccess?.();
        onCancel();
      })
      .catch((err) =>
        notification.error({
          message: "Lỗi khi tạo giao dịch",
          description: err.message || createErrorFinal,
        })
      );
  };

  /** === VALIDATION === */
  const validationRules = {
    supplierId: [{ required: true, message: "Chọn nhà cung cấp!" }],
    departmentId: [{ required: true, message: "Chọn phòng ban!" }],
    dueDate: [
      {
        required: true,
        message: "Chọn ngày đến hạn thanh toán!",
      },
    ],
  };
  useEffect(() => {
    const supplierId = form.getFieldValue("supplierId");
    const departmentId = form.getFieldValue("departmentId");
    if (supplierId && departmentId) {
      setActiveTab("1");
      setSelectedImport(null);
    }
  }, [form.getFieldValue("supplierId"), form.getFieldValue("departmentId")]);
  //
  const handleSelectImport = (transaction) => {
    setSelectedImport(transaction);
    form.setFieldsValue({
      supplierId: transaction.supplierId,
      departmentId: transaction.departmentId,
    });
    setActiveTab("2");
  };
  const handleReturnItemsChange = (items) => {
    setReturnItems(items);
  };
  const renderImportList = () => (
    <>
      <RenderTransactionInList
        departmentId={selectedDepartmentId}
        supplierId={selectedSupplierId}
        onSelectTransaction={handleSelectImport}
      />
    </>
  );
  const renderReturnForm = () => (
    <>
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "#f0f5ff",
          borderRadius: 8,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          rowGap: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Text strong>Mã giao dịch nhập:</Text>
          <Tag color="blue">{selectedImport?.docNo}</Tag>
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Text strong>Nhà cung cấp:</Text>
          <span>{selectedImport?.supplierName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Text strong>Kho:</Text>
          <span>{selectedImport?.departmentName}</span>
        </div>
        <Button
          size="small"
          style={{ marginLeft: "auto", minWidth: 80 }}
          onClick={() => {
            setActiveTab("1");
            setSelectedImport(null);
          }}
        >
          Chọn lại
        </Button>
      </div>

      <RenderTransactionProductForm
        selectedTransaction={selectedImport}
        onItemsChange={handleReturnItemsChange}
      />
    </>
  );

  return (
    <Modal
      title={
        <div className="addSupplier-titleContainer">
          <FileAddOutlined className="addSupplier-titleIcon" />
          <span style={{ fontSize: 18 }}>Thêm giao dịch trả hàng</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1150}
      centered
      maskClosable={!isLoading}
      className="addSupplier-modal"
    >
      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
        initialValues={{
          transDate: dayjs(),
        }}
        onValuesChange={(changed, all) => {
          if (changed.supplierId !== undefined) setSelectedSupplierId(changed.supplierId);
          if (changed.departmentId !== undefined) setSelectedDepartmentId(changed.departmentId);
        }}
      >
        <Row gutter={24}>
          <Col xs={24} sm={24} md={8}>
            <Form.Item label="Nhà cung cấp" name="supplierId" rules={validationRules.supplierId}>
              <Select
                placeholder="Chọn nhà cung cấp"
                showSearch
                size="large"
                suffixIcon={<ShopOutlined />}
                onChange={() => {
                  setSelectedImport(null);
                  setActiveTab("1");
                }}
              >
                {suppliers.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Form.Item
              label="Kho / Phòng ban"
              name="departmentId"
              rules={validationRules.departmentId}
            >
              <Select
                placeholder="Chọn kho"
                size="large"
                suffixIcon={<ApartmentOutlined />}
                onChange={() => {
                  setSelectedImport(null);
                  setActiveTab("1");
                }}
              >
                {departments.map((d) => (
                  <Option key={d.id} value={d.id}>
                    {d.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Form.Item label="Ngày giao dịch" name="transDate">
              <DatePicker
                format="DD/MM/YYYY"
                size="large"
                locale={locale}
                style={{ width: "100%" }}
                disabledDate={(current) =>
                  current &&
                  (current > dayjs().endOf("day") ||
                    current < dayjs().subtract(14, "day").startOf("day"))
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={24} md={8}>
            <Form.Item
              label="Ngày đến hạn thanh toán"
              name="dueDate"
              rules={validationRules.dueDate}
            >
              <DatePicker
                format="DD/MM/YYYY"
                size="large"
                style={{ width: "100%" }}
                locale={locale}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={16}>
            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea placeholder="Ghi chú thêm..." autoSize size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: "1", label: "Danh sách giao dịch nhập hàng", children: renderImportList() },
            {
              key: "2",
              label: "Thông tin sản phẩm giao dịch",
              children: selectedImport ? (
                renderReturnForm()
              ) : (
                <div style={{ padding: 24, textAlign: "center" }}>
                  Vui lòng chọn giao dịch nhập hàng trước.
                </div>
              ),
            },
          ]}
        />
        <Divider />

        <Form.Item style={{ textAlign: "right" }}>
          <Space>
            <Button onClick={onCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              {isLoading ? "Đang tạo..." : "Tạo giao dịch"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddSupplierReturnModal;
