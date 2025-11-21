import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  listSuppliers as listSuppliersAPI,
  createSupplier as createSupplierAPI,
  updateSupplier as updateSupplierAPI,
  deleteSupplier as deleteSupplierAPI,
  deleteBulkSuppliers as deleteBulkSuppliersAPI,
  getSupplierById as getSupplierByIdAPI,
  getSupplierByCode as getSupplierByCodeAPI,
  searchSuppliers as searchSuppliersAPI,
  getRecentSuppliers as getRecentSuppliersAPI,
  getSupplierCreationStats as getSupplierCreationStatsAPI,
} from "@src/services/supplierService";

// ===================== INITIAL STATE =====================
const initialState = {
  suppliers: [],
  selectedSupplier: null,
  stats: [],
  fetchStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  createStatus: "idle",
  updateStatus: "idle",
  deleteStatus: "idle",
  deleteBulkStatus: "idle",
  searchStatus: "idle",
  recentStatus: "idle",
  statsStatus: "idle",
  fetchError: null,
  createError: null,
  updateError: null,
  deleteError: null,
  deleteBulkError: null,
  searchError: null,
  recentError: null,
  statsError: null,
};

// ===================== THUNKS =====================

// Lấy danh sách suppliers
export const fetchListSuppliers = createAsyncThunk(
  "supplier/fetchListSuppliers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await listSuppliersAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Tạo supplier mới
export const createSupplier = createAsyncThunk(
  "supplier/createSupplier",
  async (supplierData, { rejectWithValue }) => {
    try {
      const response = await createSupplierAPI(supplierData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Cập nhật supplier
export const updateSupplier = createAsyncThunk(
  "supplier/updateSupplier",
  async ({ supplierId, supplierData }, { rejectWithValue }) => {
    try {
      const response = await updateSupplierAPI(supplierId, supplierData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Xóa supplier theo ID
export const deleteSupplier = createAsyncThunk(
  "supplier/deleteSupplier",
  async (supplierId, { rejectWithValue }) => {
    try {
      const response = await deleteSupplierAPI(supplierId);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Xóa nhiều suppliers
export const deleteBulkSuppliers = createAsyncThunk(
  "supplier/deleteBulkSuppliers",
  async (ids, { rejectWithValue }) => {
    try {
      const response = await deleteBulkSuppliersAPI(ids);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Tìm kiếm nâng cao
export const searchSuppliers = createAsyncThunk(
  "supplier/searchSuppliers",
  async (params, { rejectWithValue }) => {
    try {
      const response = await searchSuppliersAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Lấy suppliers gần đây
export const fetchRecentSuppliers = createAsyncThunk(
  "supplier/fetchRecentSuppliers",
  async (limit = 5, { rejectWithValue }) => {
    try {
      const response = await getRecentSuppliersAPI(limit);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Lấy thống kê supplier theo tháng
export const fetchSupplierCreationStats = createAsyncThunk(
  "supplier/fetchSupplierCreationStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getSupplierCreationStatsAPI();
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// Lấy chi tiết supplier theo ID
export const fetchSupplierById = createAsyncThunk(
  "supplier/fetchSupplierById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await getSupplierByIdAPI(id);
      return response.data;
    } catch (error) {
      return rejectWithValue({ message: error.response?.data?.message || error.message });
    }
  }
);

// Lấy chi tiết supplier theo mã code
export const fetchSupplierByCode = createAsyncThunk(
  "supplier/fetchSupplierByCode",
  async (code, { rejectWithValue }) => {
    try {
      const response = await getSupplierByCodeAPI(code);
      return response.data;
    } catch (error) {
      return rejectWithValue({ message: error.response?.data?.message || error.message });
    }
  }
);


// ===================== SLICE =====================
const supplierSlice = createSlice({
  name: "supplier",
  initialState,
  reducers: {
    clearSelectedSupplier: (state) => {
      state.selectedSupplier = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchListSuppliers.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchListSuppliers.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.suppliers = action.payload;
      })
      .addCase(fetchListSuppliers.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      })

      // Create
      .addCase(createSupplier.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.suppliers.data?.push
          ? state.suppliers.data.push(action.payload)
          : state.suppliers.push(action.payload);
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload;
      })

      // Update
      .addCase(updateSupplier.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateSupplier.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const index = state.suppliers.data?.findIndex
          ? state.suppliers.data.findIndex((s) => s.id === action.payload.id)
          : state.suppliers.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          if (state.suppliers.data) {
            state.suppliers.data[index] = action.payload;
          } else {
            state.suppliers[index] = action.payload;
          }
        }
      })
      .addCase(updateSupplier.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })

      // Delete single
      .addCase(deleteSupplier.pending, (state) => {
        state.deleteStatus = "loading";
        state.deleteError = null;
      })
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        if (state.suppliers.data) {
          state.suppliers.data = state.suppliers.data.filter(
            (s) => s.id !== action.payload.id
          );
        } else {
          state.suppliers = state.suppliers.filter(
            (s) => s.id !== action.payload.id
          );
        }
      })
      .addCase(deleteSupplier.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload;
      })

      // Delete bulk
      .addCase(deleteBulkSuppliers.pending, (state) => {
        state.deleteBulkStatus = "loading";
      })
      .addCase(deleteBulkSuppliers.fulfilled, (state) => {
        state.deleteBulkStatus = "succeeded";
      })
      .addCase(deleteBulkSuppliers.rejected, (state, action) => {
        state.deleteBulkStatus = "failed";
        state.deleteBulkError = action.payload;
      })

      // Search
      .addCase(searchSuppliers.pending, (state) => {
        state.searchStatus = "loading";
        state.searchError = null;
      })
      .addCase(searchSuppliers.fulfilled, (state, action) => {
        state.searchStatus = "succeeded";
        state.suppliers = action.payload;
      })
      .addCase(searchSuppliers.rejected, (state, action) => {
        state.searchStatus = "failed";
        state.searchError = action.payload;
      })

      // Recent
      .addCase(fetchRecentSuppliers.pending, (state) => {
        state.recentStatus = "loading";
        state.recentError = null;
      })
      .addCase(fetchRecentSuppliers.fulfilled, (state, action) => {
        state.recentStatus = "succeeded";
        state.suppliers = action.payload;
      })
      .addCase(fetchRecentSuppliers.rejected, (state, action) => {
        state.recentStatus = "failed";
        state.recentError = action.payload;
      })

      // Stats
      .addCase(fetchSupplierCreationStats.pending, (state) => {
        state.statsStatus = "loading";
        state.statsError = null;
      })
      .addCase(fetchSupplierCreationStats.fulfilled, (state, action) => {
        state.statsStatus = "succeeded";
        state.stats = action.payload;
      })
      .addCase(fetchSupplierCreationStats.rejected, (state, action) => {
        state.statsStatus = "failed";
        state.statsError = action.payload;
      })

      // Fetch by ID or Code
      .addCase(fetchSupplierById.fulfilled, (state, action) => {
      state.selectedSupplier = action.payload;
      })
      .addCase(fetchSupplierByCode.fulfilled, (state, action) => {
      state.selectedSupplier = action.payload;
      });
  },
});

export const { clearSelectedSupplier } = supplierSlice.actions;
export default supplierSlice.reducer;
