import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  listTasks as listTasksAPI,
  getTaskById as getTaskByIdAPI,
  getItemsByTask as getItemsByTaskAPI,
  createTask as createTaskAPI,
  updateTask as updateTaskAPI,
  updateTaskStatus as updateTaskStatusAPI,
  deleteTask as deleteTaskAPI,
  getTaskStatsOverview as getTaskStatsOverviewAPI,
  getTaskStatsByUser as getTaskStatsByUserAPI,
  getTasksBySupervisor as getTasksBySupervisorAPI,
  getTasksByPacker as getTasksByPackerAPI,
  getTasksByCurrentPacker as getTasksByCurrentPackerAPI,
  getTasksByCurrentSupervisor as getTasksByCurrentSupervisorAPI,
  updateTaskItemByPicker as updateTaskItemByPickerAPI,
  updateTaskReview as updateTaskReviewAPI,
} from "@src/services/taskService";

/* ============================================================
   INITIAL STATE
   ============================================================ */
const initialState = {
  tasks: [],
  selectedTask: null,
  taskItems: [],
  statsOverview: [],
  statsByUser: [],
  fetchStatus: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  deleteStatus: "idle",
  statsStatus: "idle",
  statsByUserStatus: "idle",
  fetchError: null,
  createError: null,
  updateError: null,
  deleteError: null,
  statsError: null,
  statsByUserError: null,
};

/* ============================================================
   ASYNC THUNKS
   ============================================================ */

