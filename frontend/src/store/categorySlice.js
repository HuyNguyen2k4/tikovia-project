import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  listAllCategories as listAllCategoriesAPI,
  listCategories as listCategoriesAPI,
} from "@src/services/categoryService";

const initialState = {
  categories: [],
  allCategories: [],
  fetchStatus: "idle", // idle | loading | succeeded | failed
  fetchListAllStatus: "idle", // idle | loading | succeeded | failed
  fetchListAllError: null,
  fetchError: null,
};
export const fetchListCategories = createAsyncThunk(
  "category/fetchListCategories",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await listCategoriesAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
// Lấy tất cả danh mục (không phân trang)
export const fetchListAllCategories = createAsyncThunk(
  "category/fetchListAllCategories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await listAllCategoriesAPI();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
export const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchListCategories.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchListCategories.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.categories = action.payload;
      })
      .addCase(fetchListCategories.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload || action.error.message;
      })
      // lấy tất cả danh mục không phân trang
      .addCase(fetchListAllCategories.pending, (state) => {
        state.fetchListAllStatus = "loading";
        state.fetchListAllError = null;
      })
      .addCase(fetchListAllCategories.fulfilled, (state, action) => {
        state.fetchListAllStatus = "succeeded";
        state.allCategories = action.payload;
      })
      .addCase(fetchListAllCategories.rejected, (state, action) => {
        state.fetchListAllStatus = "failed";
        state.fetchListAllError = action.payload || action.error.message;
      });
  },
});
export const {} = categorySlice.actions;
export default categorySlice.reducer;
