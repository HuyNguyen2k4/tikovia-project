const { createCanvas, registerFont } = require('canvas');

/**
 * Tạo ảnh biên lai từ payload bằng Canvas (fallback cho Puppeteer)
 * @param {object} payload Dữ liệu webhook từ SePay
 * @returns {Promise<Buffer>} Buffer của ảnh PNG
 */
async function generateReceiptImageCanvas(payload) {
    try {
        const width = 500;
        const height = 400;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // === 1. BACKGROUND VÀ BORDER ===
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Outer border
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        // Inner border
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1;
        ctx.strokeRect(20, 20, width - 40, height - 40);

        // === 2. HEADER ===
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BIÊN LAI THANH TOÁN', width / 2, 50);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText(`Ngân hàng: ${payload.gateway || 'N/A'}`, width / 2, 75);

        // === 3. SEPARATOR LINE ===
        ctx.beginPath();
        ctx.moveTo(30, 90);
        ctx.lineTo(width - 30, 90);
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2;
        ctx.stroke();

        // === 4. THÔNG TIN GIAO DỊCH ===
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';

        const infoY = 115;
        const lineHeight = 25;
        let currentY = infoY;

        // Chuẩn bị dữ liệu
        const transactionDate = payload.transactionDate
            ? new Date(payload.transactionDate).toLocaleString('vi-VN')
            : 'N/A';

        const transferType =
            payload.transferType === 'in'
                ? 'Tiền vào'
                : payload.transferType === 'out'
                  ? 'Tiền ra'
                  : 'N/A';

        const infoLines = [
            { label: 'Mã giao dịch:', value: payload.id?.toString() || 'N/A' },
            { label: 'Thời gian:', value: transactionDate },
            { label: 'Loại:', value: transferType },
            { label: 'Tài khoản:', value: payload.accountNumber || 'N/A' },
            { label: 'Nội dung:', value: payload.content || 'N/A' },
            { label: 'Mã tham chiếu:', value: payload.referenceCode || 'N/A' },
        ];

        // Draw info lines
        infoLines.forEach((line) => {
            // Label (màu xám)
            ctx.fillStyle = '#7f8c8d';
            ctx.fillText(line.label, 35, currentY);

            // Value (màu đen)
            ctx.fillStyle = '#2c3e50';
            const labelWidth = ctx.measureText(line.label).width;

            // Wrap text if too long
            const maxValueWidth = width - 80 - labelWidth;
            const wrappedValue = wrapText(ctx, line.value, maxValueWidth);

            if (wrappedValue.length === 1) {
                ctx.fillText(wrappedValue[0], 40 + labelWidth, currentY);
            } else {
                wrappedValue.forEach((textLine, index) => {
                    const xOffset = index > 0 ? 20 : 0;
                    ctx.fillText(textLine, 40 + labelWidth + xOffset, currentY + index * 15);
                });
                currentY += (wrappedValue.length - 1) * 15;
            }

            currentY += lineHeight;
        });

        // === 5. SEPARATOR LINE 2 ===
        ctx.beginPath();
        ctx.moveTo(30, currentY + 5);
        ctx.lineTo(width - 30, currentY + 5);
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2;
        ctx.stroke();

        // === 6. AMOUNT (HIGHLIGHT) ===
        currentY += 25;
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Số tiền:', 35, currentY);

        const amount = payload.transferAmount || 0;
        const amountText = `${amount.toLocaleString('vi-VN')} VNĐ`;
        ctx.fillStyle = '#c0392b';
        ctx.font = 'bold 18px Arial';
        const amountX = 35 + ctx.measureText('Số tiền: ').width;
        ctx.fillText(amountText, amountX, currentY);

        // === 7. FOOTER ===
        ctx.fillStyle = '#95a5a6';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';

        const footerY = height - 45;
        ctx.fillText('Hệ thống tự động tạo bởi Tikovia', width / 2, footerY);
        ctx.fillText(new Date().toLocaleString('vi-VN'), width / 2, footerY + 15);

        // === 8. DECORATIVE ELEMENTS ===
        // Corner dots
        drawCornerDecoration(ctx, 25, 25, 6, '#3498db');
        drawCornerDecoration(ctx, width - 25, 25, 6, '#3498db');
        drawCornerDecoration(ctx, 25, height - 25, 6, '#3498db');
        drawCornerDecoration(ctx, width - 25, height - 25, 6, '#3498db');

        console.log(
            `✅ Canvas receipt generated successfully, size: ${width}x${height}, amount: ${amountText}`
        );
        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error('❌ Lỗi khi tạo ảnh bằng Canvas:', error.message);
        throw new Error(`Tạo ảnh Canvas thất bại: ${error.message}`);
    }
}

/**
 * Helper function to wrap text
 */
function wrapText(ctx, text, maxWidth) {
    if (!text) return [''];

    const words = text.toString().split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
}

/**
 * Helper function to draw corner decorations
 */
function drawCornerDecoration(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.fill();
}

module.exports = { generateReceiptImageCanvas };
