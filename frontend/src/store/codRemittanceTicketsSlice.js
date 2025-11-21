import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createCodRemittanceTicket as createCodRemittanceTicketAPI,
  deleteCodRemittanceTicket as deleteCodRemittanceTicketAPI,
  getAvailableDeliveryRuns as getAvailableDeliveryRunsAPI,
  getCodRemittanceTicketById as getCodRemittanceTicketByIdAPI,
  getCodRemittanceTicketDetails as getCodRemittanceTicketDetailsAPI,
  // ✅ Thêm import này
  getCodRemittanceTickets as getCodRemittanceTicketsAPI,
  updateCodRemittanceTicket as updateCodRemittanceTicketAPI,
} from "@src/services/codRemittanceTicketsService";

// ============================================================
// ASYNC THUNKS
// ============================================================

// Thunk: Lấy danh sách COD remittance tickets
export const fetchCodRemittanceTickets = createAsyncThunk(
  "codRemittanceTickets/fetchCodRemittanceTickets",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getCodRemittanceTicketsAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi không xác định");
    }
  }
);

// Thunk: Lấy chi tiết ticket theo ID (cơ bản)
export const fetchCodRemittanceTicketById = createAsyncThunk(
  "codRemittanceTickets/fetchCodRemittanceTicketById",
  async (ticketId, { rejectWithValue }) => {
    try {
      const response = await getCodRemittanceTicketByIdAPI(ticketId);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi lấy chi tiết ticket");
    }
  }
);

// ✅ Thunk lấy chi tiết ticket với đầy đủ thông tin (bao gồm orders)
export const fetchCodRemittanceTicketDetails = createAsyncThunk(
  "codRemittanceTickets/fetchCodRemittanceTicketDetails",
  async (ticketId, { rejectWithValue }) => {
    try {
      const response = await getCodRemittanceTicketDetailsAPI(ticketId);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi lấy chi tiết đầy đủ ticket");
    }
  }
);

// Thunk: Lấy danh sách delivery runs khả dụng
export const fetchAvailableDeliveryRuns = createAsyncThunk(
  "codRemittanceTickets/fetchAvailableDeliveryRuns",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await getAvailableDeliveryRunsAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi lấy delivery runs khả dụng");
    }
  }
);

