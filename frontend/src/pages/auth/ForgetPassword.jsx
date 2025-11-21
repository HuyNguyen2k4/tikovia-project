import React, { useEffect, useState } from "react";

import "@assets/auth/forgetPassword.css";
import { forgotPasswordAsync } from "@src/store/authSlice";
import { Button, Form, Input, Typography, notification } from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Title, Text } = Typography;

// Key lưu thời gian cooldown trong localStorage
const STORAGE_KEY = "forgetPasswordEndTime";
// Thời gian chờ giữa 2 lần gửi yêu cầu (tính bằng giây)
const COOLDOWN_SEC = 25;

const ForgetPassword = () => {
  const dispatch = useDispatch();
  
  // Sửa lại cách lấy isLoading từ Redux store
  const { status } = useSelector((state) => state.auth);
  const isLoading = status === "loading";

  // countdown = số giây còn lại trước khi nút gửi được bật lại
  const [countdown, setCountdown] = useState(0);

  // Khi mở trang → kiểm tra trong localStorage có cooldown cũ không
  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (!Number.isNaN(saved)) {
      // Tính thời gian còn lại
      const remain = Math.max(0, Math.ceil((saved - Date.now()) / 1000));
      if (remain > 0) {
        setCountdown(remain);
      } else {
        // Hết hạn → xoá key
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Giảm countdown mỗi giây nếu còn > 0
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Submit form
  const onFinish = ({ email }) => {
    if (!email || countdown > 0 || isLoading) return; // Thêm điều kiện isLoading

    dispatch(forgotPasswordAsync(email.trim()))
      .unwrap()
      .then((res) => {
        // Đặt mốc thời gian hết cooldown trong localStorage
        const endTime = Date.now() + COOLDOWN_SEC * 1000;
        localStorage.setItem(STORAGE_KEY, String(endTime));

        // Bắt đầu đếm ngược
        setCountdown(COOLDOWN_SEC);

        notification.success({
          message: "Thành công",
          description: res?.message || "Đã gửi liên kết đặt lại mật khẩu đến email của bạn.",
        });
      })
      .catch((err) => {
        notification.error({
          message: "Lỗi",
          description:
            (typeof err === "string" && err) || 
            err?.message || 
            "Có lỗi xảy ra, vui lòng thử lại.",
        });
      });
  };

  // Tính toán trạng thái disable của button
  const isButtonDisabled = countdown > 0 || isLoading;

  // Tính toán text hiển thị trên button
  const getButtonText = () => {
    if (isLoading) return "Đang xử lý yêu cầu của bạn...";
    if (countdown > 0) return `Gửi lại sau ${countdown}s`;
    return "Xác nhận";
  };

  return (
    <div className="forget-container">
      <div className="forget-form-wrapper">
        <Title level={2} style={{ textAlign: "center", marginBottom: 8 }}>
          Quên mật khẩu
        </Title>
        <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
          Nhập email để nhận liên kết đặt lại mật khẩu
        </Text>

        <Form name="forget_form" layout="vertical" requiredMark={false} onFinish={onFinish}>
          <Form.Item
            className="forget-label"
            label="Địa chỉ email:"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập địa chỉ email!" },
              { type: "email", message: "Địa chỉ email không hợp lệ!" },
            ]}
          >
            <Input 
              placeholder="abc@gmail.com" 
              size="large" 
              disabled={isLoading} // Disable input khi đang loading
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              className="forget-button"
              disabled={isButtonDisabled}
              loading={isLoading}
            >
              {getButtonText()}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default ForgetPassword;