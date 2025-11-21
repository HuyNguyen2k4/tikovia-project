// require('module-alias/register');
// const { faker } = require('@faker-js/faker');
// const { query } = require('@src/config/dbconnect');

// // MODELS (sử dụng SupplierTransactionCombined thay vì riêng lẻ)
// const ProductCategory = require('@models/ProductCategories');
// const Product = require('@models/Products');
// const InventoryLot = require('@models/InventoryLots');
// const Department = require('@models/Departments');
// const Supplier = require('@models/Suppliers');
// const SupplierTransactionCombined = require('@models/SupplierTransactionCombined');
// const SupplierTransactionPayment = require('@models/SupplierTransactionPayments');
// const User = require('@models/Users');
// const UnitConversion = require('@models/UnitConversions');

// /* ================== CONFIGS ================== */
// const TEST_SUFFIX = '_test';

// const NUM_CATEGORIES = 8;
// const NUM_PRODUCTS = 40;
// const NUM_INVENTORY_LOTS = 80;
// const NUM_UNIT_CONVERSIONS = 40; // ✅ Giảm xuống vì 1 lot = 1 conversion
// const NUM_SUPPLIERS = 10;
// const NUM_SUPPLIER_TRANSACTIONS = 30;

// const CATEGORY_NAMES = [
//     'Electronics',
//     'Clothing & Apparel',
//     'Food & Beverage',
//     'Health & Beauty',
//     'Home & Garden',
//     'Sports & Outdoors',
//     'Books & Media',
//     'Automotive',
// ];
// const SKU_PREFIXES = ['ELE', 'CLO', 'FOO', 'HEA', 'HOM', 'SPO', 'BOO', 'AUT'];

// // Danh sách các đơn vị
// const UNITS = [
//     'kg',
//     'g',
//     'mg',
//     'ton', // Trọng lượng
//     'liter',
//     'ml',
//     'gallon', // Thể tích
//     'piece',
//     'box',
//     'carton',
//     'pallet',
//     'case', // Đóng gói
//     'meter',
//     'cm',
//     'mm', // Chiều dài
//     'dozen',
//     'pack',
//     'set', // Đếm
// ];

// const SUFFIX_PATTERN = `%\\${TEST_SUFFIX}`;

// /* ================== HELPERS ================== */
// function handleError(message, error) {
//     console.error(`🔥🔥🔥 ${message}`, error);
//     process.exit(1);
// }

// function generateSkuCode(prefix, index) {
//     const rand = faker.string.alphanumeric(3).toUpperCase();
//     return `${prefix}${String(index).padStart(3, '0')}${rand}${TEST_SUFFIX}`;
// }

// function generateLotNo(index) {
//     const datePart = faker.date.recent({ days: 30 }).toISOString().slice(0, 10).replace(/-/g, '');
//     const rand = faker.string.alphanumeric(4).toUpperCase();
//     return `LOT${datePart}${rand}${index}${TEST_SUFFIX}`;
// }

// function generateExpiryDate() {
//     const days = faker.number.int({ min: 30, max: 365 }); // ✅ Tăng min để tránh hết hạn ngay
//     return faker.date.future({ days });
// }

// function generateQuantity() {
//     const buckets = [
//         { min: 10, max: 50, weight: 0.3 }, // ✅ Tăng min để đảm bảo có stock
//         { min: 51, max: 200, weight: 0.4 },
//         { min: 201, max: 1000, weight: 0.3 },
//     ];
//     const r = Math.random();
//     let acc = 0;
//     for (const b of buckets) {
//         acc += b.weight;
//         if (r <= acc) {
//             return faker.number.float({ min: b.min, max: b.max, multipleOf: 0.001 });
//         }
//     }
//     return faker.number.float({ min: 50, max: 200, multipleOf: 0.001 });
// }