// Thunk: Tạo mới COD remittance ticket
export const createCodRemittanceTicket = createAsyncThunk(
  "codRemittanceTickets/createCodRemittanceTicket",
  async (ticketData, { rejectWithValue }) => {
    try {
      const response = await createCodRemittanceTicketAPI(ticketData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi tạo COD remittance ticket");
    }
  }
);

// Thunk: Cập nhật COD remittance ticket
export const updateCodRemittanceTicket = createAsyncThunk(
  "codRemittanceTickets/updateCodRemittanceTicket",
  async ({ ticketId, ticketData }, { rejectWithValue }) => {
    try {
      const response = await updateCodRemittanceTicketAPI(ticketId, ticketData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi cập nhật ticket");
    }
  }
);

// Thunk: Xóa COD remittance ticket
export const deleteCodRemittanceTicket = createAsyncThunk(
  "codRemittanceTickets/deleteCodRemittanceTicket",
  async (ticketId, { rejectWithValue }) => {
    try {
      await deleteCodRemittanceTicketAPI(ticketId);
      return ticketId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Lỗi khi xóa ticket");
    }
  }
);

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
  tickets: { data: [], pagination: { total: 0 } },
  currentTicket: null,
  availableDeliveryRuns: { data: [], pagination: { total: 0 } },

  fetchStatus: "idle",
  fetchError: null,

  fetchTicketStatus: "idle",
  fetchTicketError: null,

  fetchTicketDetailsStatus: "idle",
  fetchTicketDetailsError: null,

  fetchAvailableRunsStatus: "idle",
  fetchAvailableRunsError: null,

  createStatus: "idle",
  createError: null,

  updateStatus: "idle",
  updateError: null,

  deleteStatus: "idle",
  deleteError: null,
};

// ============================================================
// SLICE
// ============================================================

export const codRemittanceTicketsSlice = createSlice({
  name: "codRemittanceTickets",
  initialState,
  reducers: {
    resetCreateStatus: (state) => {
      state.createStatus = "idle";
      state.createError = null;
    },
    resetUpdateStatus: (state) => {
      state.updateStatus = "idle";
      state.updateError = null;
    },
    resetDeleteStatus: (state) => {
      state.deleteStatus = "idle";
      state.deleteError = null;
    },
    clearCurrentTicket: (state) => {
      state.currentTicket = null;
      state.fetchTicketDetailsStatus = "idle";
      state.fetchTicketDetailsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // FETCH COD REMITTANCE TICKETS
      .addCase(fetchCodRemittanceTickets.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchCodRemittanceTickets.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.tickets = action.payload;
      })
      .addCase(fetchCodRemittanceTickets.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload || action.error.message;
      })

      // FETCH SINGLE TICKET BY ID
      .addCase(fetchCodRemittanceTicketById.pending, (state) => {
        state.fetchTicketStatus = "loading";
        state.fetchTicketError = null;
      })
      .addCase(fetchCodRemittanceTicketById.fulfilled, (state, action) => {
        state.fetchTicketStatus = "succeeded";
        state.currentTicket = action.payload;
      })
      .addCase(fetchCodRemittanceTicketById.rejected, (state, action) => {
        state.fetchTicketStatus = "failed";
        state.fetchTicketError = action.payload || action.error.message;
      })

      // ✅ FETCH TICKET DETAILS (Đầy đủ thông tin)
      .addCase(fetchCodRemittanceTicketDetails.pending, (state) => {
        state.fetchTicketDetailsStatus = "loading";
        state.fetchTicketDetailsError = null;
      })
      .addCase(fetchCodRemittanceTicketDetails.fulfilled, (state, action) => {
        state.fetchTicketDetailsStatus = "succeeded";
        state.currentTicket = action.payload;
      })
      .addCase(fetchCodRemittanceTicketDetails.rejected, (state, action) => {
        state.fetchTicketDetailsStatus = "failed";
        state.fetchTicketDetailsError = action.payload || action.error.message;
      })

      // FETCH AVAILABLE DELIVERY RUNS
      .addCase(fetchAvailableDeliveryRuns.pending, (state) => {
        state.fetchAvailableRunsStatus = "loading";
        state.fetchAvailableRunsError = null;
      })
      .addCase(fetchAvailableDeliveryRuns.fulfilled, (state, action) => {
        state.fetchAvailableRunsStatus = "succeeded";
        state.availableDeliveryRuns = action.payload;
      })
      .addCase(fetchAvailableDeliveryRuns.rejected, (state, action) => {
        state.fetchAvailableRunsStatus = "failed";
        state.fetchAvailableRunsError = action.payload || action.error.message;
      })

      // CREATE COD REMITTANCE TICKET
      .addCase(createCodRemittanceTicket.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createCodRemittanceTicket.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.tickets.data.unshift(action.payload);
        state.tickets.pagination.total += 1;
      })
      .addCase(createCodRemittanceTicket.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload || action.error.message;
      })

      // UPDATE COD REMITTANCE TICKET
      .addCase(updateCodRemittanceTicket.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateCodRemittanceTicket.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const index = state.tickets.data.findIndex((ticket) => ticket.id === action.payload.id);
        if (index !== -1) {
          state.tickets.data[index] = action.payload;
        }
        if (state.currentTicket && state.currentTicket.id === action.payload.id) {
          state.currentTicket = action.payload;
        }
      })
      .addCase(updateCodRemittanceTicket.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload || action.error.message;
      })

      // DELETE COD REMITTANCE TICKET
      .addCase(deleteCodRemittanceTicket.pending, (state) => {
        state.deleteStatus = "loading";
        state.deleteError = null;
      })
      .addCase(deleteCodRemittanceTicket.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        state.tickets.data = state.tickets.data.filter((ticket) => ticket.id !== action.payload);
        state.tickets.pagination.total -= 1;
        if (state.currentTicket && state.currentTicket.id === action.payload) {
          state.currentTicket = null;
        }
      })
      .addCase(deleteCodRemittanceTicket.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload || action.error.message;
      });
  },
});

export const { resetCreateStatus, resetUpdateStatus, resetDeleteStatus, clearCurrentTicket } =
  codRemittanceTicketsSlice.actions;

export default codRemittanceTicketsSlice.reducer;
