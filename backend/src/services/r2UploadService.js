// src/services/r2UploadService.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomBytes } = require('crypto');

// Tái sử dụng hàm makeS3Client từ uploadController.js của bạn
const makeS3Client = () => {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const accountId = process.env.R2_ACCOUNT_ID;

    const s3Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    return new S3Client({
        region: 'auto',
        endpoint: s3Endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: false,
    });
};

/**
 * Upload một buffer lên Cloudflare R2
 * @param {Buffer} buffer Dữ liệu file
 * @param {string} contentType Loại file (vd: 'image/png')
 * @param {string} ext Đuôi file (vd: 'png')
 * @param {string} folder Thư mục trên R2 (vd: 'evidence')
 * @returns {Promise<string>} URL public của file
 */
async function uploadBufferToR2(buffer, contentType, ext, folder = 'evidence') {
    try {
        const s3 = makeS3Client();
        const bucket = process.env.R2_BUCKET_NAME;

        const key = `${folder}/${randomBytes(8).toString('hex')}-${Date.now()}.${ext}`;

        const params = {
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        };

        await s3.send(new PutObjectCommand(params));

        // Lấy public URL (giống như trong uploadController.js)
        const publicEndpoint =
            process.env.R2_PUBLIC_SEPAY_EVD || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;
        const url = `${publicEndpoint}/${key}`;

        return url;
    } catch (err) {
        console.error('Lỗi khi upload buffer lên R2:', err);
        throw new Error('Upload to R2 failed');
    }
}

module.exports = { uploadBufferToR2 };
