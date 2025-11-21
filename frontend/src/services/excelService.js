import apiClient from "./apiClient";

// Export Excel file for product and inventory data
/**
 * @route   POST /api/excel/inventory/export
 * @desc    Export inventory data (products and lots) to Excel
 * @access  Private (admin, manager, accountant)
 * @body    { productIds: [uuid], departmentId?: uuid }
 */
export const exportInventoryExcel = (data) => {
  return apiClient.post("/excel/inventory/export", data, {
    responseType: "blob", // Important for file download
  });
}

// Import excel file for products
/**
 * @route   POST /api/excel/products/import
 * @desc    Import (create/update) products via Excel file
 * @access  Private (admin, manager)
 * @body    multipart/form-data với field "file"
 */
export const importProductExcel = (formData) => {
  return apiClient.post("/excel/products/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "json",
  });
}