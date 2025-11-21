require('dotenv').config();

const mailResetPassword = (resetToken) => {
    // Kiểm tra đầu vào
    if (!resetToken || typeof resetToken !== 'string') {
        throw new Error('Thiếu hoặc resetToken không hợp lệ');
    }

    // Kiểm tra biến môi trường
    if (!process.env.CLIENT_URL) {
        throw new Error('CLIENT_URL chưa được cấu hình trong biến môi trường');
    }

    // Trả về HTML tiếng Việt
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Đặt lại mật khẩu tài khoản Tikovia</title>
  <style>
    body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background-color:#e3f2fd !important; color:#222; }
    a { text-decoration:none; }
    .container { max-width:600px; width:100%; margin:20px auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.08); overflow:hidden; }
    .header { background-color:#1976d2 !important; padding:22px; text-align:center; }
    .brand { color:#ffffff; font-size:24px; margin:8px 0 0; font-weight:800; letter-spacing:0.3px; }
    .tagline { color:#bbdefb; font-size:13px; margin:6px 0 0; }
    .body { padding:28px; background-color:#ffffff; }
    .title { color:#1565c0; font-size:20px; margin:0 0 12px; font-weight:700; }
    .paragraph { margin:0 0 16px; font-size:15px; line-height:1.7; color:#333; }
    .btn { display:inline-block; padding:12px 28px; background-color:#ff9800 !important; color:#fff !important; font-weight:700; font-size:16px; border-radius:8px; margin:18px 0; }
    .note { font-size:13px; color:#666; word-break:break-all; }
    .footer { background-color:#e3f2fd !important; padding:18px; text-align:center; }
    .footer a { color:#1976d2; }
    @media only screen and (max-width:600px) {
      .body { padding:22px 16px; }
      .title { font-size:18px; }
      .btn { padding:10px 22px; font-size:15px; }
    }
  </style>
</head>
<body style="background-color:#e3f2fd !important;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e3f2fd;">
    <tr>
      <td style="padding:20px 0;">
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; margin:0 auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.08); overflow:hidden;">
          <!-- Header -->
          <tr>
            <td class="header" style="background-color:#1976d2 !important; padding:22px; text-align:center;">
              <img src="https://yourdomain.com/logo.png" alt="Logo Tikovia" style="max-width:140px;height:auto;display:block;margin:0 auto 6px;">
              <h1 class="brand" style="color:#ffffff; font-size:24px; margin:8px 0 0; font-weight:800; letter-spacing:0.3px;">Tikovia</h1>
              <p class="tagline" style="color:#bbdefb; font-size:13px; margin:6px 0 0;">Trao quyền cho trải nghiệm số của bạn</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="body" style="padding:28px; background-color:#ffffff;">
              <h2 class="title" style="color:#1565c0; font-size:20px; margin:0 0 12px; font-weight:700;">Yêu cầu đặt lại mật khẩu</h2>

              <p class="paragraph" style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#333;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Tikovia của bạn. 
                Vui lòng nhấn vào nút bên dưới để tạo mật khẩu mới.
              </p>

              <p class="paragraph" style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#333;">
                Lưu ý: Liên kết đặt lại có hiệu lực trong <strong>10 phút</strong> kể từ khi bạn nhận được email này.
              </p>

              <p style="text-align:center;">
                <a class="btn" href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}" style="display:inline-block; padding:12px 28px; background-color:#ff9800 !important; color:#fff !important; font-weight:700; font-size:16px; border-radius:8px; margin:18px 0; text-decoration:none;">
                  Đặt lại mật khẩu
                </a>
              </p>

              <p class="paragraph" style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#333;">
                Nếu nút không hoạt động, hãy sao chép và dán liên kết sau vào trình duyệt của bạn:
                <br />
                <span class="note" style="font-size:13px; color:#666; word-break:break-all;">${process.env.CLIENT_URL}/reset-password?token=${resetToken}</span>
              </p>

              <p class="paragraph" style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#333;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. 
                Hoặc bạn có thể liên hệ <a href="mailto:support@tikovia.com" style="color:#1976d2;font-weight:600;">đội ngũ hỗ trợ</a> của chúng tôi để được trợ giúp.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="background-color:#e3f2fd !important; padding:18px; text-align:center;">
              <p style="margin:0;font-size:12px;color:#555;">
                © ${new Date().getFullYear()} Tikovia. Mọi quyền được bảo lưu.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#555;">
                <a href="${process.env.CLIENT_URL}/privacy" style="color:#1976d2;">Chính sách bảo mật</a> |
                <a href="${process.env.CLIENT_URL}/terms" style="color:#1976d2;">Điều khoản sử dụng</a> |
                <a href="${process.env.CLIENT_URL}/contact" style="color:#1976d2;">Liên hệ</a>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#555;">
                Kết nối với chúng tôi:
                <a href="https://facebook.com/tikovia" style="margin:0 6px; color:#1976d2;">Facebook</a> |
                <a href="https://instagram.com/tikovia" style="margin:0 6px; color:#1976d2;">Instagram</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

const mailResetPassNewUser = (resetToken, fullName = '') => {
    if (!resetToken || typeof resetToken !== 'string') {
        throw new Error('Thiếu hoặc resetToken không hợp lệ');
    }
    if (!process.env.CLIENT_URL) {
        throw new Error('CLIENT_URL chưa được cấu hình trong biến môi trường');
    }

    const name = fullName || 'bạn';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Chào mừng đến với Tikovia – Thiết lập mật khẩu</title>
  <style>
    /* Reset & base */
    body { margin:0; padding:0; background:#eaf4fc; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#222; }
    a { text-decoration:none; }
    img { border:0; outline:none; }

    /* Container */
    .container { max-width:600px; width:100%; background:#ffffff; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08); overflow:hidden; }

    /* Header */
    .header { background:#0056b3; padding:24px; text-align:center; }
    .brand { color:#ffffff; font-size:26px; margin:8px 0 0; font-weight:800; letter-spacing:0.3px; }
    .tagline { color:#cfe3ff; font-size:14px; margin:6px 0 0; }

    /* Body */
    .body { padding:28px 28px 8px; }
    .title { color:#0b5cc5; font-size:22px; margin:0 0 12px; font-weight:700; }
    .hello { margin:0 0 14px; font-size:16px; line-height:1.6; }
    .paragraph { margin:0 0 16px; font-size:15px; line-height:1.7; color:#333; }
    .note { font-size:13px; color:#666; }

    /* Button */
    .btn { display:inline-block; padding:12px 28px; background:#ff9800; color:#fff; text-decoration: none; font-weight:700; font-size:16px; border-radius:8px; margin:18px 0; }
    .btn:hover { opacity:0.95; }

    /* Footer */
    .footer { background:#eaf4fc; padding:18px; text-align:center; }
    .footer a { color:#007bff; }

    /* Responsive */
    @media only screen and (max-width:600px) {
      .body { padding:22px 16px 6px; }
      .title { font-size:20px; }
      .btn { padding:10px 22px; font-size:15px; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#eaf4fc;">
  <!-- Wrapper table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eaf4fc; min-height:100vh;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td class="header">
              <img src="https://yourdomain.com/logo.png" alt="Logo Tikovia" style="max-width:140px;height:auto;display:block;margin:0 auto 6px;">
              <h1 class="brand">Tikovia</h1>
              <p class="tagline">Trao quyền cho trải nghiệm số của bạn</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="body">
              <h2 class="title">Chào mừng ${name} đến với Tikovia! 🎉</h2>

              <p class="hello">
                Rất vui khi bạn gia nhập đội ngũ của chúng tôi. Để bắt đầu làm việc, vui lòng thiết lập mật khẩu cho tài khoản Tikovia của bạn.
              </p>

              <p class="paragraph">
                Nhấn vào nút bên dưới để tạo mật khẩu mới. Liên kết đặt lại <strong>có hiệu lực trong 7 ngày</strong> kể từ thời điểm nhận email.
              </p>

              <p style="text-align:center;">
                <a class="btn" href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}">
                  Thiết lập mật khẩu
                </a>
              </p>

              <p class="paragraph">
                Nếu nút không hoạt động, hãy sao chép và dán liên kết sau vào trình duyệt của bạn:
                <br />
                <span class="note">${process.env.CLIENT_URL}/reset-password?token=${resetToken}</span>
              </p>

              <p class="paragraph">
                Vì lý do bảo mật, vui lòng:
              </p>
              <ul class="paragraph" style="padding-left:20px;margin-top:8px;">
                <li>Không chia sẻ liên kết hoặc mật khẩu cho bất kỳ ai;</li>
                <li>Tạo mật khẩu đủ mạnh (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt);</li>
                <li>Không sử dụng lại mật khẩu đã dùng ở dịch vụ khác.</li>
              </ul>

              <p class="paragraph">
                Nếu bạn không yêu cầu tạo tài khoản hoặc đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ bộ phận hỗ trợ để được trợ giúp.
              </p>

              <p class="paragraph">
                Thân mến,<br />
                <strong>Đội ngũ Tikovia</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin:0;font-size:12px;color:#555;">
                © ${new Date().getFullYear()} Tikovia. Mọi quyền được bảo lưu.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#555;">
                <a href="${process.env.CLIENT_URL}/privacy">Chính sách bảo mật</a> |
                <a href="${process.env.CLIENT_URL}/terms">Điều khoản sử dụng</a> |
                <a href="${process.env.CLIENT_URL}/contact">Liên hệ</a>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#555;">
                Kết nối với chúng tôi:
                <a href="https://facebook.com/tikovia" style="margin:0 6px;">Facebook</a> |
                <a href="https://instagram.com/tikovia" style="margin:0 6px;">Instagram</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;
};

const mailEmailChanged = (resetToken, fullName = '') => {
    if (!resetToken || typeof resetToken !== 'string') {
        throw new Error('Thiếu hoặc resetToken không hợp lệ');
    }
    if (!process.env.CLIENT_URL) {
        throw new Error('CLIENT_URL chưa được cấu hình trong biến môi trường');
    }

    const name = fullName || 'bạn';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Tikovia Account Email Has Been Changed</title>
  <style>
    /* Reset & base */
    body { margin:0; padding:0; background:#eaf4fc; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#222; }
    a { text-decoration:none; }
    img { border:0; outline:none; }

    /* Container */
    .container { max-width:600px; width:100%; background:#ffffff; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08); overflow:hidden; }

    /* Header */
    .header { background:#0056b3; padding:24px; text-align:center; }
    .brand { color:#ffffff; font-size:26px; margin:8px 0 0; font-weight:800; letter-spacing:0.3px; }
    .tagline { color:#cfe3ff; font-size:14px; margin:6px 0 0; }

    /* Body */
    .body { padding:28px 28px 8px; }
    .title { color:#0b5cc5; font-size:22px; margin:0 0 12px; font-weight:700; }
    .hello { margin:0 0 14px; font-size:16px; line-height:1.6; }
    .paragraph { margin:0 0 16px; font-size:15px; line-height:1.7; color:#333; }
    .note { font-size:13px; color:#666; }

    /* Button */
    .btn { display:inline-block; padding:12px 28px; background:#ff9800; color:#fff; text-decoration:none; font-weight:700; font-size:16px; border-radius:8px; margin:18px 0; }
    .btn:hover { opacity:0.95; }

    /* Footer */
    .footer { background:#eaf4fc; padding:18px; text-align:center; }
    .footer a { color:#007bff; }

    /* Responsive */
    @media only screen and (max-width:600px) {
      .body { padding:22px 16px 6px; }
      .title { font-size:20px; }
      .btn { padding:10px 22px; font-size:15px; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#eaf4fc;">
  <!-- Wrapper table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eaf4fc; min-height:100vh;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td class="header">
              <img src="https://yourdomain.com/logo.png" alt="Logo Tikovia" style="max-width:140px;height:auto;display:block;margin:0 auto 6px;">
              <h1 class="brand">Tikovia</h1>
              <p class="tagline">Trao quyền cho trải nghiệm số của bạn</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="body">
              <h2 class="title">Email tài khoản Tikovia của bạn đã được thay đổi</h2>

              <p class="hello">
                Chào ${name},
              </p>

              <p class="paragraph">
                Chúng tôi vừa nhận được yêu cầu thay đổi địa chỉ email cho tài khoản Tikovia của bạn. Để đảm bảo an toàn, <strong>tài khoản của bạn hiện đang bị vô hiệu hóa</strong>. Vui lòng thiết lập mật khẩu mới để kích hoạt lại tài khoản của bạn bằng cách nhấn vào nút dưới đây. Liên kết đặt lại <strong>có hiệu lực trong 7 ngày</strong>.
              </p>

              <p style="text-align:center;">
                <a class="btn" href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}">
                  Thiết lập lại mật khẩu
                </a>
              </p>

              <p class="paragraph">
                Nếu nút không hoạt động, hãy sao chép và dán liên kết sau vào trình duyệt của bạn:
                <br />
                <span class="note">${process.env.CLIENT_URL}/reset-password?token=${resetToken}</span>
              </p>

              <p class="paragraph">
                Để bảo vệ tài khoản của bạn, vui lòng:
              </p>
              <ul class="paragraph" style="padding-left:20px;margin-top:8px;">
                <li>Không chia sẻ liên kết hoặc mật khẩu với bất kỳ ai;</li>
                <li>Tạo mật khẩu mạnh (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt);</li>
                <li>Không sử dụng lại mật khẩu đã dùng ở dịch vụ khác.</li>
              </ul>

              <p class="paragraph">
                Nếu bạn không thực hiện thay đổi email này, vui lòng liên hệ ngay với bộ phận hỗ trợ của chúng tôi để được hỗ trợ.
              </p>

              <p class="paragraph">
                Thân mến,<br />
                <strong>Đội ngũ Tikovia</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin:0;font-size:12px;color:#555;">
                © ${new Date().getFullYear()} Tikovia. Mọi quyền được bảo lưu.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#555;">
                <a href="${process.env.CLIENT_URL}/privacy">Chính sách bảo mật</a> |
                <a href="${process.env.CLIENT_URL}/terms">Điều khoản sử dụng</a> |
                <a href="${process.env.CLIENT_URL}/contact">Liên hệ</a>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#555;">
                Kết nối với chúng tôi:
                <a href="https://facebook.com/tikovia" style="margin:0 6px;">Facebook</a> |
                <a href="https://instagram.com/tikovia" style="margin:0 6px;">Instagram</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// Xuất hàm
module.exports = { mailResetPassword, mailResetPassNewUser, mailEmailChanged };
