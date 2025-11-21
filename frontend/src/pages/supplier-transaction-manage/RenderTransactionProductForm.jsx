import React, { useEffect, useRef, useState } from "react";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { findInventoryLotsInDepartmentByProduct } from "@src/services/inventoryLotService";
import { fetchProductById } from "@src/store/productSlice";
import {
  Button,
  InputNumber,
  Popconfirm,
  Select,
  Spin,
  Table,
  Tooltip,
  Typography,
  notification,
} from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;
const { Option } = Select;

const RenderTransactionProductForm = ({ selectedTransaction, onItemsChange }) => {
  const userRole = useSelector((state) => state.auth.user?.role);

  const [items, setItems] = useState([]);
  const [addProductId, setAddProductId] = useState(null);

  // ✅ Helper function để format số
  const formatNumber = (num) => {
    if (num == null) return "0";
    const rounded = Number(num);
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2).replace(/\.?0+$/, "");
  };

  // Initialize items from selected transaction
  useEffect(() => {
    if (selectedTransaction?.items) {
      const mappedItems = selectedTransaction.items.map((item, index) => ({
        key: `${item.id}_${index}`,
        productId: item.productId,
        productName: item.productName,
        skuCode: item.skuCode,
        lotId: item.lotId,
        lotNo: item.lotNo,
        expiryDate: item.expiryDate,
        originalQty: item.qty,
        originalUnitPrice: item.unitPrice,
        maxQty: item.lotQtyOnHand?.inMainUnit || item.qty,
        qty: 0,
        unitPrice: item.unitPrice,
        packUnit: item.lotQtyOnHand?.packUnit,
        mainUnit: item.lotQtyOnHand?.mainUnit,
        conversionRate: item.unitConversion?.conversionRate || 1,
        selectedUnit: "main",
        mainQty: 0,
        inMainUnit: item.lotQtyOnHand?.inMainUnit || 0,
        inPackUnit: item.lotQtyOnHand?.inPackUnit || 0,
      }));
      setItems(mappedItems);
    }
  }, [selectedTransaction]);

  // Notify parent về items changes
  useEffect(() => {
    onItemsChange?.(items);
  }, [items, onItemsChange]);
  // Danh sách sản phẩm chưa được chọn
  const availableProducts = (selectedTransaction?.items || []).filter(
    (item) => !items.some((i) => i.productId === item.productId && i.lotId === item.lotId)
  );
  // Thêm sản phẩm vào bảng
  const handleAddProduct = (productId) => {
    const item = (selectedTransaction?.items || []).find(
      (i) =>
        i.productId === productId &&
        !items.some((it) => it.productId === i.productId && it.lotId === i.lotId)
    );
    if (!item) return;
    setItems((prev) => [
      ...prev,
      {
        key: `${item.id}_${prev.length}`,
        productId: item.productId,
        productName: item.productName,
        skuCode: item.skuCode,
        lotId: item.lotId,
        lotNo: item.lotNo,
        expiryDate: item.expiryDate,
        originalQty: item.qty,
        originalUnitPrice: item.unitPrice,
        maxQty: item.lotQtyOnHand?.inMainUnit || item.qty,
        qty: 0,
        unitPrice: item.unitPrice,
        packUnit: item.lotQtyOnHand?.packUnit,
        mainUnit: item.lotQtyOnHand?.mainUnit,
        conversionRate: item.unitConversion?.conversionRate || 1,
        selectedUnit: "main",
        mainQty: 0,
        inMainUnit: item.lotQtyOnHand?.inMainUnit || 0,
        inPackUnit: item.lotQtyOnHand?.inPackUnit || 0,
      },
    ]);
    setAddProductId(null);
  };
  const updateItem = (key, field, value) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  };
  const removeItem = (key) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
    notification.success({
      message: "Đã xóa sản phẩm",
      duration: 2,
    });
  };
  const renderExplanable = (record) => {
    if (record.selectedUnit === "pack" && record.qty > 0) {
      return (
        <div
          style={{
            background: "#fffbe6",
            border: "1px solid #ffe58f",
            borderRadius: 4,
            padding: "8px 12px",
            marginTop: 12,
            color: "#ad8b00",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text strong style={{ color: "#ad8b00" }}>
            ⚠️ Lưu ý:
          </Text>
          <span>
            <Text strong style={{ color: "#d48806" }}>
              {formatNumber(record.qty)} {record.packUnit}
            </Text>{" "}
            sẽ được ghi nhận thành
            <Text strong style={{ color: "#389e0d", marginLeft: 4 }}>
              {formatNumber(record.qty * record.conversionRate)} {record.mainUnit}
            </Text>
          </span>
        </div>
      );
    }
    return null;
  };
  const columns = [
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      width: 230,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.skuCode}
          </Text>
        </div>
      ),
    },
    {
      title: "Số lượng trả",
      dataIndex: "qty",
      width: 180,
      render: (val, record) => {
        const unitOptions = [];
        if (record.packUnit && record.mainUnit) {
          unitOptions.push({ value: "pack", label: record.packUnit });
          unitOptions.push({ value: "main", label: record.mainUnit });
        }

        const handleUnitChange = (unitType) => {
          updateItem(record.key, "selectedUnit", unitType);

          if (unitType === "pack") {
            updateItem(record.key, "selectedUnit", "pack");
            updateItem(record.key, "maxQty", record.inPackUnit);
            updateItem(record.key, "qty", 0); // Reset qty khi đổi đơn vị
            updateItem(record.key, "mainQty", 0);
          } else if (unitType === "main") {
            updateItem(record.key, "selectedUnit", "main");
            updateItem(record.key, "maxQty", record.inMainUnit);
            updateItem(record.key, "qty", 0); // Reset qty khi đổi đơn vị
            updateItem(record.key, "mainQty", 0);
          }
        };

        return (
          <div>
            <InputNumber
              min={0}
              max={record.maxQty}
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
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tối đa: {record.maxQty}
            </Text>
          </div>
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
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
          />
        </Tooltip>
      ),
    },
    {
      title: "Lô hàng",
      dataIndex: "lotNo",
      width: 200,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            HSD: {record.expiryDate ? dayjs(record.expiryDate).format("DD/MM/YYYY") : "N/A"}
          </Text>
        </div>
      ),
    },
    {
      title: "Thành tiền",
      key: "total",
      render: (_, record) => {
        let finalQty = record.qty || 0;
        if (record.selectedUnit === "pack" && record.conversionRate) {
          finalQty = (record.qty || 0) * (record.conversionRate || 1);
        } else {
          finalQty = record.qty || 0;
        }
        const totalAmount = finalQty * (record.unitPrice || 0);

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
      fixed: "right",
      render: (_, record) => (
        <Popconfirm
          title="Xóa sản phẩm này?"
          description="Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách trả hàng?"
          onConfirm={() => removeItem(record.key)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} title="Xóa sản phẩm" />
        </Popconfirm>
      ),
    },
  ];

  // const calculateTotalAmount = () =>
  //   items.reduce((sum, item) => sum + (item.qty || 0) * (item.unitPrice || 0), 0);
  const calculateTotalAmount = () => {
    return items.reduce((sum, item) => {
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
  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          rowGap: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ minWidth: 120, flex: "0 0 auto" }}>Thêm sản phẩm:</Text>
        <div style={{ flex: "1 1 240px", minWidth: 200, maxWidth: 320 }}>
          <Select
            showSearch
            placeholder="Chọn sản phẩm để thêm"
            value={addProductId}
            style={{ width: "100%" }}
            onChange={handleAddProduct}
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
            }
            disabled={availableProducts.length === 0}
          >
            {availableProducts.map((item) => (
              <Option key={item.productId + "_" + item.lotId} value={item.productId}>
                {item.productName} ({item.skuCode}) - Lô: {item.lotNo}
              </Option>
            ))}
          </Select>
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={items}
        pagination={false}
        size="small"
        bordered
        scroll={items.length > 2 ? { x: 800 } : { x: 800 }}
        rowKey="key"
        expandable={{
          expandedRowRender: renderExplanable,
          expandedRowKeys: items.map((i) => i.key),
          showExpandColumn: false,
        }}
      />

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <Text strong style={{ fontSize: 16 }}>
          Tổng cộng:{" "}
          {calculateTotalAmount().toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          })}
        </Text>
      </div>
    </div>
  );
};

export default RenderTransactionProductForm;
