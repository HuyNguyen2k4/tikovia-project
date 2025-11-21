import React, { useEffect, useMemo, useRef, useState } from "react";

import { DeleteOutlined, FileAddOutlined, PlusOutlined } from "@ant-design/icons";
import "@assets/supplier/AddSupplierModal.css";
import { getListCustomers } from "@src/services/customerService";
import { listDepartments } from "@src/services/departmentService";
import { findProductsInDepartment } from "@src/services/productService";
import { createSalesOrder } from "@src/store/salesOrdersSlice";
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
import { useLocation } from "react-router-dom";
import locale from "antd/es/date-picker/locale/vi_VN";

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AddSalesOrdersModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [departmentId, setDepartmentId] = useState(undefined);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const createStatus = useSelector((state) => state.salesOrders.createStatus);
  const isLoading = createStatus === "loading";

  const user = useSelector((state) => state.auth.user) || {};
  const departments = useSelector((state) => state.department.departments?.data) || [];
  // const products = useSelector((state) => state.product.products?.data) || [];

  // State cho Customer lazy loading
  const [customerOptions, setCustomerOptions] = useState([]);
  const customerPageRef = useRef(0);
  const customerHasMoreRef = useRef(true);
  const [customerLoading, setCustomerLoading] = useState(false);
  const customerSearchRef = useRef("");
  const customerSearchTimer = useRef();

  // State cho Department lazy loading
  const [deptOptions, setDeptOptions] = useState([]);
  const deptPageRef = useRef(0);
  const deptHasMoreRef = useRef(true);
  const [deptLoading, setDeptLoading] = useState(false);
  const deptSearchRef = useRef("");
  const deptSearchTimer = useRef();

  // State cho Product lazy loading (dùng chung cho cả bảng)
  const [productOptions, setProductOptions] = useState([]);
  const productPageRef = useRef(0);
  const productHasMoreRef = useRef(true);
  const [productLoading, setProductLoading] = useState(false);
  const productSearchRef = useRef("");
  const productSearchTimer = useRef();

  useEffect(() => {
    if (visible) {
      // if (!products?.length) dispatch(fetchListProducts());
      // if (!departments?.length) dispatch(fetchListDepartments());

      form.resetFields();
      setItems([]);
      setDepartmentId(undefined);
      setSelectedCustomer(null);
      form.setFieldsValue({
        seller: user?.id,
      });

      // Reset state của customer select
      customerPageRef.current = 0;
      customerHasMoreRef.current = true;
      setCustomerOptions([]);
      customerSearchRef.current = "";
      fetchCustomers("", false);

      // Reset state của department select
      deptPageRef.current = 0;
      deptHasMoreRef.current = true;
      setDeptOptions([]);
      deptSearchRef.current = "";
      fetchDepartments("", false);

      // Reset state của product select
      productPageRef.current = 0;
      productHasMoreRef.current = true;
      setProductOptions([]);
      productSearchRef.current = "";
      fetchProducts("", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user, form]);

  // useEffect riêng: Auto-fill từ URL khi customerOptions và deptOptions đã load
  useEffect(() => {
    if (visible && customerOptions.length > 0 && deptOptions.length > 0) {
      const queryParams = new URLSearchParams(location.search);
      const formData = {};

      // Lấy customerId hoặc customerName
      const customerIdParam = queryParams.get("customerId");
      const customerNameParam = queryParams.get("customerName");

      if (customerIdParam) {
        formData.customerId = customerIdParam;
        handleCustomerChange(customerIdParam);
      } else if (customerNameParam) {
        const foundCustomer = customerOptions.find((c) =>
          c.label.toLowerCase().includes(customerNameParam.toLowerCase())
        );
        if (foundCustomer) {
          formData.customerId = foundCustomer.value;
          handleCustomerChange(foundCustomer.value);
        }
      }

      // Lấy departmentId hoặc departmentName
      const departmentIdParam = queryParams.get("departmentId");
      const departmentNameParam = queryParams.get("departmentName");
      let foundDept = null;
      if (departmentIdParam) {
        formData.departmentId = departmentIdParam;
        handleDeptChange(departmentIdParam);
      } else if (departmentNameParam) {
        foundDept = deptOptions.find(
          (d) => d.label.toLowerCase() === departmentNameParam.toLowerCase()
        );
        if (foundDept) {
          formData.departmentId = foundDept.value;
          handleDeptChange(foundDept.value);
        }
      }

      // Lấy các trường khác
      if (queryParams.get("slaDeliveryAt")) {
        formData.slaDeliveryAt = dayjs(queryParams.get("slaDeliveryAt"));
      }
      if (queryParams.get("address")) {
        formData.address = queryParams.get("address");
      }
      if (queryParams.get("phone")) {
        formData.phone = queryParams.get("phone");
      }
      if (queryParams.get("note")) {
        formData.note = queryParams.get("note");
      }

      // Set các field có giá trị
      const fieldsToSet = Object.entries(formData)
        .filter(([_, value]) => value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      if (Object.keys(fieldsToSet).length > 0) {
        form.setFieldsValue(fieldsToSet);
      }
      // --- AUTO-FILL ITEMS ---
      const itemsFromUrl = [];
      let index = 0;
      while (true) {
        const productId = queryParams.get(`items[${index}][productId]`);
        const productName = queryParams.get(`items[${index}][productName]`);

        if (!productId && !productName) break;

        const qty = queryParams.get(`items[${index}][qty]`);
        const unit = queryParams.get(`items[${index}][unit]`);
        const note = queryParams.get(`items[${index}][note]`);

        itemsFromUrl.push({
          key: Date.now() + index,
          productId: productId || null,
          productName: productName || null,
          qty: qty ? Number(qty) : 0,
          unit: unit || undefined,
          note: note || "",
          product: null,
        });
        index++;
      }

      // Nếu có items từ URL, set vào state
      if (itemsFromUrl.length > 0) {
        const deptId = departmentIdParam || (foundDept ? foundDept.value : departmentId);
        if (deptId) {
          fetchProducts("", false, deptId).then((fetchedProducts) => {
            const mappedItems = itemsFromUrl
              .map((it) => {
                let prodOpt = null;

                if (it.productId) {
                  prodOpt = fetchedProducts.find((p) => p.value === it.productId);
                } else if (it.productName) {
                  prodOpt = fetchedProducts.find((p) =>
                    p.label.toLowerCase().includes(it.productName.toLowerCase())
                  );
                }

                if (!prodOpt) return null;

                return {
                  ...it,
                  productId: prodOpt.value,
                  product: prodOpt.raw,
                };
              })
              .filter(Boolean);

            setItems(mappedItems);
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, location.search, customerOptions, deptOptions]);

  // --- Fetch Customers ---
  const fetchCustomers = async (q = "", append = false) => {
    if (!customerHasMoreRef.current && append) return;
    setCustomerLoading(true);
    const limit = 20;
    const offset = append ? (customerPageRef.current + 1) * limit : 0;
    try {
      const res = await getListCustomers(user.id, { q, limit, offset });
      const payload = res.data || {};
      const items = payload.data || [];
      const pagination = payload.pagination || {};
      customerHasMoreRef.current = !!pagination.hasMore;
      customerPageRef.current = append ? customerPageRef.current + 1 : 0;
      const mapped = items.map((c) => ({
        value: c.id,
        // label: `${c.code || ""} - ${c.name}`,
        label: `${c.name}`,
        raw: c,
      }));
      setCustomerOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
      notification.error({ message: "Failed to fetch customers" });
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

  // --- Fetch Departments ---
  const fetchDepartments = async (q = "", append = false) => {
    if (!deptHasMoreRef.current && append) return;
    setDeptLoading(true);
    const limit = 20;
    const offset = append ? (deptPageRef.current + 1) * limit : 0;
    try {
      const res = await listDepartments({ q, limit, offset });
      const payload = res.data || {};
      const items = payload.data || [];
      const pagination = payload.pagination || {};
      deptHasMoreRef.current = !!pagination.hasMore;
      deptPageRef.current = append ? deptPageRef.current + 1 : 0;
      const mapped = items.map((d) => ({ value: d.id, label: d.name, raw: d }));
      setDeptOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
      notification.error({ message: "Failed to fetch departments" });
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

  // --- Fetch Products ---
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
      const items = payload.items || [];
      const pagination = payload.pagination || {};
      productHasMoreRef.current = !!pagination.hasMore;
      productPageRef.current = append ? productPageRef.current + 1 : 0;
      const mapped = items.map((p) => ({
        value: p.productId,
        label: p.productName,
        raw: p, // Lưu toàn bộ object thô (chứa mainUnit, packUnit)
      }));
      setProductOptions((prev) => (append ? [...prev, ...mapped] : mapped));
      return mapped;
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

  // --- Item Handlers ---
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: Date.now(),
        productId: undefined,
        product: null, // Trường lưu trữ đối tượng product thô
        qty: 0,
        unit: undefined,
        note: "",
      },
    ]);
  };

  const updateItem = (key, field, value) => {
    if (field === "productId") {
      const prodOpt = productOptions.find((p) => p.value === value);
      const prod = prodOpt ? prodOpt.raw : null;
      // Tự động chọn mainUnit làm default khi đổi sản phẩm
      const mainUnit = prod?.mainUnit;
      setItems((prev) =>
        prev.map((it) =>
          it.key === key ? { ...it, productId: value, product: prod, unit: mainUnit } : it
        )
      );
    } else if (field === "unit") {
      setItems((prev) => prev.map((it) => (it.key === key ? { ...it, unit: value, qty: 0 } : it)));
    } else {
      setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
    }
  };

  const removeItem = (key) => setItems((prev) => prev.filter((it) => it.key !== key));

  const calculateTotalAmount = () => {
    return 0;
  };

  // --- Form Handlers ---
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
        ...it, // Giữ lại key và note
        productId: undefined,
        product: null,
        qty: 0,
        unit: undefined,
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
    if (items.length === 0) {
      notification.warning({ message: "Vui lòng thêm ít nhất 1 sản phẩm" });
      return;
    }
    const filledItems = items.filter((i) => i.productId && i.qty > 0);
    if (filledItems.length === 0) {
      notification.warning({ message: "Vui lòng điền sản phẩm và số lượng hợp lệ" });
      return;
    }
    // take maxQty
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
          description: `Sản phẩm ${prod.productName} có số lượng tối đa là ${maxQty.toFixed(2)} ${it.unit}`,
          duration: 5,
        });
        return;
      }
    }

    // Build payload for sales-order (adjust keys to backend API)
    const payload = {
      sellerId: user?.id,
      // orderNo: values.orderNo,
      customerId: values.customerId,
      slaDeliveryAt: values.slaDeliveryAt ? values.slaDeliveryAt.toISOString() : null,
      address: values.address,
      phone: values.phone,
      note: values.note,
      departmentId: departmentId,
      // convert qty to main unit when user selected packUnit
      items: filledItems.map((it) => {
        const prod = it.product || {};
        const inputQty = Number(it.qty) || 0;
        const packUnit = prod.packUnit;
        // try several possible keys for avg conversion rate from API
        const avgRate = Number(prod.avgConversionRate) || 1;

        const qtyForApi =
          it.unit && packUnit && it.unit === packUnit ? inputQty * avgRate : inputQty;

        return {
          productId: it.productId,
          qty: qtyForApi,
          note: it.note || "",
        };
      }),
    };
    // // For now simulate success and call onSuccess callback.
    dispatch(createSalesOrder(payload))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Tạo đơn hàng thành công",
          description: `Đơn hàng đã được tạo thành công.`,
        });
        onSuccess();
        onCancel?.();
      })
      .catch((err) => {
        notification.error({
          message: "Tạo đơn hàng thất bại",
          description: err.message || "Đã có lỗi xảy ra khi tạo đơn hàng.",
        });
      });
  };

  // --- Columns Definition ---
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
              <Empty description="Không tìm thấy sản phẩm" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              "Vui lòng chọn kho"
            )
          }
          onChange={(v) => updateItem(record.key, "productId", v)}
          onFocus={() => {
            if (productOptions.length === 0 && departmentId) {
              fetchProducts(productSearchRef.current, false);
            }
          }}
          allowClear
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
        // Tạo options cho đơn vị
        if (prod.mainUnit) {
          options.push({ label: prod.mainUnit, value: prod.mainUnit });
        }
        if (prod.packUnit && prod.packUnit !== prod.mainUnit) {
          options.push({ label: prod.packUnit, value: prod.packUnit });
        }

        return (
          <Space.Compact style={{ width: "100%" }}>
            <InputNumber
              min={0}
              // max={maxQty}
              step={0.01}
              style={{ width: "100%" }}
              value={val}
              onChange={(v) => updateItem(record.key, "qty", v)}
              disabled={!record.productId} // Vô hiệu hóa nếu chưa chọn sản phẩm
            />
            <Select
              value={record.unit}
              style={{ width: 120 }}
              onChange={(v) => updateItem(record.key, "unit", v)}
              options={options}
              disabled={!record.productId} // Vô hiệu hóa nếu chưa chọn sản phẩm
            />
          </Space.Compact>
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
  // phần expandable row để hiển thị Lưu ý
  // chỉ hiện khi có product
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

  const dataSource = items.map((it, idx) => ({ key: it.key, ...it }));
  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FileAddOutlined />
          <span style={{ fontSize: 18, fontWeight: 600 }}>Thêm đơn hàng</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={950}
      centered
      className="addSupplier-modal"
      maskClosable
    >
      <Divider />
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Nhân viên bán hàng" name="seller" tooltip="Người tạo đơn (khóa)">
              <Select disabled size="large">
                <Select.Option value={user?.id}>{user?.fullName || ""}</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          {/* <Col span={6}>
            <Form.Item
              label="Mã đơn hàng"
              name="orderNo"
              rules={[{ required: true, message: "Nhập mã đơn hàng" }]}
            >
              <Input placeholder="Nhập mã đơn hàng" size="large" />
            </Form.Item>
          </Col> */}
          <Col span={8}>
            {/* Customer Select (Lazy loading) */}
            <Form.Item
              label="Khách hàng"
              name="customerId"
              rules={[{ required: true, message: "Chọn khách hàng" }]}
            >
              <Select
                showSearch
                placeholder="Tìm hoặc chọn khách hàng"
                filterOption={false}
                onSearch={handleCustomerSearch}
                onPopupScroll={handleCustomerPopupScroll}
                notFoundContent={
                  customerLoading ? (
                    <Spin size="small" />
                  ) : (
                    <Empty description="Không có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )
                }
                onChange={handleCustomerChange}
                onFocus={() => {
                  if (customerOptions.length === 0) fetchCustomers("", false);
                }}
                allowClear
                size="large"
              >
                {customerOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Kho / Phòng ban"
              name="departmentId"
              rules={[{ required: true, message: "Chọn kho" }]}
            >
              <Select
                showSearch
                placeholder="Tìm hoặc chọn kho"
                filterOption={false}
                onSearch={handleDeptSearch}
                onPopupScroll={handleDeptPopupScroll}
                notFoundContent={deptLoading ? <Spin size="small" /> : null}
                onChange={handleDeptChange}
                onFocus={() => {
                  if (deptOptions.length === 0) fetchDepartments("", false);
                }}
                allowClear
                size="large"
              >
                {deptOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Thời gian giao hàng (SLA)"
              name="slaDeliveryAt"
              rules={[{ required: true, message: "Chọn thời gian giao" }]}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                locale={locale}
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

        <Form.Item label="Ghi chú" name="note">
          <TextArea rows={3} placeholder="Ghi chú" size="large" />
        </Form.Item>

        <Divider>Danh sách sản phẩm</Divider>

        <Table
          columns={productColumns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          bordered
          scroll={items.length > 6 ? { y: 300 } : undefined}
          expandable={{
            expandedRowRender: renderExpandableRow,
            // chỉ hiển thị expanble nếu unit là prod.packUnit và có product
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

        <Form.Item style={{ textAlign: "right" }}>
          <Space>
            <Button onClick={onCancel} size="large">
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" size="large" loading={isLoading}>
              Tạo đơn hàng
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddSalesOrdersModal;
