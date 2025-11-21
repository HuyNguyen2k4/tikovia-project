const { query, withTransaction } = require('@src/config/dbconnect');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const crypto = require('crypto');

// Cấu hình dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

/* ========== HELPER FUNCTIONS ========== */

// Helper function để format date sang Vietnam timezone
const formatToVietnamTime = (date) => {
    if (!date) return null;
    return dayjs.utc(date).tz('Asia/Ho_Chi_Minh').format();
};

// Helper function để generate doc_no tự động
// Ví dụ: 'out' -> EXP-091025-C8F23A        'in' -> IMP-091025-C8F23A
const generateDocNo = (type = 'in') => {
    const prefix = type === 'in' ? 'IMP' : 'EXP';
    const today = dayjs().format('DDMMYY');

    // Giảm từ 4 bytes xuống 3 bytes để có 6 ký tự hex
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();

    return `${prefix}-${today}-${randomSuffix}`;
};

// Helper function để generate lot_no tự động
// Ví dụ: LOT-091025-C8F23A
const generateLotNo = () => {
    const prefix = 'LOT';
    const today = dayjs().format('DDMMYY');

    // Giảm từ 4 bytes xuống 3 bytes để có 6 ký tự hex
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();

    return `${prefix}-${today}-${randomSuffix}`;
};

// ✅ FIXED: Helper function để tìm lot phù hợp cho xuất kho (FEFO) - không dùng created_at
const findAvailableLotsForOut = async (productId, departmentId, requiredQty) => {
    const sql = `
        SELECT id, lot_no, expiry_date, qty_on_hand
        FROM inventory_lots
        WHERE product_id = $1 AND department_id = $2 AND qty_on_hand > 0
        ORDER BY expiry_date ASC, lot_no ASC
    `;
    const { rows } = await query(sql, [productId, departmentId]);

    const selectedLots = [];
    let remainingQty = requiredQty;

    for (const lot of rows) {
        if (remainingQty <= 0) break;

        const lotQty = parseFloat(lot.qty_on_hand);
        const useQty = Math.min(lotQty, remainingQty);

        selectedLots.push({
            lotId: lot.id,
            lotNo: lot.lot_no,
            expiryDate: lot.expiry_date,
            availableQty: lotQty,
            useQty: useQty,
        });

        remainingQty -= useQty;
    }

    if (remainingQty > 0) {
        throw new Error(
            `Không đủ tồn kho. Cần ${requiredQty}, chỉ có ${requiredQty - remainingQty} trong kho`
        );
    }

    return selectedLots;
};

// ✅ Helper function để tìm hoặc tạo lot cho nhập kho với logic lotId
const findOrCreateLotForIn = async (
    client,
    productId,
    departmentId,
    expiryDate,
    qty,
    lotId = null,
    conversionInfo = null
) => {
    const parsedExpiryDate = dayjs(expiryDate).utc().toDate();
    const conversionRate = conversionInfo?.conversionRate || 1;

    // ✅ FIXED: Validation input parameters
    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty)) {
        throw new Error(`Invalid qty value: ${qty}`);
    }

    const parsedConversionRate = parseFloat(conversionRate);
    if (isNaN(parsedConversionRate) || parsedConversionRate <= 0) {
        throw new Error(`Invalid conversionRate value: ${conversionRate}`);
    }

    if (lotId) {
        // ✅ TRƯỜNG HỢP 1: CÓ TRUYỀN VÀO lotId - Kiểm tra và cập nhật lot hiện có

        const checkLotSql = `
            SELECT 
                id, 
                lot_no, 
                COALESCE(qty_on_hand, 0) as qty_on_hand, 
                product_id, 
                department_id, 
                expiry_date, 
                COALESCE(conversion_rate, 1) as conversion_rate
            FROM inventory_lots
            WHERE id = $1
        `;
        const { rows: existingLots } = await client.query(checkLotSql, [lotId]);

        if (existingLots.length === 0) {
            throw new Error(`Không tìm thấy lot với ID: ${lotId}`);
        }

        const existingLot = existingLots[0];

        // Kiểm tra các thông tin khớp nhau
        if (existingLot.product_id !== productId) {
            throw new Error(
                `Lot ${existingLot.lot_no} thuộc về product khác. Expected: ${productId}, Found: ${existingLot.product_id}`
            );
        }

        if (existingLot.department_id !== departmentId) {
            throw new Error(
                `Lot ${existingLot.lot_no} thuộc về department khác. Expected: ${departmentId}, Found: ${existingLot.department_id}`
            );
        }

        // Kiểm tra expiry_date (chính xác đến ngày)
        const existingExpiryDate = dayjs(existingLot.expiry_date).format('YYYY-MM-DD');
        const providedExpiryDate = dayjs(parsedExpiryDate).format('YYYY-MM-DD');

        if (existingExpiryDate !== providedExpiryDate) {
            throw new Error(
                `Lot ${existingLot.lot_no} có expiry_date khác. Expected: ${providedExpiryDate}, Found: ${existingExpiryDate}`
            );
        }

        // ✅ FIXED: Parse existing qty_on_hand với safety check
        let currentQty = parseFloat(existingLot.qty_on_hand);
        if (isNaN(currentQty)) {
            console.warn(
                `⚠️ Lot ${existingLot.lot_no} has invalid qty_on_hand: ${existingLot.qty_on_hand}, setting to 0`
            );
            currentQty = 0;
        }

        // Tất cả thông tin đều khớp - Cập nhật số lượng và conversion_rate
        const newQty = currentQty + parsedQty;

        await client.query(
            `UPDATE inventory_lots SET qty_on_hand = $1, conversion_rate = $2 WHERE id = $3`,
            [newQty, parsedConversionRate, lotId]
        );

        return {
            lotId: existingLot.id,
            lotNo: existingLot.lot_no,
            isNew: false,
            finalQty: newQty,
            operation: 'updated_existing_lot',
        };
    } else {
        // ✅ TRƯỜNG HỢP 2: KHÔNG TRUYỀN lotId - Tìm lot hiện có hoặc tạo mới

        const findSql = `
            SELECT 
                id, 
                lot_no, 
                COALESCE(qty_on_hand, 0) as qty_on_hand, 
                COALESCE(conversion_rate, 1) as conversion_rate
            FROM inventory_lots
            WHERE product_id = $1 AND department_id = $2 
            AND DATE(expiry_date) = DATE($3)
            ORDER BY lot_no DESC
            LIMIT 1
        `;
        const { rows: existingLots } = await client.query(findSql, [
            productId,
            departmentId,
            parsedExpiryDate,
        ]);

        if (existingLots.length > 0) {
            // Cập nhật lot hiện có
            const existingLot = existingLots[0];

            // ✅ FIXED: Parse với safety check
            let currentQty = parseFloat(existingLot.qty_on_hand);
            if (isNaN(currentQty)) {
                console.warn(
                    `⚠️ Found lot ${existingLot.lot_no} has invalid qty_on_hand: ${existingLot.qty_on_hand}, setting to 0`
                );
                currentQty = 0;
            }

            const newQty = currentQty + parsedQty;

            await client.query(
                `UPDATE inventory_lots SET qty_on_hand = $1, conversion_rate = $2 WHERE id = $3`,
                [newQty, parsedConversionRate, existingLot.id]
            );

            return {
                lotId: existingLot.id,
                lotNo: existingLot.lot_no,
                isNew: false,
                finalQty: newQty,
                operation: 'updated_found_lot',
            };
        } else {
            // Tạo lot mới
            const lotNo = await generateLotNo();
            const createSql = `
                INSERT INTO inventory_lots (
                    lot_no, product_id, department_id, expiry_date, qty_on_hand, conversion_rate
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `;
            const { rows: newLotRows } = await client.query(createSql, [
                lotNo,
                productId,
                departmentId,
                parsedExpiryDate,
                parsedQty,
                parsedConversionRate,
            ]);

            return {
                lotId: newLotRows[0].id,
                lotNo: lotNo,
                isNew: true,
                finalQty: parsedQty,
                operation: 'created_new_lot',
            };
        }
    }
};

/* ========== MAPPER FUNCTIONS ========== */

function toSupplierTransaction(row) {
    if (!row) return null;

    return {
        id: row.id,
        docNo: row.doc_no,
        supplierId: row.supplier_id,
        departmentId: row.department_id,
        transDate: formatToVietnamTime(row.trans_date),
        type: row.type,
        status: row.status,
        adminLocked: row.admin_locked,
        dueDate: formatToVietnamTime(row.due_date),
        totalAmount: parseFloat(row.total_amount) || 0,
        paidAmount: parseFloat(row.paid_amount) || 0,
        note: row.note,
        createdAt: formatToVietnamTime(row.created_at),
        updatedAt: formatToVietnamTime(row.updated_at),
        // Join fields
        supplierName: row.supplier_name || null,
        supplierCode: row.supplier_code || null,
        departmentName: row.department_name || null,
        departmentCode: row.department_code || null,
    };
}

