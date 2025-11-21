// Aliases cho localStorage (LS) và sessionStorage (SS)
const LS = window.localStorage;
const SS = window.sessionStorage;

// Các key chuẩn hóa để tránh gõ sai/lặp code
const KEYS = {
  user: "currentUser", // thông tin user
  token: "accessToken", // JWT hoặc token backend trả về
  remember: "rememberMe", // flag cho "ghi nhớ đăng nhập"
};

/**
 * Module authStorage
 * Cung cấp các hàm tiện ích để quản lý dữ liệu auth trong
 * localStorage hoặc sessionStorage, tùy theo chế độ "remember me".
 */
const authStorage = {
  /**
   * Đọc dữ liệu auth từ storage
   * - Ưu tiên lấy từ localStorage (nếu rememberMe = true)
   * - Nếu không có thì fallback sang sessionStorage
   */
  read: () => {
    try {
      let user = LS.getItem(KEYS.user);
      let token = LS.getItem(KEYS.token);
      let remember = LS.getItem(KEYS.remember) === "true";

      // Nếu không tìm thấy trong localStorage → thử sessionStorage
      if (!user || !token) {
        user = SS.getItem(KEYS.user);
        token = SS.getItem(KEYS.token);
        remember = false;
      }

      return {
        user: user ? JSON.parse(user) : null,
        token: token || null,
        remember,
      };
    } catch {
      return { user: null, token: null, remember: false };
    }
  },

  /**
   * Lưu dữ liệu auth (user + token) vào storage
   * - Xóa hết dữ liệu cũ để tránh rác
   * - Nếu remember = true → lưu vào localStorage
   * - Ngược lại → lưu vào sessionStorage
   */
  persist: ({ user, token, remember }) => {
    const W = remember ? LS : SS;

    authStorage.clear(); // Clear cũ trước

    W.setItem(KEYS.user, JSON.stringify(user));
    W.setItem(KEYS.token, token);

    if (remember) LS.setItem(KEYS.remember, "true"); // chỉ localStorage mới cần flag này
  },

  /**
   * Cập nhật lại user thôi (không đụng tới token)
   * - Dùng khi profile thay đổi (update avatar, tên, v.v.)
   */
  persistUserOnly: (user, remember) => {
    const W = remember ? LS : SS;
    W.setItem(KEYS.user, JSON.stringify(user));
  },

  /**
   * Xóa sạch dữ liệu auth ở cả localStorage và sessionStorage
   */
  clear: () => {
    [LS, SS].forEach((W) => {
      W.removeItem(KEYS.user);
      W.removeItem(KEYS.token);
    });
    LS.removeItem(KEYS.remember);
  },
};

export default authStorage;
