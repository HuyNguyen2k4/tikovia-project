import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createOrderReturn as createOrderReturnAPI,
  getOrderReturnsByOrderId as getOrderReturnsByOrderIdAPI,
  updateOrderReturn as updateOrderReturnAPI,
} from "@services/OrderReturnsService";

const initialState = {
  orderReturnsByOrderId: {},
  fetchStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  fetchError: null,
  createOrderReturnStatus: "idle",
  createOrderReturnError: null,
  updateOrderReturnStatus: "idle",
  updateOrderReturnError: null,
};

export const fetchOrderReturnsByOrderId = createAsyncThunk(
  "orderReturns/fetchByOrderId",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await getOrderReturnsByOrderIdAPI(orderId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const createOrderReturn = createAsyncThunk(
  "orderReturns/create",
  async (orderReturnData, { rejectWithValue }) => {
    try {
      const response = await createOrderReturnAPI(orderReturnData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const updateOrderReturn = createAsyncThunk(
  "orderReturns/update",
  async ({ id, orderReturnData }, { rejectWithValue }) => {
    try {
      const response = await updateOrderReturnAPI(id, orderReturnData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const orderReturnsSlice = createSlice({
  name: "orderReturns",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrderReturnsByOrderId.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchOrderReturnsByOrderId.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.orderReturnsByOrderId = action.payload.data;
      })
      .addCase(fetchOrderReturnsByOrderId.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload.message;
      })
      .addCase(createOrderReturn.pending, (state) => {
        state.createOrderReturnStatus = "loading";
        state.createOrderReturnError = null;
      })
      .addCase(createOrderReturn.fulfilled, (state, action) => {
        state.createOrderReturnStatus = "succeeded";
        // Optionally, add the new order return to the state
      })
      .addCase(createOrderReturn.rejected, (state, action) => {
        state.createOrderReturnStatus = "failed";
        state.createOrderReturnError = action.payload;
      })
      .addCase(updateOrderReturn.pending, (state) => {
        state.updateOrderReturnStatus = "loading";
        state.updateOrderReturnError = null;
      })
      .addCase(updateOrderReturn.fulfilled, (state, action) => {
        state.updateOrderReturnStatus = "succeeded";
        // Update the order return in the state
        state.orderReturnsByOrderId = {
          ...state.orderReturnsByOrderId,
          ...action.payload.data,
        };
      })
      .addCase(updateOrderReturn.rejected, (state, action) => {
        state.updateOrderReturnStatus = "failed";
        state.updateOrderReturnError = action.payload;
      });
  },
});

export const {} = orderReturnsSlice.actions;
export default orderReturnsSlice.reducer;
