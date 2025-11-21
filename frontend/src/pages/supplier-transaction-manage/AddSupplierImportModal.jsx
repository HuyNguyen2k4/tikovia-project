import React, { useEffect, useRef, useState } from "react";

import {
  ApartmentOutlined,
  DeleteOutlined,
  FileAddOutlined,
  PlusOutlined,
  ShopOutlined,
  TagOutlined,
} from "@ant-design/icons";
import "@assets/supplier/AddSupplierModal.css";
import { findInventoryLotsInDepartmentByProduct } from "@src/services/inventoryLotService";
import { fetchListDepartments } from "@src/store/departmentSlice";
import {
  fetchListProducts,
  fetchProductById,
  findProductsInDepartment,
} from "@src/store/productSlice";
import { fetchListSuppliers } from "@src/store/supplierSlice";
import {
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
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tooltip,
  Typography,
  notification,
} from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

import RenderExpandableRowAdd from "./RenderExpanableRowAdd";

const { Text } = Typography;
const { Option } = Select;

const AddSupplierImportModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const [items, setItems] = useState([]);
  const inventoryLotsPageRef = useRef({});
  const inventoryLotsHasMoreRef = useRef({});
  const inventoryLotsSearchRef = useRef({});

  const [productOptions, setProductOptions] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const productPageRef = useRef(0);
  const productHasMoreRef = useRef(true);
  const productSearchRef = useRef("");

  // Product details cache
  const [productDetails, setProductDetails] = useState({});
  const [productDetailsLoading, setProductDetailsLoading] = useState({});

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
  const [rowSwitchStatus, setRowSwitchStatus] = useState({});

  const isLoading = createStatus === "loading" || createTransactionWithoutPriceStatus === "loading";
  const createErrorFinal = createError || createTransactionWithoutPriceError;

  // ✅ Helper function để format số
  const formatNumber = (num) => {
    if (num == null) return "0";
    const rounded = Number(num);
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(3).replace(/\.?0+$/, "");
  };

  // Fetch product details by ID
  const fetchProductDetails = async (productId, itemKey) => {
    if (productDetails[productId]) return; // Already cached

    setProductDetailsLoading((prev) => ({ ...prev, [itemKey]: true }));

    try {
      const response = await dispatch(fetchProductById(productId)).unwrap();
      const product = response.data;

      setProductDetails((prev) => ({
        ...prev,
        [productId]: product,
      }));

      // Update item với product details
      updateItem(itemKey, "packUnit", product.packUnit);
      updateItem(itemKey, "mainUnit", product.mainUnit);

      // CRITICAL: Set conversionRate từ product hoặc default = 1
      const defaultConversionRate = product.conversionRate || 1;
      updateItem(itemKey, "conversionRate", defaultConversionRate);

      // Set default conversion rate nếu chưa có
      if (!items.find((item) => item.key === itemKey)?.conversionRate) {
        updateItem(itemKey, "conversionRate", 1);
      }
      const existing = items.find((it) => it.key === itemKey);
      if (!existing?.selectedUnit) {
        updateItem(itemKey, "selectedUnit", "pack");
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      notification.error({
        message: "Lỗi tải thông tin sản phẩm",
        description: "Không thể tải thông tin chi tiết sản phẩm.",
      });
    } finally {
      setProductDetailsLoading((prev) => ({ ...prev, [itemKey]: false }));
    }
  };

  // Fetch products
  const fetchProducts = async (q = "", append = false, useExistingLot = false) => {
    if (!productHasMoreRef.current && append) return;
    setProductLoading(true);

    const limit = 20;
    const currentPage = productPageRef.current;
    const offset = append ? (currentPage + 1) * limit : 0;
    const departmentId = form.getFieldValue("departmentId");

    try {
      let res;
      if (useExistingLot && departmentId) {
        res = await dispatch(
          findProductsInDepartment({ departmentId, params: { q, limit, offset } })
        ).unwrap();
      } else {
        res = await dispatch(fetchListProducts({ q, limit, offset })).unwrap();
      }

      let items = [];
      if (useExistingLot && departmentId) {
        items = res?.items || [];
      } else {
        items = res?.data || res?.items || [];
      }

      const pagination = res?.pagination || {};
      productHasMoreRef.current = !!pagination.hasMore;
      productPageRef.current = append ? currentPage + 1 : 0;

      const mapped = items
        .filter((p) => p && (p.id || p.productId) && (p.name || p.productName))
        .map((p, index) => ({
          value: p.id || p.productId,
          label: p.name || p.productName,
          key: `product_${p.id || p.productId}_${currentPage}_${index}`,
        }));

      setProductOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setProductLoading(false);
    }
  };

  const productSearchTimer = useRef();

  const handleProductSearch = (val, itemKey) => {
    productSearchRef.current = val;
    clearTimeout(productSearchTimer.current);
    productSearchTimer.current = setTimeout(() => {
      const useExistingLot = rowSwitchStatus[itemKey] || false;
      fetchProducts(val, false, useExistingLot);
    }, 400);
  };

  const handleProductPopupScroll = (e, itemKey) => {
    if (e.target.scrollTop + e.target.offsetHeight >= e.target.scrollHeight - 20) {
      if (!productLoading && productHasMoreRef.current) {
        const useExistingLot = rowSwitchStatus[itemKey] || false;
        fetchProducts(productSearchRef.current, true, useExistingLot);
      }
    }
  };

  // Effect để fetch lại products khi thay đổi department
  useEffect(() => {
    const departmentId = form.getFieldValue("departmentId");
    if (departmentId) {
      setProductOptions([]);
      productPageRef.current = 0;
      productHasMoreRef.current = true;
      fetchProducts("", false);

      items.forEach((item) => {
        if (item.productId) {
          const key = item.productId;
          // setInventoryLotsOptions((prev) => ({ ...prev, [key]: [] }));
          inventoryLotsPageRef.current[key] = 0;
          inventoryLotsHasMoreRef.current[key] = true;
        }
      });
    }
    // eslint-disable-next-line
  }, [form.getFieldValue("departmentId")]);

  useEffect(() => {
    if (visible) {
      if (!suppliers?.length) dispatch(fetchListSuppliers());
      if (!departments?.length) dispatch(fetchListDepartments());

      form.resetFields();
      setItems([]);
      setProductOptions([]);
      productPageRef.current = 0;
      productHasMoreRef.current = true;

      // setInventoryLotsOptions({});
      // setInventoryLotsLoading({});
      setProductDetails({});
      setProductDetailsLoading({});
      setRowSwitchStatus({});
      inventoryLotsPageRef.current = {};
      inventoryLotsHasMoreRef.current = {};
      inventoryLotsSearchRef.current = {};
    }
    // eslint-disable-next-line
  }, [visible, suppliers?.length, departments?.length, dispatch]);

  /** === TÍNH TỔNG TIỀN === */
  // const calculateTotalAmount = () =>
  //   items.reduce((sum, item) => sum + (item.qty || 0) * (item.unitPrice || 0), 0);
  /** === TÍNH TỔNG TIỀN === */
  const calculateTotalAmount = () => {
    return items.reduce((sum, item) => {
      // Sử dụng cùng logic với cột "Thành tiền"
      let finalQty = item.qty || 0;
      if (item.selectedUnit === "pack" && item.conversionRate) {
        finalQty = (item.qty || 0) * (item.conversionRate || 1);
      } else {
        finalQty = item.qty || 0;
      }
      const itemTotal = finalQty * (item.unitPrice || 0);
      return sum + itemTotal;
    }, 0);
  };

  /** === XỬ LÝ SUBMIT === */
  const handleSubmit = (values) => {
    if (items.length === 0) {
      notification.warning({ message: "Vui lòng thêm ít nhất 1 sản phẩm" });
      return;
    }

    const filledItems = items.filter(
      (i) => i.productId || i.qty > 0 || i.unitPrice >= 0 || i.expiryDate
    );

    if (filledItems.length === 0) {
      notification.warning({
        message: "Không có sản phẩm hợp lệ",
        description: "Vui lòng nhập ít nhất một sản phẩm có thông tin đầy đủ.",
      });
      return;
    }

    // ✅ ENHANCED VALIDATION: Kiểm tra theo requirements của API
    const invalidItems = filledItems.filter((i) => {
      if (!i.productId || !i.qty || i.qty <= 0) return true;
      if (userRole !== "manager" && (i.unitPrice == null || i.unitPrice < 0)) return true;
      if (!i.expiryDate) return true;

      // ✅ FIXED: Validation đặc biệt cho packUnit logic
      if (i.selectedUnit === "pack") {
        // Khi chọn pack unit, cần có đầy đủ packUnit, mainUnit, conversionRate > 0
        if (!i.packUnit || !i.mainUnit || !i.conversionRate || i.conversionRate <= 0) {
          console.error(`❌ Item ${i.productId} thiếu thông tin conversion:`, {
            packUnit: i.packUnit,
            mainUnit: i.mainUnit,
            conversionRate: i.conversionRate,
            selectedUnit: i.selectedUnit,
          });
          return true;
        }
      } else if (i.selectedUnit === "main") {
        // Khi chọn main unit, chỉ cần mainUnit
        if (!i.mainUnit) {
          console.error(`❌ Item ${i.productId} thiếu mainUnit`);
          return true;
        }
      } else {
        // Không chọn unit
        console.error(`❌ Item ${i.productId} chưa chọn đơn vị`);
        return true;
      }

      return false;
    });

    if (invalidItems.length > 0) {
      console.log("🔍 Invalid Items Details:", invalidItems);
      notification.warning({
        message: "Thiếu thông tin sản phẩm",
        description:
          "Một số sản phẩm chưa điền đủ thông tin: sản phẩm, số lượng > 0, đơn vị, đơn giá, hạn sử dụng, thông tin quy đổi.",
      });
      return;
    }

    // ✅ FIXED: Build data theo đúng API format
    const data = {
      supplierId: values.supplierId,
      departmentId: values.departmentId,
      note: values.note,
      type: "in",
      transDate: values.transDate?.toISOString(),
      dueDate: values.dueDate?.toISOString(),
      items: filledItems.map((i, index) => {
        const item = {
          productId: i.productId,
          unitPrice: userRole === "manager" ? 0 : i.unitPrice,
          expiryDate: i.expiryDate,
          lotId: i.lotId || undefined, // API có thể cần lotId
        };

        if (i.selectedUnit === "pack") {
          // ✅ Gửi packQty + conversion info
          item.packQty = i.qty || 0;
          item.packUnit = i.packUnit;
          item.mainUnit = i.mainUnit;
          item.conversionRate = i.conversionRate;
        } else if (i.selectedUnit === "main") {
          // ✅ Gửi mainQty only
          item.mainQty = i.qty || 0;
          // Không gửi packQty, packUnit, conversionRate
        }

        console.log(`🔍 Item ${index + 1} final data:`, item);

        return item;
      }),
    };

    console.log("🔍 Final Submit Data:", JSON.stringify(data, null, 2));

    const apiCall =
      userRole === "manager" ? createTransactionWithoutPrice : createSupplierTransaction;

    dispatch(apiCall(data))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Thêm giao dịch thành công",
          description: "Giao dịch nhập đã được tạo.",
        });
        onSuccess?.();
        onCancel();
      })
      .catch((err) => {
        console.error("🔍 Submit Error:", err);
        notification.error({
          message: "Lỗi khi tạo giao dịch",
          description: err.message || createErrorFinal,
        });
      });
  };

  /** === XỬ LÝ ITEMS === */
  const addItem = () => {
    setItems([
      ...items,
      {
        key: Date.now(),
        productId: undefined,
        qty: 0,
        unitPrice: 0,
        expiryDate: null,
        lotId: undefined,
        selectedUnit: undefined,
        mainQty: 0,
        packUnit: undefined,
        mainUnit: undefined,
        conversionRate: 1,
      },
    ]);
  };

  const updateItem = (key, field, value) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  // Fetch inventory lots by product ID
  const fetchInventoryLots = async (productId, q = "", append = false) => {
    const key = productId;
    if (!inventoryLotsHasMoreRef.current[key] && append) return;

    // setInventoryLotsLoading((prev) => ({ ...prev, [key]: true }));
    const limit = 20;
    const currentPage = inventoryLotsPageRef.current[key] || 0;
    const offset = append ? (currentPage + 1) * limit : 0;

    try {
      const departmentId = form.getFieldValue("departmentId");
      if (!departmentId) {
        notification.warning({ message: "Vui lòng chọn kho trước" });
        return;
      }

      const res = await findInventoryLotsInDepartmentByProduct(departmentId, productId, {
        q,
        limit,
        offset,
      });

      const payload = res.data || {};
      const items = payload.items || [];
      const pagination = payload.pagination || {};

      inventoryLotsHasMoreRef.current[key] = !!pagination.hasMore;
      inventoryLotsPageRef.current[key] = append ? currentPage + 1 : 0;

      const mapped = items
        .filter((lot) => lot && lot.id && lot.lotNo)
        .map((lot, index) => ({
          value: lot.id,
          label: `${lot.lotNo}`,
          key: `lot_${lot.id}_${productId}_${currentPage}_${index}`,
          raw: lot,
          tooltipTitle: (
            <div>
              <div>
                <strong>Mã lô:</strong> {lot.lotNo}
              </div>
              <div>
                <strong>Hạn sử dụng:</strong>{" "}
                {lot.expiryDate ? dayjs(lot.expiryDate).format("DD/MM/YYYY") : "N/A"}
              </div>
              <div>
                <strong>Số lượng tồn:</strong> {lot.qtyOnHand || 0}
              </div>
              <div>
                <strong>Quy đổi:</strong> {lot.conversionRate || 1}
              </div>
            </div>
          ),
        }));
    } catch (error) {
      console.error("Error fetching inventory lots:", error);
    }
  };

  // Search debounce cho inventory lots
  const inventoryLotsSearchTimer = useRef({});

  const handleInventoryLotSearch = (productId, val) => {
    const key = productId;
    inventoryLotsSearchRef.current[key] = val;
    clearTimeout(inventoryLotsSearchTimer.current[key]);
    inventoryLotsSearchTimer.current[key] = setTimeout(() => {
      fetchInventoryLots(productId, val, false);
    }, 400);
  };

  /** === TABLE CỘT SẢN PHẨM === */
  const columns = [
    {
      title: "Sản phẩm",
      dataIndex: "productId",
      render: (val, record) => (
        <Select
          value={val}
          showSearch
          placeholder="Chọn sản phẩm"
          filterOption={false}
          style={{ width: "100%" }}
          notFoundContent={productLoading ? <Spin size="small" /> : "Không có dữ liệu"}
          onSearch={(searchVal) => handleProductSearch(searchVal, record.key)}
          onPopupScroll={(e) => handleProductPopupScroll(e, record.key)}
          onFocus={() => {
            if (productOptions.length === 0) {
              const useExistingLot = rowSwitchStatus[record.key] || false;
              fetchProducts("", false, useExistingLot);
            }
          }}
          onChange={(v) => {
            updateItem(record.key, "productId", v);
            // Reset các trường liên quan
            updateItem(record.key, "packUnit", undefined);
            updateItem(record.key, "mainUnit", undefined);
            updateItem(record.key, "conversionRate", 1);
            // setInventoryLotsOptions({});
            // reset inventory lots
            updateItem(record.key, "lotId", undefined);
            updateItem(record.key, "selectedUnit", undefined);

            // Fetch product details nếu chọn sản phẩm
            if (v) {
              fetchProductDetails(v, record.key);
            }
          }}
        >
          {productOptions.map((p) => (
            <Option key={p.key || `product_option_${p.value}`} value={p.value}>
              {p.label}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "qty",
      width: 160,
      render: (val, record) => {
        const unitOptions = [];
        if (record.packUnit && record.mainUnit) {
          unitOptions.push({ value: "pack", label: record.packUnit });
          unitOptions.push({ value: "main", label: record.mainUnit });
        }

        const handleUnitChange = (unitType) => {
          updateItem(record.key, "selectedUnit", unitType);

          if (unitType === "pack" && record.conversionRate) {
            const mainQty = (record.qty || 0) * (record.conversionRate || 1);
            updateItem(record.key, "mainQty", mainQty);
          } else if (unitType === "main") {
            updateItem(record.key, "mainQty", record.qty || 0);
          }
        };
        return (
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            value={val}
            addonAfter={
              <Select
                value={record.selectedUnit}
                style={{ width: 80 }}
                size="small"
                placeholder="Đơn vị"
                onChange={handleUnitChange}
                disabled={unitOptions.length === 0}
                options={unitOptions}
              />
            }
            onChange={(v) => {
              updateItem(record.key, "qty", v);
              if (record.selectedUnit === "pack" && record.conversionRate) {
                const mainQty = (v || 0) * (record.conversionRate || 1);
                updateItem(record.key, "mainQty", mainQty);
              } else if (record.selectedUnit === "main") {
                updateItem(record.key, "mainQty", v || 0);
              }
            }}
          />
        );
      },
    },
    {
      title: <Tooltip title="Đơn giá theo đơn vị chính">Đơn giá (VNĐ)</Tooltip>,
      dataIndex: "unitPrice",
      width: 160,
      render: (val, record) => (
        <Tooltip
          title={`Đơn giá: ${(val || 0).toLocaleString("vi-VN")} VNĐ/${record.mainUnit || "đơn vị"}`}
          placement="topLeft"
        >
          <InputNumber
            min={0}
            step={1000}
            style={{ width: "100%" }}
            value={val}
            onChange={(v) => updateItem(record.key, "unitPrice", v)}
            disabled={userRole === "manager"}
            suffix={
              <Text type="secondary" style={{ fontSize: "10px" }}>
                /{record.mainUnit}
              </Text>
            }
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          />
        </Tooltip>
      ),
    },
    {
      title: "Hạn sử dụng",
      dataIndex: "expiryDate",
      width: 160,
      render: (val, record) => (
        <DatePicker
          value={val ? dayjs(val) : null}
          onChange={(v) => updateItem(record.key, "expiryDate", v?.toISOString())}
          style={{ width: "100%" }}
          format="DD/MM/YYYY"
          minDate={dayjs()}
          disabled={!!record.lotId} // Disable khi đã chọn lot
          placeholder={record.lotId ? "Từ lô hàng" : "Chọn hạn sử dụng"}
        />
      ),
    },
    {
      title: "Thành tiền",
      key: "total",
      width: 160,
      render: (_, record) => {
        // ✅ FIXED: Đồng bộ logic với calculateTotalAmount
        let finalQty = record.qty || 0;

        if (record.selectedUnit === "pack" && record.conversionRate) {
          finalQty = (record.qty || 0) * (record.conversionRate || 1);
        } else {
          finalQty = record.qty || 0;
        }

        const totalAmount = finalQty * (record.unitPrice || 0);

        // Debug calculation
        let calculation = "";
        if (record.selectedUnit === "pack" && record.conversionRate) {
          calculation = `${record.qty} ${record.packUnit} × ${record.conversionRate} × ${(record.unitPrice || 0).toLocaleString("vi-VN")} VNĐ`;
        } else if (record.selectedUnit === "main") {
          calculation = `${record.qty} ${record.mainUnit} × ${(record.unitPrice || 0).toLocaleString("vi-VN")} VNĐ`;
        } else {
          calculation = `${record.qty} × ${(record.unitPrice || 0).toLocaleString("vi-VN")} VNĐ (chưa chọn đơn vị)`;
        }

        return (
          <Tooltip
            title={`Tính toán: ${calculation} = ${totalAmount.toLocaleString("vi-VN")} VNĐ`}
            placement="topLeft"
          >
            {totalAmount.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
          </Tooltip>
        );
      },
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

  /** === VALIDATION === */
  const validationRules = {
    supplierId: [{ required: true, message: "Chọn nhà cung cấp!" }],
    departmentId: [{ required: true, message: "Chọn phòng ban!" }],
  };

  /** === HIỂN THỊ PHẦN EXPANDABLE: Thiết lập quy đổi === */
  const renderExpandableRow = (record) => (
    <RenderExpandableRowAdd
      record={record}
      productDetails={productDetails}
      productDetailsLoading={productDetailsLoading}
      updateItem={updateItem}
    />
  );

  return (
    <Modal
      title={
        <div className="addSupplier-titleContainer">
          <FileAddOutlined className="addSupplier-titleIcon" />
          <span style={{ fontSize: 18 }}>Thêm giao dịch nhập hàng</span>
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
      >
        <Row gutter={24}>
          <Col xs={24} sm={24} md={8}>
            <Form.Item label="Nhà cung cấp" name="supplierId" rules={validationRules.supplierId}>
              <Select
                placeholder="Chọn nhà cung cấp"
                showSearch
                size="large"
                suffixIcon={<ShopOutlined />}
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
                  // setInventoryLotsOptions({});
                  // setInventoryLotsLoading({});
                  inventoryLotsPageRef.current = {};
                  inventoryLotsHasMoreRef.current = {};
                  inventoryLotsSearchRef.current = {};

                  setProductOptions([]);
                  productPageRef.current = 0;
                  productHasMoreRef.current = true;

                  setItems((prev) =>
                    prev.map((item) => ({
                      ...item,
                      lotId: undefined,
                      productId: undefined,
                      packUnit: undefined,
                      mainUnit: undefined,
                      conversionRate: 1,
                      selectedUnit: undefined,
                      mainQty: 0,
                    }))
                  );
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
            <Form.Item label="Ngày đến hạn thanh toán" name="dueDate">
              <DatePicker format="DD/MM/YYYY" size="large" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={16}>
            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea placeholder="Ghi chú thêm..." autoSize size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Danh sách sản phẩm</Divider>

        <Table
          columns={columns}
          dataSource={items}
          pagination={false}
          size="small"
          bordered
          scroll={items.length > 2 ? { x: true, y: 280 } : { x: true }}
          expandable={{
            expandedRowRender: renderExpandableRow,
            expandedRowKeys: items.map((i) => i.key),
            showExpandColumn: false,
          }}
        />

        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>
            Thêm sản phẩm
          </Button>
          <Text strong>
            Tổng cộng:{" "}
            {calculateTotalAmount().toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
          </Text>
        </div>

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

export default AddSupplierImportModal;