// /* ================== SEED: CATEGORIES ================== */
// async function seedProductCategories() {
//     console.log('🌱 Seeding Product Categories...');
//     const categories = [];
//     for (let i = 0; i < NUM_CATEGORIES; i++) {
//         const base = CATEGORY_NAMES[i] || faker.commerce.department();
//         const name = `${base}${TEST_SUFFIX}`;
//         try {
//             const cat = await ProductCategory.createProductCategory({ name });
//             categories.push(cat);
//             console.log(`✅ Category: ${cat.name}`);
//         } catch (err) {
//             if (err.code !== '23505') {
//                 handleError('Lỗi tạo Product Category', err);
//             } else {
//                 console.warn(`⚠️ Trùng category name: ${name}`);
//             }
//         }
//     }
//     console.log(`✨ Done categories: ${categories.length}`);
//     return categories;
// }

// /* ================== SEED: PRODUCTS ================== */
// async function seedProducts(categories) {
//     if (!categories?.length) handleError('Cần categories để tạo Products.');
//     console.log('🌱 Seeding Products...');

//     const products = [];
//     for (let i = 0; i < NUM_PRODUCTS; i++) {
//         const category = faker.helpers.arrayElement(categories);
//         const idx = categories.indexOf(category);
//         const prefix = SKU_PREFIXES[idx] || 'PRD';

//         const skuCode = generateSkuCode(prefix, i);
//         const name = `${faker.commerce.productName()}${TEST_SUFFIX}`;
//         const storageRules = [
//             'Store in cool, dry place',
//             'Keep refrigerated at 2-8°C',
//             'Store at room temperature',
//             'Keep away from direct sunlight',
//             'Store in freezer at -18°C',
//             null,
//         ];
//         const imgUrl = faker.image.urlPicsumPhotos({ width: 1500, height: 1500, blur: 0 });

//         try {
//             const p = await Product.createProduct({
//                 skuCode,
//                 name,
//                 categoryId: category.id,
//                 storageRule: faker.helpers.arrayElement(storageRules),
//                 status: faker.helpers.weightedArrayElement([
//                     { weight: 0.7, value: 'active' },
//                     { weight: 0.2, value: 'warning' },
//                     { weight: 0.1, value: 'disable' },
//                 ]),
//                 adminLocked: faker.helpers.weightedArrayElement([
//                     { weight: 0.9, value: false },
//                     { weight: 0.1, value: true },
//                 ]),
//                 lowStockThreshold: faker.number.float({ min: 5, max: 50, multipleOf: 0.001 }),
//                 nearExpiryDays: faker.helpers.arrayElement([7, 14, 30, 60, 90]),
//                 imgUrl,
//             });
//             products.push(p);
//             console.log(`✅ Product: (${p.skuCode} | ${p.name})`);
//         } catch (err) {
//             if (err.code !== '23505') handleError('Lỗi tạo Product', err);
//             console.warn('⚠️ Trùng SKU, bỏ qua');
//         }
//     }
//     console.log(`✨ Done products: ${products.length}`);
//     return products;
// }

// /* ================== SEED: INVENTORY LOTS ================== */
// async function seedInventoryLots(products) {
//     if (!products?.length) handleError('Cần products để tạo Inventory Lots.');
//     const departments = await Department.listDepartments({ limit: 100 });
//     if (!departments?.length) handleError('Cần departments để tạo Inventory Lots.');

//     console.log('🌱 Seeding Inventory Lots...');
//     const lots = [];
//     for (let i = 0; i < NUM_INVENTORY_LOTS; i++) {
//         const product = faker.helpers.arrayElement(products);
//         const department = faker.helpers.arrayElement(departments);

//         const lotNo = generateLotNo(i);
//         const expiryDate = generateExpiryDate();
//         const qtyOnHand = generateQuantity();

