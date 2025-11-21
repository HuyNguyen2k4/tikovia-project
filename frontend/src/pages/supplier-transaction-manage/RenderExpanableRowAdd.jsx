import React from "react";

import { InputNumber, Select, Spin, Typography } from "antd";

const { Text } = Typography;
const { Option } = Select;

const RenderExpandableRowAdd = ({ record, productDetails, productDetailsLoading, updateItem }) => {
  // Get product details for this record
  const currentProductDetails = productDetails[record.productId];
  const isLoadingProductDetails = productDetailsLoading[record.key];

  // ✅ Helper function để format số
  const formatNumber = (num) => {
    if (num == null) return "0";
    const rounded = Number(num);
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(3).replace(/\.?0+$/, "");
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "#fafafa",
        borderRadius: 8,
        border: "1px solid #f0f0f0",
      }}
    >
      {isLoadingProductDetails && (
        <div style={{ marginBottom: 8 }}>
          <Spin size="small" /> Đang tải thông tin sản phẩm...
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Text strong>Thiết lập:</Text>
        <span>1</span>

        {/* Pack Unit */}
        <Select
          value={record.packUnit ? [record.packUnit] : []}
          style={{ width: 140 }}
          placeholder="Đóng gói"
          size="middle"
          disabled
        />

        <span>=</span>

        {/* Conversion Rate */}
        <InputNumber
          min={0.001}
          step={0.001}
          placeholder="1"
          value={record.conversionRate}
          onChange={(v) => updateItem(record.key, "conversionRate", v)}
          style={{ width: 80 }}
          size="middle"
          formatter={(value) => (value ? formatNumber(value) : "")} // ✅ Sử dụng formatNumber đã có
          parser={(value) => parseFloat(value) || 0}
        />

        {/* Main Unit */}
        <Select
          value={record.mainUnit ? [record.mainUnit] : []}
          style={{ width: 140 }}
          placeholder="Đơn vị bán"
          size="middle"
          disabled
        />
      </div>

      {/* ✅ FIXED: Hiển thị preview calculation với format số đẹp */}
      {record.qty > 0 &&
        record.packUnit &&
        record.mainUnit &&
        record.conversionRate &&
        record.selectedUnit === "pack" && (
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
        )}
    </div>
  );
};

export default RenderExpandableRowAdd;
