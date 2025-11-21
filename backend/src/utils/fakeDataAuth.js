// require('module-alias/register');
// const { faker } = require('@faker-js/faker');
// const { query } = require('@src/config/dbconnect'); // dùng query để clear
// const Department = require('@models/Departments');
// const User = require('@models/Users');

// const NUM_DEPARTMENTS = 5;
// const NUM_USERS = 20;
// const ROLES = [
//     'admin',
//     'manager',
//     'accountant',
//     'picker',
//     'sup_picker',
//     'shipper',
//     'sup_shipper',
//     'seller',
// ];
// const STATUSES = ['active', 'disable'];

// const TEST_SUFFIX = '_test';
// const GMAIL_DOMAIN = 'gmail.com';

// function handleError(message, error) {
//     console.error(`🔥🔥🔥 ${message}`, error);
//     process.exit(1);
// }

// function fakeVietnamPhone() {
//     const prefixes = ['09', '08', '03', '07', '05']; // các đầu số phổ biến
//     const prefix = faker.helpers.arrayElement(prefixes);
//     const rest = faker.string.numeric(8); // 8 số còn lại
//     return prefix + rest;
// }

// async function seedDepartments() {
//     console.log('🌱 Bắt đầu tạo dữ liệu cho Departments...');
//     const departments = [];

//     for (let i = 0; i < NUM_DEPARTMENTS; i++) {
//         // code = DEPTNAME_IDX_test (uppercase để dễ nhìn)
//         const deptName = faker.commerce.department();
//         const code = `${deptName.replace(/\W+/g, '').toUpperCase()}_${i}${TEST_SUFFIX}`;

//         try {
//             const newDept = await Department.createDepartment({
//                 code,
//                 name: deptName,
//                 address: faker.location.streetAddress(),
//                 status: faker.helpers.arrayElement(STATUSES),
//             });
//             departments.push(newDept);
//             console.log(`✅ Department: ${newDept.name} (${newDept.code})`);
//         } catch (error) {
//             // Bỏ qua duplicate; dừng nếu là lỗi khác
//             if (error.code !== '23505') {
//                 handleError('Lỗi nghiêm trọng khi tạo Department, dừng tiến trình.', error);
//             } else {
//                 console.warn(`⚠️ Trùng department code: ${code}`);
//             }
//         }
//     }

//     console.log(`✨ Hoàn thành tạo ${departments.length} Departments.`);
//     return departments;
// }

// async function seedUsers(departments) {
//     if (!departments?.length) {
//         handleError('Cần có danh sách departments để tạo Users.');
//     }

//     console.log('🌱 Bắt đầu tạo dữ liệu cho Users...');
//     let createdCount = 0;

//     for (let i = 0; i < NUM_USERS; i++) {
//         const fullName = faker.person.fullName();
//         const [firstName, lastName = ''] = fullName.split(' ');

//         try {
//             // username_base + _i_test
//             const usernameBase = faker.internet.username({ firstName, lastName }).toLowerCase();
//             const username = `${usernameBase}${TEST_SUFFIX}`;

//             // email luôn @gmail.com
//             // local-part an toàn, tránh ký tự lạ
//             const local = `${firstName}.${lastName}.${i}`.toLowerCase().replace(/[^a-z0-9.]+/g, '');
//             const email = `${local || `user${i}`}@${GMAIL_DOMAIN}`;

//             // Luôn tạo số VN dạng 10 số, bắt đầu bằng 09 hoặc 08
//             // function fakeVietnamPhone() {
//             //     const prefixes = ['09', '08', '03', '07', '05']; // các đầu số phổ biến
//             //     const prefix = faker.helpers.arrayElement(prefixes);
//             //     const rest = faker.string.numeric(8); // 8 số còn lại
//             //     return prefix + rest;
//             // }

//             await User.createUser({
//                 email,
//                 username,
//                 password: 'password123',
//                 fullName,
//                 phone: fakeVietnamPhone(),
//                 role: faker.helpers.arrayElement(ROLES),
//                 status: faker.helpers.arrayElement(STATUSES),
//                 avatar: faker.image.avatar(),
//                 departmentId: faker.helpers.arrayElement(departments).id,
//             });
//             createdCount++;
//             console.log(`✅ User: ${createdCount}/${NUM_USERS} (${username} | ${email})`);
//         } catch (error) {
//             if (error.code !== '23505') {
//                 handleError('Lỗi nghiêm trọng khi tạo User, dừng tiến trình.', error);
//             } else {
//                 console.warn('⚠️ Trùng dữ liệu user, bỏ qua 1 bản ghi');
//             }
//         }
//     }

//     console.log(`✨ Hoàn thành tạo ${createdCount} Users.`);
// }

