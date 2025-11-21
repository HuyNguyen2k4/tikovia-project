import React from "react";

import { Input, InputNumber, Typography } from "antd";

const { Text } = Typography;

const RenderExpandableRowEdit = ({ record, selectedType, userRole, updateItem }) => {
  // ✅ Helper function để format số
  const formatNumber = (num) => {
    if (num == null) return "0";
    const rounded = Number(num);
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2).replace(/\.?0+$/, "");
  };

  // ✅ FIXED: Logic tính toán theo API response
  const packQty =
    selectedType === "in"
      ? record.qty || 0 // ✅ qty đã là packQty cho "in"
      : (record.qty || 0) / (record.conversionRate || 1); // ✅ Chuyển từ mainQty về packQty cho "out"

  const calculatedMainQty =
    selectedType === "in"
      ? record.mainQty || 0 // ✅ Sử dụng mainQty đã tính
      : record.qty || 0; // ✅ qty chính là mainQty cho "out"

  return (
    <div style={{ padding: "8px 16px", backgroundColor: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Text strong>Thiết lập quy đổi:</Text>
        <span>1</span>
        <Input
          value={record.packUnit}
          style={{ width: 140 }}
          placeholder="Đơn vị đóng gói"
          disabled
        />
        <span>=</span>
        <InputNumber
          min={0}
          placeholder="Tỷ lệ"
          value={record.conversionRate}
          onChange={(v) => {
            updateItem(record.key, "conversionRate", v);

            // ✅ FIXED: Khi thay đổi conversionRate
            if (selectedType === "in") {
              const newMainQty = (record.qty || 0) * (v || 1);
              updateItem(record.key, "mainQty", newMainQty);
            }
          }}
          style={{ width: 80 }}
          disabled={selectedType === "out" || userRole === "accountant"}
        />
        <Input
          value={record.mainUnit}
          style={{ width: 140 }}
          placeholder="Đơn vị bán ra"
          disabled
        />
      </div>

      {/* ✅ FIXED: Hiển thị thông báo với format số đẹp */}
      {selectedType === "in" &&
        record.qty > 0 &&
        record.packUnit &&
        record.mainUnit &&
        record.conversionRate > 0 && (
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
            <b>⚠️ Lưu ý:</b>
            <span>
              <b style={{ color: "#d48806" }}>
                {formatNumber(packQty)} {record.packUnit}
              </b>{" "}
              sẽ được ghi nhận thành
              <b style={{ color: "#389e0d", marginLeft: 4 }}>
                {formatNumber(calculatedMainQty)} {record.mainUnit}
              </b>
            </span>
          </div>
        )}

      {selectedType === "out" &&
        record.qty > 0 &&
        record.packUnit &&
        record.mainUnit &&
        record.conversionRate > 0 && (
          <div
            style={{
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: 4,
              padding: "8px 12px",
              marginTop: 12,
              color: "#389e0d",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <b>📤 Xuất kho:</b>
            <span>
              <b style={{ color: "#389e0d" }}>
                {formatNumber(record.qty || 0)} {record.mainUnit}
              </b>{" "}
              tương đương
              <b style={{ color: "#d48806", marginLeft: 4 }}>
                {formatNumber(packQty)} {record.packUnit}
              </b>
            </span>
          </div>
        )}
    </div>
  );
};

export default RenderExpandableRowEdit;
