import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createCustomer as createCustomerAPI,
  // Import
  deleteCustomer as deleteCustomerAPI, // Import
  getListCustomersWithMoney,
  listCustomers as listCustomersAPI,
  // Import
  updateCustomer as updateCustomerAPI,
  getCustomerFinancialSummary as getCustomerFinancialSummaryAPI
} from "@src/services/customerService";

// Thunk: Lấy danh sách (đã có)
export const fetchCustomerWithMoney = createAsyncThunk(
  "customer/fetchCustomerWithMoney",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getListCustomersWithMoney(params);
      return response.data; // Trả về { data: [], pagination: {} }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi không xác định");
    }
  }
);

// Thunk: Tạo mới
export const createCustomer = createAsyncThunk(
  "customer/createCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await createCustomerAPI(customerData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi tạo khách hàng");
    }
  }
);

// Thunk: Cập nhật
export const updateCustomer = createAsyncThunk(
  "customer/updateCustomer",
  async ({ customerId, customerData }, { rejectWithValue }) => {
    try {
      const response = await updateCustomerAPI(customerId, customerData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi cập nhật");
    }
  }
);

// Thunk: Xóa
export const deleteCustomer = createAsyncThunk(
  "customer/deleteCustomer",
  async (customerId, { rejectWithValue }) => {
    try {
      await deleteCustomerAPI(customerId);
      return customerId; // Trả về ID để xử lý trong state
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi xóa");
    }
  }
);

// Rút gọn: fetchListCustomers (nếu bạn không dùng, có thể xóa)
export const fetchListCustomers = createAsyncThunk(
  "customer/fetchListCustomers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await listCustomersAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
// Lấy tổng hợp tài chính khách hàng
export const fetchCustomerFinancialSummary = createAsyncThunk(
  "customer/fetchCustomerFinancialSummary",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCustomerFinancialSummaryAPI();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

const initialState = {
  customers: { data: [], pagination: { total: 0 } }, // Thay đổi cấu trúc này
  financialSummary: {},
  
  fetchStatus: "idle", // idle | loading | succeeded | failed
  fetchError: null,

  createStatus: "idle",
  createError: null,

  updateStatus: "idle",
  updateError: null,

  deleteStatus: "idle",
  deleteError: null,

  financialSummaryStatus: "idle",
  financialSummaryError: null,
};

export const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchCustomerWithMoney (List)
      .addCase(fetchCustomerWithMoney.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchCustomerWithMoney.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.customers = action.payload; // Payload là { data: [], pagination: {} }
      })
      .addCase(fetchCustomerWithMoney.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload || action.error.message;
      })

      // createCustomer
      .addCase(createCustomer.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        // Không cần thêm vào list vì list sẽ được fetch lại
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload || action.error.message;
      })

      // updateCustomer
      .addCase(updateCustomer.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        // Cập nhật item trong list (nếu cần)
        const index = state.customers.data.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.customers.data[index] = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload || action.error.message;
      })

      // deleteCustomer
      .addCase(deleteCustomer.pending, (state) => {
        state.deleteStatus = "loading";
        state.deleteError = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        // Xóa item khỏi list (nếu cần)
        state.customers.data = state.customers.data.filter((c) => c.id !== action.payload);
        state.customers.pagination.total -= 1;
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload || action.error.message;
      })

      // Lấy tổng hợp tài chính khách hàng
      .addCase(fetchCustomerFinancialSummary.pending, (state) => {
        state.financialSummaryStatus = "loading";
        state.financialSummaryError = null;
      })
      .addCase(fetchCustomerFinancialSummary.fulfilled, (state, action) => {
        state.financialSummaryStatus = "succeeded";
        state.financialSummary = action.payload;
      })
      .addCase(fetchCustomerFinancialSummary.rejected, (state, action) => {
        state.financialSummaryStatus = "failed";
        state.financialSummaryError = action.payload || action.error.message;
      });
  },
});

export default customerSlice.reducer;
