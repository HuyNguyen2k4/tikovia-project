import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createInventoryLot as createInventoryLotAPI,
  deleteInventoryLot as deleteInventoryLotAPI,
  findInventoryLotsInDepartmentByProduct as findInventoryLotsInDepartmentByProductAPI,
  getInventoryLotById as getInventoryLotByIdAPI,
  getListInventoryLots as getListInventoryLotsAPI,
  getListInventoryLotsByProductId as getListInventoryLotsByProductIdAPI,
  updateInventoryLot as updateInventoryLotAPI,
} from "@src/services/inventoryLotService";

const initialState = {
  inventoryLots: [],
  inventoryLotsByProductId: [],
  inventoryLotsById: {},
  fetchStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' get by product ID
  fetchListStatus: "idle",
  fetchByIdStatus: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  deleteStatus: "idle",
  fetchError: null,
  fetchListError: null,
  fetchByIdError: null,
  createError: null,
  updateError: null,
  deleteError: null,
};
// Async thunk để lấy danh sách inventory lots theo product ID
export const fetchInventoryLots = createAsyncThunk(
  "inventoryLot/fetchInventoryLots",
  async ({ productId, params }, { rejectWithValue }) => {
    try {
      const response = await getListInventoryLotsByProductIdAPI(productId, params);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);
// Async thunk để lấy chi tiết inventory lot theo ID
export const fetchInventoryLotById = createAsyncThunk(
  "inventoryLot/fetchInventoryLotById",
  async (inventoryLotId, { rejectWithValue }) => {
    try {
      const response = await getInventoryLotByIdAPI(inventoryLotId);
      return response.data.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);
// Async thunk để lấy danh sách inventory lots với phân trang và tìm kiếm
export const fetchListInventoryLots = createAsyncThunk(
  "inventoryLot/fetchListInventoryLots",
  async (params, { rejectWithValue }) => {
    try {
      const response = await getListInventoryLotsAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Lấy danh sách lot theo department + product (lọc qty_on_hand > 0 && expiry_date > now())
export const fetchInventoryLotsByDepartmentAndProduct = createAsyncThunk(
  "inventoryLot/fetchInventoryLotsByDepartmentAndProduct",
  async ({ departmentId, productId, params }, { rejectWithValue }) => {
    try {
      const res = await findInventoryLotsInDepartmentByProductAPI(departmentId, productId, params);
      return res.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Tạo inventory lot mới (Admin, Manager)
export const createInventoryLot = createAsyncThunk(
  "inventoryLot/createInventoryLot",
  async (data, { rejectWithValue }) => {
    try {
      const response = await createInventoryLotAPI(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Cập nhật thông tin inventory lot (Admin, Manager)
export const updateInventoryLot = createAsyncThunk(
  "inventoryLot/updateInventoryLot",
  async ({ inventoryLotId, data }, { rejectWithValue }) => {
    try {
      const response = await updateInventoryLotAPI(inventoryLotId, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Xóa inventory lot (Admin, Manager)
export const deleteInventoryLot = createAsyncThunk(
  "inventoryLot/deleteInventoryLot",
  async (inventoryLotId, { rejectWithValue }) => {
    try {
      await deleteInventoryLotAPI(inventoryLotId);
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

const inventoryLotSlice = createSlice({
  name: "inventoryLot",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch inventory lots by product ID
      .addCase(fetchInventoryLots.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchInventoryLots.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        // state.inventoryLotsByProductId = action.payload;
        state.inventoryLotsByProductId = {
          data: action.payload.data,
          pagination: action.payload.pagination,
        };
      })
      .addCase(fetchInventoryLots.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      })
      // Fetch inventory lot by ID
      .addCase(fetchInventoryLotById.pending, (state) => {
        state.fetchByIdStatus = "loading";
        state.fetchByIdError = null;
      })
      .addCase(fetchInventoryLotById.fulfilled, (state, action) => {
        state.fetchByIdStatus = "succeeded";
        state.inventoryLotsById = action.payload;
      })
      .addCase(fetchInventoryLotById.rejected, (state, action) => {
        state.fetchByIdStatus = "failed";
        state.fetchByIdError = action.payload;
      })
      // Fetch list of inventory lots
      .addCase(fetchListInventoryLots.pending, (state) => {
        state.fetchListStatus = "loading";
        state.fetchListError = null;
      })
      .addCase(fetchListInventoryLots.fulfilled, (state, action) => {
        state.fetchListStatus = "succeeded";
        state.inventoryLots = action.payload;
      })
      .addCase(fetchListInventoryLots.rejected, (state, action) => {
        state.fetchListStatus = "failed";
        state.fetchListError = action.payload;
      })

      // Fetch inventory lots by department + product
      .addCase(fetchInventoryLotsByDepartmentAndProduct.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchInventoryLotsByDepartmentAndProduct.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.inventoryLotsByProductId = {
          data: action.payload?.data || [],
          pagination: action.payload?.pagination || {},
        };
      })
      .addCase(fetchInventoryLotsByDepartmentAndProduct.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      })

      // Create inventory lot
      .addCase(createInventoryLot.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createInventoryLot.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        // support inventoryLots as array OR { data: [], pagination: {} }
        if (Array.isArray(state.inventoryLots)) {
          state.inventoryLots.unshift(action.payload);
        } else if (state.inventoryLots && Array.isArray(state.inventoryLots.data)) {
          state.inventoryLots.data.unshift(action.payload);
          // bump total if pagination present
          if (state.inventoryLots.pagination) {
            state.inventoryLots.pagination.total = (state.inventoryLots.pagination.total || 0) + 1;
          }
        } else {
          state.inventoryLots = [action.payload];
        }
      })
      .addCase(createInventoryLot.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload;
      })
      // Update inventory lot
      .addCase(updateInventoryLot.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateInventoryLot.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const payload = action.payload;
        if (Array.isArray(state.inventoryLots)) {
          const idx = state.inventoryLots.findIndex((l) => l.id === payload.id);
          if (idx !== -1) state.inventoryLots[idx] = payload;
        } else if (state.inventoryLots && Array.isArray(state.inventoryLots.data)) {
          const idx = state.inventoryLots.data.findIndex((l) => l.id === payload.id);
          if (idx !== -1) state.inventoryLots.data[idx] = payload;
        }
      })
      .addCase(updateInventoryLot.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })
      // Delete inventory lot
      .addCase(deleteInventoryLot.pending, (state) => {
        state.deleteStatus = "loading";
        state.deleteError = null;
      })
      .addCase(deleteInventoryLot.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        const deletedId = action.meta?.arg; // delete thunk receives inventoryLotId as arg
        if (!deletedId) return;
        if (Array.isArray(state.inventoryLots)) {
          state.inventoryLots = state.inventoryLots.filter((lot) => lot.id !== deletedId);
        } else if (state.inventoryLots && Array.isArray(state.inventoryLots.data)) {
          state.inventoryLots.data = state.inventoryLots.data.filter((lot) => lot.id !== deletedId);
          if (state.inventoryLots.pagination) {
            state.inventoryLots.pagination.total = Math.max(
              (state.inventoryLots.pagination.total || 1) - 1,
              0
            );
          }
        }
      })
      .addCase(deleteInventoryLot.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload;
      });
  },
});
export const {} = inventoryLotSlice.actions;
export default inventoryLotSlice.reducer;