//         try {
//             const lot = await InventoryLot.createInventoryLot({
//                 lotNo,
//                 productId: product.id,
//                 departmentId: department.id,
//                 expiryDate,
//                 qtyOnHand,
//             });
//             lots.push({
//                 id: lot.id,
//                 lotNo: lot.lotNo,
//                 productId: product.id,
//                 departmentId: department.id,
//                 expiryDate,
//                 qtyOnHand,
//                 skuCode: product.skuCode, // ✅ Thêm để debug
//                 productName: product.name, // ✅ Thêm để debug
//             });
//             console.log(`✅ Lot: (${lot.lotNo} | ${product.skuCode} | Qty: ${qtyOnHand})`);
//         } catch (err) {
//             if (err.code !== '23505') handleError('Lỗi tạo Inventory Lot', err);
//             console.warn('⚠️ Trùng lot_no, bỏ qua');
//         }
//     }
//     console.log(`✨ Done inventory lots: ${lots.length}`);
//     return lots;
// }

// /* ================== SEED: UNIT CONVERSIONS ================== */
// async function seedUnitConversions(inventoryLots) {
//     if (!inventoryLots?.length) handleError('Cần inventory lots để tạo Unit Conversions.');

//     console.log('🌱 Seeding Unit Conversions...');
//     const conversions = [];

//     // ✅ Random chọn các lots để tạo unit conversion (không phải tất cả lots)
//     const selectedLots = faker.helpers.arrayElements(
//         inventoryLots,
//         Math.min(NUM_UNIT_CONVERSIONS, inventoryLots.length)
//     );

//     console.log(
//         `📦 Chọn ${selectedLots.length}/${inventoryLots.length} lots để tạo unit conversions`
//     );

//     for (const lot of selectedLots) {
//         try {
//             // ✅ Kiểm tra lot đã có unit conversion chưa (vì 1 lot = 1 conversion)
//             const exists = await UnitConversion.isConversionExists(lot.id);
//             if (exists) {
//                 console.log(`⚠️ Lot ${lot.lotNo} đã có unit conversion, bỏ qua`);
//                 continue;
//             }

//             // Chọn 2 đơn vị khác nhau
//             const packUnit = faker.helpers.arrayElement(UNITS);
//             let mainUnit;
//             do {
//                 mainUnit = faker.helpers.arrayElement(UNITS);
//             } while (mainUnit === packUnit);

//             // Tạo conversion rate hợp lý
//             const conversionRate = faker.number.float({
//                 min: 0.1,
//                 max: 100,
//                 multipleOf: 0.001,
//             });

//             const conversion = await UnitConversion.createUnitConversion({
//                 lotId: lot.id,
//                 packUnit,
//                 mainUnit,
//                 conversionRate,
//             });

//             conversions.push(conversion);

//             console.log(
//                 `✅ Unit Conversion: ${packUnit} → ${mainUnit} (${conversionRate}) | Lot: ${lot.lotNo} | Product: ${lot.skuCode}`
//             );
//         } catch (err) {
//             if (err.code !== '23505') {
//                 console.warn(`⚠️ Lỗi tạo Unit Conversion cho lot ${lot.lotNo}:`, err.message);
//             } else {
//                 console.warn(`⚠️ Trùng unit conversion cho lot ${lot.lotNo}, bỏ qua`);
//             }
//         }
//     }

//     console.log(`✨ Done unit conversions: ${conversions.length}`);
//     return conversions;
// }

// /* ================== SEED: SUPPLIERS ================== */
// async function seedSuppliers() {
//     console.log('🌱 Seeding Suppliers...');
//     const suppliers = [];
//     const names = [
//         'ABC Import Export Co., Ltd',
//         'Viet Fresh Foods Corporation',
//         'Golden Dragon Trading',
//         'Sunrise Manufacturing',
//         'Pacific Ocean Seafood',
//         'Green Valley Agriculture',
//         'Metro Supply Chain',
//         'Elite Business Solutions',
//         'Harmony International Trade',
//         'Crystal Clear Water Co.',
//     ];

