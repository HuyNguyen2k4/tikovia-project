const { uploadToR2, deleteFromR2 } = require('@config/r2.config');
const path = require('path');
const fs = require('fs');

class UploadService {
    /**
     * Upload một file lên Cloudflare R2
     * @param {Object} file - File object từ multer
     * @param {string} folder - Folder trong bucket (default: 'products')
     * @returns {Object} - Kết quả upload
     */
    static async uploadFile(file, folder = 'products') {
        try {
            if (!file) {
                throw new Error('Không có file để upload');
            }

            const uploadResult = await uploadToR2(file.path, file.filename, folder);

            if (uploadResult.success) {
                return {
                    success: true,
                    url: uploadResult.url,
                    key: uploadResult.key,
                    originalName: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype,
                };
            } else {
                throw new Error(uploadResult.error);
            }
        } catch (error) {
            console.error('UploadService.uploadFile error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Upload nhiều file lên Cloudflare R2
     * @param {Array} files - Array các file object từ multer
     * @param {string} folder - Folder trong bucket
     * @returns {Object} - Kết quả upload
     */
    static async uploadMultipleFiles(files, folder = 'products') {
        try {
            if (!files || files.length === 0) {
                throw new Error('Không có file để upload');
            }

            const uploadPromises = files.map((file) => this.uploadFile(file, folder));
            const results = await Promise.all(uploadPromises);

            const successful = results.filter((result) => result.success);
            const failed = results.filter((result) => !result.success);

            return {
                success: failed.length === 0,
                successful,
                failed,
                total: files.length,
                successCount: successful.length,
                failCount: failed.length,
            };
        } catch (error) {
            console.error('UploadService.uploadMultipleFiles error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Xóa file từ Cloudflare R2
     * @param {string} key - Key của file trong R2
     * @returns {Object} - Kết quả xóa
     */
    static async deleteFile(key) {
        try {
            if (!key) {
                throw new Error('Key không được để trống');
            }

            const deleteResult = await deleteFromR2(key);
            return deleteResult;
        } catch (error) {
            console.error('UploadService.deleteFile error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Lấy URL public của file từ R2
     * @param {string} key - Key của file trong R2
     * @returns {string} - Public URL
     */
    static getPublicUrl(key) {
        if (!key) return null;

        console.log('Generating public URL for key:', key);
        // Nếu key đã chứa domain, trả về nguyên
        if (key.startsWith('http')) {
            return key;
        }

        //Tạo link public từ biến môi trường
        const publicEndpoint = process.env.R2_PUBLIC_SEPAY_EVD;
        console.log('Public Endpoint:', publicEndpoint);
        if (publicEndpoint) {
            return `${publicEndpoint}/${key}`;
        }

        // Tạo public URL từ key (cái này ko trả về link public)
        const bucketName = process.env.R2_BUCKET_NAME;
        const accountId = process.env.R2_ACCOUNT_ID;
        if (accountId && bucketName) {
            return `https://pub-${accountId}.r2.dev/${key}`;
        }

        // Fallback: sử dụng endpoint + bucket + key
        const endpoint = process.env.R2_ENDPOINT;
        if (endpoint && bucketName) {
            return `${endpoint}/${bucketName}/${key}`;
        }

        return key;
    }

    /**
     * Validate file type
     * @param {string} mimetype - MIME type của file
     * @returns {boolean} - File có hợp lệ không
     */
    static isValidImageType(mimetype) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        return allowedTypes.includes(mimetype);
    }

    /**
     * Validate file size
     * @param {number} size - Kích thước file (bytes)
     * @param {number} maxSize - Kích thước tối đa (bytes, default: 10MB)
     * @returns {boolean} - File size có hợp lệ không
     */
    static isValidFileSize(size, maxSize = 10 * 1024 * 1024) {
        return size <= maxSize;
    }
}

module.exports = UploadService;
