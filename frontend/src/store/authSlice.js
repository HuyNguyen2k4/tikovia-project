// src/store/authSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  checkResetToken as checkResetTokenApi,
  forgotPassword as forgotPasswordApi,
  getUserProfile,
  loginUser as loginApi,
  logoutUser as logoutApi,
  resetPassword as resetPasswordApi,
  updateUserProfile as updateUserApi,
  changePassword as changePasswordApi,
} from "../services/authService";
import authStorage from "./authStorage";

// ---- Initial state: đọc 1 lần từ storage
const stored = authStorage.read();

const initialState = {
  user: stored.user, // thông tin người dùng
  token: stored.token, // token (nếu lưu trong storage)
  isAuthenticated: !!(stored.user && stored.token),
  isRemembered: stored.remember, // flag remember me
  hasFetchedProfile: false, // đã gọi /auth/me (dù 200 hay 401)
  status: "idle", // idle | loading | succeeded | failed
  error: null,
};

// ---- Thunks ----
export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const { remember, ...loginData } = credentials;
      const res = await loginApi(loginData);
      const { user, accessToken } = res.data;

      // Lưu 1 lần theo remember
      authStorage.persist({ user, token: accessToken, remember: !!remember });

      return { user, token: accessToken, remember: !!remember };
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed";
      return rejectWithValue(msg);
    }
  }
);

export const logoutUserAsync = createAsyncThunk("auth/logoutAsync", async (_, { dispatch }) => {
  try {
    await logoutApi();
  } catch {} // không chặn UI nếu API fail
  dispatch(logout());
});

export const forgotPasswordAsync = createAsyncThunk(
  "auth/forgotPassword",
  async (email, { rejectWithValue }) => {
    try {
      const res = await forgotPasswordApi(email);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data);
    }
  }
);

export const resetPasswordAsync = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const res = await resetPasswordApi(token, password);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data);
    }
  }
);

export const checkResetTokenAsync = createAsyncThunk(
  "auth/checkResetToken",
  async (token, { rejectWithValue }) => {
    try {
      const res = await checkResetTokenApi(token);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data);
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await getUserProfile();
      // Chuẩn hoá theo API của bạn (data.data hoặc data.user hoặc data)
      const user = res.data?.data ?? res.data?.user ?? res.data;
      return user;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to fetch user profile";
      return rejectWithValue(msg);
    }
  }
);

export const updateUserAsync = createAsyncThunk(
  "auth/updateUser",
  async (data, { rejectWithValue }) => {
    try {
      const res = await updateUserApi(data);
      const updatedUser = res.data?.data ?? res.data?.user ?? res.data;
      return updatedUser;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update user profile";
      return rejectWithValue(msg);
    }
  }
);

export const changePasswordAsync = createAsyncThunk(
  "auth/changePassword",
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const res = await changePasswordApi({ oldPassword, newPassword });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to change password";
      return rejectWithValue(msg);
    }
  }
);


// ---- Slice ----
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      authStorage.clear();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isRemembered = false;
      state.hasFetchedProfile = true; // đã biết là out
      state.status = "idle";
      state.error = null;
    },
    setUser(state, action) {
      state.user = action.payload;
      // đồng bộ lại user theo remember
      authStorage.persistUserOnly(state.user, state.isRemembered);
    },
    setAuthenticated(state, action) {
      state.isAuthenticated = !!action.payload;
    },
    clearAuth(state) {
      authStorage.clear();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isRemembered = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isRemembered = action.payload.remember;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.isAuthenticated = false;
        state.isRemembered = false;
      })

      // FETCH PROFILE
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.hasFetchedProfile = true;
        // cập nhật user vào đúng storage theo remember
        authStorage.persistUserOnly(state.user, state.isRemembered);
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.hasFetchedProfile = true;

        // nếu token có vấn đề → dọn sạch
        const msg = (action.payload || "").toString().toLowerCase();
        if (msg.includes("token") || msg.includes("unauthorized") || msg.includes("401")) {
          authStorage.clear();
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
          state.isRemembered = false;
        }
      })

      // FORGOT / RESET / CHECK TOKEN
      .addCase(forgotPasswordAsync.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(forgotPasswordAsync.fulfilled, (s) => {
        s.status = "succeeded";
      })
      .addCase(forgotPasswordAsync.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })

      .addCase(resetPasswordAsync.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(resetPasswordAsync.fulfilled, (s) => {
        s.status = "succeeded";
      })
      .addCase(resetPasswordAsync.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })

      .addCase(checkResetTokenAsync.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(checkResetTokenAsync.fulfilled, (s) => {
        s.status = "succeeded";
      })
      .addCase(checkResetTokenAsync.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })

      .addCase(updateUserAsync.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateUserAsync.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        authStorage.persistUserOnly(state.user, state.isRemembered);
      })
      .addCase(updateUserAsync.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { logout, setUser, setAuthenticated, clearAuth } = authSlice.actions;
export default authSlice.reducer;
