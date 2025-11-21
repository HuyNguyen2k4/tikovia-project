import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createDepartment as createDepartmentAPI,
  deleteDepartment as deleteDepartmentAPI,
  getDepartment as getDepartmentAPI,
  listAllDepartments as listAllDepartmentsAPI,
  listDepartments as listDepartmentsAPI,
  updateDepartment as updateDepartmentAPI,
  updateDepartmentStatus as updateDepartmentStatusAPI,
} from "@src/services/departmentService";

const initialState = {
  departments: [],
  allDepartments: [], // danh sách tất cả department (không phân trang) dùng cho select
  department: null,
  fetchStatus: "idle", // idle | loading | succeeded | failed
  fetchListAllStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' (danh sách tất cả department không phân trang)
  createStatus: "idle", // idle | loading | succeeded | failed
  updateStatus: "idle", // idle | loading | succeeded | failed
  updateDepartmentStatus: "idle", // idle | loading | succeeded | failed (cho update status của department )
  deleteDepartmentStatus: "idle", // idle | loading | succeeded | failed (cho delete department)
  fetchError: null,
  fetchListAllError: null, // lỗi khi fetch danh sách tất cả department không phân trang
  createError: null,
  updateError: null,
  updateDepartmentStatusError: null,
  deleteDepartmentError: null,
};
// NOTE: đoạn này trả nguyên cả response từ backend về để lấy thêm thông tin pagination
// nếu chỉ trả về data thì sẽ không có thông tin pagination
// nên sẽ không biết được tổng số bản ghi là bao nhiêu
// relation: line 152, 153 in DepartmentManage.jsx
export const fetchListDepartments = createAsyncThunk(
  "departments/fetchList",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await listDepartmentsAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
      });
    }
  }
);
// Lấy danh sách tất cả department (không phân trang)
export const fetchListAllDepartments = createAsyncThunk(
  "departments/fetchListAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await listAllDepartmentsAPI();
      return response.data.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
      });
    }
  }
);

//optional
// Get single department by ID
export const getDepartment = createAsyncThunk(
  "departments/get",
  async (departmentId, { rejectWithValue }) => {
    try {
      const response = await getDepartmentAPI(departmentId);
      return response.data.data; // Trả về data của department
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
        departmentId: departmentId, // Để track department nào bị lỗi
      });
    }
  }
);

export const createDepartment = createAsyncThunk(
  "departments/create",
  async (departmentData, { rejectWithValue }) => {
    try {
      const response = await createDepartmentAPI(departmentData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

export const updateDepartment = createAsyncThunk(
  "departments/update",
  async ({ departmentId, departmentData }, { rejectWithValue }) => {
    try {
      const response = await updateDepartmentAPI(departmentId, departmentData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

export const updateDepartmentStatus = createAsyncThunk(
  "departments/updateStatus",
  async ({ departmentId, status }, { rejectWithValue }) => {
    try {
      const response = await updateDepartmentStatusAPI(departmentId, status);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  "departments/delete",
  async (departmentId, { rejectWithValue }) => {
    try {
      const response = await deleteDepartmentAPI(departmentId, "inactive");
      return response.data.message;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);
// ----Slice-----
const departmentSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch list departments
      .addCase(fetchListDepartments.pending, (state) => {
        state.fetchStatus = "loading";
      })
      .addCase(fetchListDepartments.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.departments = action.payload;
      })
      .addCase(fetchListDepartments.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      })
      // Fetch list all departments (không phân trang)
      .addCase(fetchListAllDepartments.pending, (state) => {
        state.fetchListAllStatus = "loading";
      })
      .addCase(fetchListAllDepartments.fulfilled, (state, action) => {
        state.fetchListAllStatus = "succeeded";
        state.allDepartments = action.payload;
      })
      .addCase(fetchListAllDepartments.rejected, (state, action) => {
        state.fetchListAllStatus = "failed";
        state.fetchListAllError = action.payload;
      })
      // optional: get department by id
      // Get single department by id
      .addCase(getDepartment.pending, (state) => {
        state.getStatus = "loading";
        state.getError = null;
      })
      .addCase(getDepartment.fulfilled, (state, action) => {
        state.getStatus = "succeeded";
        state.department = action.payload;
      })
      .addCase(getDepartment.rejected, (state, action) => {
        state.getStatus = "failed";
        state.getError = action.payload;
        state.department = null; // Clear department data on error
      })
      // Create department
      .addCase(createDepartment.pending, (state) => {
        state.createStatus = "loading";
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        // state.departments.push(action.payload);
        if (state.departments && state.departments.data && Array.isArray(state.departments.data)) {
          state.departments.data.push(action.payload);
        }
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload;
      })
      // Update department
      .addCase(updateDepartment.pending, (state) => {
        state.updateStatus = "loading";
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        // Cập nhật department trong current page data nếu có
        if (state.departments && state.departments.data && Array.isArray(state.departments.data)) {
          const index = state.departments.data.findIndex(
            (department) => department.id === action.payload.id
          );
          if (index !== -1) {
            state.departments.data[index] = action.payload;
          }
        }
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })
      // Update department status
      .addCase(updateDepartmentStatus.pending, (state) => {
        state.updateDepartmentStatus = "loading";
      })
      .addCase(updateDepartmentStatus.fulfilled, (state, action) => {
        state.updateDepartmentStatus = "succeeded"; // Sửa tên
        // Cập nhật department status trong current page data nếu có
        if (state.departments && state.departments.data && Array.isArray(state.departments.data)) {
          const index = state.departments.data.findIndex(
            (department) => department.id === action.payload.id
          );
          if (index !== -1) {
            state.departments.data[index] = action.payload;
          }
        }
      })
      .addCase(updateDepartmentStatus.rejected, (state, action) => {
        state.updateDepartmentStatus = "failed";
        state.updateDepartmentStatusError = action.payload;
      })
      // Delete department
      .addCase(deleteDepartment.pending, (state) => {
        state.deleteDepartmentStatus = "loading";
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.deleteDepartmentStatus = "succeeded"; // Sửa tên
        // Xóa department khỏi current page data nếu có
        if (state.departments && state.departments.data && Array.isArray(state.departments.data)) {
          state.departments.data = state.departments.data.filter(
            (department) => department.id !== action.payload.id
          );
        }
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.deleteDepartmentStatus = "failed";
        state.deleteDepartmentError = action.payload;
      });
  },
});

export const {} = departmentSlice.actions;
export default departmentSlice.reducer;
