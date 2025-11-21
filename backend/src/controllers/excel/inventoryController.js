const asyncHandler = require('express-async-handler');
const dayjs = require('dayjs');
const InventoryRepository = require('@src/models/excel/InventoryRepository');
const {
    buildInventoryWorkbook,
    workbookToBuffer,
} = require('@src/utils/excel/inventoryWorkbookBuilder');

const validateUuid = (value) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const exportInventoryExcel = asyncHandler(async (req, res) => {
    const { productIds, departmentId } = req.body || {};

    // ✅ UPDATED: Cho phép productIds rỗng hoặc undefined
    const isProductIdsValid =
        !productIds || (Array.isArray(productIds) && productIds.every((id) => validateUuid(id)));

    if (!isProductIdsValid) {
        return res.status(400).json({
            message: 'productIds phải là mảng các UUID hợp lệ hoặc không truyền',
        });
    }

    // ✅ Validate departmentId if provided
    if (departmentId && !validateUuid(departmentId)) {
        return res.status(400).json({ message: 'departmentId không hợp lệ' });
    }

    // ✅ UPDATED: Truyền productIds có thể null/undefined
    const { products, lots, departmentName } = await InventoryRepository.fetchInventoryForExport({
        productIds: productIds && productIds.length > 0 ? productIds : null,
        departmentId,
    });

    // ✅ UPDATED: Thông báo phù hợp với từng case
    if (!products.length) {
        const scope = departmentId ? `trong kho ${departmentName || 'đã chọn'}` : 'trong hệ thống';
        return res.status(404).json({
            message: `Không tìm thấy sản phẩm ${scope}`,
        });
    }

    // ✅ Build workbook with departmentName
    const workbook = buildInventoryWorkbook({ products, lots, departmentName });
    const buffer = await workbookToBuffer(workbook);

    // ✅ UPDATED: Enhanced filename logic
    let filename = 'inventory';

    // Add department suffix if filtered by department
    if (departmentName) {
        const cleanDeptName = departmentName.replace(/[^a-zA-Z0-9]/g, '');
        filename += `_${cleanDeptName}`;
    }

    // Add scope indicator
    if (!productIds || productIds.length === 0) {
        filename += '_full'; // Full export
    } else {
        filename += '_partial'; // Partial export
    }

    filename += `_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${filename}`,
        // Cho phép FE truy cập header Content-Disposition
        'Access-Control-Expose-Headers': 'Content-Disposition',
    });

    return res.send(buffer);
});

module.exports = {
    exportInventoryExcel,
};
