// src/pages/auth/Login.jsx
import React, { useEffect } from "react";

import "@assets/auth/login.css";
import { GoogleLogin } from "@react-oauth/google";
// sync reducers
import { googleAuth } from "@src/services/authService";
import { fetchCurrentUser, loginUser } from "@src/store/authSlice";
// thunk login thường
import { setAuthenticated, setUser } from "@src/store/authSlice";
// đã gộp vào authService
import authStorage from "@src/store/authStorage";
import { Button, Checkbox, Divider, Form, Input, Spin, Typography, notification } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

// helper lưu user/token/remember

const { Title, Text, Link } = Typography;

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, isAuthenticated } = useSelector((state) => state.auth);
  const isLoading = status === "loading";
  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Điều hướng sau đăng nhập tuỳ role
  const handleLoginRedirect = (user) => {
    if (user?.role === "admin") {
      navigate("/dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  // Submit form (email/username + password)
  const onFinish = (values) => {
    const credentials = {
      emailOrUsername: values.emailOrUsername,
      password: values.password,
      remember: values.remember || false,
    };

    dispatch(loginUser(credentials))
      .unwrap()
      .then((result) => {
        notification.success({
          message: "Đăng nhập thành công",
          description: values.remember
            ? "Bạn đã đăng nhập và sẽ được ghi nhớ."
            : "Bạn đã đăng nhập cho phiên hiện tại.",
          placement: "topRight",
          duration: 4,
          showProgress: true,
        });
        dispatch(fetchCurrentUser()).unwrap();

        handleLoginRedirect(result.user);
      })
      .catch((error) => {
        notification.error({
          message: "Đăng nhập thất bại",
          description: error || "Vui lòng kiểm tra lại thông tin.",
          placement: "topRight",
          duration: 3,
          showProgress: true,
        });
      });
  };

  const onFinishFailed = () => {
    notification.error({
      message: "Nội dung không hợp lệ",
      description: "Vui lòng kiểm tra lại thông tin bạn đã nhập.",
      placement: "topRight",
      duration: 3,
    });
  };

  // Đăng nhập Google thành công
  const handleGGSuccess = async (credentialResponse) => {
    try {
      // 1) Lấy id_token từ Google
      const idToken = credentialResponse?.credential;
      if (!idToken) throw new Error("Không nhận được mã xác thực từ Google.");

      // 2) Gọi backend /auth/google -> axios response { data: { success, message, user, accessToken } }
      const res = await googleAuth(idToken);
      const data = res?.data; // vì googleAuth trả về axios response
      const { success, message, user, accessToken } = data || {};

      // 3) Kiểm tra dữ liệu trả về
      if (!success) {
        // ví dụ các case 401/403/404: backend trả success=false + message
        throw new Error(message || "Xác thực Google thất bại!");
      }
      if (!user || !accessToken) {
        throw new Error("Dữ liệu phản hồi không hợp lệ.");
      }

      // 4) Lưu phiên: chọn remember theo nhu cầu (ở đây để true cho Google)
      const remember = true;
      authStorage.persist({ user, token: accessToken, remember });

      // 5) Cập nhật Redux
      dispatch(setUser(user));
      dispatch(setAuthenticated(true));

      // 6) Thông báo & điều hướng
      notification.success({
        message: "Đăng nhập thành công",
        description: message || "Bạn đã đăng nhập bằng Google.",
        placement: "topRight",
        duration: 4,
        showProgress: true,
      });
      dispatch(fetchCurrentUser()).unwrap();

      handleLoginRedirect(user);
    } catch (error) {
      // Hiển thị thông báo lỗi từ backend (404: chưa đăng ký, 403: bị khóa, 401: verify fail, ...)
      const desc =
        error?.response?.data?.message || // lỗi từ server (nếu có)
        error?.message || // lỗi throw ở trên
        "Lỗi không xác định khi đăng nhập bằng Google.";
      notification.error({
        message: "Đăng nhập thất bại",
        description: desc,
        placement: "topRight",
        duration: 3,
        showProgress: true,
      });
    }
  };

  const handleGGError = () => {
    notification.error({
      message: "Đăng nhập thất bại",
      description: "Có lỗi xảy ra khi đăng nhập bằng Google.",
      placement: "topRight",
      duration: 3,
      showProgress: true,
    });
  };

  // Nếu đã đăng nhập (state đang sync) → hiển thị loading ngắn
  if (isAuthenticated) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form-wrapper">
        <Title level={2} style={{ textAlign: "center", marginBottom: 8 }}>
          Đăng nhập
        </Title>
        <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
          Vui lòng nhập email/tên đăng nhập và mật khẩu để tiếp tục
        </Text>

        <Form
          name="login_form"
          initialValues={{ remember: false }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            className="login-label"
            label="Địa chỉ email hoặc tên đăng nhập"
            name="emailOrUsername"
            rules={[{ required: true, message: "Vui lòng nhập Email hoặc Tên đăng nhập!" }]}
          >
            <Input placeholder="abc@gmail.com hoặc username" size="large" />
          </Form.Item>

          {/* Nhãn mật khẩu + link quên mật khẩu */}
          <div style={{ marginBottom: 24 }}>
            <div className="password-label">
              <span>Mật khẩu</span>
              <Link href="/forget-password" className="forget-password-link" tabIndex={-1}>
                Quên mật khẩu?
              </Link>
            </div>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Vui lòng nhập Mật khẩu!" },
                ///////////////////////////////////////////////////
                ///////////////Business rule///////////////
                // Password:
                // ít nhất 8 ký tự
                // ít nhất 1 chữ hoa, 1 chữ thường, 1 số
                // Khóa tài khoản sau 10 lần nhập sai
                ///////////////////////////////////////////////////
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
                  message: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số!",
                },
              ]}
              style={{ margin: 0 }}
            >
              <Input.Password placeholder="Mật khẩu" size="large" />
            </Form.Item>
          </div>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Ghi nhớ tôi</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              className="login-button"
              loading={isLoading}
            >
              Đăng nhập
            </Button>
          </Form.Item>

          <Divider style={{ margin: "24px 0", borderColor: "#d9d9d9" }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Hoặc
            </Text>
          </Divider>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Nếu muốn redirect backend truyền thống thay vì One Tap:
                <button className="btn-login-google google" type="button" onClick={() => initiateGoogleLogin()}>
                  Đăng nhập với Google
                </button> */}
            <GoogleLogin onSuccess={handleGGSuccess} onError={handleGGError} />
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;
