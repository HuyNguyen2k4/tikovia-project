import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getSupplierTransactionItemById as getSupplierTransactionItemByIdAPI,
  createSupplierTransactionItem as createSupplierTransactionItemAPI,
  updateSupplierTransactionItem as updateSupplierTransactionItemAPI,
  deleteSupplierTransactionItem as deleteSupplierTransactionItemAPI,
  deleteItemsByTransactionId as deleteItemsByTransactionIdAPI,
  deleteBulkSupplierTransactionItems as deleteBulkSupplierTransactionItemsAPI,
  getItemsByTransactionId as getItemsByTransactionIdAPI,
  getItemsByProductId as getItemsByProductIdAPI,
  getItemsByLotId as getItemsByLotIdAPI,
  getItemStatsByProduct as getItemStatsByProductAPI,
  calculateTransactionTotal as calculateTransactionTotalAPI,
} from "@src/services/supplierTransactionItemService";

/* ============================================================
   INITIAL STATE
   ============================================================ */
const initialState = {
  items: [],
  selectedItem: null,
  stats: [],
  total: 0,
  fetchStatus: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  deleteStatus: "idle",
  deleteBulkStatus: "idle",
  statsStatus: "idle",
  totalStatus: "idle",
  fetchError: null,
  createError: null,
  updateError: null,
  deleteError: null,
  deleteBulkError: null,
  statsError: null,
  totalError: null,
};

/* ============================================================
   THUNKS
   ============================================================ */

// 🔹 Lấy tất cả items theo Transaction ID
export const fetchItemsByTransactionId = createAsyncThunk(
  "supplierTransactionItem/fetchByTransaction",
  async (transId, { rejectWithValue }) => {
    try {
      const res = await getItemsByTransactionIdAPI(transId);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Lấy item theo ID
export const fetchSupplierTransactionItemById = createAsyncThunk(
  "supplierTransactionItem/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await getSupplierTransactionItemByIdAPI(id);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Lấy items theo Product ID
export const fetchItemsByProductId = createAsyncThunk(
  "supplierTransactionItem/fetchByProduct",
  async ({ productId, params = {} }, { rejectWithValue }) => {
    try {
      const res = await getItemsByProductIdAPI(productId, params);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Lấy items theo Lot ID
export const fetchItemsByLotId = createAsyncThunk(
  "supplierTransactionItem/fetchByLot",
  async (lotId, { rejectWithValue }) => {
    try {
      const res = await getItemsByLotIdAPI(lotId);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Tạo item mới
export const createSupplierTransactionItem = createAsyncThunk(
  "supplierTransactionItem/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await createSupplierTransactionItemAPI(data);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Cập nhật item
export const updateSupplierTransactionItem = createAsyncThunk(
  "supplierTransactionItem/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await updateSupplierTransactionItemAPI(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Xóa item theo ID
export const deleteSupplierTransactionItem = createAsyncThunk(
  "supplierTransactionItem/delete",
  async (id, { rejectWithValue }) => {
    try {
      const res = await deleteSupplierTransactionItemAPI(id);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Xóa tất cả items theo transaction
export const deleteItemsByTransactionId = createAsyncThunk(
  "supplierTransactionItem/deleteByTransaction",
  async (transId, { rejectWithValue }) => {
    try {
      const res = await deleteItemsByTransactionIdAPI(transId);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Xóa nhiều items
export const deleteBulkSupplierTransactionItems = createAsyncThunk(
  "supplierTransactionItem/deleteBulk",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await deleteBulkSupplierTransactionItemsAPI(ids);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Thống kê items theo sản phẩm
export const fetchItemStatsByProduct = createAsyncThunk(
  "supplierTransactionItem/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await getItemStatsByProductAPI();
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

// 🔹 Tính tổng giá trị transaction
export const fetchTransactionTotal = createAsyncThunk(
  "supplierTransactionItem/fetchTotal",
  async (transId, { rejectWithValue }) => {
    try {
      const res = await calculateTransactionTotalAPI(transId);
      return res.data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || err.message,
      });
    }
  }
);

/* ============================================================
   SLICE
   ============================================================ */

const supplierTransactionItemSlice = createSlice({
  name: "supplierTransactionItem",
  initialState,
  reducers: {
    clearSelectedItem: (state) => {
      state.selectedItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch by Transaction
      .addCase(fetchItemsByTransactionId.pending, (state) => {
        state.fetchStatus = "loading";
      })
      .addCase(fetchItemsByTransactionId.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchItemsByTransactionId.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      })

      // Fetch by ID
      .addCase(fetchSupplierTransactionItemById.fulfilled, (state, action) => {
        state.selectedItem = action.payload;
      })

      // Create
      .addCase(createSupplierTransactionItem.pending, (state) => {
        state.createStatus = "loading";
      })
      .addCase(createSupplierTransactionItem.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.items.push(action.payload);
      })
      .addCase(createSupplierTransactionItem.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload;
      })

      // Update
      .addCase(updateSupplierTransactionItem.pending, (state) => {
        state.updateStatus = "loading";
      })
      .addCase(updateSupplierTransactionItem.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const index = state.items.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateSupplierTransactionItem.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })

      // Delete
      .addCase(deleteSupplierTransactionItem.pending, (state) => {
        state.deleteStatus = "loading";
      })
      .addCase(deleteSupplierTransactionItem.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        state.items = state.items.filter((i) => i.id !== action.payload.id);
      })
      .addCase(deleteSupplierTransactionItem.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload;
      })

      // Delete bulk
      .addCase(deleteBulkSupplierTransactionItems.pending, (state) => {
        state.deleteBulkStatus = "loading";
      })
      .addCase(deleteBulkSupplierTransactionItems.fulfilled, (state) => {
        state.deleteBulkStatus = "succeeded";
      })
      .addCase(deleteBulkSupplierTransactionItems.rejected, (state, action) => {
        state.deleteBulkStatus = "failed";
        state.deleteBulkError = action.payload;
      })

      // Stats
      .addCase(fetchItemStatsByProduct.pending, (state) => {
        state.statsStatus = "loading";
      })
      .addCase(fetchItemStatsByProduct.fulfilled, (state, action) => {
        state.statsStatus = "succeeded";
        state.stats = action.payload;
      })
      .addCase(fetchItemStatsByProduct.rejected, (state, action) => {
        state.statsStatus = "failed";
        state.statsError = action.payload;
      })

      // Total
      .addCase(fetchTransactionTotal.pending, (state) => {
        state.totalStatus = "loading";
      })
      .addCase(fetchTransactionTotal.fulfilled, (state, action) => {
        state.totalStatus = "succeeded";
        state.total = action.payload.total || 0;
      })
      .addCase(fetchTransactionTotal.rejected, (state, action) => {
        state.totalStatus = "failed";
        state.totalError = action.payload;
      });
  },
});

export const { clearSelectedItem } = supplierTransactionItemSlice.actions;
export default supplierTransactionItemSlice.reducer;