// Hàm helper để map một dòng item thô từ DB thành object item hoàn chỉnh
function toSupplierTransactionItem(row) {
    if (!row) return null;

    const qty = parseFloat(row.qty) || 0;
    const unitPrice = parseFloat(row.unit_price) || 0;
    const conversionRate = parseFloat(row.conversion_rate) || 1; // ✅ Lấy từ inventory_lots
    const currentLotQtyInMain = parseFloat(row.current_lot_qty) || 0;

    // ✅ Logic mới để xử lý tồn kho với conversion_rate từ inventory_lots
    let lotQtyOnHand;

    // Nếu có conversion_rate > 1 (có quy đổi)
    if (conversionRate > 1) {
        lotQtyOnHand = {
            inMainUnit: currentLotQtyInMain,
            inPackUnit: Math.round((currentLotQtyInMain / conversionRate) * 1000) / 1000,
            mainUnit: row.main_unit || 'đơn vị',
            packUnit: row.pack_unit || 'đơn vị',
        };
    } else {
        // Nếu không có quy đổi, main_unit và pack_unit là một
        lotQtyOnHand = {
            inMainUnit: currentLotQtyInMain,
            inPackUnit: currentLotQtyInMain,
            mainUnit: row.main_unit || 'đơn vị',
            packUnit: row.pack_unit || 'đơn vị',
        };
    }

    return {
        id: row.id,
        transId: row.trans_id,
        productId: row.product_id,
        lotId: row.lot_id,
        qty: qty,
        unitPrice: unitPrice,
        lineTotal: Math.round(qty * unitPrice * 1000) / 1000,
        // Dữ liệu join từ các bảng khác
        skuCode: row.sku_code || null,
        productName: row.product_name || null,
        lotNo: row.lot_no || null,
        expiryDate: row.expiry_date,
        currentLotQty: currentLotQtyInMain,
        lotQtyOnHand: lotQtyOnHand,
        // ✅ Cập nhật: Lấy conversion info từ inventory_lots và products
        unitConversion:
            conversionRate > 1
                ? {
                      packUnit: row.pack_unit,
                      mainUnit: row.main_unit,
                      conversionRate: conversionRate,
                      // ✅ FIXED: Hiển thị số lượng transaction theo pack unit
                      convertedQty: Math.round((qty / conversionRate) * 1000) / 1000,
                      // ✅ OPTIONAL: Thêm thông tin chi tiết
                      transactionQtyInMainUnit: qty,
                  }
                : null,
    };
}

function toTransactionWithItems(transaction, itemRows = []) {
    // transaction ở đây là object đã được map từ toSupplierTransaction, không cần map lại
    if (!transaction) return null;

    const items = itemRows.map(toSupplierTransactionItem).filter(Boolean);
    const calculatedTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return {
        ...transaction,
        // Cập nhật lại totalAmount để đồng bộ với các item con nếu cần
        totalAmount: calculatedTotal,
        items,
        summary: {
            itemCount: items.length,
            calculatedTotal: calculatedTotal,
            hasUnitConversions: items.some((item) => item.unitConversion !== null),
            inventoryImpact: transaction.type === 'in' ? 'increase' : 'decrease',
        },
    };
}

/* ========== TRANSACTION OPERATIONS ========== */

/**
 * Tạo transaction với items và xử lý inventory lots theo type.
 * Toàn bộ hoạt động được bọc trong một transaction của database.
 * @param {object} payload - Dữ liệu để tạo transaction.
 * @returns {Promise<object>} - Dữ liệu transaction hoàn chỉnh sau khi tạo.
 */
async function createTransactionWithItems({
    supplierId,
    departmentId,
    transDate,
    type = 'in',
    dueDate,
    note,
    items = [],
}) {
    // Bắt đầu một transaction, nếu có lỗi, mọi thay đổi sẽ được hoàn tác (rollback).
    return await withTransaction(async (client) => {
        try {
            // ----- BƯỚC 1: TẠO GIAO DỊCH CHÍNH -----

            // Tạo một mã giao dịch duy nhất (ví dụ: IMP-101025-ABCD)
            const docNo = generateDocNo(type);

            // Chuyển đổi chuỗi ngày tháng sang định dạng timestamp mà database hiểu
            const parsedTransDate = transDate ? dayjs(transDate).utc().toDate() : new Date();
            const parsedDueDate = dueDate ? dayjs(dueDate).utc().toDate() : new Date();

            // Chèn bản ghi transaction chính vào database và lấy ra ID của nó
            const transactionSql = `
                INSERT INTO supplier_transactions (
                    doc_no, supplier_id, department_id, trans_date, type, due_date, note
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `;
            const transactionParams = [
                docNo,
                supplierId,
                departmentId,
                parsedTransDate,
                type,
                parsedDueDate,
                note,
            ];
            const { rows: transRows } = await client.query(transactionSql, transactionParams);
            const transactionId = transRows[0].id;

            // ----- BƯỚC 2: XỬ LÝ TỪNG ITEM VÀ TỒN KHO (INVENTORY) -----

            let totalAmount = 0; // Khởi tạo tổng tiền

            // Lặp qua từng item được gửi lên trong request
            for (const item of items) {
                // `qty` ở đây là số lượng đã được quy đổi về đơn vị cơ bản (main_unit) từ controller
                const { productId, qty, unitPrice, expiryDate, lotId, conversionInfo } = item;
                const parsedQty = parseFloat(qty);
                const parsedUnitPrice = parseFloat(unitPrice);

                // Mảng để chứa các thao tác xử lý lô (có thể có nhiều thao tác cho 1 item khi xuất kho)
                let lotOperations = [];

                // Logic xử lý dựa trên loại giao dịch (nhập hoặc xuất)
                if (type === 'in') {
                    // --- NHẬP KHO ---
                    if (!expiryDate) {
                        throw new Error('expiryDate là bắt buộc cho transaction type "in"');
                    }
                    // ✅ UPDATED: Truyền thêm lotId (có thể null)
                    const lotResult = await findOrCreateLotForIn(
                        client,
                        productId,
                        departmentId,
                        expiryDate,
                        parsedQty,
                        lotId,
                        conversionInfo // ✅ Thêm parameter conversionInfo
                    );

                    // // Tự động tạo bản ghi quy đổi đơn vị nếu đây là một lô hàng MỚI và có thông tin quy đổi
                    // if (lotResult.isNew && conversionInfo) {
                    //     const ucSql = `
                    //         INSERT INTO unit_conversions (lot_id, pack_unit, main_unit, conversion_rate)
                    //         VALUES ($1, $2, $3, $4)
                    //         ON CONFLICT (lot_id) DO NOTHING`; // Nếu đã tồn tại thì bỏ qua, tránh lỗi
                    //     await client.query(ucSql, [
                    //         lotResult.lotId,
                    //         conversionInfo.packUnit,
                    //         conversionInfo.mainUnit,
                    //         conversionInfo.conversionRate,
                    //     ]);
                    // }
                    // Thêm kết quả xử lý lô vào mảng operations
                    lotOperations.push({
                        lotId: lotResult.lotId,
                        lotNo: lotResult.lotNo,
                        qty: parsedQty,
                        ...lotResult,
                    });
                } else if (type === 'out') {
                    // --- XUẤT KHO ---
                    if (lotId) {
                        // Trường hợp 1: Người dùng chỉ định xuất từ một lô cụ thể
                        const checkLotSql = `SELECT id, lot_no, qty_on_hand FROM inventory_lots WHERE id = $1 AND product_id = $2 AND department_id = $3`;
                        const { rows: lotRows } = await client.query(checkLotSql, [
                            lotId,
                            productId,
                            departmentId,
                        ]);
                        if (!lotRows.length)
                            throw new Error(`Không tìm thấy lot ${lotId} cho product ${productId}`);

                        const lot = lotRows[0];
                        const availableQty = parseFloat(lot.qty_on_hand);
                        if (availableQty < parsedQty) {
                            throw new Error(
                                `Lot ${lot.lot_no} chỉ có ${availableQty}, không đủ để xuất ${parsedQty}`
                            );
                        }

                        // Trừ số lượng tồn kho của lô
                        const newQty = availableQty - parsedQty;
                        await client.query(
                            `UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`,
                            [newQty, lotId]
                        );
                        lotOperations.push({
                            lotId,
                            lotNo: lot.lot_no,
                            qty: parsedQty,
                            operation: 'decreased',
                            finalQty: newQty,
                        });
                    } else {
                        // Trường hợp 2: Tự động chọn lô để xuất theo quy tắc FEFO (First-Expired, First-Out)
                        const availableLots = await findAvailableLotsForOut(
                            productId,
                            departmentId,
                            parsedQty
                        );
                        for (const lotInfo of availableLots) {
                            const newQty = lotInfo.availableQty - lotInfo.useQty;
                            await client.query(
                                `UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`,
                                [newQty, lotInfo.lotId]
                            );
                            lotOperations.push({
                                lotId: lotInfo.lotId,
                                lotNo: lotInfo.lotNo,
                                qty: lotInfo.useQty,
                                operation: 'decreased',
                                finalQty: newQty,
                            });
                        }
                    }
                }

                // ----- BƯỚC 3: TẠO BẢN GHI CHI TIẾT GIAO DỊCH (TRANSACTION ITEMS) -----

                // Với mỗi thao tác trên lô, tạo một bản ghi tương ứng trong `supplier_transaction_items`
                for (const lotOp of lotOperations) {
                    const itemSql = `
                        INSERT INTO supplier_transaction_items (trans_id, product_id, lot_id, qty, unit_price)
                        VALUES ($1, $2, $3, $4, $5)`;
                    await client.query(itemSql, [
                        transactionId,
                        productId,
                        lotOp.lotId,
                        lotOp.qty,
                        parsedUnitPrice,
                    ]);
                    // Cộng dồn vào tổng tiền
                    totalAmount += lotOp.qty * parsedUnitPrice;
                }
            }

            // ----- BƯỚC 4: CẬP NHẬT TỔNG TIỀN VÀ KẾT THÚC -----

            // Cập nhật tổng tiền cuối cùng vào bản ghi transaction chính
            await client.query(`UPDATE supplier_transactions SET total_amount = $1 WHERE id = $2`, [
                totalAmount,
                transactionId,
            ]);

            // Lấy lại toàn bộ dữ liệu transaction hoàn chỉnh (bao gồm cả items) để trả về cho client
            return await findTransactionWithItemsByIdTx(client, transactionId);
        } catch (error) {
            console.error('Error in createTransactionWithItems:', error.message);
            // Nếu có bất kỳ lỗi nào, transaction sẽ tự động được rollback
            throw error;
        }
    });
}