//     for (let i = 0; i < NUM_SUPPLIERS; i++) {
//         try {
//             const base = names[i] || faker.company.name();
//             const code = `SUP${String(i + 1).padStart(3, '0')}${TEST_SUFFIX}`;
//             const phonePrefix = faker.helpers.arrayElement([
//                 '090',
//                 '091',
//                 '094',
//                 '083',
//                 '084',
//                 '085',
//                 '081',
//                 '082',
//             ]);
//             const phone = `+84 ${phonePrefix} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`;
//             const emailDomain = faker.helpers.arrayElement([
//                 'gmail.com',
//                 'company.vn',
//                 'trade.com',
//                 'business.com',
//             ]);
//             const email = faker.helpers.maybe(
//                 () => `${base.toLowerCase().replace(/[^a-z0-9]/g, '')}@${emailDomain}`,
//                 { probability: 0.8 }
//             );
//             const address = faker.helpers.arrayElement([
//                 '123 Nguyen Trai, District 1, Ho Chi Minh City',
//                 '456 Le Loi, Hoan Kiem, Hanoi',
//                 '789 Tran Phu, Hai Chau, Da Nang',
//                 '321 Ly Thuong Kiet, Ninh Kieu, Can Tho',
//                 '654 Nguyen Hue, District 3, Ho Chi Minh City',
//                 '987 Ba Trieu, Hai Ba Trung, Hanoi',
//             ]);

//             const s = await Supplier.createSupplier({
//                 code: code.toUpperCase(),
//                 name: `${base}${TEST_SUFFIX}`,
//                 phone,
//                 email,
//                 address,
//                 taxCode: faker.helpers.maybe(() => faker.string.numeric(10), { probability: 0.7 }),
//                 note: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
//             });
//             suppliers.push(s);
//             console.log(`✅ Supplier: (${s.code} | ${s.name})`);
//         } catch (err) {
//             if (err.code !== '23505') handleError('Lỗi tạo Supplier', err);
//             console.warn('⚠️ Trùng supplier code, bỏ qua');
//         }
//     }
//     console.log(`✨ Done suppliers: ${suppliers.length}`);
//     return suppliers;
// }

// /* ================== SEED: SUPPLIER TRANSACTIONS với SupplierTransactionCombined ================== */
// async function seedSupplierTransactionsWithItems(suppliers, departments, products, inventoryLots) {
//     if (!suppliers?.length) handleError('Cần suppliers để tạo transactions.');
//     if (!departments?.length) handleError('Cần departments để tạo transactions.');
//     if (!products?.length) handleError('Cần products để tạo items.');
//     if (!inventoryLots?.length) handleError('Cần inventory lots để tạo items.');

//     console.log('🌱 Seeding Supplier Transactions with Items (Combined)...');
//     const transactions = [];

//     for (let i = 0; i < NUM_SUPPLIER_TRANSACTIONS; i++) {
//         try {
//             const supplier = faker.helpers.arrayElement(suppliers);
//             const department = faker.helpers.arrayElement(departments);

//             const transDate = faker.date.recent({ days: 180 });
//             const dueDate = faker.date.future({ days: 30, refDate: transDate });

//             // ✅ 80% nhập kho, 20% xuất kho
//             const type = faker.helpers.weightedArrayElement([
//                 { weight: 0.8, value: 'in' },
//                 { weight: 0.2, value: 'out' },
//             ]);

//             const note = faker.helpers.maybe(
//                 () =>
//                     `${type === 'in' ? 'Nhập hàng' : 'Xuất hàng'} tháng ${transDate.getMonth() + 1}/${transDate.getFullYear()}`,
//                 { probability: 0.7 }
//             );

//             // ✅ Tạo items theo type
//             const items = [];
//             const numItems = faker.number.int({ min: 1, max: 4 });

//             for (let j = 0; j < numItems; j++) {
//                 const product = faker.helpers.arrayElement(products);

