// require('module-alias/register');
// const { faker } = require('@faker-js/faker');
// const { query } = require('@src/config/dbconnect');
// const Customer = require('@models/Customers');
// const User = require('@models/Users');

// const NUM_CUSTOMERS = 30; // Số lượng khách hàng cần tạo
// const TEST_SUFFIX = '_test'; // Suffix để dễ dàng xóa dữ liệu giả

// function handleError(message, error) {
//     console.error(`🔥🔥🔥 ${message}`, error);
//     process.exit(1);
// }

// function fakeVietnamPhone() {
//     const prefixes = ['09', '08', '03', '07', '05']; // Các đầu số phổ biến
//     const prefix = faker.helpers.arrayElement(prefixes);
//     const rest = faker.string.numeric(8); // 8 số còn lại
//     return prefix + rest;
// }

// async function seedCustomers() {
//     console.log('🌱 Bắt đầu tạo dữ liệu cho Customers...');
//     const customers = [];

//     // Lấy danh sách users có role là 'seller' hoặc 'admin' để làm managed_by
//     const managers = await User.listUsers({
//         role: ['seller', 'admin'],
//         limit: 100,
//     });

//     if (!managers?.length) {
//         handleError('Không tìm thấy users với role "seller" hoặc "admin".');
//     }

//     for (let i = 0; i < NUM_CUSTOMERS; i++) {
//         try {
//             const name = faker.person.fullName();
//             const code = `CUST${String(i + 1).padStart(4, '0')}${TEST_SUFFIX}`;
//             const phone = fakeVietnamPhone();
//             const email = faker.helpers.maybe(() => faker.internet.email(name), {
//                 probability: 0.8,
//             });
//             const address = faker.helpers.maybe(() => faker.location.streetAddress(), {
//                 probability: 0.7,
//             });
//             const taxCode = faker.helpers.maybe(() => faker.string.numeric(10), {
//                 probability: 0.5,
//             });
//             const creditLimit = faker.helpers.maybe(
//                 () => faker.number.float({ min: 10_000_000, max: 100_000_000, precision: 0.001 }),
//                 { probability: 0.6 }
//             );
//             const note = faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 });
//             // Lấy id của seller hoặc admin ngẫu nhiên (để làm managed_by)
//             const managedBy = faker.helpers.arrayElement(managers).id;

//             const newCustomer = await Customer.createCustomer({
//                 code,
//                 name,
//                 phone,
//                 email,
//                 address,
//                 taxCode,
//                 creditLimit,
//                 note,
//                 managedBy,
//             });

//             customers.push(newCustomer);
//             console.log(`✅ Customer: ${newCustomer.name} (${newCustomer.code})`);
//         } catch (error) {
//             if (error.code !== '23505') {
//                 handleError('Lỗi nghiêm trọng khi tạo Customer, dừng tiến trình.', error);
//             } else {
//                 console.warn('⚠️ Trùng dữ liệu customer, bỏ qua 1 bản ghi');
//             }
//         }
//     }

//     console.log(`✨ Hoàn thành tạo ${customers.length} Customers.`);
//     return customers;
// }

// async function clearFakeCustomers() {
//     try {
//         console.log('🧹 Bắt đầu xóa dữ liệu giả cho Customers (theo suffix "_test")...');

//         const delCustomers = await query(
//             `DELETE FROM customers
//              WHERE code LIKE $1 ESCAPE '\\'`,
//             [`%\\${TEST_SUFFIX}`]
//         );

//         console.log(`🗑️ Đã xóa ${delCustomers.rowCount} Customers.`);
//         console.log('✅ Hoàn tất xóa dữ liệu giả.');
//         process.exit(0);
//     } catch (error) {
//         handleError('Lỗi khi xóa dữ liệu giả cho Customers.', error);
//     }
// }

// async function seedAll() {
//     console.log('🚀 Bắt đầu quá trình tạo dữ liệu giả cho Customers...');
//     try {
//         await seedCustomers();
//         console.log('🎉🎉🎉 Tạo dữ liệu giả thành công! 🎉🎉🎉');
//         process.exit(0);
//     } catch (error) {
//         handleError('Đã xảy ra lỗi không mong muốn trong quá trình tạo dữ liệu.', error);
//     }
// }

// /* ---------- CLI entry ---------- */
// // Nếu chạy với tham số "clear" thì chỉ clear, KHÔNG seed
// if (process.argv.includes('clear')) {
//     clearFakeCustomers();
// } else {
//     seedAll();
// }
