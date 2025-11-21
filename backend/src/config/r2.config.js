const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

// Cấu hình Cloudflare R2
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, // S3-compatible endpoint
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Cấu hình multer để lưu file tạm thời
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/temp/');
    },
    filename: function (req, file, cb) {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép upload file ảnh (JPEG, PNG, WebP)'), false);
        }
    }
});

// Hàm upload file lên R2
const uploadToR2 = async (filePath, fileName, folder = 'products') => {
    try {
        const fileStream = require('fs').createReadStream(filePath);
        
        const uploadParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: `${folder}/${fileName}`,
            Body: fileStream,
            ContentType: 'image/jpeg', // Có thể detect từ file extension
        };

        const upload = new Upload({
            client: r2Client,
            params: uploadParams,
        });

        const result = await upload.done();
        
        // Xóa file tạm thời sau khi upload
        require('fs').unlinkSync(filePath);
        
        return {
            success: true,
            url: result.Location,
            key: result.Key,
            bucket: result.Bucket
        };
    } catch (error) {
        console.error('Error uploading to R2:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Hàm xóa file từ R2
const deleteFromR2 = async (key) => {
    try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        
        const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        await r2Client.send(command);
        return { success: true };
    } catch (error) {
        console.error('Error deleting from R2:', error);
        return { success: false, error: error.message };
    }
};

// Middleware để xử lý upload
const uploadMiddleware = (fieldName = 'image') => {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có file được upload'
                });
            }

            try {
                // Upload file lên R2
                const uploadResult = await uploadToR2(
                    req.file.path,
                    req.file.filename,
                    'products'
                );

                if (uploadResult.success) {
                    req.uploadedFile = {
                        url: uploadResult.url,
                        key: uploadResult.key,
                        originalName: req.file.originalname,
                        size: req.file.size
                    };
                    next();
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Lỗi khi upload file lên server',
                        error: uploadResult.error
                    });
                }
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Lỗi khi xử lý file upload',
                    error: error.message
                });
            }
        });
    };
};

module.exports = {
    r2Client,
    uploadToR2,
    deleteFromR2,
    uploadMiddleware,
    upload
};


