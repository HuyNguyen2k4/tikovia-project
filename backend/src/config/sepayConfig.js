require('dotenv').config();

const sepayConfig = {
    apiKey: process.env.SEPAY_API_KEY || 'default_api_key', // API key dùng để xác thực webhook từ SePay
    secretKey: process.env.SEPAY_API_SECRET || 'default_api_secret', // Secret key dùng để ký request từ SePay
    merchantCode: process.env.SEPAY_MERCHANT_CODE || 'TIKOVIA_MERCHANT_CODE', // Mã merchant của Tikovia trên SePay
    endpoint: process.env.SEPAY_ENDPOINT || 'https://api.sepay.com', // Endpoint API của SePay (Production)
    transferContentPrefix: process.env.SEPAY_TRANSFER_CONTENT_PREFIX || 'THANH TOAN HOA DON',
    timeout: parseInt(process.env.SEPAY_TIMEOUT_MS, 10) || 10000, // in milliseconds
};

module.exports = sepayConfig;