//                 const qty = faker.number.float({ min: 5, max: 50, multipleOf: 0.001 });
//                 const unitPrice = faker.number.float({
//                     min: 10_000,
//                     max: 500_000,
//                     multipleOf: 1000,
//                 });

//                 const item = {
//                     productId: product.id,
//                     qty,
//                     unitPrice,
//                 };

//                 if (type === 'in') {
//                     // ✅ Nhập kho: cần expiryDate
//                     item.expiryDate = generateExpiryDate();
//                 } else if (type === 'out') {
//                     // ✅ Xuất kho: có thể chỉ định lotId hoặc để auto FEFO
//                     const lotsOfProduct = inventoryLots.filter(
//                         (l) =>
//                             l.productId === product.id &&
//                             l.departmentId === department.id &&
//                             l.qtyOnHand > qty // Đảm bảo đủ stock
//                     );

//                     if (lotsOfProduct.length > 0) {
//                         // 70% chọn lot cụ thể, 30% để auto FEFO
//                         const shouldSpecifyLot = faker.datatype.boolean(0.7);
//                         if (shouldSpecifyLot) {
//                             const lot = faker.helpers.arrayElement(lotsOfProduct);
//                             item.lotId = lot.id;
//                         }
//                         // Nếu không specify lotId, hệ thống sẽ tự động chọn theo FEFO
//                     } else {
//                         // Nếu không có lot phù hợp, skip item này
//                         console.warn(
//                             `⚠️ Không có lot phù hợp cho ${product.skuCode} trong ${department.name}, skip item`
//                         );
//                         continue;
//                     }
//                 }

//                 items.push(item);
//             }

//             if (items.length === 0) {
//                 console.warn(`⚠️ Không có items hợp lệ cho transaction ${i + 1}, skip`);
//                 continue;
//             }

//             // ✅ Sử dụng SupplierTransactionCombined để tạo transaction + items + inventory lots
//             const transaction = await SupplierTransactionCombined.createTransactionWithItems({
//                 supplierId: supplier.id,
//                 departmentId: department.id,
//                 transDate,
//                 type,
//                 dueDate,
//                 note,
//                 items,
//             });

//             transactions.push(transaction);

//             console.log(
//                 `✅ Transaction: ${transaction.docNo} | ${type.toUpperCase()} | ${supplier.name} | Items: ${transaction.items?.length || items.length} | Total: ${transaction.totalAmount?.toLocaleString() || 'N/A'}`
//             );

//             // ✅ Log inventory operations nếu có
//             if (transaction.inventoryOperations?.length > 0) {
//                 transaction.inventoryOperations.forEach((op) => {
//                     console.log(
//                         `   📦 ${op.operation}: Lot ${op.lotNo} | Qty: ${op.qty} | Final: ${op.finalLotQty}`
//                     );
//                 });
//             }
//         } catch (err) {
//             console.warn(`⚠️ Lỗi tạo transaction ${i + 1}:`, err.message);
//         }
//     }

//     console.log(`✨ Done transactions with items: ${transactions.length}`);
//     return transactions;
// }

// /* ================== SEED: SUPPLIER TRANSACTION PAYMENTS ================== */
// async function seedSupplierTransactionPayments(transactions) {
//     if (!transactions?.length) handleError('Cần transactions để tạo payments.');
//     const users = await User.listUsers({ limit: 100 });
//     if (!users?.length) handleError('Cần users để tạo payments. Vui lòng seed user trước.');

//     console.log('🌱 Seeding Supplier Transaction Payments...');
//     let created = 0;

//     for (const t of transactions) {
//         try {
//             // ✅ Skip tạo payments cho transactions bị admin khóa
//             if (t.adminLocked) {
//                 console.log(`⚠️ Skip payment cho locked transaction: ${t.docNo}`);
//                 continue;
//             }

//             // ✅ 70% có payments
//             const shouldHavePayments = faker.helpers.weightedArrayElement([
//                 { weight: 0.3, value: false },
//                 { weight: 0.7, value: true },
//             ]);

