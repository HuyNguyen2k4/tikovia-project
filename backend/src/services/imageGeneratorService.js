const puppeteer = require('puppeteer');
const ejs = require('ejs');
const fs = require('fs').promises;
const path = require('path');

// ✅ ADDED: Import Canvas fallback
const { generateReceiptImageCanvas } = require('./canvasImageGeneratorService');

/**
 * Tạo ảnh biên lai từ payload của SePay bằng cách render HTML
 * @param {object} payload Dữ liệu webhook từ SePay
 * @returns {Promise<Buffer>} Buffer của ảnh PNG
 */
async function generateReceiptImage(payload) {
    let browser = null;
    try {
        // 1. Đầu tiên thử tìm template file
        const templatePath = path.join(__dirname, '../templates/receiptTemplate.ejs');

        let hasTemplate = false;
        try {
            await fs.access(templatePath);
            hasTemplate = true;
        } catch (error) {
            console.warn(`⚠️ Template file không tồn tại: ${templatePath}`);
        }

        // ✅ IMPROVED: Nếu không có template hoặc Puppeteer fail, dùng Canvas ngay
        if (!hasTemplate) {
            console.log('🎨 No template found, using Canvas fallback...');
            return await generateReceiptImageCanvas(payload);
        }

        // 2. Đọc và render template
        const templateString = await fs.readFile(templatePath, 'utf-8');
        const htmlContent = ejs.render(templateString, payload);

        // 3. ✅ IMPROVED: Cấu hình Puppeteer với timeout ngắn hơn
        const puppeteerConfig = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--enable-features=NetworkService,NetworkServiceInProcess',
                '--force-color-profile=srgb',
                '--disable-background-networking',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-default-apps',
                '--disable-sync',
            ],
            timeout: 20000, // ✅ Giảm timeout xuống 20s
            protocolTimeout: 20000,
        };

        // ✅ ADDED: Tự động tìm Chrome trên Windows
        if (process.platform === 'win32') {
            const possiblePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Chrome\\Application\\chrome.exe',
                process.env.CHROME_PATH, // Allow custom path via env
            ].filter(Boolean);

            for (const chromePath of possiblePaths) {
                try {
                    await fs.access(chromePath);
                    puppeteerConfig.executablePath = chromePath;
                    console.log(`🔍 Found Chrome at: ${chromePath}`);
                    break;
                } catch (error) {
                    // Continue to next path
                }
            }
        }

        console.log('🚀 Attempting Puppeteer launch with timeout 20s...');

        // ✅ IMPROVED: Wrap Puppeteer trong timeout
        const launchPromise = puppeteer.launch(puppeteerConfig);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Puppeteer launch timeout')), 20000);
        });

        browser = await Promise.race([launchPromise, timeoutPromise]);
        const page = await browser.newPage();

        // Set viewport và user agent
        await page.setViewport({ width: 800, height: 600 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // 4. Set content với timeout ngắn
        await page.setContent(htmlContent, {
            waitUntil: 'domcontentloaded', // ✅ Change from 'networkidle0' to faster option
            timeout: 10000, // ✅ Giảm timeout xuống 10s
        });

        // 5. Tìm element #receipt
        const receiptElement = await page.$('#receipt');
        if (!receiptElement) {
            throw new Error('Không tìm thấy element #receipt trong template');
        }

        // 6. Screenshot với timeout
        console.log('📸 Taking screenshot...');
        const screenshotPromise = receiptElement.screenshot({
            type: 'png', // ✅ Change back to PNG for better compatibility
            omitBackground: false,
        });

        const screenshotTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Screenshot timeout')), 10000);
        });

        const imageBuffer = await Promise.race([screenshotPromise, screenshotTimeoutPromise]);

        console.log(`✅ Puppeteer screenshot completed, buffer size: ${imageBuffer.length} bytes`);
        return imageBuffer;
    } catch (error) {
        console.error('❌ Lỗi Puppeteer chi tiết:', {
            message: error.message,
            code: error.code,
            syscall: error.syscall,
            stack: error.stack?.split('\n')[0], // Only first line of stack
        });

        // ✅ IMPROVED: Comprehensive fallback conditions
        const fallbackErrors = [
            'ECONNRESET',
            'ECONNREFUSED',
            'WebSocket',
            'timeout',
            'Protocol error',
            'Target closed',
            'Navigation timeout',
            'net::ERR_',
            'Session closed',
            'Connection closed',
            'launch timeout',
        ];

        const shouldFallback = fallbackErrors.some((errorType) =>
            error.message.toLowerCase().includes(errorType.toLowerCase())
        );

        if (shouldFallback) {
            console.log('🎨 Puppeteer failed, falling back to Canvas...');
            try {
                return await generateReceiptImageCanvas(payload);
            } catch (canvasError) {
                console.error('❌ Canvas fallback cũng thất bại:', canvasError.message);
                throw new Error(
                    `Both Puppeteer and Canvas failed. Puppeteer: ${error.message}, Canvas: ${canvasError.message}`
                );
            }
        } else {
            // For other unexpected errors, also try Canvas
            console.log('🎨 Unknown Puppeteer error, trying Canvas fallback...');
            try {
                return await generateReceiptImageCanvas(payload);
            } catch (canvasError) {
                console.error('❌ Canvas fallback thất bại:', canvasError.message);
                throw new Error(`Puppeteer error: ${error.message}`);
            }
        }
    } finally {
        // ✅ IMPROVED: Safe browser cleanup
        if (browser) {
            try {
                await Promise.race([
                    browser.close(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Browser close timeout')), 5000)
                    ),
                ]);
                console.log('🔒 Browser closed successfully');
            } catch (closeError) {
                console.error('⚠️ Error closing browser:', closeError.message);
                // Force close if needed
                try {
                    if (browser.process()) {
                        browser.process().kill('SIGKILL');
                    }
                } catch (killError) {
                    console.error('⚠️ Error force killing browser:', killError.message);
                }
            }
        }
    }
}

