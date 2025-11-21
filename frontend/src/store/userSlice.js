import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createUser as createUserAPI,
  getListAllSellers,
  listUsers as listUsersAPI,
  updateUser as updateUserAPI,
  updateUserStatus as updateUserStatusAPI,
} from "@src/services/userService";

const initialState = {
  users: { data: [], pagination: {} },
  fetchStatus: "idle", // idle | loading | succeeded | failed
  createStatus: "idle", // idle | loading | succeeded | failed
  updateStatus: "idle", // idle | loading | succeeded | failed
  updateStatusStatus: "idle", // idle | loading | succeeded | failed (cho update status của user )
  fetchError: null,
  createError: null,
  updateError: null,
  updateStatusError: null, // lỗi khi update status của user
  // Thêm sellerList và trạng thái fetch
  sellerList: [],
  sellerFetchStatus: "idle",
  sellerFetchError: null,
};

export const fetchListUsers = createAsyncThunk(
  "user/fetchListUsers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await listUsersAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
      });
    }
  }
);

// userData = { name, email, password, role }
export const createUser = createAsyncThunk(
  "user/createUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await createUserAPI(userData);
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response.data.message || "Có lỗi xảy ra khi tạo người dùng";
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateUser = createAsyncThunk(
  "user/updateUser",
  async ({ userId, userData }, { rejectWithValue }) => {
    try {
      const response = await updateUserAPI(userId, userData);
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response.data.message || "Có lỗi xảy ra khi cập nhật người dùng";
      return rejectWithValue(errorMessage);
    }
  }
);
export const updateUserStatus = createAsyncThunk(
  "user/updateUserStatus",
  async ({ userId, status }, { rejectWithValue }) => {
    try {
      const response = await updateUserStatusAPI(userId, status);
      return response.data.data;
    } catch (error) {
      console.log("Error updating user status:", error);
      const errorMessage =
        error.response.data.message || "Có lỗi xảy ra khi cập nhật trạng thái người dùng";
      return rejectWithValue(errorMessage);
    }
  }
);

// 2. TẠO THUNK MỚI
export const fetchListAllSellers = createAsyncThunk(
  "user/fetchListAllSellers",
  async (_, { rejectWithValue }) => {
    try {
      // Hàm getListAllSellers() sẽ được tạo ở bước 2
      const response = await getListAllSellers();
      // Giả định API trả về { success: true, data: [...] }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi tải danh sách người bán");
    }
  }
);

// -----Slice-----
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateOnlineStatusBatch: (state, action) => {
      const statusList = action.payload;
      if (!state.users?.data) return;
      state.users.data = state.users.data.map((user) => {
        const found = statusList.find((u) => u.id === user.id);
        return found
          ? {
              ...user,
              online: found.online,
              lastOnline: found.lastOnline,
              lastOffline: found.lastOffline,
            }
          : user;
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch List Users
      .addCase(fetchListUsers.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchListUsers.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.users = action.payload;
      })
      .addCase(fetchListUsers.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload || action.error.message;
      })
      // Create User
      .addCase(createUser.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        // state.users.unshift(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload;
      })
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        // Cập nhật user trong current page data nếu có
        if (state.users && state.users.data && Array.isArray(state.users.data)) {
          const index = state.users.data.findIndex((user) => user.id === action.payload.id);
          if (index !== -1) {
            state.users.data[index] = action.payload;
          }
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })
      // Update User Status
      .addCase(updateUserStatus.pending, (state) => {
        state.updateStatusStatus = "loading";
        state.updateStatusError = null;
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.updateStatusStatus = "succeeded";
        // Cập nhật user status trong current page data nếu có
        if (state.users && state.users.data && Array.isArray(state.users.data)) {
          const index = state.users.data.findIndex((user) => user.id === action.payload.id);
          if (index !== -1) {
            state.users.data[index] = action.payload;
          }
        }
      })
      .addCase(updateUserStatus.rejected, (state, action) => {
        state.updateStatusStatus = "failed";
        state.updateStatusError = action.payload;
      })
      // THÊM CASE CHO THUNK MỚI
      .addCase(fetchListAllSellers.pending, (state) => {
        state.sellerFetchStatus = "loading";
      })
      .addCase(fetchListAllSellers.fulfilled, (state, action) => {
        state.sellerFetchStatus = "succeeded";
        state.sellerList = action.payload;
      })
      .addCase(fetchListAllSellers.rejected, (state, action) => {
        state.sellerFetchStatus = "failed";
        state.sellerFetchError = action.payload;
      });
  },
});

export const {updateOnlineStatusBatch} = userSlice.actions;

export default userSlice.reducer;
