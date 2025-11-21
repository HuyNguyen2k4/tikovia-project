import React, { useEffect, useRef, useState } from "react";

import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ShopOutlined,
  TagOutlined,
} from "@ant-design/icons";
import "@assets/supplier/EditSupplierModal.css";
import {
  findInventoryLotsInDepartmentByProduct,
  getInventoryLotById,
} from "@src/services/inventoryLotService";
import { fetchListDepartments } from "@src/store/departmentSlice";
import {
  fetchListProducts,
  fetchProductById,
  findProductsInDepartment,
} from "@src/store/productSlice";
import { fetchListSuppliers } from "@src/store/supplierSlice";
import {
  fetchSupplierTransactionById,
  updateItemCostInTransaction,
  updateSupplierTransaction,
  updateTransactionWithoutPrice,
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
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

import RenderExpandableRowEdit from "./RenderExpanableRowEdit";

const { Text } = Typography;
const { Option } = Select;

const EditSupplierTransactionModal = ({ visible, onCancel, onSuccess, transactionId }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const [items, setItems] = useState([]);
  const [selectedType, setSelectedType] = useState("in");
  const [loading, setLoading] = useState(false);

  // Product search states
  const [productOptions, setProductOptions] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const productPageRef = useRef(0);
  const productHasMoreRef = useRef(true);
  const productSearchRef = useRef("");

  // Inventory lots state
  const [inventoryLotsOptions, setInventoryLotsOptions] = useState({});
  const [inventoryLotsLoading, setInventoryLotsLoading] = useState({});
  const inventoryLotsPageRef = useRef({});
  const inventoryLotsHasMoreRef = useRef({});
  const inventoryLotsSearchRef = useRef({});

  // Redux selectors
  const userRole = useSelector((state) => state.auth.user?.role);
  const updateStatus = useSelector((state) => state.supplierTransactionCombined.updateStatus);
  const updateError = useSelector((state) => state.supplierTransactionCombined.updateError);
  const updateTransactionWithoutPriceStatus = useSelector(
    (state) => state.supplierTransactionCombined.updateTransactionWithoutPriceStatus
  );
  const updateTransactionWithoutPriceError = useSelector(
    (state) => state.supplierTransactionCombined.updateTransactionWithoutPriceError
  );
  const updateItemCostInTransactionStatus = useSelector(
    (state) => state.supplierTransactionCombined.updateItemCostInTransactionStatus
  );
  const updateItemCostInTransactionError = useSelector(
    (state) => state.supplierTransactionCombined.updateItemCostInTransactionError
  );

  const isUpdating =
    updateStatus === "loading" ||
    updateTransactionWithoutPriceStatus === "loading" ||
    updateItemCostInTransactionStatus === "loading";
  const updateErrorMessage =
    updateError || updateTransactionWithoutPriceError || updateItemCostInTransactionError;

  const suppliers = useSelector((state) => state.supplier.suppliers?.data) || [];
  const departments = useSelector((state) => state.department.departments?.data) || [];

  const fetchProducts = async (q = "", append = false) => {
    if (!productHasMoreRef.current && append) return;
    setProductLoading(true);

    const limit = 20;
    const currentPage = productPageRef.current;
    const offset = append ? (currentPage + 1) * limit : 0;
    const departmentId = form.getFieldValue("departmentId");

    try {
      let res;
      if (selectedType === "in") {
        res = await dispatch(fetchListProducts({ q, limit, offset })).unwrap();
      } else if (selectedType === "out" && departmentId) {
        res = await dispatch(
          findProductsInDepartment({ departmentId, params: { q, limit, offset } })
        ).unwrap();
      } else return;

      let items = [];
      if (selectedType === "in") {
        items = res?.data || res?.items || [];
      } else if (selectedType === "out") {
        items = res?.items || [];
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

  const handleProductSearch = (val) => {
    productSearchRef.current = val;
    clearTimeout(productSearchTimer.current);
    productSearchTimer.current = setTimeout(() => {
      fetchProducts(val, false);
    }, 400);
  };

  const handleProductPopupScroll = (e) => {
    if (e.target.scrollTop + e.target.offsetHeight >= e.target.scrollHeight - 20) {
      if (!productLoading && productHasMoreRef.current) {
        fetchProducts(productSearchRef.current, true);
      }
    }
  };

  useEffect(() => {
    if (visible) {
      if (!suppliers.length) dispatch(fetchListSuppliers());
      if (!departments.length) dispatch(fetchListDepartments());
    }
  }, [visible, dispatch, suppliers.length, departments.length]);

  useEffect(() => {
    if (visible && transactionId) {
      setLoading(true);
      dispatch(fetchSupplierTransactionById(transactionId))
        .unwrap()
        .then((res) => {
          const data = res?.data;
          if (data) {
            setSelectedType(data.type || "in");
            form.setFieldsValue({
              supplierId: data.supplierId,
              departmentId: data.departmentId,
              type: data.type,
              note: data.note,
              transDate: data.transDate ? dayjs(data.transDate) : null,
              dueDate: data.dueDate ? dayjs(data.dueDate) : null,
            });

            // const mappedItems = (data.items || []).map((item, i) => ({
            //   key: item.id || i,
            //   id: item.id,
            //   productId: item.productId,
            //   qty: item.qty || item.packQty || item.mainQty,
            //   unitPrice: item.unitPrice,
            //   expiryDate: item.expiryDate,
            //   lotId: item.lotId,
            //   lotNo: item.lotNo,
            //   packUnit: item.packUnit,
            //   mainUnit: item.mainUnit,
            //   conversionRate: item.conversionRate,
            //   mainQty: item.mainQty || 0,
            // }));
            // ✅ FIXED: Logic mapping theo API response mới
            const mappedItems = (data.items || []).map((item, i) => {
              let qtyValue;
              const mainQtyValue = item.qty || 0; // ✅ qty từ DB luôn là mainQty

              if (data.type === "in") {
                // ✅ Cho "in": Sử dụng convertedQty nếu có, không thì tính từ mainQty
                if (item.unitConversion && item.unitConversion.convertedQty !== undefined) {
                  qtyValue = item.unitConversion.convertedQty;
                } else {
                  // Fallback: tính từ mainQty nếu có conversionRate
                  const conversionRate =
                    item.unitConversion?.conversionRate || item.conversionRate || 1;
                  qtyValue = conversionRate > 1 ? mainQtyValue / conversionRate : mainQtyValue;
                }
              } else {
                // ✅ Cho "out": qty hiển thị chính là mainQty
                qtyValue = mainQtyValue;
              }

              return {
                key: item.id || i,
                id: item.id,
                productId: item.productId,
                qty: qtyValue, // ✅ Đây là giá trị hiển thị (packQty cho "in", mainQty cho "out")
                unitPrice: item.unitPrice,
                expiryDate: item.expiryDate,
                lotId: item.lotId,
                lotNo: item.lotNo,
                packUnit: item.unitConversion?.packUnit || item.packUnit,
                mainUnit: item.unitConversion?.mainUnit || item.mainUnit,
                conversionRate: item.unitConversion?.conversionRate || item.conversionRate,
                mainQty: mainQtyValue, // ✅ Luôn giữ mainQty từ DB
              };
            });

            setItems(mappedItems);

            const currentProductOptions = (data.items || [])
              .filter((item) => item.productId && item.productName)
              .map((item, index) => ({
                value: item.productId,
                label: item.productName,
                key: `current_product_${item.productId}_${index}`,
              }));
            setProductOptions(currentProductOptions);

            // Fetch additional details for each item
            mappedItems.forEach((item) => {
              // Fetch packUnit and mainUnit from the product
              if (item.productId) {
                dispatch(fetchProductById(item.productId))
                  .unwrap()
                  .then((prodData) => {
                    updateItem(item.key, "packUnit", prodData.data.packUnit);
                    updateItem(item.key, "mainUnit", prodData.data.mainUnit);
                  });
              }

              // For existing "in" transactions, fetch conversionRate from the created lot
              if (item.lotId) {
                getInventoryLotById(item.lotId).then((lotRes) => {
                  const lotData = lotRes.data.data;
                  if (lotData && lotData.conversionRate) {
                    updateItem(item.key, "conversionRate", lotData.conversionRate);
                  }
                });
              }
            });

            if (data.type === "out") {
              (data.items || []).forEach((item) => {
                if (item.productId) fetchInventoryLots(item.productId, "", false);
              });
            }
          }
        })
        .catch(() => {
          notification.error({
            message: "Lỗi khi tải dữ liệu giao dịch",
            description: "Không thể tải thông tin chi tiết giao dịch.",
          });
        })
        .finally(() => setLoading(false));
    } else if (!visible) {
      form.resetFields();
      setItems([]);
      setProductOptions([]);
      setInventoryLotsOptions({});
      setInventoryLotsLoading({});
      productPageRef.current = 0;
      productHasMoreRef.current = true;
      inventoryLotsPageRef.current = {};
      inventoryLotsHasMoreRef.current = {};
      inventoryLotsSearchRef.current = {};
    }
  }, [visible, transactionId, dispatch, form]);

  const fetchInventoryLots = async (productId, q = "", append = false) => {
    const key = productId;
    if (!inventoryLotsHasMoreRef.current[key] && append) return;

    setInventoryLotsLoading((prev) => ({ ...prev, [key]: true }));
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
          raw: lot, // Keep the full lot object
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
            </div>
          ),
        }));

      setInventoryLotsOptions((prev) => ({
        ...prev,
        [key]: append ? [...(prev[key] || []), ...mapped] : mapped,
      }));
    } catch (error) {
      console.error("Error fetching inventory lots:", error);
    } finally {
      setInventoryLotsLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const inventoryLotsSearchTimer = useRef({});

  const handleInventoryLotSearch = (productId, val) => {
    const key = productId;
    inventoryLotsSearchRef.current[key] = val;
    clearTimeout(inventoryLotsSearchTimer.current[key]);
    inventoryLotsSearchTimer.current[key] = setTimeout(() => {
      fetchInventoryLots(productId, val, false);
    }, 400);
  };

  const handleInventoryLotPopupScroll = (productId, e) => {
    const key = productId;
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!inventoryLotsLoading[key] && inventoryLotsHasMoreRef.current[key]) {
        fetchInventoryLots(productId, inventoryLotsSearchRef.current[key] || "", true);
      }
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: Date.now(),
        productId: undefined,
        qty: 0,
        unitPrice: 0,
        expiryDate: null,
        lotId: undefined,
        mainQty: 0,
      },
    ]);
  };

  const updateItem = (key, field, value) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  // const calculateTotalAmount = () =>
  //   items.reduce((sum, i) => sum + (i.qty || 0) * (i.unitPrice || 0), 0);

  // ✅ FIXED: Tính tổng tiền đúng theo logic chuyển đổi đơn vị
  const calculateTotalAmount = () => {
    return items.reduce((sum, item) => {
      // ✅ Sử dụng cùng logic với cột "Thành tiền"
      let finalQty = item.qty || 0;

      if (selectedType === "in") {
        // ✅ Cho "in": qty là packQty, cần chuyển về mainQty để tính tiền
        finalQty = (item.qty || 0) * (item.conversionRate || 1);
      } else {
        // ✅ Cho "out": qty đã là mainQty, dùng trực tiếp
        finalQty = item.qty || 0;
      }

      const itemTotal = finalQty * (item.unitPrice || 0);

      console.log(`🔍 Calculate item ${item.key}:`, {
        selectedType,
        inputQty: item.qty,
        conversionRate: item.conversionRate,
        finalQty,
        unitPrice: item.unitPrice,
        itemTotal,
      });

      return sum + itemTotal;
    }, 0);
  };

  const handleSubmit = (values) => {
    if (items.length === 0) {
      notification.warning({ message: "Vui lòng thêm ít nhất 1 sản phẩm" });
      return;
    }

    const filledItems = items.filter(
      (i) =>
        i.productId ||
        i.qty > 0 ||
        i.unitPrice >= 0 ||
        (selectedType === "in" && i.expiryDate) ||
        (selectedType === "out" && i.lotId)
    );

    if (filledItems.length === 0) {
      notification.warning({
        message: "Không có sản phẩm hợp lệ",
        description: "Vui lòng nhập ít nhất một sản phẩm có thông tin đầy đủ.",
      });
      return;
    }

    // ✅ FIXED: Validate theo loại transaction
    if (userRole === "accountant") {
      const invalidAccountantItems = filledItems.filter((i) => !i.productId || i.unitPrice == null);
      if (invalidAccountantItems.length > 0) {
        notification.warning({
          message: "Thiếu thông tin sản phẩm",
          description: "Vui lòng nhập đầy đủ đơn giá cho từng sản phẩm.",
        });
        return;
      }

      const itemsBody = filledItems.map((i) => ({
        productId: i.productId,
        unitPrice: i.unitPrice,
      }));

      dispatch(updateItemCostInTransaction({ transactionId, items: itemsBody }))
        .unwrap()
        .then(() => {
          notification.success({
            message: "Cập nhật giá thành công",
            description: "Đơn giá các sản phẩm đã được cập nhật.",
          });
          onSuccess?.();
          onCancel();
        })
        .catch((err) => {
          notification.error({
            message: "Cập nhật giá thất bại",
            description: err || updateErrorMessage,
          });
        });
      return;
    }

    // ✅ FIXED: Validate theo từng loại transaction
    const invalidItems = filledItems.filter((i) => {
      // Kiểm tra cơ bản
      if (!i.productId || !i.qty || i.qty <= 0) return true;

      // Kiểm tra đơn giá (nếu không phải manager)
      if (userRole !== "manager" && (i.unitPrice == null || i.unitPrice < 0)) return true;

      // Kiểm tra theo loại transaction
      if (selectedType === "in") {
        // "in" cần có expiryDate và conversionRate > 0
        if (!i.expiryDate) return true;
        if (!i.conversionRate || i.conversionRate <= 0) return true;
      } else if (selectedType === "out") {
        // "out" cần có lotId
        if (!i.lotId) return true;
      }

      return false;
    });

    if (invalidItems.length > 0) {
      console.log("🔍 Invalid Items:", invalidItems);

      notification.warning({
        message: "Thiếu thông tin sản phẩm",
        description:
          selectedType === "in"
            ? "Một số sản phẩm chưa điền đủ thông tin (tên, số lượng > 0, đơn giá, hạn sử dụng, tỷ lệ quy đổi)."
            : "Một số sản phẩm chưa điền đủ thông tin (tên, số lượng > 0, đơn giá, lô hàng).",
      });
      return;
    }

    // ✅ FIXED: Submit data với đúng field names
    const data = {
      supplierId: values.supplierId,
      departmentId: values.departmentId,
      note: values.note,
      type: selectedType,
      transDate: values.transDate?.toISOString(),
      dueDate: values.dueDate?.toISOString(),
      items:
        selectedType === "in"
          ? filledItems.map((i) => ({
              id: i.id,
              productId: i.productId,
              packQty: i.qty, // ✅ Gửi packQty cho API
              unitPrice: userRole === "manager" ? 0 : i.unitPrice,
              expiryDate: i.expiryDate,
              packUnit: i.packUnit,
              mainUnit: i.mainUnit,
              conversionRate: i.conversionRate,
            }))
          : filledItems.map((i) => ({
              id: i.id,
              productId: i.productId,
              mainQty: i.qty, // ✅ Gửi mainQty cho API
              unitPrice: userRole === "manager" ? 0 : i.unitPrice,
              lotId: i.lotId,
            })),
    };
    const apiCall =
      userRole === "manager" ? updateTransactionWithoutPrice : updateSupplierTransaction;
    dispatch(apiCall({ id: transactionId, data }))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Cập nhật thành công",
          description: `Giao dịch ${selectedType === "in" ? "nhập" : "trả"} đã được cập nhật.`,
        });
        onSuccess?.();
        onCancel();
      })
      .catch((err) => {
        console.log(err);
        notification.error({
          message: "Cập nhật thất bại",
          description: err.message || updateErrorMessage || "Có lỗi xảy ra khi cập nhật giao dịch",
        });
      });
  };

  const handleProductSelect = (productId, itemKey) => {
    updateItem(itemKey, "productId", productId);

    if (selectedType === "out") {
      updateItem(itemKey, "lotId", undefined);
      const key = productId;
      setInventoryLotsOptions((prev) => ({ ...prev, [key]: [] }));
      inventoryLotsPageRef.current[key] = 0;
      inventoryLotsHasMoreRef.current[key] = true;
    }
    updateItem(itemKey, "packUnit", undefined);
    updateItem(itemKey, "mainUnit", undefined);
    updateItem(itemKey, "conversionRate", undefined);
    updateItem(itemKey, "mainQty", 0);

    if (productId) {
      dispatch(fetchProductById(productId))
        .unwrap()
        .then((productData) => {
          const product = productData.data;
          updateItem(itemKey, "packUnit", product.packUnit);
          updateItem(itemKey, "mainUnit", product.mainUnit);
        })
        .catch(() => {
          notification.error({ message: "Lỗi: Không thể tải đơn vị sản phẩm." });
        });
    }
  };

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
          onSearch={handleProductSearch}
          onPopupScroll={handleProductPopupScroll}
          onFocus={() => {
            if (productOptions.length === 0) fetchProducts("", false);
          }}
          onChange={(v) => handleProductSelect(v, record.key)}
          disabled={userRole === "accountant" || selectedType === "out"}
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
        const displayValue = val || 0;

        return (
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            value={displayValue}
            addonAfter={
              selectedType === "out"
                ? record.mainUnit || <TagOutlined />
                : record.packUnit || <TagOutlined />
            }
            onChange={(v) => {
              console.log(`🔍 Quantity changed:`, {
                itemKey: record.key,
                newValue: v,
                type: selectedType,
                conversionRate: record.conversionRate,
              });

              if (selectedType === "in") {
                // ✅ Lưu packQty (giá trị người dùng nhập)
                updateItem(record.key, "qty", v || 0);

                // ✅ Tính mainQty từ packQty * conversionRate
                const mainQty = (v || 0) * (record.conversionRate || 1);
                updateItem(record.key, "mainQty", mainQty);

                console.log(`🔍 IN calculation:`, {
                  packQty: v || 0,
                  conversionRate: record.conversionRate || 1,
                  calculatedMainQty: mainQty,
                });
              } else {
                // ✅ selectedType === "out": Lưu mainQty trực tiếp
                updateItem(record.key, "qty", v || 0);
                updateItem(record.key, "mainQty", v || 0);

                console.log(`🔍 OUT calculation:`, {
                  mainQty: v || 0,
                });
              }
            }}
            disabled={userRole === "accountant"}
            placeholder={
              selectedType === "out" ? "Số lượng (đơn vị chính)" : "Số lượng (đơn vị gói)"
            }
          />
        );
      },
    },
    {
      title: <Tooltip title="Đơn giá theo đơn vị chính">Đơn giá (VNĐ)</Tooltip>,
      dataIndex: "unitPrice",
      width: 150,
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
    selectedType === "in"
      ? {
          title: "Hạn sử dụng",
          dataIndex: "expiryDate",
          width: 160,
          render: (val, record) => (
            <DatePicker
              value={val ? dayjs(val) : null}
              onChange={(v) => updateItem(record.key, "expiryDate", v?.toISOString())}
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabled={userRole === "accountant"}
              minDate={dayjs()}
            />
          ),
        }
      : {
          title: "Lô hàng",
          dataIndex: "lotId",
          width: 180,
          render: (val, record) => (
            <Select
              value={val}
              showSearch
              placeholder="Chọn lô hàng"
              filterOption={false}
              onSearch={(searchVal) =>
                record.productId && handleInventoryLotSearch(record.productId, searchVal)
              }
              onPopupScroll={(e) =>
                record.productId && handleInventoryLotPopupScroll(record.productId, e)
              }
              notFoundContent={
                inventoryLotsLoading[record.productId] ? (
                  <Spin size="small" />
                ) : !record.productId ? (
                  "Vui lòng chọn sản phẩm"
                ) : (
                  "Không có dữ liệu"
                )
              }
              optionLabelProp="label"
              onFocus={() => {
                if (
                  record.productId &&
                  (!inventoryLotsOptions[record.productId] ||
                    inventoryLotsOptions[record.productId].length === 0)
                ) {
                  fetchInventoryLots(record.productId, "", false);
                }
              }}
              onChange={(v, option) => {
                updateItem(record.key, "lotId", v);
                if (v && option?.raw) {
                  updateItem(record.key, "conversionRate", option.raw.conversionRate);
                } else {
                  updateItem(record.key, "conversionRate", undefined);
                }
              }}
              disabled={!record.productId || userRole === "accountant" || selectedType === "out"}
              allowClear
              style={{ width: "100%" }}
            >
              {(inventoryLotsOptions[record.productId] || []).map((opt) => (
                <Option
                  key={opt.key || `lot_option_${opt.value}`}
                  value={opt.value}
                  label={opt.label}
                  raw={opt.raw}
                >
                  <Tooltip title={opt.tooltipTitle} placement="right">
                    <div style={{ cursor: "pointer" }}>{opt.label}</div>
                  </Tooltip>
                </Option>
              ))}
            </Select>
          ),
        },
    {
      title: "Thành tiền",
      key: "total",
      width: 160,
      render: (_, record) => {
        // ✅ FIXED: Tính thành tiền dựa trên loại transaction và đơn vị
        let finalQty = record.qty || 0;
        if (selectedType === "in") {
          // ✅ Cho "in": qty là packQty, cần chuyển về mainQty để tính tiền
          finalQty = (record.qty || 0) * (record.conversionRate || 1);
        } else {
          // ✅ Cho "out": qty đã là mainQty, dùng trực tiếp
          finalQty = record.qty || 0;
        }
        const totalAmount = finalQty * (record.unitPrice || 0);
        // ✅ ADDED: Debug calculation với tooltip như modal Add
        let calculation = "";
        if (selectedType === "in" && record.conversionRate) {
          calculation = `${record.qty} ${record.packUnit || "đơn vị"} × ${record.conversionRate} × ${(record.unitPrice || 0).toLocaleString("vi-VN")} VNĐ`;
        } else if (selectedType === "out") {
          calculation = `${record.qty} ${record.mainUnit || "đơn vị"} × ${(record.unitPrice || 0).toLocaleString("vi-VN")} VNĐ`;
        } else {
          calculation = `${record.qty} × ${(record.unitPrice || 0).toLocaleString("vi-VN")} VNĐ`;
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
          disabled={userRole === "accountant"}
        />
      ),
    },
  ];

  const renderExpandableRow = (record) => (
    <RenderExpandableRowEdit
      record={record}
      selectedType={selectedType}
      userRole={userRole}
      updateItem={updateItem}
    />
  );

  return (
    <Modal
      title={
        <div className="editSupplier-titleContainer">
          <EditOutlined className="editSupplier-titleIcon" />
          <span style={{ fontSize: 18 }}>
            Chỉnh sửa giao dịch {selectedType === "in" ? "nhập" : "trả"} hàng
          </span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1150}
      centered
      maskClosable={!isUpdating}
      className="editSupplier-modal"
    >
      <Divider />

      {loading ? (
        <Spin tip="Đang tải dữ liệu..." style={{ width: "100%" }} />
      ) : (
        <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={isUpdating}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Loại giao dịch" name="type">
                <Select
                  size="large"
                  disabled
                  options={[
                    { value: "in", label: "Nhập hàng" },
                    { value: "out", label: "Trả hàng" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Nhà cung cấp" name="supplierId">
                <Select
                  placeholder="Chọn nhà cung cấp"
                  showSearch
                  size="large"
                  suffixIcon={<ShopOutlined />}
                  disabled={userRole === "accountant"}
                >
                  {suppliers.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Kho / Phòng ban" name="departmentId">
                <Select
                  placeholder="Chọn kho"
                  size="large"
                  suffixIcon={<ApartmentOutlined />}
                  disabled={userRole === "accountant"}
                  onChange={(val) => {
                    setInventoryLotsOptions({});
                    setInventoryLotsLoading({});
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
                        conversionRate: undefined,
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
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Ngày giao dịch" name="transDate">
                <DatePicker
                  format="DD/MM/YYYY"
                  size="large"
                  style={{ width: "100%" }}
                  disabled={userRole === "accountant"}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Ngày đến hạn thanh toán" name="dueDate">
                <DatePicker
                  format="DD/MM/YYYY"
                  size="large"
                  style={{ width: "100%" }}
                  disabled={userRole === "accountant"}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Ghi chú" name="note">
                <Input
                  placeholder="Ghi chú thêm..."
                  size="large"
                  disabled={userRole === "accountant"}
                />
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
            scroll={items.length > 5 ? { x: true, y: 280 } : { x: true }}
            expandable={{
              expandedRowRender: renderExpandableRow,
              expandedRowKeys: items.map((i) => i.key),
              showExpandColumn: false,
            }}
          />

          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: selectedType === "in" ? "space-between" : "flex-end",
            }}
          >
            {selectedType === "in" && (
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addItem}
                disabled={userRole === "accountant"}
              >
                Thêm sản phẩm
              </Button>
            )}
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
              <Button type="primary" htmlType="submit" loading={isUpdating}>
                {isUpdating ? "Đang cập nhật..." : "Cập nhật giao dịch"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default EditSupplierTransactionModal;
