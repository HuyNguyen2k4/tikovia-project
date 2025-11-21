import React, { useEffect, useMemo, useRef, useState } from "react";

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import "@assets/supplier/AddSupplierModal.css";
import { getListCustomers } from "@src/services/customerService";
import { listDepartments } from "@src/services/departmentService";
import { findProductsInDepartment } from "@src/services/productService";
import { updateSalesOrderInfo } from "@src/store/salesOrdersSlice";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  notification,
} from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const EditSalesOrdersModal = ({ visible, onCancel, onSuccess, orderData }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const [items, setItems] = useState([]);
  const [departmentId, setDepartmentId] = useState(undefined);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const user = useSelector((state) => state.auth.user) || {};

  const [customerOptions, setCustomerOptions] = useState([]);
  const customerPageRef = useRef(0);
  const customerHasMoreRef = useRef(true);
  const [customerLoading, setCustomerLoading] = useState(false);
  const customerSearchRef = useRef("");
  const customerSearchTimer = useRef();
  const [deptOptions, setDeptOptions] = useState([]);
  const deptPageRef = useRef(0);
  const deptHasMoreRef = useRef(true);
  const [deptLoading, setDeptLoading] = useState(false);
  const deptSearchRef = useRef("");
  const deptSearchTimer = useRef();
  const [productOptions, setProductOptions] = useState([]);
  const productPageRef = useRef(0);
  const productHasMoreRef = useRef(true);
  const [productLoading, setProductLoading] = useState(false);
  const productSearchRef = useRef("");
  const productSearchTimer = useRef();

  const updateStatus = useSelector((state) => state.salesOrders.updateStatus);
  const updateError = useSelector((state) => state.salesOrders.updateError);
  const isLoading = updateStatus === "loading";

  const fetchProductDetails = async (productId, deptId, productName) => {
    if (!deptId || !productId) return null;
    const searchQuery = productName || "";
    try {
      const res = await findProductsInDepartment(deptId, {
        q: searchQuery,
        limit: 10,
        offset: 0,
      });
      const payload = res.data || {};
      const itemsData = payload.items || [];
      const productData = itemsData.find((p) => p.productId === productId);
      if (productData) {
        return productData;
      }
      console.warn(`Không tìm thấy chi tiết cho SP: ${productId} / ${productName}`);
      return null;
    } catch (e) {
      console.error(`Lỗi khi fetch chi tiết cho SP: ${productId}`, e);
      return null;
    }
  };

  useEffect(() => {
    const initializeModal = async () => {
      if (visible && orderData) {
        form.setFieldsValue({
          seller: orderData.sellerId || user?.id,
          orderNo: orderData.orderNo,
          customerId: orderData.customerId,
          departmentId: orderData.departmentId,
          slaDeliveryAt: orderData.slaDeliveryAt ? dayjs(orderData.slaDeliveryAt) : null,
          address: orderData.address,
          phone: orderData.phone,
          note: orderData.note,
        });

        setDepartmentId(orderData.departmentId);
        if (orderData.customerId && orderData.customerName) {
          setCustomerOptions([
            {
              value: orderData.customerId,
              label: orderData.customerName,
              raw: { id: orderData.customerId, name: orderData.customerName },
            },
          ]);
          setSelectedCustomer({
            id: orderData.customerId,
            name: orderData.customerName,
            address: orderData.address,
            phone: orderData.phone,
          });
        }
        if (orderData.departmentId && orderData.departmentName) {
          setDeptOptions([
            {
              value: orderData.departmentId,
              label: orderData.departmentName,
              raw: {
                id: orderData.departmentId,
                name: orderData.departmentName,
              },
            },
          ]);
        }

        const initialItemsPromises = (orderData.items || []).map(async (item) => {
          const prodData = await fetchProductDetails(
            item.productId,
            orderData.departmentId,
            item.product?.productName
          );

          const fullProduct = prodData
            ? {
                productId: prodData.productId,
                productName: prodData.productName,
                mainUnit: prodData.mainUnit,
                packUnit: prodData.packUnit,
                avgConversionRate: prodData.avgConversionRate,
                totalQuantity: prodData.totalQuantity,
                totalQtyPackUnit: prodData.totalQtyPackUnit,
              }
            : item.product || {
                productId: item.productId,
                productName: item.product?.productName,
              };

          return {
            key: item.id || Date.now() + Math.random(),
            id: item.id,
            productId: item.productId,
            product: fullProduct,
            qty: item.qty,
            unit: item.unit || fullProduct.mainUnit,
            note: item.note || "",
            qtyError: null,
          };
        });

        const initialItems = await Promise.all(initialItemsPromises);
        setItems(initialItems);

        customerPageRef.current = 0;
        customerHasMoreRef.current = true;
        customerSearchRef.current = "";
        deptPageRef.current = 0;
        deptHasMoreRef.current = true;
        deptSearchRef.current = "";
        productPageRef.current = 0;
        productHasMoreRef.current = true;
        productSearchRef.current = "";

        if (orderData.departmentId) {
          fetchProducts("", false, orderData.departmentId);
        }
      } else if (!visible) {
        form.resetFields();
        setItems([]);
        setDepartmentId(undefined);
        setSelectedCustomer(null);
        setCustomerOptions([]);
        setDeptOptions([]);
        setProductOptions([]);
        customerPageRef.current = 0;
        customerHasMoreRef.current = true;
        customerSearchRef.current = "";
        deptPageRef.current = 0;
        deptHasMoreRef.current = true;
        deptSearchRef.current = "";
        productPageRef.current = 0;
        productHasMoreRef.current = true;
        productSearchRef.current = "";
      }
    };

    initializeModal();
  }, [visible, orderData, form, user]);

  const fetchCustomers = async (q = "", append = false) => {
    if (!customerHasMoreRef.current && append) return;
    setCustomerLoading(true);
    const limit = 20;
    const offset = append ? (customerPageRef.current + 1) * limit : 0;
    try {
      const res = await getListCustomers(user.id, { q, limit, offset });
      const payload = res.data || {};
      const itemsData = payload.data || [];
      const pagination = payload.pagination || {};
      customerHasMoreRef.current = !!pagination.hasMore;
      customerPageRef.current = append ? customerPageRef.current + 1 : 0;
      const mapped = itemsData.map((c) => ({
        value: c.id,
        label: `${c.code || ""} - ${c.name}`,
        raw: c,
      }));
      setCustomerOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
      console.error("Failed to fetch customers");
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleCustomerSearch = (val) => {
    customerSearchRef.current = val;
    clearTimeout(customerSearchTimer.current);
    customerSearchTimer.current = setTimeout(() => {
      fetchCustomers(val, false);
    }, 400);
  };

  const handleCustomerPopupScroll = (e) => {
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!customerLoading && customerHasMoreRef.current) {
        fetchCustomers(customerSearchRef.current, true);
      }
    }
  };

  const fetchDepartments = async (q = "", append = false) => {
    if (!deptHasMoreRef.current && append) return;
    setDeptLoading(true);
    const limit = 20;
    const offset = append ? (deptPageRef.current + 1) * limit : 0;
    try {
      const res = await listDepartments({ q, limit, offset });
      const payload = res.data || {};
      const itemsData = payload.data || [];
      const pagination = payload.pagination || {};
      deptHasMoreRef.current = !!pagination.hasMore;
      deptPageRef.current = append ? deptPageRef.current + 1 : 0;
      const mapped = itemsData.map((d) => ({
        value: d.id,
        label: d.name,
        raw: d,
      }));
      setDeptOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
      console.error("Failed to fetch departments");
    } finally {
      setDeptLoading(false);
    }
  };

  const handleDeptSearch = (val) => {
    deptSearchRef.current = val;
    clearTimeout(deptSearchTimer.current);
    deptSearchTimer.current = setTimeout(() => {
      fetchDepartments(val, false);
    }, 400);
  };

  const handleDeptPopupScroll = (e) => {
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!deptLoading && deptHasMoreRef.current) {
        fetchDepartments(deptSearchRef.current, true);
      }
    }
  };

  const fetchProducts = async (q = "", append = false, deptId) => {
    const deptToFetch = deptId || departmentId;
    if (!deptToFetch) return;
    if (!productHasMoreRef.current && append) return;
    setProductLoading(true);
    const limit = 20;
    const offset = append ? (productPageRef.current + 1) * limit : 0;
    try {
      const res = await findProductsInDepartment(deptToFetch, { q, limit, offset });
      const payload = res.data || {};
      const itemsData = payload.items || [];
      const pagination = payload.pagination || {};
      productHasMoreRef.current = !!pagination.hasMore;
      productPageRef.current = append ? productPageRef.current + 1 : 0;
      const mapped = itemsData.map((p) => ({
        value: p.productId,
        label: p.productName,
        raw: p,
      }));

      setProductOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch (error) {
      console.error("Failed to fetch products for department:", error);
    } finally {
      setProductLoading(false);
    }
  };

  const handleProductSearch = (val) => {
    productSearchRef.current = val;
    clearTimeout(productSearchTimer.current);
    productSearchTimer.current = setTimeout(() => {
      fetchProducts(val, false);
    }, 400);
  };

  const handleProductPopupScroll = (e) => {
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!productLoading && productHasMoreRef.current) {
        fetchProducts(productSearchRef.current, true);
      }
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: Date.now(),
        id: undefined,
        productId: undefined,
        product: null,
        qty: 0,
        unit: undefined,
        note: "",
        qtyError: null,
      },
    ]);
  };

  const updateItem = (key, field, value) => {
    if (field === "productId") {
      const prodOpt = productOptions.find((p) => p.value === value);
      const prodData = prodOpt ? prodOpt.raw : null;
      const prod = prodData
        ? {
            productId: prodData.productId,
            productName: prodData.productName,
            mainUnit: prodData.mainUnit,
            packUnit: prodData.packUnit,
            avgConversionRate: prodData.avgConversionRate,
            totalQuantity: prodData.totalQuantity,
            totalQtyPackUnit: prodData.totalQtyPackUnit,
          }
        : null;

      const mainUnit = prod?.mainUnit;
      setItems((prev) =>
        prev.map((it) =>
          it.key === key
            ? {
                ...it,
                productId: value,
                product: prod,
                unit: mainUnit,
                qty: 0,
                qtyError: null,
              }
            : it
        )
      );
    } else if (field === "unit") {
      setItems((prev) =>
        prev.map((it) => (it.key === key ? { ...it, unit: value, qty: 0, qtyError: null } : it))
      );
    } else if (field === "qty") {
      const finalValue = value === null ? 0 : value;
      setItems((prev) =>
        prev.map((it) => {
          if (it.key !== key) return it;
          const prod = it.product || {};
          const unit = it.unit;
          let maxQty = undefined;
          let errorMsg = null;
          if (prod.productId && unit) {
            if (unit === prod.mainUnit) maxQty = prod.totalQuantity;
            else if (unit === prod.packUnit) maxQty = prod.totalQtyPackUnit;
          }
          if (maxQty !== undefined && finalValue > maxQty) {
            const maxFormatted = maxQty.toLocaleString("vi-VN");
            errorMsg = `Tồn kho: ${maxFormatted} ${unit || ""}`;
          }
          return { ...it, qty: finalValue, qtyError: errorMsg };
        })
      );
    } else {
      setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
    }
  };

  const removeItem = (key) => setItems((prev) => prev.filter((it) => it.key !== key));

  const calculateTotalAmount = () => {
    return 0;
  };

  const handleCustomerChange = (custId) => {
    const custOpt = customerOptions.find((c) => c.value === custId) || {};
    const cust = custOpt.raw || null;
    setSelectedCustomer(cust);
    form.setFieldsValue({
      address: cust?.address || "",
      phone: cust?.phone || "",
    });
  };

  const handleDeptChange = (v) => {
    setDepartmentId(v);
    setItems((prevItems) =>
      prevItems.map((it) => ({
        ...it,
        productId: undefined,
        product: null,
        qty: 0,
        unit: undefined,
        qtyError: null,
      }))
    );
    setProductOptions([]);
    productPageRef.current = 0;
    productHasMoreRef.current = true;
    productSearchRef.current = "";
    if (v) {
      fetchProducts("", false, v);
    }
  };

  const handleSubmit = (values) => {
    const filledItems = items.filter((i) => i.productId && i.qty > 0);
    if (filledItems.length === 0) {
      notification.warning({
        message: "Vui lòng điền sản phẩm và số lượng hợp lệ",
      });
      return;
    }
    for (const it of filledItems) {
      const prod = it.product || {};
      let maxQty = undefined;
      if (prod.productId) {
        if (it.unit === prod.mainUnit) {
          maxQty = prod.totalQuantity;
        } else if (it.unit === prod.packUnit) {
          maxQty = prod.totalQtyPackUnit;
        }
      }
      if (maxQty !== undefined && it.qty > maxQty) {
        notification.error({
          message: "Số lượng vượt quá giới hạn",
          description: `Sản phẩm ${
            prod.productName
          } có số lượng tối đa là ${maxQty.toFixed(2)} ${it.unit}`,
          duration: 5,
        });
        return;
      }
    }

    const payload = {
      orderNo: values.orderNo,
      customerId: values.customerId,
      slaDeliveryAt: values.slaDeliveryAt ? values.slaDeliveryAt.toISOString() : null,
      address: values.address,
      phone: values.phone,
      note: values.note,
      departmentId: departmentId,
      items: filledItems.map((it) => {
        const prod = it.product || {};
        let finalQty = it.qty;
        let finalUnit = it.unit;

        if (prod.packUnit && it.unit === prod.packUnit && it.unit !== prod.mainUnit) {
          finalQty = it.qty * (prod.avgConversionRate || 1);
          finalUnit = prod.mainUnit;
        }

        const itemPayload = {
          productId: it.productId,
          qty: finalQty,
          note: it.note || "",
        };

        if (it.id) {
          itemPayload.id = it.id;
        }

        return itemPayload;
      }),
    };

    dispatch(updateSalesOrderInfo({ id: orderData.id, orderData: payload }))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Cập nhật đơn hàng thành công",
          description: `Đơn hàng ${payload.orderNo} đã được cập nhật.`,
        });
        if (onSuccess) onSuccess();
        onCancel();
      })
      .catch((err) => {
        notification.error({
          message: "Cập nhật đơn hàng thất bại",
          description: updateError?.message || err?.message || "Đã có lỗi xảy ra.",
        });
      });
  };

  const productColumns = [
    {
      title: "Sản phẩm",
      dataIndex: "productId",
      render: (val, record) => (
        <Select
          value={val}
          showSearch
          style={{ width: "100%" }}
          placeholder="Chọn sản phẩm"
          disabled={!departmentId}
          filterOption={false}
          onSearch={handleProductSearch}
          onPopupScroll={handleProductPopupScroll}
          notFoundContent={
            productLoading ? (
              <Spin size="small" />
            ) : departmentId ? (
              <Empty description="Không tìm thấy" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              "Chọn kho"
            )
          }
          onChange={(v) => updateItem(record.key, "productId", v)}
          onFocus={() => {
            if (productOptions.length === 0 && departmentId) fetchProducts("", false);
          }}
          allowClear
          options={productOptions}
        >
          {productOptions.map((opt) => (
            <Option key={opt.value} value={opt.value}>
              {opt.label}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "qty",
      width: 250,
      render: (val, record) => {
        const prod = record.product || {};
        const options = [];
        if (prod.mainUnit) options.push({ label: prod.mainUnit, value: prod.mainUnit });
        if (prod.packUnit && prod.packUnit !== prod.mainUnit)
          options.push({ label: prod.packUnit, value: prod.packUnit });

        return (
          <div>
            <Space.Compact style={{ width: "100%" }}>
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: "100%" }}
                value={val}
                onChange={(v) => updateItem(record.key, "qty", v)}
                disabled={!record.productId}
              />
              <Select
                value={record.unit}
                style={{ width: 120 }}
                options={options}
                onChange={(v) => updateItem(record.key, "unit", v)}
                disabled={!record.productId}
              />
            </Space.Compact>
          </div>
        );
      },
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (val, record) => (
        <Input value={val} onChange={(e) => updateItem(record.key, "note", e.target.value)} />
      ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ];

  const renderExpandableRow = (record) => {
    return (
      <>
        <div>
          <Tag color="orange">
            <strong>Lưu ý:</strong> Trung bình 1 {record?.product?.packUnit} ={" "}
            {record?.product?.avgConversionRate} {record?.product?.mainUnit} (vậy {record?.qty}{" "}
            {record?.product?.packUnit} = {record?.qty * record?.product?.avgConversionRate}{" "}
            {record?.product?.mainUnit})
          </Tag>
        </div>
      </>
    );
  };

  const dataSource = items.map((it) => ({ key: it.key, ...it }));

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span style={{ fontSize: "18px" }}>Chỉnh sửa đơn hàng</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={950}
      centered
      className="addSupplier-modal"
      maskClosable={!isLoading}
      destroyOnHidden
    >
      <Divider />
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={isLoading}>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Nhân viên bán hàng" name="seller" tooltip="Người tạo đơn (khóa)">
              <Select disabled size="large" value={user?.id}>
                <Option value={user?.id}>{orderData?.sellerName || user?.fullName || ""}</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Mã đơn hàng" name="orderNo">
              <Input placeholder="Mã đơn hàng" size="large" disabled />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Khách hàng"
              name="customerId"
              rules={[{ required: true, message: "Chọn KH" }]}
            >
              <Select
                showSearch
                placeholder="Tìm/chọn khách hàng"
                filterOption={false}
                onSearch={handleCustomerSearch}
                onPopupScroll={handleCustomerPopupScroll}
                notFoundContent={
                  customerLoading ? <Spin size="small" /> : <Empty description="Không có" />
                }
                onChange={handleCustomerChange}
                onFocus={() => {
                  if (customerOptions.length <= 1 && orderData.customerId)
                    fetchCustomers("", false);
                }}
                allowClear
                size="large"
                options={customerOptions}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Kho / Phòng ban"
              name="departmentId"
              rules={[{ required: true, message: "Chọn kho" }]}
            >
              <Select
                showSearch
                placeholder="Tìm/chọn kho"
                filterOption={false}
                onSearch={handleDeptSearch}
                onPopupScroll={handleDeptPopupScroll}
                notFoundContent={deptLoading ? <Spin size="small" /> : null}
                onChange={handleDeptChange}
                onFocus={() => {
                  if (deptOptions.length <= 1 && orderData.departmentId)
                    fetchDepartments("", false);
                }}
                allowClear
                size="large"
                options={deptOptions}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Thời gian giao hàng (SLA)"
              name="slaDeliveryAt"
              rules={[{ required: true, message: "Chọn thời gian" }]}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: "100%" }}
                size="large"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Địa chỉ giao hàng" name="address">
              <Input placeholder="Địa chỉ giao" size="large" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Số điện thoại" name="phone">
              <Input placeholder="Số điện thoại" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Ghi chú chung" name="note">
          <TextArea rows={3} placeholder="Ghi chú chung cho đơn hàng" size="large" />
        </Form.Item>

        <Divider>Danh sách sản phẩm</Divider>

        <Table
          columns={productColumns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          loading={dataSource.length === 0 ? true : false}
          bordered
          expandable={{
            expandedRowRender: renderExpandableRow,
            rowExpandable: (record) =>
              record.unit === record?.product?.packUnit && !!record?.product,
            expandedRowKeys: items.map((i) => i.key),
            showExpandColumn: false,
          }}
        />

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} disabled={!departmentId}>
            Thêm sản phẩm
          </Button>
        </div>

        <Divider />

        <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
          <Space>
            <Button onClick={onCancel} disabled={isLoading} size="large">
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={isLoading} size="large">
              {isLoading ? "Đang cập nhật..." : "Cập nhật đơn hàng"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditSalesOrdersModal;