// /**
//  * ✅ FIXED: Hàm revert thay đổi inventory khi update/delete transaction
//  */
// async function revertInventoryChanges(client, transactionId, transactionType) {
//     const itemsSql = `
//         SELECT sti.lot_id, sti.qty, il.qty_on_hand
//         FROM supplier_transaction_items sti
//         JOIN inventory_lots il ON sti.lot_id = il.id
//         WHERE sti.trans_id = $1
//     `;
//     const { rows: items } = await client.query(itemsSql, [transactionId]);

//     for (const item of items) {
//         const itemQty = parseFloat(item.qty);
//         const currentLotQty = parseFloat(item.qty_on_hand);

//         if (transactionType === 'in') {
//             // Revert nhập kho: trừ đi số lượng đã nhập
//             const newQty = Math.max(0, currentLotQty - itemQty);

//             // ✅ FIXED: Không dùng updated_at
//             await client.query(`UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`, [
//                 newQty,
//                 item.lot_id,
//             ]);

//             // Xóa lot nếu qty = 0
//             if (newQty === 0) {
//                 await client.query(`DELETE FROM inventory_lots WHERE id = $1`, [item.lot_id]);
//             }
//         } else if (transactionType === 'out') {
//             // Revert xuất kho: cộng lại số lượng đã xuất
//             const newQty = currentLotQty + itemQty;

//             // ✅ FIXED: Không dùng updated_at
//             await client.query(`UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`, [
//                 newQty,
//                 item.lot_id,
//             ]);
//         }
//     }
// }
/**
 * ✅ FIXED: Hàm revert thay đổi inventory khi update/delete transaction
 * Handle NULL và 0 values từ database
 */
async function revertInventoryChanges(client, transactionId, transactionType, transactionStatus) {
    // ✅ NEW: Chỉ revert inventory nếu transaction đang ở trạng thái ảnh hưởng inventory
    const INVENTORY_AFFECTING_STATUSES = ['pending', 'paid'];

    if (!INVENTORY_AFFECTING_STATUSES.includes(transactionStatus)) {
        console.log(
            `⏭️ Transaction ${transactionId} có status '${transactionStatus}' - bỏ qua revert inventory`
        );
        return;
    }

    console.log(
        `🔄 Reverting inventory for transaction ${transactionId} (${transactionType}, ${transactionStatus})`
    );

    const itemsSql = `
        SELECT 
            sti.lot_id, 
            sti.qty, 
            COALESCE(il.qty_on_hand, 0) as qty_on_hand
        FROM supplier_transaction_items sti
        JOIN inventory_lots il ON sti.lot_id = il.id
        WHERE sti.trans_id = $1
    `;
    const { rows: items } = await client.query(itemsSql, [transactionId]);

    if (items.length === 0) {
        console.log(`⚠️ Không tìm thấy items cho transaction ${transactionId}`);
        return;
    }

    for (const item of items) {
        // ✅ FIXED: Parse và handle NULL/NaN values từ database
        let itemQty = parseFloat(item.qty);
        let currentLotQty = parseFloat(item.qty_on_hand);

        // ✅ FIXED: Handle NaN và set default values
        if (isNaN(itemQty)) {
            console.warn(`⚠️ Invalid itemQty for lot ${item.lot_id}: ${item.qty}, setting to 0`);
            itemQty = 0;
        }

        if (isNaN(currentLotQty)) {
            console.warn(
                `⚠️ Invalid currentLotQty for lot ${item.lot_id}: ${item.qty_on_hand}, setting to 0`
            );
            currentLotQty = 0;
        }

        // ✅ SKIP: Bỏ qua items có qty = 0 (không có gì để revert)
        if (itemQty === 0) {
            console.log(`⏭️ Skipping lot ${item.lot_id} with qty = 0`);
            continue;
        }

        console.log(
            `🔄 Processing lot ${item.lot_id}: itemQty=${itemQty}, currentLotQty=${currentLotQty}`
        );

        if (transactionType === 'in') {
            // Revert nhập kho: trừ đi số lượng đã nhập
            const newQty = Math.max(0, currentLotQty - itemQty);

            await client.query(`UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`, [
                newQty,
                item.lot_id,
            ]);

            console.log(`📦 Lot ${item.lot_id}: ${currentLotQty} - ${itemQty} = ${newQty}`);

            if (newQty === 0) {
                console.log(`⚠️ Lot ${item.lot_id} có qty = 0, sẽ được xóa sau khi items được xóa`);
            }
        } else if (transactionType === 'out') {
            // Revert xuất kho: cộng lại số lượng đã xuất
            const newQty = currentLotQty + itemQty;

            await client.query(`UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`, [
                newQty,
                item.lot_id,
            ]);
            console.log(`📦 Lot ${item.lot_id}: ${currentLotQty} + ${itemQty} = ${newQty}`);
        }
    }
    console.log(`✅ Reverted inventory changes for transaction ${transactionId}`);
}

/**
 * ✅ IMPROVED: Hàm xóa các lot có qty = 0 sau khi đã xóa transaction_items
 * Handle NULL values và add more safety checks
 */
async function cleanupEmptyLots(client, transactionId) {
    // Tìm các lot có qty = 0 hoặc NULL và không được tham chiếu bởi transaction nào khác
    const findEmptyLotsSql = `
        SELECT DISTINCT il.id, il.lot_no, COALESCE(il.qty_on_hand, 0) as qty_on_hand
        FROM inventory_lots il
        LEFT JOIN supplier_transaction_items sti ON il.id = sti.lot_id
        LEFT JOIN supplier_transactions st ON sti.trans_id = st.id 
            AND st.status IN ('pending', 'paid') 
            AND st.id != $1
        WHERE COALESCE(il.qty_on_hand, 0) = 0 
            AND st.id IS NULL  -- Không có transaction nào khác đang tham chiếu
    `;

    const { rows: emptyLots } = await client.query(findEmptyLotsSql, [transactionId]);

    for (const lot of emptyLots) {
        try {
            await client.query(`DELETE FROM inventory_lots WHERE id = $1`, [lot.id]);
            console.log(
                `🗑️ Cleaned up empty lot ${lot.lot_no} (${lot.id}) with qty=${lot.qty_on_hand}`
            );
        } catch (error) {
            console.warn(`⚠️ Could not delete lot ${lot.lot_no}: ${error.message}`);
            // Continue với lots khác thay vì stop
        }
    }

    if (emptyLots.length > 0) {
        console.log(`✅ Cleaned up ${emptyLots.length} empty lots`);
    } else {
        console.log(`ℹ️ No empty lots to clean up`);
    }
}

