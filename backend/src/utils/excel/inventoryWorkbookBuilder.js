// ========================================
// 📦 inventoryWorkbookBuilder.js
// Tạo file Excel báo cáo tồn kho & lô hàng
// (Sử dụng thư viện ExcelJS và dayjs)
// ========================================

const ExcelJS = require('exceljs');
const dayjs = require('dayjs');

// ----------------------
// 🔧 Utility functions
// ----------------------

/** Định dạng ngày theo chuẩn dd/MM/yyyy */
const formatDate = (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '');

/** Tính số ngày còn lại đến ngày hết hạn (so với hôm nay) */
const calcDaysToExpiry = (value) =>
    value ? dayjs(value).startOf('day').diff(dayjs().startOf('day'), 'day') : '';

/** Ép kiểu giá trị về số, trả về chuỗi rỗng nếu null/undefined */
const toNumber = (value) =>
    value === null || value === undefined || value === '' ? '' : Number(value);

// ----------------------
// 🎨 Excel Style helpers
// ----------------------

/** Border mảnh 4 phía cho toàn bộ cell */
const BORDER_THIN = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
};

/**
 * Áp border và căn giữa cho từng cell trong row
 * @param {Row} row - ExcelJS Row object
 * @param {boolean} skip - nếu true thì bỏ qua (dùng cho hàng tổng)
 */
