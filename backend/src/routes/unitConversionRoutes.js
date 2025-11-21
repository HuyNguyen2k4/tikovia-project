// const router = require('express').Router();
// const ctrls = require('@controllers/unitConversionController');
// const tokenUtils = require('@middlewares/jwt');

// /**
//  * @desc Lấy danh sách các unit conversion với bộ lọc và phân trang
//  * @route GET /api/unit-conversions
//  * @query q, lotId, packUnit, mainUnit, limit, offset
//  */
// router.get('/', [tokenUtils.verifyAccessToken], ctrls.getUnitConversions);

// /**
//  * @desc Tạo mới một unit conversion
//  * @route POST /api/unit-conversions
//  * @body lotId, packUnit, mainUnit, conversionRate
//  */
// router.post(
//     '/',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
//     ctrls.createUnitConversion
// );

// // ============ CÁC ROUTE TIỆN ÍCH ============
// // Note: Mỗi lot_id chỉ có 1 unit conversion (UNIQUE constraint)
// // Ví dụ: 1 lot chỉ có thể có 1 conversion như "thùng ↔ kg" hoặc "bó ↔ kg"

// /**
//  * @desc Lấy unit conversion theo lotId (chỉ có 1 conversion per lot)
//  * @route GET /api/unit-conversions/by-lot/:lotId
//  * @param lotId
//  */
// router.get('/by-lot/:lotId', [tokenUtils.verifyAccessToken], ctrls.getUnitConversionByLot); // ✅ Thay đổi tên

// /**
//  * @desc Lấy thông tin conversion cho một lot
//  * @route GET /api/unit-conversions/rate
//  * @query lotId (bỏ fromUnit, toUnit vì mỗi lot chỉ có 1 conversion)
//  */
// router.get('/rate', [tokenUtils.verifyAccessToken], ctrls.getConversionRate);

// // ============ CÁC ROUTE BASIC (CRUD) ============

// /**
//  * @desc    Lấy chi tiết 1 unit conversion theo ID
//  * @route   GET /api/unit-conversions/:id
//  * @param   id
//  */
// router.get('/:id', [tokenUtils.verifyAccessToken], ctrls.getUnitConversionById);

// /**
//  * @desc    Cập nhật 1 unit conversion theo ID
//  * @route   PUT /api/unit-conversions/:id
//  * @param   id
//  * @body    lotId, packUnit, mainUnit, conversionRate
//  */
// router.put(
//     '/:id',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
//     ctrls.updateUnitConversion
// );

// /**
//  * @desc    Xoá 1 unit conversion theo ID
//  * @route   DELETE /api/unit-conversions/:id
//  * @param   id
//  */
// router.delete(
//     '/:id',
//     [tokenUtils.verifyAccessToken, tokenUtils.checkRole(['admin', 'manager'])],
//     ctrls.deleteUnitConversion
// );

// module.exports = router;
