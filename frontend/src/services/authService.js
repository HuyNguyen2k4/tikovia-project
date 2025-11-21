import { data } from "react-router-dom";
import apiClient from "./apiClient";

// =============================================================
// Các hàm gọi API liên quan đến Auth
// Lưu ý: chỉ dùng apiClient (đã có interceptors cho token/refresh)
// Không viết thêm logic xử lý token ở đây
// =============================================================

// Đăng ký tài khoản mới
// payload: { email, username, password, ... }
export const registerUser = (payload) => apiClient.post("/auth/register", payload);

// Đăng nhập bằng email/username + password
// credentials: { emailOrUsername, password }
export const loginUser = ({ emailOrUsername, password }) =>
  apiClient.post("/auth/login", { emailOrUsername, password });

// Đăng xuất người dùng hiện tại
// => Backend thường sẽ xoá refresh token trong cookie
export const logoutUser = () => apiClient.post("/auth/logout");

// Yêu cầu gửi email reset password
// email: string
export const forgotPassword = (email) => apiClient.post("/auth/forgot-password", { email });

// Đặt lại mật khẩu mới
// token: mã reset lấy từ email
// newPassword: mật khẩu mới
export const resetPassword = (token, newPassword) =>
  apiClient.post(`/auth/reset-password/${token}`, { newPassword });

// Kiểm tra token reset password còn hợp lệ không
// token: mã reset lấy từ email
export const checkResetToken = (token) => apiClient.get(`/auth/check-reset-token/${token}`);

// Validate token reset (tuỳ backend có khác với checkResetToken)
// token: mã reset
export const validateResetToken = (token) =>
  apiClient.get(`/auth/reset-password/validate/${token}`);

// Lấy thông tin user hiện tại từ backend
// => Backend xác thực dựa trên access token (hoặc cookie)
export const getUserProfile = () => apiClient.get("/users/current");

// Đăng nhập bằng Google OAuth
// token: id_token nhận từ Google (qua @react-oauth/google hoặc gapi)
// Backend sẽ verify token này với Google rồi trả về user + accessToken
export const googleAuth = (token) => apiClient.post("/auth/google", { token });

// Cập nhật thông tin user hiện tại
export const updateUserProfile = (data) => apiClient.put("/users/current", data);

// Đổi mật khẩu người dùng hiện tại
export const changePassword = (data) => apiClient.put("/users/current/password", data);