// async function clearFakeData() {
//     try {
//         console.log('🧹 Bắt đầu xóa dữ liệu giả (theo suffix "_test" & gmail.com)...');

//         // Xóa Users trước (FK users.department_id)
//         const delUsers = await query(
//             `DELETE FROM users
//        WHERE username LIKE $1 ESCAPE '\\'
//           OR email LIKE $2`,
//             [`%\\${TEST_SUFFIX}`, `%@${GMAIL_DOMAIN}`]
//         );
//         console.log(`🗑️ Đã xóa ${delUsers.rowCount} Users.`);

//         // Xóa Departments sau (avoid FK issues)
//         const delDepts = await query(
//             `DELETE FROM departments
//        WHERE code LIKE $1 ESCAPE '\\'`,
//             [`%\\${TEST_SUFFIX}`]
//         );
//         console.log(`🗑️ Đã xóa ${delDepts.rowCount} Departments.`);

//         console.log('✅ Hoàn tất xóa dữ liệu giả.');
//         process.exit(0);
//     } catch (error) {
//         handleError('Lỗi khi xóa dữ liệu giả.', error);
//     }
// }

// // Hàm tạo dữ liệu tài khoản admin, manager, accountant, shipper, picker, sup_shipper, sup_picker, seller để dev test dễ dàng
// async function createTestUser(role, departments) {
//     const fullName = `${role.charAt(0).toUpperCase() + role.slice(1)} Test`;
//     const username = `${role}${TEST_SUFFIX}`;
//     const email = `${role}${TEST_SUFFIX}@${GMAIL_DOMAIN}`;

//     try {
//         await User.createUser({
//             email,
//             username,
//             password: 'password123',
//             fullName,
//             phone: fakeVietnamPhone(),
//             role,
//             status: 'active',
//             avatar: faker.image.avatar(),
//             departmentId: departments[0].id,
//         });
//         console.log(`✅ Tạo user test: ${username} (${role})`);
//     } catch (error) {
//         if (error.code !== '23505') {
//             handleError(`Lỗi khi tạo user test: ${username}`, error);
//         } else {
//             console.warn(`⚠️ User test đã tồn tại: ${username}`);
//         }
//     }
// }

// // Hàm tạo tài khoản cho từng cho dev test
// async function createDevUsers(props, departments) {
//     for (const { role, username, email, phone } of props) {
//         const fullName = `${role.charAt(0).toUpperCase() + role.slice(1)} Dev`;
//         try {
//             await User.createUser({
//                 email,
//                 username,
//                 password: 'password123',
//                 fullName,
//                 phone: phone || fakeVietnamPhone(),
//                 role: role || 'admin',
//                 status: 'active',
//                 avatar: faker.image.avatar(),
//                 departmentId: departments[0].id, // Giả sử dev users luôn thuộc department đầu tiên
//             });
//             console.log(`✅ Tạo user dev: ${username} (${role})`);
//         } catch (error) {
//             if (error.code !== '23505') {
//                 handleError(`Lỗi khi tạo user dev: ${username}`, error);
//             } else {
//                 console.warn(`⚠️ User dev đã tồn tại: ${username}`);
//             }
//         }
//     }
// }

// async function seedAll() {
//     console.log('🚀 Bắt đầu quá trình tạo dữ liệu giả...');
//     try {
//         const departments = await seedDepartments();
//         await seedUsers(departments);
//         // Tạo thêm user test với các role phổ biến
//         // (username = `${role}${TEST_SUFFIX}`) (password = password123)
//         for (const role of ROLES) {
//             await createTestUser(role, departments);
//         }
//         // Tạo tài khoản dev cụ thể
//         const devUsers = [
//             {
//                 role: 'admin',
//                 username: `devNam${TEST_SUFFIX}`,
//                 email: `pnam2212004@${GMAIL_DOMAIN}`,
//             },
//             {
//                 role: 'admin',
//                 username: `devTrung${TEST_SUFFIX}`,
//                 email: `trungnguyenngocktm@${GMAIL_DOMAIN}`,
//             },
//         ];
//         await createDevUsers(devUsers, departments);

//         console.log('🎉🎉🎉 Tạo dữ liệu giả thành công! 🎉🎉🎉');
//         process.exit(0);
//     } catch (error) {
//         handleError('Đã xảy ra lỗi không mong muốn trong quá trình tạo dữ liệu.', error);
//     }
// }

// /* ---------- CLI entry ---------- */
// // Nếu chạy với tham số "clear" thì chỉ clear, KHÔNG seed
// if (process.argv.includes('clear')) {
//     clearFakeData();
// } else {
//     seedAll();
// }
