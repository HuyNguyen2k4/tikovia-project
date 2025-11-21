import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  cancelDeliveryRunOrder as cancelDeliveryRunOrderAPI,
  completeDeliveryRunOrder as completeDeliveryRunOrderAPI,
  failDeliveryRunOrder as failDeliveryRunOrderAPI,
  reopenDeliveryRunOrder as reopenDeliveryRunOrderAPI,
  startDeliveryRunOrder as startDeliveryRunOrderAPI,
} from "@services/deliveryRunOrdersService";
import {
  cancelDeliveryRun as cancelDeliveryRunAPI,
  completeDeliveryOrder as completeDeliveryOrderAPI,
  completeDeliveryRun as completeDeliveryRunAPI,
  createDeliveryRun as createDeliveryRunAPI,
  deleteDeliveryRun as deleteDeliveryRunAPI,
  failDeliveryOrder as failDeliveryOrderAPI,
  getDeliveryRunById as getDeliveryRunByIdAPI,
  getDeliveryRunOrdersByRunId as getDeliveryRunOrdersByRunIdAPI,
  getListDeliveryRuns as getListDeliveryRunsAPI,
  startDeliveryOrder as startDeliveryOrderAPI,
  startDeliveryRun as startDeliveryRunAPI,
  updateDeliveryRun as updateDeliveryRunAPI,
} from "@services/deliveryRunsService";

const initialState = {
  deliveryRuns: {
    data: [],
    pagination: {},
  },
  deliveryRunById: {},
  fetchStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  fetchError: null,
  createStatus: "idle",
  createError: null,
  updateStatus: "idle",
  updateError: null,
  deleteStatus: "idle",
  deleteError: null,
  startStatus: "idle",
  startError: null,
  completeStatus: "idle",
  completeError: null,
  cancelStatus: "idle",
  cancelError: null,
  // Delivery run orders status
  orderStartStatus: "idle",
  orderStartError: null,
  orderCompleteStatus: "idle",
  orderCompleteError: null,
  orderCancelStatus: "idle",
  orderCancelError: null,
  orderFailStatus: "idle",
  orderFailError: null,
  orderReopenStatus: "idle", // ✅ Thêm state cho reopen
  orderReopenError: null,
};

