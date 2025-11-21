import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createPaymentCombined as createPaymentCombinedAPI,
  fetchAllocationsForInvoice as fetchAllocationsForInvoiceAPI,
  fetchPaymentCombinedById as fetchPaymentCombinedByIdAPI,
  fetchPaymentsCombined as fetchPaymentsCombinedAPI,
  updatePaymentCombined as updatePaymentCombinedAPI,
} from "@services/paymentsCombinedService";
import { updatePayment } from "@src/services/supTransactionPaymentService";

const initialState = {
  paymentsCombinedData: {
    data: [],
    pagination: {},
  },
  fetchAllStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  fetchAllError: null,

  allocationForInvoice: [],
  fetchAllocationStatus: "idle",
  fetchAllocationError: null,

  paymentDetail: {},
  fetchDetailStatus: "idle",
  fetchDetailError: null,

  createPaymentStatus: "idle",
  createPaymentError: null,

  updatePaymentStatus: "idle",
  updatePaymentError: null,
};
//Lấy danh sách payments
export const fetchListAllPaymentsCombined = createAsyncThunk(
  "paymentsCombined/fetchListAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await fetchPaymentsCombinedAPI(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

//Lấy allocations của một invoice
export const fetchAllocationsForInvoice = createAsyncThunk(
  "paymentsCombined/fetchAllocationsForInvoice",
  async (invoiceId, { rejectWithValue }) => {
    try {
      const response = await fetchAllocationsForInvoiceAPI(`/invoice/${invoiceId}/allocations`);
      return { invoiceId, allocations: response.data };
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

// Lấy chi tiết payment
export const fetchPaymentCombinedById = createAsyncThunk(
  "paymentsCombined/fetchPaymentCombinedById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetchPaymentCombinedByIdAPI(id);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

//Tạo payment mới
export const createPaymentCombined = createAsyncThunk(
  "paymentsCombined/createPaymentCombined",
  async (paymentData, { rejectWithValue }) => {
    try {
      const response = await createPaymentCombinedAPI(paymentData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

//Cập nhật payment
export const updatePaymentCombined = createAsyncThunk(
  "paymentsCombined/updatePaymentCombined",
  async ({ id, paymentData }, { rejectWithValue }) => {
    try {
      const response = await updatePaymentCombinedAPI(id, paymentData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const paymentsCombinedSlice = createSlice({
  name: "paymentsCombined",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch All Payments Combined
      .addCase(fetchListAllPaymentsCombined.pending, (state) => {
        state.fetchAllStatus = "loading";
        state.fetchAllError = null;
      })
      .addCase(fetchListAllPaymentsCombined.fulfilled, (state, action) => {
        state.fetchAllStatus = "succeeded";
        state.paymentsCombinedData = action.payload;
      })
      .addCase(fetchListAllPaymentsCombined.rejected, (state, action) => {
        state.fetchAllStatus = "failed";
        state.fetchAllError = action.payload.message;
      })
      // Allocations for Invoice
      .addCase(fetchAllocationsForInvoice.pending, (state) => {
        state.fetchAllocationStatus = "loading";
        state.fetchAllocationError = null;
      })
      .addCase(fetchAllocationsForInvoice.fulfilled, (state, action) => {
        state.fetchAllocationStatus = "succeeded";
        state.allocationForInvoice = action.payload.data;
      })
      .addCase(fetchAllocationsForInvoice.rejected, (state, action) => {
        state.fetchAllocationStatus = "failed";
        state.fetchAllocationError = action.payload.message;
      })
      // Payment Detail
      .addCase(fetchPaymentCombinedById.pending, (state) => {
        state.fetchDetailStatus = "loading";
        state.fetchDetailError = null;
      })
      .addCase(fetchPaymentCombinedById.fulfilled, (state, action) => {
        state.fetchDetailStatus = "succeeded";
        state.paymentDetail = action.payload.data;
      })
      .addCase(fetchPaymentCombinedById.rejected, (state, action) => {
        state.fetchDetailStatus = "failed";
        state.fetchDetailError = action.payload.message;
      })
      // Create Payment Combined
      .addCase(createPaymentCombined.pending, (state) => {
        state.createPaymentStatus = "loading";
        state.createPaymentError = null;
      })
      .addCase(createPaymentCombined.fulfilled, (state, action) => {
        state.createPaymentStatus = "succeeded";
        state.paymentsCombinedData.data.push(action.payload.data);
      })
      .addCase(createPaymentCombined.rejected, (state, action) => {
        state.createPaymentStatus = "failed";
        state.createPaymentError = action.payload.message;
      })
      // Update Payment Combined
      .addCase(updatePaymentCombined.pending, (state) => {
        state.updatePaymentStatus = "loading";
        state.updatePaymentError = null;
      })
      .addCase(updatePaymentCombined.fulfilled, (state, action) => {
        state.updatePaymentStatus = "succeeded";
        const index = state.paymentsCombinedData.data.findIndex(
          (payment) => payment.id === action.payload.data.id
        );
        if (index !== -1) {
          state.paymentsCombinedData.data[index] = action.payload.data;
        }
      })
      .addCase(updatePaymentCombined.rejected, (state, action) => {
        state.updatePaymentStatus = "failed";
        state.updatePaymentError = action.payload.message;
      });
  },
});
export const {} = paymentsCombinedSlice.actions;
export default paymentsCombinedSlice.reducer;