/**
 * Cập nhật transaction và items.
 * Logic chính là "hoàn tác và làm lại" (revert and re-apply) để đảm bảo tính đúng đắn của tồn kho.
 * @param {string} transactionId - ID của transaction cần cập nhật.
 * @param {object} updatePayload - Dữ liệu mới cần cập nhật.
 * @returns {Promise<object>} - Dữ liệu transaction hoàn chỉnh sau khi cập nhật.
 */
// async function updateTransactionWithItems(transactionId, updatePayload) {
//     return await withTransaction(async (client) => {
//         try {
//             // ----- BƯỚC 1: KIỂM TRA VÀ KHÓA BẢN GHI -----

//             // Tìm transaction hiện tại và khóa nó lại (`FOR UPDATE`) để tránh xung đột dữ liệu khi xử lý
//             const { rows: transRows } = await client.query(
//                 `SELECT * FROM supplier_transactions WHERE id = $1 FOR UPDATE`,
//                 [transactionId]
//             );
//             const existingTrans = transRows[0];

//             if (!existingTrans) {
//                 throw new Error('Không tìm thấy transaction');
//             }
//             if (existingTrans.admin_locked) {
//                 throw new Error('Transaction đã bị khóa, không thể chỉnh sửa');
//             }

//             // Xác định departmentId sẽ được sử dụng, ưu tiên ID mới trong payload
//             const departmentId = updatePayload.departmentId || existingTrans.department_id;

//             // ----- BƯỚC 2: XỬ LÝ CẬP NHẬT ITEMS (NẾU CÓ) -----

//             // Chỉ thực hiện khối logic phức tạp này nếu client gửi lên danh sách `items` mới
//             if (updatePayload.items && updatePayload.items.length > 0) {
//                 // 1. (LÀM TRƯỚC) Xóa các items cũ để gỡ bỏ ràng buộc khóa ngoại
//                 await client.query(`DELETE FROM supplier_transaction_items WHERE trans_id = $1`, [
//                     transactionId,
//                 ]);

//                 // 2. (LÀM SAU) Hoàn tác các thay đổi tồn kho.
//                 //    Bây giờ hàm này có thể xóa lot một cách an toàn nếu qty về 0.
//                 await revertInventoryChanges(client, transactionId, existingTrans.type);

//                 // 2c. Xử lý danh sách items mới, logic này gần như giống hệt với hàm `createTransactionWithItems`
//                 let totalAmount = 0;
//                 const targetType = updatePayload.type || existingTrans.type;

//                 for (const item of updatePayload.items) {
//                     const { productId, qty, unitPrice, expiryDate, lotId, conversionInfo } = item;
//                     const parsedQty = parseFloat(qty);
//                     const parsedUnitPrice = parseFloat(unitPrice);

//                     if (!productId || parsedQty <= 0 || parsedUnitPrice < 0) {
//                         // Đơn giá có thể là 0
//                         throw new Error('Mỗi item phải có productId, qty và unitPrice hợp lệ');
//                     }

//                     let lotOperations = [];

//                     if (targetType === 'in') {
//                         if (!expiryDate) {
//                             throw new Error('expiryDate là bắt buộc cho transaction type "in"');
//                         }
//                         // ✅ UPDATED: Truyền thêm lotId (có thể null)
//                         const lotResult = await findOrCreateLotForIn(
//                             client,
//                             productId,
//                             departmentId,
//                             expiryDate,
//                             parsedQty,
//                             lotId,
//                             conversionInfo // ✅ Thêm parameter conversionInfo
//                         );

//                         // // ✅ THAY ĐỔI QUAN TRỌNG Ở ĐÂY
//                         // // Luôn chạy lệnh Upsert nếu có conversionInfo, bất kể lot là mới hay cũ.
//                         // if (conversionInfo) {
//                         //     const ucSql = `
//                         //         INSERT INTO unit_conversions (lot_id, pack_unit, main_unit, conversion_rate)
//                         //         VALUES ($1, $2, $3, $4)
//                         //         ON CONFLICT (lot_id)
//                         //         DO UPDATE SET
//                         //             pack_unit = EXCLUDED.pack_unit,
//                         //             main_unit = EXCLUDED.main_unit,
//                         //             conversion_rate = EXCLUDED.conversion_rate,
//                         //             updated_at = now()`;
//                         //     await client.query(ucSql, [
//                         //         lotResult.lotId,
//                         //         conversionInfo.packUnit,
//                         //         conversionInfo.mainUnit,
//                         //         conversionInfo.conversionRate,
//                         //     ]);
//                         // }
//                         lotOperations.push({
//                             lotId: lotResult.lotId,
//                             lotNo: lotResult.lotNo,
//                             qty: parsedQty,
//                             ...lotResult,
//                         });
//                     } else if (targetType === 'out') {
//                         if (lotId) {
//                             const checkLotSql = `SELECT id, lot_no, qty_on_hand FROM inventory_lots WHERE id = $1 AND product_id = $2 AND department_id = $3`;
//                             const { rows: lotRows } = await client.query(checkLotSql, [
//                                 lotId,
//                                 productId,
//                                 departmentId,
//                             ]);
//                             if (!lotRows.length)
//                                 throw new Error(
//                                     `Không tìm thấy lot ${lotId} cho product ${productId}`
//                                 );

//                             const lot = lotRows[0];
//                             const availableQty = parseFloat(lot.qty_on_hand);
//                             if (availableQty < parsedQty) {
//                                 throw new Error(
//                                     `Lot ${lot.lot_no} chỉ có ${availableQty}, không đủ để xuất ${parsedQty}`
//                                 );
//                             }

//                             const newQty = availableQty - parsedQty;
//                             await client.query(
//                                 `UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`,
//                                 [newQty, lotId]
//                             );
//                             lotOperations.push({
//                                 lotId,
//                                 lotNo: lot.lot_no,
//                                 qty: parsedQty,
//                                 operation: 'decreased',
//                                 finalQty: newQty,
//                             });
//                         } else {
//                             const availableLots = await findAvailableLotsForOut(
//                                 productId,
//                                 departmentId,
//                                 parsedQty
//                             );
//                             for (const lotInfo of availableLots) {
//                                 const newQty = lotInfo.availableQty - lotInfo.useQty;
//                                 await client.query(
//                                     `UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`,
//                                     [newQty, lotInfo.lotId]
//                                 );
//                                 lotOperations.push({
//                                     lotId: lotInfo.lotId,
//                                     lotNo: lotInfo.lotNo,
//                                     qty: lotInfo.useQty,
//                                     operation: 'decreased',
//                                     finalQty: newQty,
//                                 });
//                             }
//                         }
//                     }

//                     // Ghi lại các bản ghi item mới
//                     for (const lotOp of lotOperations) {
//                         const itemSql = `
//                             INSERT INTO supplier_transaction_items (trans_id, product_id, lot_id, qty, unit_price)
//                             VALUES ($1, $2, $3, $4, $5)`;
//                         await client.query(itemSql, [
//                             transactionId,
//                             productId,
//                             lotOp.lotId,
//                             lotOp.qty,
//                             parsedUnitPrice,
//                         ]);
//                         totalAmount += lotOp.qty * parsedUnitPrice;
//                     }
//                 }
//                 // Gán tổng tiền mới tính được vào payload để cập nhật ở bước sau
//                 updatePayload.totalAmount = totalAmount;
//             }

//             // ----- BƯỚC 3: CẬP NHẬT CÁC THÔNG TIN CƠ BẢN -----

//             // Xây dựng câu lệnh UPDATE một cách linh hoạt dựa trên các trường có trong payload
//             const updateFields = [];
//             const updateParams = [];
//             let paramIndex = 1;
//             const fieldMap = {
//                 supplierId: 'supplier_id',
//                 departmentId: 'department_id',
//                 transDate: 'trans_date',
//                 type: 'type',
//                 dueDate: 'due_date',
//                 note: 'note',
//                 status: 'status',
//                 totalAmount: 'total_amount',
//             };

