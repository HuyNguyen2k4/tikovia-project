// utils/password.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Băm mật khẩu người dùng bằng bcrypt.
 * @param {string} plain - mật khẩu thuần
 * @returns {Promise<string>} - chuỗi hash bcrypt
 */
const hashPassword = async (plain) => {
    if (typeof plain !== 'string' || plain.length === 0) {
        throw new Error('Password is required');
    }
    return bcrypt.hash(plain, SALT_ROUNDS);
};

/**
 * So khớp mật khẩu thuần với hash đã lưu.
 * @param {string} plain - mật khẩu thuần user nhập
 * @param {string} hash - hash đã lưu trong DB
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (plain, hash) => {
    if (!hash) return false;
    return bcrypt.compare(plain, hash);
};

/**
 * Tạo token đặt lại mật khẩu (password reset).
 * Mặc định hết hạn sau 10 phút.
 *
 * @param {object} [opts]
 * @param {number} [opts.expiresInMinutes]
 * @returns {{ resetToken: string, passwordResetToken: string, passwordResetExpires: Date }}
 */
const createPasswordResetToken = (opts = {}) => {
    const expiresInMinutes = opts.expiresInMinutes || 10;

    // Token thuần gửi qua email (không lưu DB)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash của token để lưu DB
    const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const passwordResetExpires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    return { resetToken, passwordResetToken, passwordResetExpires };
};

module.exports = {
    hashPassword,
    verifyPassword,
    createPasswordResetToken,
};
