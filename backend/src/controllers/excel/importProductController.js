const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx');
const Product = require('@src/models/Products');
const ProductCategory = require('@src/models/ProductCategories');

const STATUS_VALUES = new Set(['active', 'warning', 'disable']);
const TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'on', 'có', 'co', 'locked']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off', 'không', 'khong']);

const columnAliases = {
    sku: ['SKU', 'SKU Code', 'Mã hàng'],
    name: ['Product Name', 'Tên hàng hóa', 'Name'],
    categoryName: ['Category Name', 'Danh mục', 'Category'], // ✅ ONLY categoryName
    // ❌ REMOVED: categoryId: ['Category ID', 'ID danh mục'],
    status: ['Status', 'Trạng thái'],
    adminLocked: ['Admin Locked', 'Bị khóa'],
    lowStockThreshold: ['Low Stock Threshold', 'Ngưỡng cảnh báo hết hàng (số lượng)'],
    nearExpiryDays: ['Near Expiry Days', 'Ngưỡng cảnh báo hết hạn (ngày)'],
    packUnit: ['Pack Unit', 'Đơn vị phụ', 'Đơn vị đóng gói'],
    mainUnit: ['Main Unit', 'Đơn vị chính'],
    storageRule: ['Storage Rule', 'Ghi chú lưu trữ'],
    imgUrl: ['Image URL', 'Link ảnh sản phẩm', 'Img URL'],
};

const validateUuid = (value) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

const getCellValue = (row, keys = []) => {
    for (const key of keys) {
        if (!(key in row)) continue;
        const raw = row[key];
        if (raw === null || raw === undefined) continue;
        const normalized = typeof raw === 'string' ? raw.trim() : String(raw).trim();
        if (normalized === '') continue;
        return typeof raw === 'string' ? raw.trim() : raw;
    }
    return '';
};

const isRowEmpty = (row = {}) =>
    Object.values(row).every((value) => {
        if (value === null || value === undefined) return true;
        return String(value).trim() === '';
    });

const parseStatus = (value) => {
    if (value === null || value === undefined || value === '') {
        return 'active';
    }
    const normalized = String(value).trim().toLowerCase();
    if (!STATUS_VALUES.has(normalized)) {
        throw new Error(`Status '${value}' không hợp lệ (active | warning | disable)`);
    }
    return normalized;
};

const parseBooleanCell = (value) => {
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined || value === '') return false;
    const normalized = String(value).trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    return false;
};

const parseNumberCell = (value, fieldName, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = Number(value);
    if (Number.isNaN(num)) {
        throw new Error(`${fieldName} không hợp lệ`);
    }
    if (num < 0) {
        throw new Error(`${fieldName} phải lớn hơn hoặc bằng 0`);
    }
    return num;
};

const parseIntegerCell = (value, fieldName, defaultValue = 7) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    if (typeof value === 'number' && Number.isInteger(value)) {
        if (value < 0) throw new Error(`${fieldName} phải lớn hơn hoặc bằng 0`);
        return value;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        throw new Error(`${fieldName} không hợp lệ`);
    }
    if (parsed < 0) {
        throw new Error(`${fieldName} phải lớn hơn hoặc bằng 0`);
    }
    return parsed;
};