//             for (const [key, dbField] of Object.entries(fieldMap)) {
//                 if (updatePayload[key] !== undefined) {
//                     updateFields.push(`${dbField} = $${paramIndex++}`);
//                     let value = updatePayload[key];
//                     if (key === 'transDate' || key === 'dueDate') {
//                         value = dayjs(value).utc().toDate();
//                     }
//                     updateParams.push(value);
//                 }
//             }

//             // Nếu có ít nhất một trường cần cập nhật, tiến hành chạy câu lệnh UPDATE
//             if (updateFields.length > 0) {
//                 // Luôn cập nhật `updated_at` khi có thay đổi
//                 updateFields.push(`updated_at = $${paramIndex++}`);
//                 updateParams.push(dayjs().utc().toDate());
//                 updateParams.push(transactionId);
//                 const updateSql = `UPDATE supplier_transactions SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
//                 await client.query(updateSql, updateParams);
//             }

//             // ----- BƯỚC 4: TRẢ VỀ KẾT QUẢ -----

//             // Lấy lại dữ liệu transaction hoàn chỉnh sau khi đã cập nhật để trả về
//             return await findTransactionWithItemsByIdTx(client, transactionId);
//         } catch (error) {
//             console.error('Error in updateTransactionWithItems:', error.message);
//             // Nếu có lỗi, transaction sẽ tự động được rollback
//             throw error;
//         }
//     });
// }
async function updateTransactionWithItems(transactionId, updatePayload) {
    return await withTransaction(async (client) => {
        try {
            // ----- BƯỚC 1: KIỂM TRA VÀ KHÓA BẢN GHI -----
            const { rows: transRows } = await client.query(
                `SELECT * FROM supplier_transactions WHERE id = $1 FOR UPDATE`,
                [transactionId]
            );
            const existingTrans = transRows[0];

            if (!existingTrans) {
                throw new Error('Không tìm thấy transaction');
            }
            if (existingTrans.admin_locked) {
                throw new Error('Transaction đã bị khóa, không thể chỉnh sửa');
            }

            const departmentId = updatePayload.departmentId || existingTrans.department_id;

            // ✅ NEW: Xác định status cũ và mới để kiểm soát inventory
            const oldStatus = existingTrans.status;
            const newStatus = updatePayload.status || oldStatus;
            const oldType = existingTrans.type;
            const newType = updatePayload.type || oldType;

            console.log(
                `🔄 Updating transaction ${transactionId}: ${oldType}(${oldStatus}) -> ${newType}(${newStatus})`
            );

            // ✅ FIXED: Xác định xem có nên ảnh hưởng inventory không
            const INVENTORY_AFFECTING_STATUSES = ['pending', 'paid'];
            const shouldAffectInventory = INVENTORY_AFFECTING_STATUSES.includes(newStatus);

            // ----- BƯỚC 2: XỬ LÝ CẬP NHẬT ITEMS (NẾU CÓ) -----
            if (updatePayload.items && updatePayload.items.length > 0) {
                console.log(`📝 Updating items for transaction ${transactionId}`);
                console.log(
                    `🎯 Should affect inventory: ${shouldAffectInventory} (status: ${newStatus})`
                );

                // ✅ FIXED: Chỉ revert nếu trạng thái cũ ảnh hưởng inventory
                if (INVENTORY_AFFECTING_STATUSES.includes(oldStatus)) {
                    await revertInventoryChanges(client, transactionId, oldType, oldStatus);
                } else {
                    console.log(
                        `⏭️ Old status '${oldStatus}' không ảnh hưởng inventory - bỏ qua revert`
                    );
                }

                // 2. SAU ĐÓ mới xóa items cũ
                await client.query(`DELETE FROM supplier_transaction_items WHERE trans_id = $1`, [
                    transactionId,
                ]);

                // ✅ NEW: 3. Cleanup các lot rỗng sau khi đã xóa items
                await cleanupEmptyLots(client, transactionId);

                // 4. Xử lý danh sách items mới
                let totalAmount = 0;

                for (const item of updatePayload.items) {
                    // ✅ SIMPLIFIED: Chỉ xử lý 1 format từ Controller (qty đã được tính sẵn)
                    const { productId, qty, unitPrice, expiryDate, lotId, conversionInfo } = item;

                    // ✅ SIMPLIFIED: Validation đơn giản
                    const parsedQty = parseFloat(qty);
                    const parsedUnitPrice = parseFloat(unitPrice);

                    if (!productId || !productId.trim()) {
                        throw new Error('productId là bắt buộc');
                    }
                    if (isNaN(parsedQty) || parsedQty <= 0) {
                        throw new Error(`qty phải là số dương, nhận được: ${qty}`);
                    }
                    if (isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
                        throw new Error(`unitPrice phải là số không âm, nhận được: ${unitPrice}`);
                    }

                    console.log(
                        `📦 Processing item: ${productId}, qty: ${parsedQty}, shouldAffect: ${shouldAffectInventory}`
                    );

                    let lotOperations = [];

                    if (shouldAffectInventory) {
                        console.log(`✅ Affecting inventory for item ${productId}`);

                        if (newType === 'in') {
                            if (!expiryDate) {
                                throw new Error('expiryDate là bắt buộc cho transaction type "in"');
                            }

                            const lotResult = await findOrCreateLotForIn(
                                client,
                                productId,
                                departmentId,
                                expiryDate,
                                parsedQty,
                                lotId,
                                conversionInfo
                            );

                            console.log(
                                `📦 Created/Updated lot: ${lotResult.lotNo}, qty: ${parsedQty}`
                            );

                            lotOperations.push({
                                lotId: lotResult.lotId,
                                lotNo: lotResult.lotNo,
                                qty: parsedQty,
                                ...lotResult,
                            });
                        } else if (newType === 'out') {
                            if (lotId) {
                                const checkLotSql = `SELECT id, lot_no, qty_on_hand FROM inventory_lots WHERE id = $1 AND product_id = $2 AND department_id = $3`;
                                const { rows: lotRows } = await client.query(checkLotSql, [
                                    lotId,
                                    productId,
                                    departmentId,
                                ]);
                                if (!lotRows.length)
                                    throw new Error(
                                        `Không tìm thấy lot ${lotId} cho product ${productId}`
                                    );

                                const lot = lotRows[0];
                                const availableQty = parseFloat(lot.qty_on_hand);
                                if (availableQty < parsedQty) {
                                    throw new Error(
                                        `Lot ${lot.lot_no} chỉ có ${availableQty}, không đủ để xuất ${parsedQty}`
                                    );
                                }

                                const newQty = availableQty - parsedQty;
                                await client.query(
                                    `UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`,
                                    [newQty, lotId]
                                );
                                console.log(
                                    `📦 Updated lot ${lot.lot_no}: ${availableQty} - ${parsedQty} = ${newQty}`
                                );

                                lotOperations.push({
                                    lotId: lotId,
                                    lotNo: lot.lot_no,
                                    qty: parsedQty,
                                    operation: 'decreased',
                                    finalQty: newQty,
                                });
                            } else {
                                const availableLots = await findAvailableLotsForOut(
                                    productId,
                                    departmentId,
                                    parsedQty
                                );
                                for (const lotInfo of availableLots) {
                                    const newQty = lotInfo.availableQty - lotInfo.useQty;
                                    await client.query(
                                        `UPDATE inventory_lots SET qty_on_hand = $1 WHERE id = $2`,
                                        [newQty, lotInfo.lotId]
                                    );
                                    console.log(
                                        `📦 Updated lot ${lotInfo.lotNo}: ${lotInfo.availableQty} - ${lotInfo.useQty} = ${newQty}`
                                    );

                                    lotOperations.push({
                                        lotId: lotInfo.lotId,
                                        lotNo: lotInfo.lotNo,
                                        qty: lotInfo.useQty,
                                        operation: 'decreased',
                                        finalQty: newQty,
                                    });
                                }
                            }
                        }
                    } else {
                        console.log(
                            `⏭️ NOT affecting inventory for item ${productId} (status: ${newStatus})`
                        );

                        // ✅ NEW: Nếu status không ảnh hưởng inventory, tạo lot giả để có record
                        if (newType === 'in') {
                            if (!expiryDate) {
                                throw new Error('expiryDate là bắt buộc cho transaction type "in"');
                            }

                            // Tạo lot với qty = 0 (không ảnh hưởng inventory)
                            const lotResult = await findOrCreateLotForIn(
                                client,
                                productId,
                                departmentId,
                                expiryDate,
                                0, // ✅ qty = 0 để không ảnh hưởng inventory
                                lotId,
                                conversionInfo
                            );

                            console.log(
                                `📦 Created/Found dummy lot: ${lotResult.lotNo}, qty: 0 (record only)`
                            );

                            lotOperations.push({
                                lotId: lotResult.lotId,
                                lotNo: lotResult.lotNo,
                                qty: parsedQty, // ✅ Vẫn record số lượng thực trong transaction_items
                                ...lotResult,
                            });
                        } else {
                            // Đối với 'out', cần có lotId
                            if (!lotId) {
                                throw new Error(
                                    `Lot ID là bắt buộc cho transaction type "out" với status "${newStatus}"`
                                );
                            }

                            const checkLotSql = `SELECT id, lot_no FROM inventory_lots WHERE id = $1 AND product_id = $2 AND department_id = $3`;
                            const { rows: lotRows } = await client.query(checkLotSql, [
                                lotId,
                                productId,
                                departmentId,
                            ]);
                            if (!lotRows.length)
                                throw new Error(
                                    `Không tìm thấy lot ${lotId} cho product ${productId}`
                                );

                            const lot = lotRows[0];
                            lotOperations.push({
                                lotId: lotId,
                                lotNo: lot.lot_no,
                                qty: parsedQty,
                                operation: 'no_change',
                            });
                        }
                    }

                    // Ghi lại các bản ghi item mới
                    for (const lotOp of lotOperations) {
                        const itemSql = `
                            INSERT INTO supplier_transaction_items (trans_id, product_id, lot_id, qty, unit_price)
                            VALUES ($1, $2, $3, $4, $5)`;
                        await client.query(itemSql, [
                            transactionId,
                            productId,
                            lotOp.lotId,
                            lotOp.qty,
                            parsedUnitPrice,
                        ]);
                        totalAmount += lotOp.qty * parsedUnitPrice;

                        console.log(
                            `💾 Inserted transaction item: lot ${lotOp.lotNo}, qty: ${lotOp.qty}, unitPrice: ${parsedUnitPrice}`
                        );
                    }
                }

                updatePayload.totalAmount = totalAmount;
                console.log(`💰 Total amount calculated: ${totalAmount}`);
            } else {
                // ✅ Nếu chỉ thay đổi status mà không thay đổi items
                if (oldStatus !== newStatus) {
                    console.log(`🔄 Status changed: ${oldStatus} -> ${newStatus}`);

                    const INVENTORY_AFFECTING_STATUSES = ['pending', 'paid'];
                    const oldAffectsInventory = INVENTORY_AFFECTING_STATUSES.includes(oldStatus);
                    const newAffectsInventory = INVENTORY_AFFECTING_STATUSES.includes(newStatus);

                    if (oldAffectsInventory && !newAffectsInventory) {
                        // Chuyển từ ảnh hưởng sang không ảnh hưởng inventory
                        console.log(
                            `📤 Removing inventory impact for transaction ${transactionId}`
                        );
                        await revertInventoryChanges(client, transactionId, oldType, oldStatus);
                        await cleanupEmptyLots(client, transactionId);
                    } else if (!oldAffectsInventory && newAffectsInventory) {
                        // Chuyển từ không ảnh hưởng sang ảnh hưởng inventory
                        console.log(
                            `📥 Applying inventory impact for transaction ${transactionId}`
                        );

                        const applyInventoryChangesSql = `
                            SELECT sti.product_id, sti.lot_id, sti.qty
                            FROM supplier_transaction_items sti
                            WHERE sti.trans_id = $1
                        `;
                        const { rows: items } = await client.query(applyInventoryChangesSql, [
                            transactionId,
                        ]);

                        for (const item of items) {
                            const itemQty = parseFloat(item.qty);

                            if (oldType === 'in') {
                                // Apply nhập kho: cộng số lượng
                                await client.query(
                                    `UPDATE inventory_lots SET qty_on_hand = qty_on_hand + $1 WHERE id = $2`,
                                    [itemQty, item.lot_id]
                                );
                            } else if (oldType === 'out') {
                                // Apply xuất kho: trừ số lượng
                                const checkLotSql = `SELECT qty_on_hand FROM inventory_lots WHERE id = $1`;
                                const { rows: lotRows } = await client.query(checkLotSql, [
                                    item.lot_id,
                                ]);
                                if (lotRows.length > 0) {
                                    const currentQty = parseFloat(lotRows[0].qty_on_hand);
                                    if (currentQty < itemQty) {
                                        throw new Error(`Không đủ tồn kho để áp dụng transaction`);
                                    }
                                    await client.query(
                                        `UPDATE inventory_lots SET qty_on_hand = qty_on_hand - $1 WHERE id = $2`,
                                        [itemQty, item.lot_id]
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // ----- BƯỚC 3: CẬP NHẬT CÁC THÔNG TIN CƠ BẢN -----
            const updateFields = [];
            const updateParams = [];
            let paramIndex = 1;
            const fieldMap = {
                supplierId: 'supplier_id',
                departmentId: 'department_id',
                transDate: 'trans_date',
                type: 'type',
                dueDate: 'due_date',
                note: 'note',
                status: 'status',
                totalAmount: 'total_amount',
            };

            for (const [key, dbField] of Object.entries(fieldMap)) {
                if (updatePayload[key] !== undefined) {
                    updateFields.push(`${dbField} = $${paramIndex++}`);
                    let value = updatePayload[key];
                    if (key === 'transDate' || key === 'dueDate') {
                        value = dayjs(value).utc().toDate();
                    }
                    updateParams.push(value);
                }
            }

            if (updateFields.length > 0) {
                updateFields.push(`updated_at = $${paramIndex++}`);
                updateParams.push(dayjs().utc().toDate());
                updateParams.push(transactionId);
                const updateSql = `UPDATE supplier_transactions SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
                await client.query(updateSql, updateParams);
            }

            // ----- BƯỚC 4: TRẢ VỀ KẾT QUẢ -----
            return await findTransactionWithItemsByIdTx(client, transactionId);
        } catch (error) {
            console.error('Error in updateTransactionWithItems:', error.message);
            throw error;
        }
    });
}

/**
 * Xóa transaction và revert inventory changes
 */
// async function deleteTransactionWithItems(transactionId) {
//     return await withTransaction(async (client) => {
//         try {
//             const existingTrans = await findTransactionById(transactionId);
//             if (!existingTrans) {
//                 throw new Error('Không tìm thấy transaction');
//             }

//             if (existingTrans.adminLocked) {
//                 throw new Error('Transaction đã bị khóa, không thể xóa');
//             }

//             // Revert inventory changes
//             await revertInventoryChanges(client, transactionId, existingTrans.type);

//             // Delete transaction items
//             await client.query(`DELETE FROM supplier_transaction_items WHERE trans_id = $1`, [
//                 transactionId,
//             ]);

//             // Delete transaction
//             await client.query(`DELETE FROM supplier_transactions WHERE id = $1`, [transactionId]);

//             return true;
//         } catch (error) {
//             console.error('Error in deleteTransactionWithItems:', error.message);
//             throw error;
//         }
//     });
// }
async function deleteTransactionWithItems(transactionId) {
    return await withTransaction(async (client) => {
        try {
            const existingTrans = await findTransactionById(transactionId);
            if (!existingTrans) {
                throw new Error('Không tìm thấy transaction');
            }

            if (existingTrans.adminLocked) {
                throw new Error('Transaction đã bị khóa, không thể xóa');
            }

            console.log(
                `🗑️ Deleting transaction ${transactionId} (${existingTrans.type}, ${existingTrans.status})`
            );

            // ✅ FIXED: Thứ tự mới - Revert inventory, xóa items, cleanup lots
            // 1. Revert inventory changes
            await revertInventoryChanges(
                client,
                transactionId,
                existingTrans.type,
                existingTrans.status
            );

            // 2. Delete transaction items
            await client.query(`DELETE FROM supplier_transaction_items WHERE trans_id = $1`, [
                transactionId,
            ]);

            // ✅ NEW: 3. Cleanup empty lots
            await cleanupEmptyLots(client, transactionId);

            // 4. Delete transaction
            await client.query(`DELETE FROM supplier_transactions WHERE id = $1`, [transactionId]);

            console.log(`✅ Successfully deleted transaction ${transactionId}`);
            return true;
        } catch (error) {
            console.error('Error in deleteTransactionWithItems:', error.message);
            throw error;
        }
    });
}

/* ========== QUERY OPERATIONS ========== */

async function findTransactionById(id) {
    const sql = `
        SELECT 
            st.id, st.doc_no, st.supplier_id, st.department_id, st.trans_date, 
            st.type, st.status, st.admin_locked, st.due_date, 
            st.total_amount, st.paid_amount, st.note, 
            st.created_at, st.updated_at,
            s.name AS supplier_name, s.code AS supplier_code,
            d.name AS department_name, d.code AS department_code
        FROM supplier_transactions st
        LEFT JOIN suppliers s ON st.supplier_id = s.id
        LEFT JOIN departments d ON st.department_id = d.id
        WHERE st.id = $1
    `;
    const { rows } = await query(sql, [id]);
    return toSupplierTransaction(rows[0]);
}

async function findTransactionWithItemsById(id) {
    // 1. Lấy thông tin transaction gốc (giữ nguyên)
    const transactionSql = `
        SELECT 
            st.id, st.doc_no, st.supplier_id, st.department_id, st.trans_date, 
            st.type, st.status, st.admin_locked, st.due_date, 
            st.total_amount, st.paid_amount, st.note, 
            st.created_at, st.updated_at,
            s.name AS supplier_name, s.code AS supplier_code,
            d.name AS department_name, d.code AS department_code
        FROM supplier_transactions st
        LEFT JOIN suppliers s ON st.supplier_id = s.id
        LEFT JOIN departments d ON st.department_id = d.id
        WHERE st.id = $1
    `;
    const { rows: transRows } = await query(transactionSql, [id]);
    const transactionRow = transRows[0];

    if (!transactionRow) return null;

    // 2. ✅ UPDATED: Lấy conversion_rate từ inventory_lots và units từ products
    const itemsSql = `
        SELECT 
            sti.id, sti.trans_id, sti.product_id, sti.lot_id, sti.qty, sti.unit_price,
            p.sku_code, p.name AS product_name, p.pack_unit, p.main_unit,
            il.lot_no, il.expiry_date, il.qty_on_hand AS current_lot_qty, il.conversion_rate
        FROM supplier_transaction_items sti
        LEFT JOIN products p ON sti.product_id = p.id
        LEFT JOIN inventory_lots il ON sti.lot_id = il.id
        WHERE sti.trans_id = $1
        ORDER BY sti.id
    `;
    const { rows: itemRows } = await query(itemsSql, [id]);

    // 3. Map dữ liệu thô của transaction và items
    const mappedTransaction = toSupplierTransaction(transactionRow);
    const mappedItems = itemRows.map(toSupplierTransactionItem);

    // 4. Kết hợp lại và trả về
    return {
        ...mappedTransaction,
        items: mappedItems,
    };
}

/**
 * Hàm nội bộ để xây dựng mệnh đề WHERE và các tham số từ bộ lọc.
 * @param {object} filters - Các bộ lọc đầu vào.
 * @returns {{whereClause: string, params: any[], paramIndex: number}}
 */
function _buildTransactionFilters(filters = {}) {
    const clauses = [];
    const params = [];
    let paramIndex = 1;

    // ✅ FIXED: Thêm hasStock vào destructuring
    const { q, supplierId, departmentId, type, status, fromDate, toDate, hasStock } = filters;

    if (q && q.trim()) {
        clauses.push(`(
            st.doc_no ILIKE $${paramIndex} OR 
            s.name ILIKE $${paramIndex} OR 
            s.code ILIKE $${paramIndex} OR
            d.name ILIKE $${paramIndex} OR
            st.note ILIKE $${paramIndex}
        )`);
        params.push(`%${q.trim()}%`);
        paramIndex++;
    }

    if (supplierId) {
        clauses.push(`st.supplier_id = $${paramIndex++}`);
        params.push(supplierId);
    }
    if (departmentId) {
        clauses.push(`st.department_id = $${paramIndex++}`);
        params.push(departmentId);
    }
    if (type) {
        clauses.push(`st.type = $${paramIndex++}`);
        params.push(type);
    }
    if (status) {
        clauses.push(`st.status = $${paramIndex++}`);
        params.push(status);
    }
    if (fromDate) {
        clauses.push(`st.trans_date >= $${paramIndex++}`);
        params.push(dayjs(fromDate).utc().toDate());
    }
    if (toDate) {
        clauses.push(`st.trans_date <= $${paramIndex++}`);
        params.push(dayjs(toDate).utc().toDate());
    }

    // ✅ FIXED: Sử dụng hasStock từ destructuring
    if (hasStock === true || hasStock === 'true') {
        clauses.push(`EXISTS (
            SELECT 1 FROM supplier_transaction_items sti
            JOIN inventory_lots il ON sti.lot_id = il.id
            WHERE sti.trans_id = st.id AND il.qty_on_hand > 0
        )`);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    return { whereClause, params, paramIndex };
}

async function listTransactions(filters = {}) {
    try {
        // ✅ FIXED: Truyền đầy đủ filters vào _buildTransactionFilters
        const { limit = 50, offset = 0, ...filterParams } = filters;

        // Gọi hàm helper để lấy mệnh đề WHERE và params
        const {
            whereClause,
            params,
            paramIndex: initialParamIndex,
        } = _buildTransactionFilters(filterParams); // ✅ Truyền filterParams thay vì filters

        let paramIndex = initialParamIndex;

        params.push(limit, offset);

        const sql = `
            SELECT 
                st.id, st.doc_no, st.supplier_id, st.department_id, st.trans_date, 
                st.type, st.status, st.admin_locked, st.due_date, 
                st.total_amount, st.paid_amount, st.note, 
                st.created_at, st.updated_at,
                s.name AS supplier_name, s.code AS supplier_code,
                d.name AS department_name, d.code AS department_code
            FROM supplier_transactions st
            LEFT JOIN suppliers s ON st.supplier_id = s.id
            LEFT JOIN departments d ON st.department_id = d.id
            ${whereClause}
            ORDER BY st.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;

        const { rows } = await query(sql, params);
        return rows.map(toSupplierTransaction);
    } catch (error) {
        console.error('Error in listTransactions:', error.message);
        throw new Error('Không thể lấy danh sách transactions');
    }
}

async function countTransactions(filters = {}) {
    try {
        // ✅ FIXED: Loại bỏ limit và offset trước khi truyền vào _buildTransactionFilters
        const { limit, offset, ...filterParams } = filters;

        // Gọi hàm helper để lấy mệnh đề WHERE và params
        const { whereClause, params } = _buildTransactionFilters(filterParams); // ✅ Truyền filterParams

        const sql = `
            SELECT COUNT(*) AS count
            FROM supplier_transactions st
            LEFT JOIN suppliers s ON st.supplier_id = s.id
            LEFT JOIN departments d ON st.department_id = d.id
            ${whereClause}
        `;

        const { rows } = await query(sql, params);
        return parseInt(rows[0]?.count ?? '0', 10);
    } catch (error) {
        console.error('Error in countTransactions:', error.message);
        throw new Error('Không thể đếm transactions');
    }
}

/* ========== ANALYTICS & STATS ========== */

async function getTransactionStats({ months = 12 } = {}) {
    const sql = `
        SELECT 
            DATE_TRUNC('month', trans_date) as month,
            type,
            COUNT(*) as transaction_count,
            SUM(total_amount) as total_amount,
            SUM(paid_amount) as paid_amount
        FROM supplier_transactions
        WHERE trans_date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', trans_date), type
        ORDER BY month DESC, type
    `;
    const { rows } = await query(sql);

    return rows.map((row) => ({
        month: formatToVietnamTime(row.month),
        type: row.type,
        transactionCount: parseInt(row.transaction_count, 10),
        totalAmount: parseFloat(row.total_amount) || 0,
        paidAmount: parseFloat(row.paid_amount) || 0,
    }));
}

async function getTopSuppliers({ limit = 10 } = {}) {
    const sql = `
        SELECT 
            s.id, s.code, s.name,
            COUNT(st.id) as transaction_count,
            SUM(st.total_amount) as total_value,
            SUM(st.paid_amount) as paid_value,
            AVG(st.total_amount) as avg_transaction_value
        FROM suppliers s
        LEFT JOIN supplier_transactions st ON s.id = st.supplier_id
        WHERE st.id IS NOT NULL
        GROUP BY s.id, s.code, s.name
        ORDER BY total_value DESC
        LIMIT $1
    `;
    const { rows } = await query(sql, [limit]);

    return rows.map((row) => ({
        supplierId: row.id,
        supplierCode: row.code,
        supplierName: row.name,
        transactionCount: parseInt(row.transaction_count, 10),
        totalValue: parseFloat(row.total_value) || 0,
        paidValue: parseFloat(row.paid_value) || 0,
        avgTransactionValue: parseFloat(row.avg_transaction_value) || 0,
    }));
}

async function findTransactionWithItemsByIdTx(client, id) {
    // fetch transaction row
    const sqlT = `
        SELECT 
            st.id, st.doc_no, st.supplier_id, st.department_id, st.trans_date,
            st.type, st.status, st.admin_locked, st.due_date,
            st.total_amount, st.paid_amount, st.note,
            st.created_at, st.updated_at,
            s.name AS supplier_name, s.code AS supplier_code,
            d.name AS department_name, d.code AS department_code
        FROM supplier_transactions st
        LEFT JOIN suppliers s ON st.supplier_id = s.id
        LEFT JOIN departments d ON st.department_id = d.id
        WHERE st.id = $1
    `;
    const { rows: trows } = await client.query(sqlT, [id]);
    const transaction = toSupplierTransaction(trows[0]);
    if (!transaction) return null;

    // ✅ UPDATED: fetch item rows - loại bỏ join với unit_conversions
    const sqlI = `
        SELECT 
            sti.id, sti.trans_id, sti.product_id, sti.lot_id, sti.qty, sti.unit_price,
            p.sku_code, p.name AS product_name, p.pack_unit, p.main_unit,
            il.lot_no, il.expiry_date, il.qty_on_hand AS current_lot_qty, il.conversion_rate
        FROM supplier_transaction_items sti
        LEFT JOIN products p ON sti.product_id = p.id
        LEFT JOIN inventory_lots il ON sti.lot_id = il.id
        WHERE sti.trans_id = $1
        ORDER BY sti.id
    `;
    const { rows: irows } = await client.query(sqlI, [id]);
    return toTransactionWithItems(transaction, irows);
}

/**
 * Cập nhật trường adminLocked của transaction
 * @param {string} transactionId - ID của transaction
 * @param {boolean} adminLocked - Giá trị mới của adminLocked
 * @returns {Promise<boolean>} - Trả về true nếu cập nhật thành công
 */
async function updateAdminLocked(transactionId, adminLocked) {
    const sql = `
        UPDATE supplier_transactions
        SET admin_locked = $1, updated_at = now()
        WHERE id = $2
        RETURNING id
    `;
    const { rows } = await query(sql, [adminLocked, transactionId]);
    return rows.length > 0; // Trả về true nếu có dòng được cập nhật
}

/**
 * Cập nhật unitPrice cho các items và tính lại total_amount của transaction.
 * Được thiết kế riêng cho nghiệp vụ của Accountant.
 * @param {string} transactionId - ID của transaction.
 * @param {Array<{id: string, unitPrice: number}>} itemsToUpdate - Mảng các item cần cập nhật giá.
 * @returns {Promise<object>} - Dữ liệu transaction hoàn chỉnh sau khi cập nhật.
 */
async function updateItemPrices(transactionId, itemsToUpdate = []) {
    return await withTransaction(async (client) => {
        // Cập nhật giá cho từng item trong một vòng lặp
        for (const item of itemsToUpdate) {
            const sql = `UPDATE supplier_transaction_items SET unit_price = $1 WHERE product_id = $2 AND trans_id = $3`;
            await client.query(sql, [item.unitPrice, item.productId, transactionId]);
        }

        // Tính lại tổng tiền của toàn bộ transaction từ các item đã được cập nhật
        const recalcSql = `
            UPDATE supplier_transactions
            SET total_amount = (
                SELECT SUM(qty * unit_price)
                FROM supplier_transaction_items
                WHERE trans_id = $1
            )
            WHERE id = $1
        `;
        await client.query(recalcSql, [transactionId]);

        // Trả về dữ liệu mới nhất
        return await findTransactionWithItemsByIdTx(client, transactionId);
    });
}

/**
 * Tìm transaction với items theo doc_no
 * @param {string} docNo - Số chứng từ của transaction (ví dụ: IMP-091025-C8F23A)
 * @returns {Promise<object|null>} - Transaction với items hoặc null nếu không tìm thấy
 */
async function findTransactionWithItemsByDocNo(docNo) {
    try {
        // 1. Lấy thông tin transaction theo doc_no
        const transactionSql = `
            SELECT 
                st.id, st.doc_no, st.supplier_id, st.department_id, st.trans_date, 
                st.type, st.status, st.admin_locked, st.due_date, 
                st.total_amount, st.paid_amount, st.note, 
                st.created_at, st.updated_at,
                s.name AS supplier_name, s.code AS supplier_code,
                d.name AS department_name, d.code AS department_code
            FROM supplier_transactions st
            LEFT JOIN suppliers s ON st.supplier_id = s.id
            LEFT JOIN departments d ON st.department_id = d.id
            WHERE st.doc_no = $1
        `;
        const { rows: transRows } = await query(transactionSql, [docNo]);
        const transactionRow = transRows[0];

        if (!transactionRow) {
            return null; // Không tìm thấy transaction với doc_no này
        }

        // 2. Lấy conversion_rate từ inventory_lots và thông tin items
        const itemsSql = `
            SELECT 
                sti.id, sti.trans_id, sti.product_id, sti.lot_id, sti.qty, sti.unit_price,
                p.sku_code, p.name AS product_name, p.pack_unit, p.main_unit,
                il.lot_no, il.expiry_date, il.qty_on_hand AS current_lot_qty, il.conversion_rate
            FROM supplier_transaction_items sti
            LEFT JOIN products p ON sti.product_id = p.id
            LEFT JOIN inventory_lots il ON sti.lot_id = il.id
            WHERE sti.trans_id = $1
            ORDER BY sti.id
        `;
        const { rows: itemRows } = await query(itemsSql, [transactionRow.id]);

        // 3. Map dữ liệu thô của transaction và items
        const mappedTransaction = toSupplierTransaction(transactionRow);
        const mappedItems = itemRows.map(toSupplierTransactionItem);

        // 4. Kết hợp lại và trả về
        return {
            ...mappedTransaction,
            items: mappedItems,
        };
    } catch (error) {
        console.error('Error in findTransactionWithItemsByDocNo:', error.message);
        throw new Error('Không thể tìm transaction theo doc_no');
    }
}

/**
 * Tìm transaction cơ bản theo doc_no (không có items)
 * @param {string} docNo - Số chứng từ của transaction
 * @returns {Promise<object|null>} - Transaction hoặc null nếu không tìm thấy
 */
async function findTransactionByDocNo(docNo) {
    try {
        const sql = `
            SELECT 
                st.id, st.doc_no, st.supplier_id, st.department_id, st.trans_date, 
                st.type, st.status, st.admin_locked, st.due_date, 
                st.total_amount, st.paid_amount, st.note, 
                st.created_at, st.updated_at,
                s.name AS supplier_name, s.code AS supplier_code,
                d.name AS department_name, d.code AS department_code
            FROM supplier_transactions st
            LEFT JOIN suppliers s ON st.supplier_id = s.id
            LEFT JOIN departments d ON st.department_id = d.id
            WHERE st.doc_no = $1
        `;
        const { rows } = await query(sql, [docNo]);
        return toSupplierTransaction(rows[0]);
    } catch (error) {
        console.error('Error in findTransactionByDocNo:', error.message);
        throw new Error('Không thể tìm transaction theo doc_no');
    }
}

/**
 * ✅ BONUS: Hàm kiểm tra doc_no có tồn tại không (để validate trước khi xử lý)
 * @param {string} docNo - Số chứng từ cần kiểm tra
 * @returns {Promise<boolean>} - true nếu doc_no tồn tại, false nếu không
 */
async function checkDocNoExists(docNo) {
    try {
        const sql = `SELECT COUNT(*) AS count FROM supplier_transactions WHERE doc_no = $1`;
        const { rows } = await query(sql, [docNo]);
        return parseInt(rows[0].count, 10) > 0;
    } catch (error) {
        console.error('Error in checkDocNoExists:', error.message);
        throw new Error('Không thể kiểm tra doc_no');
    }
}

/* ========== EXPORTS ========== */
module.exports = {
    // Combined CRUD operations
    createTransactionWithItems,
    updateTransactionWithItems,
    deleteTransactionWithItems,

    // Find by doc_no
    findTransactionByDocNo,
    findTransactionWithItemsByDocNo,
    checkDocNoExists,

    // Specialized update
    updateItemPrices, // Dành cho Accountant

    // Query operations
    findTransactionById,
    findTransactionWithItemsById,
    listTransactions,
    countTransactions,

    // Analytics
    getTransactionStats,
    getTopSuppliers,

    // Utilities
    updateAdminLocked,
    generateDocNo,
    generateLotNo,
    findAvailableLotsForOut,
    toTransactionWithItems,
};
