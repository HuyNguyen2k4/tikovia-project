// const router = require('express').Router();
// const ctrls = require('@controllers/supTransactionController');
// const tokenUtils = require('@middlewares/jwt');

// /* -------------------- Main CRUD Routes -------------------- */

// /**
//  * @desc Lấy danh sách supplier transaction items với unit conversion
//  * @route GET /api/supplier-transaction-items
//  * @query q, transId, productId, lotId, limit, offset
//  */
// router.get('/', [tokenUtils.verifyAccessToken], ctrls.getSupplierTransactionItems);

// /**
//  * @desc Tạo supplier transaction item mới
//  * @route POST /api/supplier-transaction-items
//  * @body transId, productId, lotId, qty, unitPrice
//  */
// router.post('/', [tokenUtils.verifyAccessToken], ctrls.createSupplierTransactionItem);

// /**
//  * @desc Lấy chi tiết 1 supplier transaction item với unit conversion
//  * @route GET /api/supplier-transaction-items/:id
//  */
// router.get('/:id', [tokenUtils.verifyAccessToken], ctrls.getSupplierTransactionItemById);

// /**
//  * @desc Cập nhật supplier transaction item
//  * @route PUT /api/supplier-transaction-items/:id
//  * @body transId?, productId?, lotId?, qty?, unitPrice?
//  */
// router.put('/:id', [tokenUtils.verifyAccessToken], ctrls.updateSupplierTransactionItem);

// /**
//  * @desc Xóa supplier transaction item
//  * @route DELETE /api/supplier-transaction-items/:id
//  */
// router.delete('/:id', [tokenUtils.verifyAccessToken], ctrls.deleteSupplierTransactionItem);

// /* -------------------- Relationship Routes -------------------- */

// /**
//  * @desc Lấy tất cả items của 1 transaction với unit conversion và summary
//  * @route GET /api/supplier-transaction-items/transaction/:transId
//  */
// router.get('/transaction/:transId', [tokenUtils.verifyAccessToken], ctrls.getItemsByTransactionId);

// /* -------------------- Stats & Analytics Routes -------------------- */

// /**
//  * @desc Lấy thống kê items với unit conversion
//  * @route GET /api/supplier-transaction-items/stats/conversion
//  * @query limit
//  */
// router.get('/stats/conversion', [tokenUtils.verifyAccessToken], ctrls.getItemsStatsWithConversion);

// /* -------------------- Utility Routes -------------------- */

// /**
//  * @desc Test timezone conversion
//  * @route GET /api/supplier-transaction-items/test-timezone
//  */
// router.get('/test-timezone', [tokenUtils.verifyAccessToken], ctrls.getTimezoneTest);

// module.exports = router;
