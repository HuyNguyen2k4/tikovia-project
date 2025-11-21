import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createSalesInvoice as createSalesInvoiceAPI,
  getSalesInvoiceById as getSalesInvoiceByIdAPI,
  getSalesInvoiceByOrderId as getSalesInvoiceByOrderIdAPI,
  getSalesInvoices as getSalesInvoicesAPI,
  updateSalesInvoice as updateSalesInvoiceAPI,
} from "@services/salesInvoicesService";

const initialState = {
  salesInvoices: {
    data: [],
    pagination: {},
  },
  salesInvoiceById: {},
  salesInvoiceByOrderId: {},
  fetchStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  fetchError: null,
  fetchByIdStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  fetchByIdError: null,
  fetchByOrderIdStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  fetchByOrderIdError: null,
  createStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  createError: null,
  updateStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  updateError: null,
};

// Lấy hết tất cả sales invoice với phân trang (chưa sử dụng)
export const fetchSalesInvoices = createAsyncThunk(
  "salesInvoices/fetchSalesInvoices",
  async (params, { rejectWithValue }) => {
    try {
      const response = await getSalesInvoicesAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Lấy thông tin sales invoice theo ID
export const fetchSalesInvoiceById = createAsyncThunk(
  "salesInvoices/fetchSalesInvoiceById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await getSalesInvoiceByIdAPI(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Lấy thông tin sales invoice theo order ID
export const fetchSalesInvoiceByOrderId = createAsyncThunk(
  "salesInvoices/fetchSalesInvoiceByOrderId",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await getSalesInvoiceByOrderIdAPI(orderId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
// Tạo mới sales invoice
export const createSalesInvoice = createAsyncThunk(
  "salesInvoices/createSalesInvoice",
  async (data, { rejectWithValue }) => {
    try {
      const response = await createSalesInvoiceAPI(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Cập nhật sales invoice
export const updateSalesInvoice = createAsyncThunk(
  "salesInvoices/updateSalesInvoice",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await updateSalesInvoiceAPI(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const salesInvoicesSlice = createSlice({
  name: "salesInvoices",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // lấy tất cả sales invoices có phân trang
      .addCase(fetchSalesInvoices.pending, (state) => {
        state.fetchStatus = "loading";
      })
      .addCase(fetchSalesInvoices.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.salesInvoices.data = action.payload.data;
        state.salesInvoices.pagination = action.payload.pagination;
      })
      .addCase(fetchSalesInvoices.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload || action.error.message;
      })
      // lấy sales invoice theo ID
      .addCase(fetchSalesInvoiceById.pending, (state) => {
        state.fetchByIdStatus = "loading";
      })
      .addCase(fetchSalesInvoiceById.fulfilled, (state, action) => {
        state.fetchByIdStatus = "succeeded";
        state.salesInvoiceById = action.payload.data;
      })
      .addCase(fetchSalesInvoiceById.rejected, (state, action) => {
        state.fetchByIdStatus = "failed";
        state.fetchByIdError = action.payload || action.error.message;
      })
      // lấy sales invoice theo order ID
      .addCase(fetchSalesInvoiceByOrderId.pending, (state) => {
        state.fetchByOrderIdStatus = "loading";
      })
      .addCase(fetchSalesInvoiceByOrderId.fulfilled, (state, action) => {
        state.fetchByOrderIdStatus = "succeeded";
        state.salesInvoiceByOrderId = action.payload.data;
      })
      .addCase(fetchSalesInvoiceByOrderId.rejected, (state, action) => {
        state.fetchByOrderIdStatus = "failed";
        state.fetchByOrderIdError = action.payload || action.error.message;
      })
      // tạo mới sales invoice
      .addCase(createSalesInvoice.pending, (state) => {
        state.createStatus = "loading";
      })
      .addCase(createSalesInvoice.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.salesInvoices.data.push(action.payload.data);
      })
      .addCase(createSalesInvoice.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload || action.error.message;
      })
      // cập nhật sales invoice
      .addCase(updateSalesInvoice.pending, (state) => {
        state.updateStatus = "loading";
      })
      .addCase(updateSalesInvoice.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const index = state.salesInvoices.data.findIndex(
          (item) => item.id === action.payload.data.id
        );
        if (index !== -1) {
          state.salesInvoices.data[index] = action.payload.data;
        }
      })
      .addCase(updateSalesInvoice.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload || action.error.message;
      });
  },
});
export const {} = salesInvoicesSlice.actions;
export default salesInvoicesSlice.reducer;
