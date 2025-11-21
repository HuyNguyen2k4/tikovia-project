import React from "react";

import { ExportOutlined } from "@ant-design/icons";
import { exportInventoryExcel } from "@src/services/excelService";
import { Button, notification } from "antd";

/**
 * @param {Array} selectedRows - Danh sách các lot đã chọn (object, phải có productId và departmentId)
 * @param {boolean} loading - Trạng thái loading
 */
const ExportInventoryExcelButton = ({ selectedRows, loading }) => {
  const handleExportExcel = async () => {
    const productIds =
      selectedRows && selectedRows.length > 0
        ? selectedRows.map((item) => item.productId)
        : undefined;
    // const productIds = selectedRows.map((item) => item.productId);

    // Lấy departmentId đầu tiên (hoặc sửa lại nếu muốn chọn nhiều)
    // const departmentId = selectedRows[0]?.departmentId;

    try {
      //   const res = await exportInventoryExcel({ productIds, departmentId });
      const res = await exportInventoryExcel({ productIds });
      const disposition = res.headers["content-disposition"] || res.headers["Content-Disposition"];
      let filename = "inventory_export.xlsx";
      if (disposition && disposition.includes("filename=")) {
        filename = decodeURIComponent(disposition.split("filename=")[1].replace(/"/g, ""));
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notification.success({ message: "Xuất file Excel thành công!" });
    } catch (err) {
      notification.error({
        message: "Xuất file Excel thất bại",
        description: err?.message || "Đã xảy ra lỗi khi xuất file.",
      });
    }
  };

  return (
    <Button icon={<ExportOutlined />} size="middle" disabled={loading} onClick={handleExportExcel}>
      Xuất file
    </Button>
  );
};

export default ExportInventoryExcelButton;
