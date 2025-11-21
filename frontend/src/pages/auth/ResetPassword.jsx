// src/pages/auth/ResetPassword.jsx
import React, { useEffect, useRef, useState } from "react";

import "@assets/auth/resetPassword.css";
import { checkResetTokenAsync, resetPasswordAsync } from "@src/store/authSlice";
import { Button, Form, Input, Spin, Typography, notification } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";

const { Title, Text } = Typography;

// Bước 1: Lấy token từ URL.
// Bước 2: useEffect gọi checkResetTokenAsync(token):
//        OK → validToken = true → hiện form.
//        Fail/không có token → validToken = false → hiện màn lỗi.
// Bước 3: Submit form:
//        So sánh 2 mật khẩu.
//        Gọi resetPasswordAsync({ token, password }).
//        Thành công → thông báo + điều hướng /login.
//        Thất bại → thông báo; nếu thấy token “hết hạn/invalid” → chuyển sang màn lỗi.

const ResetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSelector((state) => state.auth);
  const isLoading = status === "loading";

  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // token lấy từ URL ?token=...

  // validToken: null = đang kiểm tra, true = hợp lệ, false = không hợp lệ
  const [validToken, setValidToken] = useState(null);

  // Cờ nhỏ chống gọi check token 2 lần ở StrictMode (đơn giản, không rườm rà)
  const didCheckRef = useRef(false);

  // 1) Kiểm tra token ngay khi vào trang
  useEffect(() => {
    if (didCheckRef.current) return;
    didCheckRef.current = true;

    if (!token) {
      setValidToken(false);
      return;
    }

    dispatch(checkResetTokenAsync(token))
      .unwrap()
      .then(() => {
        // Token hợp lệ
        setValidToken(true);
      })
      .catch(() => {
        // Token không hợp lệ
        setValidToken(false);
      });
  }, [dispatch, token]);

  // 2) Submit form đổi mật khẩu
  const onFinish = ({ newPassword, confirmNewPassword }) => {
    // So khớp mật khẩu
    if (newPassword !== confirmNewPassword) {
      form.setFields([{ name: "confirmNewPassword", errors: ["Mật khẩu xác nhận không khớp!"] }]);
      return;
    }

    // Gọi API đặt lại mật khẩu
    dispatch(resetPasswordAsync({ token, password: newPassword }))
      .unwrap()
      .then((res) => {
        notification.success({
          message: "Thành công",
          description:
            res?.message || "Đặt lại mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.",
        });
        // Điều hướng về login sau 1s
        setTimeout(() => navigate("/login"), 1000);
      })
      .catch((err) => {
        notification.error({
          message: "Lỗi",
          description:
            (typeof err === "string" && err) ||
            err?.message ||
            "Có lỗi xảy ra khi đặt lại mật khẩu. Vui lòng thử lại.",
        });

        // Nếu backend báo token hết hạn/không hợp lệ → chuyển sang màn lỗi
        const msg = ((typeof err === "string" ? err : err?.message) || "").toLowerCase();
        if (msg.includes("hết hạn") || msg.includes("invalid") || msg.includes("không hợp lệ")) {
          setValidToken(false);
        }
      });
  };
  const isButtonLoading = isLoading;
  const getButtonText = () => {
    if (isButtonLoading) return "Đang xử lý...";
    return "Xác nhận";
  };

  // 3) UI hiển thị theo trạng thái validToken
  return (
    <div className="reset-container">
      <div className="reset-form-wrapper">
        {/* Đang kiểm tra token */}
        {validToken === null ? (
          <div className="resetPass-loading-spinner">
            <Spin size="large" />
            <Text style={{ marginTop: 16, display: "block", textAlign: "center" }}>
              Đang xác thực liên kết...
            </Text>
          </div>
        ) : validToken ? (
          // Token hợp lệ → hiển thị form đặt lại mật khẩu
          <>
            <Title level={2} style={{ textAlign: "center", marginBottom: 8 }}>
              Cập nhật mật khẩu mới
            </Title>
            <Text
              type="secondary"
              style={{ display: "block", textAlign: "center", marginBottom: 24 }}
            >
              Vui lòng nhập mật khẩu mới để cập nhật cho tài khoản của bạn
            </Text>

            <Form
              name="reset_form"
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={onFinish}
            >
              <Form.Item
                className="reset-label"
                label="Mật khẩu mới:"
                name="newPassword"
                rules={[
                  { required: true, message: "Vui lòng nhập Mật khẩu mới!" },
                  {
                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
                    message: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số!",
                  },
                ]}
              >
                <Input.Password
                  placeholder="Mật khẩu mới"
                  size="large"
                  disabled={isButtonLoading}
                />
              </Form.Item>

              <Form.Item
                className="reset-label"
                label="Xác nhận Mật khẩu mới:"
                name="confirmNewPassword"
                rules={[{ required: true, message: "Vui lòng xác nhận Mật khẩu mới!" }]}
              >
                <Input.Password
                  placeholder="Xác nhận Mật khẩu mới"
                  size="large"
                  disabled={isButtonLoading}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  className="reset-button"
                  loading={isButtonLoading} // loading từ Redux khi đang submit
                  disabled={isButtonLoading} // Disable button khi đang loading
                >
                  {getButtonText()}
                </Button>
              </Form.Item>
            </Form>
          </>
        ) : (
          // Token không hợp lệ/hết hạn → hiển thị hướng dẫn
          <div style={{ textAlign: "center" }}>
            <img src="/images/expiry_warning.png" alt="Warning" className="expiry-warning-image" />
            <Text
              type="danger"
              className="expiry-warning-text"
              style={{ display: "block", marginTop: 16, marginBottom: 24, fontSize: 16 }}
            >
              Liên kết đặt lại không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.
            </Text>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Button type="primary" onClick={() => navigate("/forget-password")}>
                Yêu cầu đặt lại mật khẩu mới
              </Button>
              <Button onClick={() => navigate("/login")}>Quay về đăng nhập</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