// 📋 Lấy danh sách tasks
export const fetchTasks = createAsyncThunk(
  "tasks/fetchList",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await listTasksAPI(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 🔍 Lấy chi tiết task
export const fetchTaskById = createAsyncThunk(
  "tasks/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await getTaskByIdAPI(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 📦 Lấy danh sách items của task
export const fetchItemsByTask = createAsyncThunk(
  "tasks/fetchItemsByTask",
  async (id, { rejectWithValue }) => {
    try {
      const res = await getItemsByTaskAPI(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// ➕ Tạo task mới
export const createTask = createAsyncThunk(
  "tasks/create",
  async (taskData, { rejectWithValue }) => {
    try {
      const res = await createTaskAPI(taskData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// ✏️ Cập nhật task
export const updateTask = createAsyncThunk(
  "tasks/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await updateTaskAPI(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 🔄 Cập nhật trạng thái task (assigned → in_progress → pending_review → completed)
export const updateTaskStatus = createAsyncThunk(
  "tasks/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await updateTaskStatusAPI(id, status);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 🧾 Cập nhật kết quả review của preparation task
export const updateTaskReview = createAsyncThunk(
  "tasks/updateReview",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await updateTaskReviewAPI(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// ✏️ Picker cập nhật item trong task
export const updateTaskItemByPicker = createAsyncThunk(
  "tasks/updateItemByPicker",
  async ({ taskId, itemId, data }, { rejectWithValue }) => {
    try {
      const res = await updateTaskItemByPickerAPI(taskId, itemId, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// ❌ Xóa task
export const deleteTask = createAsyncThunk(
  "tasks/delete",
  async (id, { rejectWithValue }) => {
    try {
      const res = await deleteTaskAPI(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 📊 Lấy thống kê tổng quan
export const fetchTaskStatsOverview = createAsyncThunk(
  "tasks/fetchStatsOverview",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await getTaskStatsOverviewAPI(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 👤 Lấy thống kê theo người dùng
export const fetchTaskStatsByUser = createAsyncThunk(
  "tasks/fetchStatsByUser",
  async (userId, { rejectWithValue }) => {
    try {
      const res = await getTaskStatsByUserAPI(userId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 📦 Lấy task theo supervisor
export const fetchTasksBySupervisor = createAsyncThunk(
  "tasks/fetchBySupervisor",
  async ({ supervisorId, params = {} }, { rejectWithValue }) => {
    try {
      const res = await getTasksBySupervisorAPI(supervisorId, params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 📦 Lấy task theo packer
export const fetchTasksByPacker = createAsyncThunk(
  "tasks/fetchByPacker",
  async ({ packerId, params = {} }, { rejectWithValue }) => {
    try {
      const res = await getTasksByPackerAPI(packerId, params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 📋 Lấy toàn bộ task của supervisor hiện tại (theo JWT)
export const fetchTasksByCurrentSupervisor = createAsyncThunk(
  "tasks/fetchByCurrentSupervisor",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await getTasksByCurrentSupervisorAPI(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// 📋 Lấy toàn bộ task của packer hiện tại (theo JWT)
export const fetchTasksByCurrentPacker = createAsyncThunk(
  "tasks/fetchByCurrentPacker",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await getTasksByCurrentPackerAPI(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);


/* ============================================================
   SLICE
   ============================================================ */

const taskSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    clearSelectedTask: (state) => {
      state.selectedTask = null;
    },
    clearTaskItems: (state) => {
      state.taskItems = [];
    },
  },
  extraReducers: (builder) => {
    builder
      /* -------- FETCH LIST -------- */
      .addCase(fetchTasks.pending, (state) => {
        state.fetchStatus = "loading";
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      })

      /* -------- FETCH BY ID -------- */
      .addCase(fetchTaskById.pending, (state) => {
        state.fetchStatus = "loading";
        state.selectedTask = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.selectedTask = action.payload?.data || {};
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
        state.selectedTask = null;
      })

      /* -------- FETCH ITEMS BY TASK -------- */
      .addCase(fetchItemsByTask.pending, (state) => {
        state.fetchStatus = "loading";
      })
      .addCase(fetchItemsByTask.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.taskItems = action.payload?.data || [];
      })
      .addCase(fetchItemsByTask.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      })

      /* -------- CREATE -------- */
      .addCase(createTask.pending, (state) => {
        state.createStatus = "loading";
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        if (Array.isArray(state.tasks?.data)) {
          state.tasks.data.unshift(action.payload.data || action.payload);
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload;
      })

      /* -------- UPDATE -------- */
      .addCase(updateTask.pending, (state) => {
        state.updateStatus = "loading";
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const updated = action.payload?.data || action.payload;
        if (!updated?.id) return;

        // Nếu tasks là object có field data
        if (Array.isArray(state.tasks?.data)) {
          const idx = state.tasks.data.findIndex((t) => t.id === updated.id);
          if (idx !== -1) state.tasks.data[idx] = { ...state.tasks.data[idx], ...updated };
        }
        // Nếu tasks là mảng thuần
        else if (Array.isArray(state.tasks)) {
          const idx = state.tasks.findIndex((t) => t.id === updated.id);
          if (idx !== -1) state.tasks[idx] = { ...state.tasks[idx], ...updated };
        }

        // Nếu đang mở selectedTask, cập nhật lại luôn
        if (state.selectedTask?.id === updated.id) {
          state.selectedTask = { ...state.selectedTask, ...updated };
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })

      /* -------- UPDATE ITEM BY PICKER -------- */
      .addCase(updateTaskItemByPicker.pending, (state) => {
        state.updateStatus = "loading";
      })
      .addCase(updateTaskItemByPicker.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";

        const updatedItem = action.payload?.data || action.payload;

        // Cập nhật trong state.taskItems (nếu đang có)
        if (Array.isArray(state.taskItems)) {
          const idx = state.taskItems.findIndex((i) => i.id === updatedItem.id);
          if (idx !== -1) state.taskItems[idx] = { ...state.taskItems[idx], ...updatedItem };
        }

        // Cập nhật trong selectedTask.items nếu đang mở task
        if (state.selectedTask?.items) {
          const idx = state.selectedTask.items.findIndex((i) => i.id === updatedItem.id);
          if (idx !== -1)
            state.selectedTask.items[idx] = {
              ...state.selectedTask.items[idx],
              ...updatedItem,
            };
        }
      })
      .addCase(updateTaskItemByPicker.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })

      /* -------- UPDATE STATUS -------- */
      .addCase(updateTaskStatus.pending, (state) => {
        state.updateStatus = "loading";
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";

        const updated = action.payload?.data || action.payload;
        const updatedTask = updated?.id ? updated : null;

        if (updatedTask) {
          // Nếu state.tasks là object có field data (dạng { data: [...] })
          if (Array.isArray(state.tasks?.data)) {
            const idx = state.tasks.data.findIndex((t) => t.id === updatedTask.id);
            if (idx !== -1) state.tasks.data[idx] = { ...state.tasks.data[idx], ...updatedTask };
          }
          // Nếu state.tasks là mảng thuần
          else if (Array.isArray(state.tasks)) {
            const idx = state.tasks.findIndex((t) => t.id === updatedTask.id);
            if (idx !== -1) state.tasks[idx] = { ...state.tasks[idx], ...updatedTask };
          }
        }

        // Cập nhật selectedTask nếu đang mở
        if (state.selectedTask?.id === updatedTask?.id) {
          state.selectedTask = { ...state.selectedTask, ...updatedTask };
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })

      /* -------- UPDATE REVIEW -------- */
      .addCase(updateTaskReview.pending, (state) => {
        state.updateStatus = "loading";
      })
      .addCase(updateTaskReview.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";

        const updatedReview = action.payload?.data || action.payload;
        const taskId = updatedReview?.task_id;

        // Nếu có selectedTask hiện tại thì cập nhật thông tin review
        if (state.selectedTask && state.selectedTask.id === taskId) {
          state.selectedTask.review = updatedReview;
        }

        // Nếu state.tasks là danh sách các task — có thể thêm cờ reviewResult
        if (Array.isArray(state.tasks)) {
          const idx = state.tasks.findIndex((t) => t.id === taskId);
          if (idx !== -1) {
            state.tasks[idx] = {
              ...state.tasks[idx],
              reviewResult: updatedReview.result,
              reviewReason: updatedReview.reason,
              reviewUpdatedAt: updatedReview.updated_at,
            };
          }
        }
      })
      .addCase(updateTaskReview.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })

      /* -------- DELETE -------- */
      .addCase(deleteTask.pending, (state) => {
        state.deleteStatus = "loading";
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        state.tasks = state.tasks.filter((t) => t.id !== action.payload.id);
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload;
      })

      /* -------- STATS OVERVIEW -------- */
      .addCase(fetchTaskStatsOverview.pending, (state) => {
        state.statsStatus = "loading";
      })
      .addCase(fetchTaskStatsOverview.fulfilled, (state, action) => {
        state.statsStatus = "succeeded";
        state.statsOverview = action.payload;
      })
      .addCase(fetchTaskStatsOverview.rejected, (state, action) => {
        state.statsStatus = "failed";
        state.statsError = action.payload;
      })

      /* -------- STATS BY USER -------- */
      .addCase(fetchTaskStatsByUser.pending, (state) => {
        state.statsByUserStatus = "loading";
      })
      .addCase(fetchTaskStatsByUser.fulfilled, (state, action) => {
        state.statsByUserStatus = "succeeded";
        state.statsByUser = action.payload;
      })
      .addCase(fetchTaskStatsByUser.rejected, (state, action) => {
        state.statsByUserStatus = "failed";
        state.statsByUserError = action.payload;
      })
      
            /* -------- FETCH TASKS BY CURRENT SUPERVISOR -------- */
      .addCase(fetchTasksByCurrentSupervisor.pending, (state) => {
        state.fetchStatus = "loading";
      })
      .addCase(fetchTasksByCurrentSupervisor.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.tasks = action.payload?.data || action.payload;
      })
      .addCase(fetchTasksByCurrentSupervisor.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      })

      /* -------- FETCH TASKS BY CURRENT PACKER -------- */
      .addCase(fetchTasksByCurrentPacker.pending, (state) => {
        state.fetchStatus = "loading";
      })
      .addCase(fetchTasksByCurrentPacker.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.tasks = action.payload?.data || action.payload;
      })
      .addCase(fetchTasksByCurrentPacker.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      });
  },
});

export const { clearSelectedTask, clearTaskItems } = taskSlice.actions;
export default taskSlice.reducer;