const isValidUrl = (value) => {
    if (!value) return false;
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

const importProductsFromExcel = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Thiếu file Excel (field: file)' });
    }

    let workbook;
    try {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    } catch (error) {
        return res.status(400).json({ message: 'Không đọc được file Excel', error: error.message });
    }

    if (!workbook.SheetNames.length) {
        return res.status(400).json({ message: 'File Excel không có sheet nào' });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const requiredFields = [
        { key: 'sku', label: 'Mã hàng' },
        { key: 'name', label: 'Tên sản phẩm' },
        { key: 'categoryName', label: 'Danh mục' },
        { key: 'packUnit', label: 'Đơn vị đóng gói' },
        { key: 'mainUnit', label: 'Đơn vị chính' },
    ];

    const sheetHeaders = Object.keys(rows[0] || {}).map((h) => h.trim().toLowerCase());

    // Kiểm tra thiếu trường nào (dựa vào alias)
    const missingFields = requiredFields.filter(
        (field) =>
            !columnAliases[field.key].some((alias) =>
                sheetHeaders.includes(alias.trim().toLowerCase())
            )
    );

    if (missingFields.length > 0) {
        return res.status(400).json({
            message: `File Excel thiếu cột bắt buộc: ${missingFields.map((f) => f.label).join(', ')}. Vui lòng tải lên đúng với mẫu!`,
        });
    }
    if (!rows.length) {
        return res.status(400).json({ message: 'Sheet đầu tiên không có dữ liệu' });
    }

    // // ✅ UPDATED: Chỉ cần categoryNameToId map
    // const categories = await ProductCategory.getAllProdCategory();
    // if (!categories.length) {
    //     return res.status(400).json({ message: 'Chưa có danh mục sản phẩm trong hệ thống' });
    // }
    // const categoryNameToId = new Map(
    //     categories.map((cat) => [cat.name.trim().toLowerCase(), cat.id])
    // );

    // ✅ UPDATED: Load categories và prepare cho auto-create
    const existingCategories = await ProductCategory.getAllProdCategory();
    const categoryNameToId = new Map(
        existingCategories.map((cat) => [cat.name.trim().toLowerCase(), cat.id])
    );

    // ✅ NEW: Track categories cần tạo mới
    const newCategoriesCreated = [];
    const categoryNamesInFile = new Set();

    // ✅ NEW: Thu thập tất cả category names từ file
    rows.forEach((row) => {
        if (isRowEmpty(row)) return;
        const rawCategoryName = getCellValue(row, columnAliases.categoryName);
        if (rawCategoryName) {
            categoryNamesInFile.add(rawCategoryName.trim());
        }
    });

    // ✅ FIXED: Tạo categories trước khi xử lý products
    for (const categoryName of categoryNamesInFile) {
        const categoryKey = categoryName.toLowerCase();
        if (!categoryNameToId.has(categoryKey)) {
            try {
                console.log(`Creating new category: ${categoryName}`);

                const newCategory = await ProductCategory.createProductCategory({
                    name: categoryName,
                });

                categoryNameToId.set(categoryKey, newCategory.id);
                newCategoriesCreated.push(categoryName);

                console.log(`✅ Created category: ${categoryName} with ID: ${newCategory.id}`);
            } catch (error) {
                console.error(`❌ Error creating category ${categoryName}:`, error);
                // ✅ IMPROVED: Add to errors instead of silent fail
                return res.status(500).json({
                    success: false,
                    message: `Lỗi tạo danh mục '${categoryName}': ${error.message}`,
                    error: error.message,
                });
            }
        }
    }

    const uniqueSkuList = [];
    const skuSeenForQuery = new Set();
    rows.forEach((row) => {
        const rawSku = getCellValue(row, columnAliases.sku);
        if (!rawSku) return;
        const normalized = String(rawSku).trim();
        if (!normalized || skuSeenForQuery.has(normalized)) return;
        skuSeenForQuery.add(normalized);
        uniqueSkuList.push(normalized);
    });

    const existingProducts = await Product.findBySkuCodes(uniqueSkuList);
    const existingMap = new Map(
        existingProducts.map((product) => [product.skuCode.trim().toLowerCase(), product])
    );

    const summary = {
        totalRows: rows.length,
        processed: 0,
        created: 0,
        updated: 0,
        categoriesCreated: newCategoriesCreated.length, // ✅ NEW: Track created categories
        newCategories: newCategoriesCreated, // ✅ NEW: List of created categories
        errors: [],
    };

    const processedSkuInFile = new Set();

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        if (isRowEmpty(row)) continue;

        summary.processed += 1;
        const rowNumber = index + 2; // +2 vì header nằm ở hàng 1

        try {
            const rawSku = getCellValue(row, columnAliases.sku);
            if (!rawSku) {
                throw new Error('Thiếu SKU (cột SKU / Mã hàng)');
            }
            const sku = String(rawSku).trim();
            const skuKey = sku.toLowerCase();

            if (processedSkuInFile.has(skuKey)) {
                throw new Error('SKU bị trùng trong file Excel');
            }
            processedSkuInFile.add(skuKey);

            const name = getCellValue(row, columnAliases.name);
            if (!name) {
                throw new Error('Thiếu tên sản phẩm (cột Product Name / Tên hàng hóa)');
            }

            // ✅ FIXED: Improved category lookup
            const rawCategoryName = getCellValue(row, columnAliases.categoryName);
            if (!rawCategoryName) {
                throw new Error('Thiếu Category Name (cột Category Name / Danh mục)');
            }

            const categoryKey = rawCategoryName.trim().toLowerCase();
            const categoryId = categoryNameToId.get(categoryKey);

            if (!categoryId) {
                // ✅ This should never happen now, but just in case
                throw new Error(`Lỗi hệ thống: Không tìm thấy categoryId cho '${rawCategoryName}'`);
            }

            const packUnit = getCellValue(row, columnAliases.packUnit);
            if (!packUnit) {
                throw new Error('Thiếu Pack Unit (Đơn vị phụ)');
            }
            const mainUnit = getCellValue(row, columnAliases.mainUnit);
            if (!mainUnit) {
                throw new Error('Thiếu Main Unit (Đơn vị chính)');
            }

            const status = parseStatus(getCellValue(row, columnAliases.status));
            const adminLocked = parseBooleanCell(getCellValue(row, columnAliases.adminLocked));
            const lowStockThreshold = parseNumberCell(
                getCellValue(row, columnAliases.lowStockThreshold),
                'Ngưỡng cảnh báo hết hàng',
                0
            );
            const nearExpiryDays = parseIntegerCell(
                getCellValue(row, columnAliases.nearExpiryDays),
                'Ngưỡng cảnh báo hết hạn',
                7
            );
            const storageRule = getCellValue(row, columnAliases.storageRule) || null;
            const imgUrlRaw = getCellValue(row, columnAliases.imgUrl);
            let imgUrl = null;
            if (imgUrlRaw) {
                if (!isValidUrl(imgUrlRaw)) {
                    throw new Error(`Image URL '${imgUrlRaw}' không hợp lệ`);
                }
                imgUrl = imgUrlRaw;
            }

            const payload = {
                skuCode: sku,
                name,
                categoryId,
                storageRule,
                status,
                adminLocked,
                lowStockThreshold,
                nearExpiryDays,
                packUnit,
                mainUnit,
                imgUrl,
            };

            const existingProduct = existingMap.get(skuKey);

            if (existingProduct) {
                // 🔄 UPDATE: Cập nhật sản phẩm đã tồn tại
                await Product.updateProduct(existingProduct.id, payload);
                summary.updated += 1;
            } else {
                // ➕ CREATE: Tạo sản phẩm mới
                await Product.createProduct(payload);
                summary.created += 1;
            }
        } catch (error) {
            summary.errors.push({
                row: rowNumber,
                sku: sku || 'N/A',
                message: error.message,
            });
        }
    }

    // ✅ IMPROVED: Enhanced message formatting
    let message = `Import hoàn tất: ${summary.created} tạo mới, ${summary.updated} cập nhật`;

    if (summary.categoriesCreated > 0) {
        message += `, ${summary.categoriesCreated} danh mục mới (${summary.newCategories.join(', ')})`;
    }

    if (summary.errors.length > 0) {
        message += `, ${summary.errors.length} lỗi`;
    }

    return res.status(200).json({
        success: summary.errors.length === 0,
        message,
        data: summary,
    });
});

module.exports = {
    importProductsFromExcel,
};