//             if (!shouldHavePayments) {
//                 console.log(`ℹ️ No payments for ${t.docNo} (will stay draft)`);
//                 continue;
//             }

//             const numPayments = faker.number.int({ min: 1, max: 3 });

//             for (let j = 0; j < numPayments; j++) {
//                 const paidBy = faker.helpers.arrayElement(users);
//                 const createdBy = faker.helpers.arrayElement(users);

//                 // ✅ Tạo amount hợp lý dựa trên totalAmount
//                 const maxAmount = t.totalAmount || 1_000_000;
//                 const amount = faker.number.float({
//                     min: maxAmount * 0.1, // 10% của total
//                     max: maxAmount * 0.8, // 80% của total
//                     multipleOf: 1000,
//                 });

//                 const paidAt = faker.date.between({
//                     from: t.transDate,
//                     to: t.dueDate || new Date(),
//                 });
//                 const evdUrl = faker.image.urlPicsumPhotos({ width: 720, height: 1280, blur: 0 });

//                 await SupplierTransactionPayment.createSupplierTransactionPayment({
//                     transId: t.id,
//                     amount,
//                     paidAt,
//                     paidBy: paidBy.id,
//                     createdBy: createdBy.id,
//                     evdUrl,
//                     note: faker.helpers.maybe(() => `Payment ${j + 1} for ${t.docNo}`, {
//                         probability: 0.5,
//                     }),
//                 });

//                 created++;
//                 console.log(
//                     `✅ Payment: ${t.docNo} | ${amount.toLocaleString()} | ${paidBy.fullName}`
//                 );
//             }
//         } catch (err) {
//             console.warn(`⚠️ Lỗi tạo payments cho ${t.docNo}:`, err.message);
//         }
//     }

//     console.log(`✨ Hoàn thành tạo ${created} Payments.`);
//     return created;
// }

// /* ================== CLEAR FUNCTIONS ================== */
// async function clearAllFakeData() {
//     try {
//         console.log('🧹 Clear ALL fake data (theo suffix "_test")...');

//         // 1) Payments
//         const transIds = (
//             await query(`SELECT id FROM supplier_transactions WHERE doc_no ILIKE $1 ESCAPE '\\'`, [
//                 SUFFIX_PATTERN,
//             ])
//         ).rows.map((r) => r.id);

//         if (transIds.length > 0) {
//             const payIds = (
//                 await query(
//                     `SELECT id FROM supplier_transactions_payments WHERE trans_id = ANY($1::uuid[])`,
//                     [transIds]
//                 )
//             ).rows.map((r) => r.id);

//             if (payIds.length > 0) {
//                 const delPay = await SupplierTransactionPayment.deleteMany(payIds);
//                 console.log(`🗑️ Deleted payments: ${delPay}`);
//             }

//             // 2) Transaction items (sẽ được xóa bởi foreign key constraint)
//             const itemIds = (
//                 await query(
//                     `SELECT id FROM supplier_transaction_items WHERE trans_id = ANY($1::uuid[])`,
//                     [transIds]
//                 )
//             ).rows.map((r) => r.id);

//             if (itemIds.length > 0) {
//                 await query(
//                     `DELETE FROM supplier_transaction_items WHERE trans_id = ANY($1::uuid[])`,
//                     [transIds]
//                 );
//                 console.log(`🗑️ Deleted transaction items: ${itemIds.length}`);
//             }

//             // 3) Transactions
//             await query(`DELETE FROM supplier_transactions WHERE doc_no ILIKE $1 ESCAPE '\\'`, [
//                 SUFFIX_PATTERN,
//             ]);
//             console.log(`🗑️ Deleted transactions: ${transIds.length}`);
//         }

//         // 4) Suppliers
//         const supIds = (
//             await query(
//                 `SELECT id FROM suppliers WHERE code ILIKE $1 ESCAPE '\\' OR name ILIKE $1 ESCAPE '\\'`,
//                 [SUFFIX_PATTERN]
//             )
//         ).rows.map((r) => r.id);

