import React, { useMemo } from "react";

import PropTypes from "prop-types";

/**
 * Component để hiển thị mã QR thanh toán của sepay.vn
 * Tự động tạo link ảnh QR dựa trên các props được truyền vào.
 */
const SepayQRCode = ({ account, bank, amount, description, template, altText, style }) => {
  // Báo lỗi nếu thiếu props bắt buộc (ĐÃ CẬP NHẬT)
  // Kiểm tra này chạy trước useMemo để tránh lỗi (ví dụ: bank.toUpperCase() khi bank=null)
  const hasError =
    !account ||
    String(account).trim() === "" ||
    !bank ||
    String(bank).trim() === "" ||
    !description ||
    String(description).trim() === "";

  // Kiểm tra amount nếu tồn tại
  const amountInvalid =
    amount !== undefined && amount !== null && !/^\d+(\.\d+)?$/.test(String(amount).trim());

  if (hasError || amountInvalid) {
    console.error(
      "SepayQRCode: Props 'account', 'bank', 'description' là bắt buộc và 'amount' phải là số."
    );
    return (
      <div style={{ color: "red", padding: "10px", border: "1px solid red" }}>
        Lỗi: Vui lòng cung cấp đủ `account`, `bank`, `description` và `amount` chỉ chứa số.
      </div>
    );
  }

  // Sử dụng useMemo để link QR chỉ được tính toán lại khi các props liên quan thay đổi.
  // Giờ đã an toàn để gọi .toUpperCase() và encodeURIComponent()
  const qrLink = useMemo(() => {
    const encodedDescription = encodeURIComponent(description);
    const bankCode = bank.toUpperCase();
    // Nếu không truyền amount thì bỏ khỏi link
    const amountParam =
      amount !== undefined && amount !== null && String(amount).trim() !== ""
        ? `&amount=${amount}`
        : "";
    const link = `https://qr.sepay.vn/img?acc=${account}&bank=${bankCode}${amountParam}&des=${encodedDescription}&template=${template || ""}`;
    return link;
  }, [account, bank, amount, description, template]);

  return (
    <img
      src={qrLink}
      alt={altText || `QR Code ${bank} - ${account}`}
      style={{ maxWidth: "100%", ...style }}
    />
  );
};

// Định nghĩa các prop types cho component (ĐÃ CẬP NHẬT)
SepayQRCode.propTypes = {
  /** Số tài khoản ngân hàng (bắt buộc) */
  account: PropTypes.string.isRequired,
  /** Mã ngân hàng (VD: TCB, VCB...) (bắt buộc) */
  bank: PropTypes.string.isRequired,
  /** Số tiền cần chuyển */
  amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // <--- THAY ĐỔI
  /** Nội dung chuyển khoản (bắt buộc) */
  description: PropTypes.string.isRequired, // <--- THAY ĐỔI
  /** Template của ảnh QR (compact, qronly, hoặc để trống) */
  template: PropTypes.oneOf(["", "compact", "qronly"]),
  /** Văn bản thay thế cho ảnh (cho accessibility) */
  altText: PropTypes.string,
  /** CSS style tùy chỉnh cho thẻ <img> */
  style: PropTypes.object,
};

// Giá trị mặc định cho các props không bắt buộc (ĐÃ CẬP NHẬT)
SepayQRCode.defaultProps = {
  // Đã xóa 'amount' và 'description' vì chúng là bắt buộc
  template: "", // Dùng template mặc định của sepay
  altText: "QR Code sepay.vn",
  style: {},
};

export default SepayQRCode;