module.exports = { generateReceiptImage };

// const puppeteer = require('puppeteer'); // Thư viện mới
// const ejs = require('ejs'); // Thư viện mới
// const fs = require('fs').promises;
// const path = require('path');

// /**
//  * Tạo ảnh biên lai từ payload của SePay bằng cách render HTML
//  * @param {object} payload Dữ liệu webhook từ SePay. EJS sẽ tự động lấy các biến từ đây (vd: payload.transferAmount)
//  * @returns {Promise<Buffer>} Buffer của ảnh PNG
//  */
// async function generateReceiptImage(payload) {
//     let browser = null;
//     try {
//         // 1. Đọc file template HTML (EJS)
//         const templatePath = path.join(__dirname, '../templates/receiptTemplate.ejs');
//         const templateString = await fs.readFile(templatePath, 'utf-8');

//         // 2. Render HTML, inject dữ liệu từ payload vào
//         // Chúng ta truyền toàn bộ payload vào EJS, EJS sẽ tự lấy các biến nó cần
//         const htmlContent = ejs.render(templateString, payload);

//         // 3. Khởi chạy Puppeteer
//         // Các tham số '--no-sandbox' rất quan trọng khi chạy trên server (Linux, Docker)
//         browser = await puppeteer.launch({
//             headless: true, // Chạy ở chế độ không giao diện
//             args: [
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--disable-dev-shm-usage', // Tối ưu cho môi trường bộ nhớ chia sẻ
//                 '--single-process',
//             ],
//         });
//         const page = await browser.newPage();

//         // 4. Set nội dung HTML cho trang
//         // waitUntil: 'networkidle0' đảm bảo mọi tài nguyên (font, css) đã tải xong
//         await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

//         // 5. Tìm đến element #receipt
//         const receiptElement = await page.$('#receipt');

//         if (!receiptElement) {
//             throw new Error('Không tìm thấy element #receipt trong template.');
//         }

//         // 6. Chụp ảnh màn hình chỉ của element đó
//         const imageBuffer = await receiptElement.screenshot({
//             type: 'webp', // Chụp ảnh định dạng webp
//             quality: 85, // (Tùy chọn) 80-90 là mức chất lượng tốt và dung lượng nhẹ
//         });

//         return imageBuffer;
//     } catch (error) {
//         console.error('Lỗi khi tạo ảnh biên lai bằng Puppeteer:', error);
//         throw new Error('Tạo ảnh biên lai thất bại.');
//     } finally {
//         // 7. Luôn đóng trình duyệt dù thành công hay thất bại
//         if (browser) {
//             await browser.close();
//         }
//     }
// }

// module.exports = { generateReceiptImage };