const setTableBorder = (row, skip = false) => {
    if (skip) return;
    row.eachCell((cell) => {
        cell.border = BORDER_THIN;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
};

/**
 * Áp định dạng số cho cell
 * - Số nguyên: 0
 * - Số thập phân: #,##0.###
 */
const applyNumericFormat = (cell) => {
    if (!cell) return;
    const v = cell.value;
    if (v === null || v === undefined || v === '') return;
    const num = Number(v);
    if (Number.isNaN(num)) return;
    cell.numFmt = Number.isInteger(num) ? '0' : '#,##0.###';
};

/**
 * Kiểm tra sản phẩm có nằm dưới ngưỡng cảnh báo hết hàng không
 * @returns {boolean} true nếu lượng tồn khả dụng ≤ ngưỡng cảnh báo
 */
const isLowStock = (product) => {
    const totalQty = Number(product?.total_qty ?? 0);
    const expiredQty = Number(product?.expired_qty ?? 0);
    const lowStockThreshold = Number(product?.low_stock_threshold ?? 0);
    const availableQty = totalQty - expiredQty;
    return availableQty <= lowStockThreshold;
};

// =======================================================
// 🧾 Sheet 1: Báo cáo sản phẩm tồn kho
// =======================================================
const addProductSheet = (workbook, products = [], departmentName = null) => {
    // ✅ Tạo sheet mới "Sản Phẩm"
    const sheet = workbook.addWorksheet('Sản Phẩm', {
        views: [{ showGridLines: false }],
        properties: { defaultRowHeight: 20 },
    });

    // ---- Tổng hợp số liệu
    const totalQuantity = products.reduce(
        (sum, p) => sum + (Number.isNaN(+p.total_qty) ? 0 : +p.total_qty),
        0
    );
    const totalExpired = products.reduce(
        (sum, p) => sum + (Number.isNaN(+p.expired_qty) ? 0 : +p.expired_qty),
        0
    );

    // ---- Tiêu đề chính
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = departmentName
        ? `BÁO CÁO SẢN PHẨM TỒN KHO CHO ${departmentName}`
        : 'BÁO CÁO SẢN PHẨM TỒN KHO';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFc00000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // ---- Ngày tạo báo cáo
    sheet.mergeCells('A2:J2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Ngày báo cáo: ${dayjs().format('DD/MM/YYYY HH:mm')}`;
    dateCell.font = { italic: true };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // ---- Header 2 dòng
    const headerRow1 = sheet.addRow([
        'Mã hàng',
        'Tên hàng hóa',
        'Tồn kho hiện tại',
        '',
        'Bị khóa',
        'Số lượng hết hạn',
        'Ngưỡng cảnh báo hết hàng',
        'Ngưỡng cảnh báo hết hạn',
        'Đơn vị phụ',
        'Ghi chú lưu trữ',
    ]);
    const headerRow2 = sheet.addRow(['', '', 'Số lượng', 'Đơn vị', '', '', '', '', '', '']);
    const headerRowIndex = headerRow2.number;

    // ---- Styling cho header
    [headerRow1, headerRow2].forEach((row) => {
        row.height = 30;
        row.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF7941D' }, // Cam đậm
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.border = BORDER_THIN;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
    });

    // ---- Merge header
    sheet.mergeCells('A3:A4');
    sheet.mergeCells('B3:B4');
    sheet.mergeCells('C3:D3');
    ['E', 'F', 'G', 'H', 'I', 'J'].forEach((col) => sheet.mergeCells(`${col}3:${col}4`));

    const dataStartRow = headerRowIndex + 1;

    // ---- Dòng dữ liệu sản phẩm
    products.forEach((p) => {
        const row = sheet.addRow([
            p.sku_code,
            p.name,
            toNumber(p.total_qty),
            p.main_unit,
            p.admin_locked ? 'Có' : 'Không',
            toNumber(p.expired_qty),
            toNumber(p.low_stock_threshold),
            p.near_expiry_days,
            p.pack_unit,
            p.storage_rule || '',
        ]);

        // 🔶 Tô vàng nếu tồn kho thấp
        if (isLowStock(p)) {
            row.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFF00' },
                };
            });
        }

        // Border + căn lề
        setTableBorder(row);
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(10).alignment = { horizontal: 'left', vertical: 'middle' };

        // Format số
        [3, 6, 7].forEach((i) => applyNumericFormat(row.getCell(i)));
    });

    // ---- AutoFilter + separator
    if (products.length > 0) {
        const lastDataRow = dataStartRow + products.length - 1;
        sheet.autoFilter = {
            from: { row: headerRowIndex, column: 1 },
            to: { row: lastDataRow, column: 10 },
        };

        const separatorRow = sheet.addRow(['', '', '', '', '', '', '', '', '', '']);
        separatorRow.height = 8;
        separatorRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF878787' } };
        });
    }

    // ---- Hàng tổng cộng
    const totalRow = sheet.addRow([
        '',
        'Tổng cộng:',
        totalQuantity,
        '',
        '',
        totalExpired,
        '',
        '',
        '',
        '',
    ]);
    [3, 6].forEach((i) => applyNumericFormat(totalRow.getCell(i)));
    totalRow.font = { bold: true };

    totalRow.eachCell((cell, col) => {
        if ([2, 3, 6].includes(col)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } }; // xanh lá nhạt
        }
    });

    totalRow.getCell(2).alignment = { horizontal: 'right' };
    totalRow.getCell(3).alignment = totalRow.getCell(6).alignment = { horizontal: 'center' };

    // ---- Phần ký tên
    sheet.addRow([]);
    const signerRow = sheet.addRow([
        '',
        '',
        '',
        '',
        '',
        'Người lập',
        '',
        '',
        'Người phê duyệt',
        '',
    ]);
    const signerRow2 = sheet.addRow([
        '',
        '',
        '',
        '',
        '',
        '(Ký, họ tên)',
        '',
        '',
        '(Ký, họ tên)',
        '',
    ]);
    [signerRow, signerRow2].forEach((r) => {
        r.getCell(6).alignment = r.getCell(9).alignment = { horizontal: 'center' };
    });

    // ---- Chiều rộng cột
    const columnWidths = {
        A: 9.11,
        B: 27.67,
        C: 18,
        D: 10,
        E: 8.45,
        F: 18,
        G: 18.89,
        H: 18.56,
        I: 16.22,
        J: 26.11,
    };
    Object.entries(columnWidths).forEach(([c, w]) => (sheet.getColumn(c).width = w));

    return sheet;
};

