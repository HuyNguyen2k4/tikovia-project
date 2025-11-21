// src/services/apiClient.js
import axios from "axios";

import authStorage from "../store/authStorage";

// helper quản lý token/user

// Lấy baseURL từ file .env (VD: http://localhost:3000/api)
// => Giúp dễ cấu hình khi chuyển môi trường dev, staging, production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Tạo một instance axios dùng chung cho toàn app
// => Tất cả request trong dự án sẽ dùng apiClient thay vì axios trực tiếp
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // cho phép gửi cookie (cần cho refresh token)
  timeout: 15000, // giới hạn 15s, tránh treo request
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// =============================================================
// Helpers quản lý token (lấy và lưu lại token mới vào storage)
// =============================================================
const getStoredToken = () => authStorage.read().token || null;

const setStoredToken = (newToken) => {
  const { remember, user } = authStorage.read();
  // Nếu user tick "remember me" → lưu token vào localStorage
  // Ngược lại → chỉ lưu token trong sessionStorage
  (remember ? localStorage : sessionStorage).setItem("accessToken", newToken);

  // Nếu có thông tin user thì giữ lại (tránh mất user khi refresh token)
  if (user) authStorage.persistUserOnly(user, remember);
};

// =============================================================
// Interceptor 1: chạy TRƯỚC KHI gửi request
// - Tự động gắn Authorization: Bearer <token> vào header
// - Giúp bạn không phải gắn thủ công ở từng API call
// =============================================================
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =============================================================
// Interceptor 2: chạy SAU KHI nhận response
// - Nếu API trả về 401 (token hết hạn) → tự động refresh token
// - Nếu refresh thành công → retry request cũ
// - Nếu refresh thất bại → clear storage và redirect /login
// =============================================================

// Biến kiểm soát trạng thái refresh
let isRefreshing = false; // tránh gọi refresh nhiều lần song song
let queue = []; // hàng đợi chứa các request chờ refresh xong

// Đẩy request vào hàng đợi khi chờ refresh
const enqueue = () => new Promise((resolve, reject) => queue.push({ resolve, reject }));

// Xử lý tất cả request trong hàng đợi sau khi refresh xong
const flush = (error, token) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

// Các route liên quan đến auth (login, register, forgot-password...)
// => Không chạy refresh token cho mấy route này để tránh vòng lặp vô hạn
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/refresh-token",
];

apiClient.interceptors.response.use(
  (response) => response, // Nếu OK thì trả response luôn
  async (error) => {
    if (!error.response) return Promise.reject(error);
    const { status, config: req } = error;

    // Nếu không phải 401 hoặc request thuộc auth routes → không xử lý, trả lỗi luôn
    if (status !== 401 || AUTH_ROUTES.some((r) => (req.url || "").includes(r))) {
      return Promise.reject(error);
    }

    // Nếu đang refresh → request này sẽ đợi token mới
    if (isRefreshing) {
      const token = await enqueue();
      req.headers.Authorization = `Bearer ${token}`;
      return apiClient(req); // retry request sau khi có token mới
    }

    // Nếu request đã retry 1 lần mà vẫn lỗi 401 → bỏ luôn, tránh loop vô hạn
    if (req._retry) return Promise.reject(error);
    req._retry = true;
    isRefreshing = true;

    try {
      // Gọi API refresh token
      const { data } = await apiClient.post("/auth/refresh-token", {});
      const accessToken = data?.accessToken;
      if (!accessToken) throw new Error("No accessToken");

      // Lưu token mới vào storage
      setStoredToken(accessToken);

      // Update header mặc định cho tất cả request sau này
      apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      // Update header cho request cũ bị fail
      req.headers.Authorization = `Bearer ${accessToken}`;

      // Báo cho các request đang chờ trong hàng đợi là refresh thành công
      flush(null, accessToken);

      return apiClient(req); // Retry lại request cũ
    } catch (e) {
      // Nếu refresh token cũng fail → coi như hết hạn phiên đăng nhập
      flush(e, null); // báo lỗi cho các request chờ
      authStorage.clear(); // xoá sạch dữ liệu user/token
      window.location.replace("/login"); // chuyển về trang login
      return Promise.reject(e);
    } finally {
      // Reset cờ refresh
      isRefreshing = false;
    }
  }
);

export default apiClient;
