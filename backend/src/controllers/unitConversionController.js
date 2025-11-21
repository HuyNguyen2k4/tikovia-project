// const asyncHandler = require('express-async-handler');
// const UnitConversion = require('@src/models/UnitConversions');
// const InventoryLot = require('@src/models/InventoryLots');
// const dayjs = require('dayjs');
// const utc = require('dayjs/plugin/utc');
// const timezone = require('dayjs/plugin/timezone');

// // Cấu hình dayjs
// dayjs.extend(utc);
// dayjs.extend(timezone);

// /* -------------------- Helpers -------------------- */
// // Helper function để parse date từ frontend
// const parseDate = (dateString) => {
//     if (!dateString) return null;
//     try {
//         const parsed = dayjs(dateString);
//         if (!parsed.isValid()) throw new Error('Invalid date format');
//         return parsed.utc().toDate();
//     } catch (error) {
//         throw new Error(`Invalid date: ${error.message}`);
//     }
// };

// const isUuid = (id) =>
//     /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

// const validateLotExists = async (lotId) => {
//     if (!lotId) return;
//     const lot = await InventoryLot.findById(lotId);
//     if (!lot) throw new Error(`Inventory Lot ID '${lotId}' không tồn tại`);
// };

// const validateUnit = (label, value) => {
//     if (!value || !String(value).trim()) throw new Error(`${label} là bắt buộc`);
//     return String(value).trim();
// };

// const validateRate = (value) => {
//     const num = Number(value);
//     if (Number.isNaN(num) || num <= 0) throw new Error('conversionRate phải là số > 0');
//     return num;
// };

// /* -------------------- Controllers -------------------- */

// /**
//  * @desc Lấy danh sách các unit conversion với bộ lọc và phân trang
//  * @route GET /api/unit-conversions
//  * @access Private
//  * @query q, lotId, packUnit, mainUnit, limit, offset
//  */
// const getUnitConversions = asyncHandler(async (req, res) => {
//     const { q, lotId, packUnit, mainUnit, limit, offset } = req.query;
//     const parsedLimit = parseInt(limit, 10) || 20;
//     const parsedOffset = parseInt(offset, 10) || 0;
//     const maxLimit = 100;

//     const [items, total] = await Promise.all([
//         UnitConversion.listUnitConversions({
//             q: q ? q.trim() : undefined,
//             lotId,
//             packUnit,
//             mainUnit,
//             limit: Math.min(parsedLimit, maxLimit),
//             offset: parsedOffset,
//         }),
//         UnitConversion.countUnitConversions({
//             q: q ? q.trim() : undefined,
//             lotId,
//             packUnit,
//             mainUnit,
//         }),
//     ]);

//     res.status(200).json({
//         success: true,
//         data: items,
//         pagination: { total, limit: parsedLimit, offset: parsedOffset },
//     });
// });

// /**
//  * @desc Tạo mới một unit conversion
//  * @route POST /api/unit-conversions
//  * @access Private
//  * @body lotId, packUnit, mainUnit, conversionRate
//  */
// const createUnitConversion = asyncHandler(async (req, res) => {
//     const { lotId, packUnit, mainUnit, conversionRate } = req.body;
//     if (!lotId) return res.status(400).json({ success: false, message: 'lotId là bắt buộc' });

//     await validateLotExists(lotId);
//     const pack = validateUnit('packUnit', packUnit);
//     const main = validateUnit('mainUnit', mainUnit);
//     const rate = validateRate(conversionRate);

//     // ✅ Thay đổi: chỉ kiểm tra lot_id đã có conversion chưa
//     const exists = await UnitConversion.isConversionExists(lotId);
//     if (exists)
//         return res.status(409).json({
//             success: false,
//             message: `Lot này đã có unit conversion. Mỗi lot chỉ được có 1 unit conversion.`,
//         });

//     const created = await UnitConversion.createUnitConversion({
//         lotId,
//         packUnit: pack,
//         mainUnit: main,
//         conversionRate: rate,
//     });

//     res.status(201).json({
//         success: true,
//         message: 'Tạo unit conversion thành công',
//         data: created,
//     });
// });

// /**
//  * @desc Cập nhật một unit conversion theo ID
//  * @route PUT /api/unit-conversions/:id
//  * @access Private
//  * @param id
//  * @body lotId, packUnit, mainUnit, conversionRate
//  */
// const updateUnitConversion = asyncHandler(async (req, res) => {
//     const { id } = req.params;
//     const { lotId, packUnit, mainUnit, conversionRate } = req.body;
//     const existing = await UnitConversion.findById(id);
//     if (!existing)
//         return res.status(404).json({ success: false, message: 'Không tìm thấy unit conversion' });

//     // ✅ Thay đổi: nếu update lotId thì kiểm tra lot mới đã có conversion chưa
//     if (lotId && lotId !== existing.lotId) {
//         await validateLotExists(lotId);
//         const existsInNewLot = await UnitConversion.isConversionExists(lotId);
//         if (existsInNewLot)
//             return res.status(409).json({
//                 success: false,
//                 message: 'Lot đích đã có unit conversion. Mỗi lot chỉ được có 1 unit conversion.',
//             });
//     }