// =======================================================
// 🧾 Sheet 2: Báo cáo chi tiết lô hàng
// =======================================================
const addLotSheet = (workbook, lots = []) => {
    const sheet = workbook.addWorksheet('Lô Hàng', {
        views: [{ showGridLines: false }],
        properties: { defaultRowHeight: 20 },
    });

    const totalQtyOnHand = lots.reduce(
        (sum, l) => sum + (Number.isNaN(+l.qty_on_hand) ? 0 : +l.qty_on_hand),
        0
    );

    // ---- Tiêu đề
    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = 'BÁO CÁO CHI TIẾT CÁC LÔ HÀNG';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFc00000' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:H2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Ngày báo cáo: ${dayjs().format('DD/MM/YYYY HH:mm')}`;
    dateCell.font = { italic: true };
    dateCell.alignment = { horizontal: 'center' };

    // ---- Header
    const headerRow = sheet.addRow([
        'Mã lô',
        'Mã sản phẩm',
        'Tên sản phẩm',
        'Kho',
        'Ngày hết hạn',
        'Số lượng tồn',
        'Tỷ lệ chuyển đổi',
        'Số ngày đến hạn',
    ]);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7941D' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = BORDER_THIN;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    const headerRowIndex = headerRow.number;
    const dataStartRow = headerRowIndex + 1;

    // ---- Dòng dữ liệu từng lô hàng
    lots.forEach((lot) => {
        const row = sheet.addRow([
            lot.lot_no,
            lot.sku_code,
            lot.product_name,
            lot.department_name || 'N/A',
            formatDate(lot.expiry_date),
            toNumber(lot.qty_on_hand),
            toNumber(lot.conversion_rate),
            calcDaysToExpiry(lot.expiry_date),
        ]);

        setTableBorder(row);
        row.getCell(3).alignment = row.getCell(4).alignment = { horizontal: 'left' };

        applyNumericFormat(row.getCell(6));
        applyNumericFormat(row.getCell(7));

        const daysToExpiry = calcDaysToExpiry(lot.expiry_date);

        // 🔴 Hết hạn
        if (daysToExpiry !== '' && daysToExpiry <= 0) {
            row.eachCell(
                (c) =>
                    (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFec5353' } })
            );
        }
        // 🟡 Gần hết hạn
        else if (daysToExpiry !== '' && daysToExpiry <= 30) {
            row.eachCell(
                (c) =>
                    (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } })
            );
        }
    });

    // ---- Filter, separator, tổng cộng
    if (lots.length > 0) {
        const lastDataRow = dataStartRow + lots.length - 1;
        sheet.autoFilter = {
            from: { row: headerRowIndex, column: 1 },
            to: { row: lastDataRow, column: 8 },
        };

        const separatorRow = sheet.addRow(Array(8).fill(''));
        separatorRow.height = 8;
        separatorRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF878787' } };
        });
    }

    const totalRow = sheet.addRow(['', '', '', '', 'Tổng cộng:', totalQtyOnHand, '', '']);
    applyNumericFormat(totalRow.getCell(6));
    totalRow.font = { bold: true };
    totalRow.eachCell((c, i) => {
        if ([5, 6].includes(i))
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
    });
    totalRow.getCell(5).alignment = { horizontal: 'right' };
    totalRow.getCell(6).alignment = { horizontal: 'center' };

    // ---- Phần ký tên
    sheet.addRow([]);
    const signerRow = sheet.addRow(['', '', 'Người lập', '', '', 'Người phê duyệt', '', '']);
    const signerRow2 = sheet.addRow(['', '', '(Ký, họ tên)', '', '', '(Ký, họ tên)', '', '']);
    [signerRow, signerRow2].forEach((r) => {
        r.getCell(3).alignment = r.getCell(6).alignment = { horizontal: 'center' };
    });

    // ---- Chiều rộng cột
    const columnWidths = { A: 15, B: 12, C: 30, D: 15, E: 12, F: 15, G: 15, H: 15 };
    Object.entries(columnWidths).forEach(([c, w]) => (sheet.getColumn(c).width = w));

    return sheet;
};

// =======================================================
// 🏗️ Hàm chính tạo workbook
// =======================================================
const buildInventoryWorkbook = ({ products = [], lots = [], departmentName = null }) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tikovia';
    workbook.created = new Date();

    addProductSheet(workbook, products, departmentName);
    addLotSheet(workbook, lots);
    return workbook;
};

/** Xuất workbook ra buffer (dùng để gửi HTTP response) */
const workbookToBuffer = (workbook) => workbook.xlsx.writeBuffer();

module.exports = {
    buildInventoryWorkbook,
    workbookToBuffer,
};