//         if (supIds.length > 0) {
//             const delSup = await Supplier.deleteMany(supIds);
//             console.log(`🗑️ Deleted suppliers: ${delSup}`);
//         }

//         // 5) Unit conversions (phải xóa trước inventory lots)
//         const lotIds = (
//             await query(`SELECT id FROM inventory_lots WHERE lot_no ILIKE $1 ESCAPE '\\'`, [
//                 SUFFIX_PATTERN,
//             ])
//         ).rows.map((r) => r.id);

//         if (lotIds.length > 0) {
//             const conversionIds = (
//                 await query(`SELECT id FROM unit_conversions WHERE lot_id = ANY($1::uuid[])`, [
//                     lotIds,
//                 ])
//             ).rows.map((r) => r.id);

//             if (conversionIds.length > 0) {
//                 const delConversions = await UnitConversion.deleteMany(conversionIds);
//                 console.log(`🗑️ Deleted unit conversions: ${delConversions}`);
//             }
//         }

//         // 6) Inventory lots
//         if (lotIds.length > 0) {
//             const delLots = await InventoryLot.deleteMany(lotIds);
//             console.log(`🗑️ Deleted lots: ${delLots}`);
//         }

//         // 7) Products
//         const prodIds = (
//             await query(
//                 `SELECT id FROM products WHERE sku_code ILIKE $1 ESCAPE '\\' OR name ILIKE $1 ESCAPE '\\'`,
//                 [SUFFIX_PATTERN]
//             )
//         ).rows.map((r) => r.id);

//         if (prodIds.length > 0) {
//             const delProd = await Product.deleteMany(prodIds);
//             console.log(`🗑️ Deleted products: ${delProd}`);
//         }

//         // 8) Product categories
//         const catIds = (
//             await query(`SELECT id FROM product_categories WHERE name ILIKE $1 ESCAPE '\\'`, [
//                 SUFFIX_PATTERN,
//             ])
//         ).rows.map((r) => r.id);

//         if (catIds.length > 0) {
//             const delCat = await ProductCategory.deleteMany(catIds);
//             console.log(`🗑️ Deleted categories: ${delCat}`);
//         }

//         console.log('✅ Done CLEAR ALL.');
//         process.exit(0);
//     } catch (err) {
//         handleError('Lỗi clear ALL', err);
//     }
// }

// async function clearProductsAndInventory() {
//     try {
//         console.log('🧹 Clear products & inventory (theo suffix "_test")...');

//         const lotIds = (
//             await query(`SELECT id FROM inventory_lots WHERE lot_no ILIKE $1 ESCAPE '\\'`, [
//                 SUFFIX_PATTERN,
//             ])
//         ).rows.map((r) => r.id);

//         // Xóa unit conversions trước
//         if (lotIds.length > 0) {
//             const conversionIds = (
//                 await query(`SELECT id FROM unit_conversions WHERE lot_id = ANY($1::uuid[])`, [
//                     lotIds,
//                 ])
//             ).rows.map((r) => r.id);

//             if (conversionIds.length > 0) {
//                 const delConversions = await UnitConversion.deleteMany(conversionIds);
//                 console.log(`🗑️ Deleted unit conversions: ${delConversions}`);
//             }

//             const delLots = await InventoryLot.deleteMany(lotIds);
//             console.log(`🗑️ Deleted lots: ${delLots}`);
//         }

//         const prodIds = (
//             await query(
//                 `SELECT id FROM products WHERE sku_code ILIKE $1 ESCAPE '\\' OR name ILIKE $1 ESCAPE '\\'`,
//                 [SUFFIX_PATTERN]
//             )
//         ).rows.map((r) => r.id);

//         if (prodIds.length > 0) {
//             const delProd = await Product.deleteMany(prodIds);
//             console.log(`🗑️ Deleted products: ${delProd}`);
//         }