//     const payload = {};
//     if (lotId) payload.lotId = lotId;
//     if (packUnit) payload.packUnit = validateUnit('packUnit', packUnit);
//     if (mainUnit) payload.mainUnit = validateUnit('mainUnit', mainUnit);
//     if (conversionRate) payload.conversionRate = validateRate(conversionRate);

//     const updated = await UnitConversion.updateUnitConversion(id, payload);
//     res.status(200).json({ success: true, message: 'Cập nhật thành công', data: updated });
// });

// /**
//  * @desc Xóa một unit conversion theo ID
//  * @route DELETE /api/unit-conversions/:id
//  * @access Private
//  * @param id
//  */
// const deleteUnitConversion = asyncHandler(async (req, res) => {
//     const { id } = req.params;
//     const existing = await UnitConversion.findById(id);
//     if (!existing)
//         return res.status(404).json({ success: false, message: 'Không tìm thấy unit conversion' });

//     await UnitConversion.deleteUnitConversion(id);
//     res.status(200).json({ success: true, message: 'Xóa unit conversion thành công' });
// });

// /**
//  * @desc Lấy unit conversion theo lotId (chỉ có 1 conversion per lot)
//  * @route GET /api/unit-conversions/by-lot/:lotId
//  * @access Private
//  * @param lotId
//  */
// const getUnitConversionByLot = asyncHandler(async (req, res) => {
//     const { lotId } = req.params;
//     const lot = await InventoryLot.findById(lotId);
//     if (!lot)
//         return res.status(404).json({ success: false, message: 'Không tìm thấy inventory lot' });

//     const conversion = await UnitConversion.findByLotId(lotId);

//     res.status(200).json({
//         success: true,
//         data: conversion,
//         lot: {
//             id: lot.id,
//             lotNo: lot.lotNo,
//             productName: lot.productName,
//             expiryDate: lot.expiryDate,
//         },
//     });
// });

// /**
//  * @desc Lấy thông tin conversion cho một lot
//  * @route GET /api/unit-conversions/rate
//  * @access Private
//  * @query lotId
//  */
// const getConversionRate = asyncHandler(async (req, res) => {
//     const { lotId } = req.query;
//     if (!lotId) return res.status(400).json({ success: false, message: 'lotId là bắt buộc' });

//     await validateLotExists(lotId);
//     const conversionInfo = await UnitConversion.findConversionRate(lotId);

//     if (!conversionInfo) {
//         return res.status(404).json({
//             success: false,
//             message: 'Lot này chưa có unit conversion',
//         });
//     }

//     res.status(200).json({
//         success: true,
//         data: {
//             lotId,
//             ...conversionInfo,
//         },
//     });
// });

// /**
//  * @desc    Lấy chi tiết 1 unit conversion theo ID
//  * @route   GET /api/unit-conversions/:id
//  * @access  Private
//  * @param   id
//  */
// const getUnitConversionById = asyncHandler(async (req, res) => {
//     const { id } = req.params;

//     // Validate UUID
//     if (!isUuid(id)) {
//         return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
//     }

//     // Lấy dữ liệu conversion
//     const existing = await UnitConversion.findById(id);
//     if (!existing) {
//         return res.status(404).json({ success: false, message: 'Không tìm thấy unit conversion' });
//     }

//     // Lấy thông tin lot (và qua đó có product info)
//     const lot = await InventoryLot.findById(existing.lotId);

//     res.status(200).json({
//         success: true,
//         data: existing,
//         lot: lot
//             ? {
//                   id: lot.id,
//                   lotNo: lot.lotNo,
//                   expiryDate: lot.expiryDate,
//                   productId: lot.productId,
//               }
//             : null,
//     });
// });

// /**
//  * @desc    Test timezone conversion cho unit conversions
//  * @route   GET /api/unit-conversions/test-timezone
//  * @access  Private
//  * Note:    Chưa đưa vào route chính thức, chỉ để dev test
//  */
// const getTimezoneTest = asyncHandler(async (req, res) => {
//     const now = new Date();

//     res.status(200).json({
//         success: true,
//         data: {
//             server_utc: now.toISOString(),
//             server_vietnam: dayjs.utc(now).tz('Asia/Ho_Chi_Minh').format(),
//             dayjs_vietnam: dayjs().tz('Asia/Ho_Chi_Minh').format(),
//             timezone_info: {
//                 current_offset: dayjs().tz('Asia/Ho_Chi_Minh').format('Z'),
//                 timezone_name: 'Asia/Ho_Chi_Minh',
//             },
//         },
//     });
// });

// /* -------------------- EXPORT -------------------- */
// module.exports = {
//     getUnitConversions,
//     createUnitConversion,
//     updateUnitConversion,
//     deleteUnitConversion,
//     getUnitConversionByLot,
//     getConversionRate,
//     getUnitConversionById,
//     getTimezoneTest,
// };