// Lấy danh sách delivery runs
export const fetchDeliveryRuns = createAsyncThunk(
  "deliveryRuns/fetchDeliveryRuns",
  async (params, { rejectWithValue }) => {
    try {
      const response = await getListDeliveryRunsAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Lấy thông tin delivery run theo ID
export const fetchDeliveryRunById = createAsyncThunk(
  "deliveryRuns/fetchDeliveryRunById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await getDeliveryRunByIdAPI(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Tạo delivery run mới
export const createDeliveryRun = createAsyncThunk(
  "deliveryRuns/createDeliveryRun",
  async (data, { rejectWithValue }) => {
    try {
      const response = await createDeliveryRunAPI(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Cập nhật delivery run
export const updateDeliveryRun = createAsyncThunk(
  "deliveryRuns/updateDeliveryRun",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await updateDeliveryRunAPI(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Xóa delivery run
export const deleteDeliveryRun = createAsyncThunk(
  "deliveryRuns/deleteDeliveryRun",
  async (id, { rejectWithValue }) => {
    try {
      const response = await deleteDeliveryRunAPI(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Bắt đầu delivery run
export const startDeliveryRun = createAsyncThunk(
  "deliveryRuns/startDeliveryRun",
  async (id, { rejectWithValue }) => {
    try {
      const response = await startDeliveryRunAPI(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Hoàn thành delivery run
export const completeDeliveryRun = createAsyncThunk(
  "deliveryRuns/completeDeliveryRun",
  async (id, { rejectWithValue }) => {
    try {
      const response = await completeDeliveryRunAPI(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Hủy delivery run
export const cancelDeliveryRun = createAsyncThunk(
  "deliveryRuns/cancelDeliveryRun",
  async (id, { rejectWithValue }) => {
    try {
      const response = await cancelDeliveryRunAPI(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Lấy danh sách orders của một delivery run
export const fetchDeliveryRunOrders = createAsyncThunk(
  "deliveryRuns/fetchDeliveryRunOrders",
  async (runId, { rejectWithValue }) => {
    try {
      const response = await getDeliveryRunOrdersByRunIdAPI(runId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Bắt đầu giao hàng (delivery order)
export const startDeliveryOrder = createAsyncThunk(
  "deliveryRuns/startDeliveryOrder",
  async (id, { rejectWithValue }) => {
    try {
      const response = await startDeliveryOrderAPI(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Hoàn thành giao hàng (delivery order)
export const completeDeliveryOrder = createAsyncThunk(
  "deliveryRuns/completeDeliveryOrder",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await completeDeliveryOrderAPI(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Đánh dấu giao hàng thất bại (delivery order)
export const failDeliveryOrder = createAsyncThunk(
  "deliveryRuns/failDeliveryOrder",
  async ({ id, note }, { rejectWithValue }) => {
    try {
      const response = await failDeliveryOrderAPI(id, note);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ===== NEW DELIVERY RUN ORDERS ACTIONS =====

// Bắt đầu giao hàng cho một order (new service)
export const startDeliveryRunOrder = createAsyncThunk(
  "deliveryRuns/startDeliveryRunOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await startDeliveryRunOrderAPI(orderId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Hoàn thành giao hàng cho một order (new service)
export const completeDeliveryRunOrder = createAsyncThunk(
  "deliveryRuns/completeDeliveryRunOrder",
  async ({ orderId, data }, { rejectWithValue }) => {
    try {
      const response = await completeDeliveryRunOrderAPI(orderId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Hủy giao hàng cho một order (new service - admin only)
export const cancelDeliveryRunOrder = createAsyncThunk(
  "deliveryRuns/cancelDeliveryRunOrder",
  async ({ orderId, data }, { rejectWithValue }) => {
    try {
      const response = await cancelDeliveryRunOrderAPI(orderId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Đánh dấu giao hàng thất bại cho một order (new service - admin only)
export const failDeliveryRunOrder = createAsyncThunk(
  "deliveryRuns/failDeliveryRunOrder",
  async ({ orderId, data }, { rejectWithValue }) => {
    try {
      const response = await failDeliveryRunOrderAPI(orderId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✅ Thêm thunk mở lại giao hàng cho một order
export const reopenDeliveryRunOrder = createAsyncThunk(
  "deliveryRuns/reopenDeliveryRunOrder",
  async ({ orderId, data }, { rejectWithValue }) => {
    try {
      const response = await reopenDeliveryRunOrderAPI(orderId, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const deliveryRunsSlice = createSlice({
  name: "deliveryRuns",
  initialState,
  reducers: {
    resetDeliveryRuns: (state) => {
      state.deliveryRuns = {
        data: [],
        pagination: {},
      };
      state.fetchStatus = "idle";
      state.fetchError = null;
    },
    resetDeliveryRunById: (state) => {
      state.deliveryRunById = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchDeliveryRuns
      .addCase(fetchDeliveryRuns.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchDeliveryRuns.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.deliveryRuns.data = action.payload.data;
        state.deliveryRuns.pagination = action.payload.pagination;
      })
      .addCase(fetchDeliveryRuns.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload || action.error.message;
      })
      // fetchDeliveryRunById
      .addCase(fetchDeliveryRunById.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchDeliveryRunById.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.deliveryRunById = action.payload.data;
      })
      .addCase(fetchDeliveryRunById.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload || action.error.message;
      })
      // createDeliveryRun
      .addCase(createDeliveryRun.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createDeliveryRun.fulfilled, (state) => {
        state.createStatus = "succeeded";
      })
      .addCase(createDeliveryRun.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload || action.error.message;
      })
      // updateDeliveryRun
      .addCase(updateDeliveryRun.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateDeliveryRun.fulfilled, (state) => {
        state.updateStatus = "succeeded";
      })
      .addCase(updateDeliveryRun.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload || action.error.message;
      })
      // deleteDeliveryRun
      .addCase(deleteDeliveryRun.pending, (state) => {
        state.deleteStatus = "loading";
        state.deleteError = null;
      })
      .addCase(deleteDeliveryRun.fulfilled, (state) => {
        state.deleteStatus = "succeeded";
      })
      .addCase(deleteDeliveryRun.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload || action.error.message;
      })
      // startDeliveryRun
      .addCase(startDeliveryRun.pending, (state) => {
        state.startStatus = "loading";
        state.startError = null;
      })
      .addCase(startDeliveryRun.fulfilled, (state) => {
        state.startStatus = "succeeded";
      })
      .addCase(startDeliveryRun.rejected, (state, action) => {
        state.startStatus = "failed";
        state.startError = action.payload || action.error.message;
      })
      // completeDeliveryRun
      .addCase(completeDeliveryRun.pending, (state) => {
        state.completeStatus = "loading";
        state.completeError = null;
      })
      .addCase(completeDeliveryRun.fulfilled, (state) => {
        state.completeStatus = "succeeded";
      })
      .addCase(completeDeliveryRun.rejected, (state, action) => {
        state.completeStatus = "failed";
        state.completeError = action.payload || action.error.message;
      })
      // cancelDeliveryRun
      .addCase(cancelDeliveryRun.pending, (state) => {
        state.cancelStatus = "loading";
        state.cancelError = null;
      })
      .addCase(cancelDeliveryRun.fulfilled, (state) => {
        state.cancelStatus = "succeeded";
      })
      .addCase(cancelDeliveryRun.rejected, (state, action) => {
        state.cancelStatus = "failed";
        state.cancelError = action.payload || action.error.message;
      })
      // startDeliveryRunOrder
      .addCase(startDeliveryRunOrder.pending, (state) => {
        state.orderStartStatus = "loading";
        state.orderStartError = null;
      })
      .addCase(startDeliveryRunOrder.fulfilled, (state) => {
        state.orderStartStatus = "succeeded";
      })
      .addCase(startDeliveryRunOrder.rejected, (state, action) => {
        state.orderStartStatus = "failed";
        state.orderStartError = action.payload || action.error.message;
      })
      // completeDeliveryRunOrder
      .addCase(completeDeliveryRunOrder.pending, (state) => {
        state.orderCompleteStatus = "loading";
        state.orderCompleteError = null;
      })
      .addCase(completeDeliveryRunOrder.fulfilled, (state) => {
        state.orderCompleteStatus = "succeeded";
      })
      .addCase(completeDeliveryRunOrder.rejected, (state, action) => {
        state.orderCompleteStatus = "failed";
        state.orderCompleteError = action.payload || action.error.message;
      })
      // cancelDeliveryRunOrder
      .addCase(cancelDeliveryRunOrder.pending, (state) => {
        state.orderCancelStatus = "loading";
        state.orderCancelError = null;
      })
      .addCase(cancelDeliveryRunOrder.fulfilled, (state) => {
        state.orderCancelStatus = "succeeded";
      })
      .addCase(cancelDeliveryRunOrder.rejected, (state, action) => {
        state.orderCancelStatus = "failed";
        state.orderCancelError = action.payload || action.error.message;
      })
      // failDeliveryRunOrder
      .addCase(failDeliveryRunOrder.pending, (state) => {
        state.orderFailStatus = "loading";
        state.orderFailError = null;
      })
      .addCase(failDeliveryRunOrder.fulfilled, (state) => {
        state.orderFailStatus = "succeeded";
      })
      .addCase(failDeliveryRunOrder.rejected, (state, action) => {
        state.orderFailStatus = "failed";
        state.orderFailError = action.payload || action.error.message;
      })
      // ✅ Thêm cases cho reopenDeliveryRunOrder
      .addCase(reopenDeliveryRunOrder.pending, (state) => {
        state.orderReopenStatus = "loading";
        state.orderReopenError = null;
      })
      .addCase(reopenDeliveryRunOrder.fulfilled, (state) => {
        state.orderReopenStatus = "succeeded";
      })
      .addCase(reopenDeliveryRunOrder.rejected, (state, action) => {
        state.orderReopenStatus = "failed";
        state.orderReopenError = action.payload || action.error.message;
      });
  },
});

export const { resetDeliveryRuns, resetDeliveryRunById } = deliveryRunsSlice.actions;
export default deliveryRunsSlice.reducer;
