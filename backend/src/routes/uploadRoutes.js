const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadController = require('@controllers/uploadController');

router.post('/', upload.single('file'), uploadController.uploadFile);
router.delete('/:key', uploadController.deleteFile);

module.exports = router;