//         const catIds = (
//             await query(`SELECT id FROM product_categories WHERE name ILIKE $1 ESCAPE '\\'`, [
//                 SUFFIX_PATTERN,
//             ])
//         ).rows.map((r) => r.id);

//         if (catIds.length > 0) {
//             const delCat = await ProductCategory.deleteMany(catIds);
//             console.log(`🗑️ Deleted categories: ${delCat}`);
//         }

//         console.log('✅ Done CLEAR products & inventory.');
//         process.exit(0);
//     } catch (err) {
//         handleError('Lỗi clear products & inventory', err);
//     }
// }

// /* ================== MAIN SEED FUNCTIONS ================== */
// async function seedProductsAndInventory() {
//     console.log('🚀 Seed Products & Inventory...');
//     try {
//         const categories = await seedProductCategories();
//         const products = await seedProducts(categories);
//         const inventoryLots = await seedInventoryLots(products);
//         const unitConversions = await seedUnitConversions(inventoryLots);

//         console.log('🎉 Done seed Products & Inventory!');
//         console.log('📊 Summary:');
//         console.log(`   - Product Categories created : ${categories.length}`);
//         console.log(`   - Products created           : ${products.length}`);
//         console.log(`   - Inventory Lots created     : ${inventoryLots.length}`);
//         console.log(`   - Unit Conversions created   : ${unitConversions.length}`);

//         process.exit(0);
//     } catch (err) {
//         handleError('Lỗi seed Products & Inventory', err);
//     }
// }

// async function seedFullSystem() {
//     console.log('🚀 Seed FULL system with SupplierTransactionCombined...');
//     try {
//         // 1. Seed basic data
//         const categories = await seedProductCategories();
//         const products = await seedProducts(categories);
//         const inventoryLots = await seedInventoryLots(products);
//         const unitConversions = await seedUnitConversions(inventoryLots);

//         // 2. Get departments
//         const departments = await Department.listDepartments({ limit: 100 });
//         if (!departments?.length) {
//             throw new Error('Thiếu departments — tạo trước khi seed FULL.');
//         }

//         // 3. Seed suppliers and transactions (combined)
//         const suppliers = await seedSuppliers();
//         const transactions = await seedSupplierTransactionsWithItems(
//             suppliers,
//             departments,
//             products,
//             inventoryLots
//         );

//         // 4. Seed payments
//         const paymentsCount = await seedSupplierTransactionPayments(transactions);

//         console.log('🎉 Done seed FULL system!');
//         console.log('📊 Summary:');
//         console.log(`   - Product Categories created    : ${categories.length}`);
//         console.log(`   - Products created              : ${products.length}`);
//         console.log(`   - Inventory Lots created        : ${inventoryLots.length}`);
//         console.log(`   - Unit Conversions created      : ${unitConversions.length}`);
//         console.log(`   - Suppliers created             : ${suppliers.length}`);
//         console.log(`   - Transactions created (Combined): ${transactions.length}`);
//         console.log(`   - Payments created              : ${paymentsCount}`);
//         console.log('');
//         console.log('✨ Features:');
//         console.log('   - ✅ 1 lot = 1 unit conversion (UNIQUE constraint)');
//         console.log('   - ✅ Combined transaction creation (transaction + items + inventory)');
//         console.log('   - ✅ FEFO logic for "out" transactions');
//         console.log('   - ✅ Auto inventory lot management');

//         process.exit(0);
//     } catch (err) {
//         handleError('Lỗi seed FULL', err);
//     }
// }

// /* ================== CLI ENTRY POINT ================== */
// if (process.argv.includes('clear')) {
//     clearAllFakeData();
// } else if (process.argv.includes('clearProducts')) {
//     clearProductsAndInventory();
// } else if (process.argv.includes('products')) {
//     seedProductsAndInventory();
// } else {
//     seedFullSystem();
// }
