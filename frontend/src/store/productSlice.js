import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createProduct as createProductAPI,
  deleteProduct as deleteProductAPI,
  findProductsInDepartment as findProductsInDepartmentAPI,
  getProductById as getProductByIdAPI,
  listAllProducts as listAllProductsAPI,
  listProducts as listProductsAPI,
  refreshAllProductStatuses as refreshAllProductStatusAPI,
  refreshProductStatus as refreshProductStatusAPI,
  updateProduct as updateProductAPI,
  updateProductAdminLocked as updateProductAdminLockedAPI,
  updateProductStatus as updateProductStatusAPI,
} from "@src/services/productService";

const initialState = {
  product: {},
  products: [],
  allProducts: [], // danh sách tất cả product (không phân trang) dùng cho select
  fetchStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  fetchProductByIdStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' (lấy product theo ID)
  fetchListAllStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' (danh sách tất cả product không phân trang)
  createStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  updateStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  updateStatusStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' (cho update status của product )
  deleteStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  refreshStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  refreshAllStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  findProductsInDepartmentStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  fetchError: null,
  fetchListAllError: null, // lỗi khi fetch danh sách tất cả product không phân trang
  createError: null,
  updateError: null,
  updateStatusError: null, // lỗi khi update status của product
  deleteError: null,
  refreshError: null,
  refreshAllError: null,
  fetchProductByIdError: null,
  findProductsInDepartmentError: null,
};
// Lấy danh sách tất cả product (không phân trang)
export const fetchListAllProducts = createAsyncThunk(
  "product/fetchListAllProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await listAllProductsAPI();
      return response.data.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);
// Lấy danh sách product (có phân trang)
export const fetchListProducts = createAsyncThunk(
  "product/fetchListProducts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await listProductsAPI(params);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);
// Lấy thông tin product theo ID
export const fetchProductById = createAsyncThunk(
  "product/fetchProductById",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await getProductByIdAPI(productId);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

export const createProduct = createAsyncThunk(
  "product/createProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const response = await createProductAPI(productData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

export const updateProduct = createAsyncThunk(
  "product/updateProduct",
  async ({ productId, productData }, { rejectWithValue }) => {
    try {
      const response = await updateProductAPI(productId, productData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

export const updateProductStatus = createAsyncThunk(
  "product/updateProductStatus",
  async ({ productId, status }, { rejectWithValue }) => {
    try {
      const response = await updateProductStatusAPI(productId, status);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "product/deleteProduct",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await deleteProductAPI(productId);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

export const updateProductAdminLocked = createAsyncThunk(
  "product/updateProductAdminLocked",
  async ({ productId, adminLocked }, { rejectWithValue }) => {
    try {
      const response = await updateProductAdminLockedAPI(productId, adminLocked);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

export const refreshProductStatus = createAsyncThunk(
  "product/refreshProductStatus",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await refreshProductStatusAPI(productId);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

export const refreshAllProductStatuses = createAsyncThunk(
  "product/refreshAllProductStatuses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await refreshAllProductStatusAPI();
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

export const findProductsInDepartment = createAsyncThunk(
  "product/findProductsInDepartment",
  async ({ departmentId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await findProductsInDepartmentAPI(departmentId, params);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchListProducts.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(fetchListProducts.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.products = action.payload;
      })
      .addCase(fetchListProducts.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload;
      })
      // Fetch all products (no pagination)
      .addCase(fetchListAllProducts.pending, (state) => {
        state.fetchListAllStatus = "loading";
        state.fetchListAllError = null;
      })
      .addCase(fetchListAllProducts.fulfilled, (state, action) => {
        state.fetchListAllStatus = "succeeded";
        state.allProducts = action.payload;
      })
      .addCase(fetchListAllProducts.rejected, (state, action) => {
        state.fetchListAllStatus = "failed";
        state.fetchListAllError = action.payload;
      })
      // Find products in department
      .addCase(findProductsInDepartment.pending, (state) => {
        state.findProductsInDepartmentStatus = "loading";
        state.findProductsInDepartmentError = null;
      })
      .addCase(findProductsInDepartment.fulfilled, (state, action) => {
        state.findProductsInDepartmentStatus = "succeeded";
        state.products = action.payload;
      })
      .addCase(findProductsInDepartment.rejected, (state, action) => {
        state.findProductsInDepartmentStatus = "failed";
        state.findProductsInDepartmentError = action.payload;
      })
      // Fetch product by ID
      .addCase(fetchProductById.pending, (state) => {
        state.fetchProductByIdStatus = "loading";
        state.fetchProductByIdError = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.fetchProductByIdStatus = "succeeded";
        state.product = action.payload.data;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.fetchProductByIdStatus = "failed";
        state.fetchProductByIdError = action.payload;
      })
      // Create product
      .addCase(createProduct.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        // state.products.push(action.payload);
        if (state.products && Array.isArray(state.products.data)) {
          state.products.data.push(action.payload); // Thêm vào đầu danh sách
          // Nếu có pagination, tăng total
          if (state.products.pagination) {
            state.products.pagination.total += 1;
          }
        }
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload;
      })
      // Update product
      .addCase(updateProduct.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const index = state.products.data.findIndex((product) => product.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })
      // Update product status
      .addCase(updateProductStatus.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateProductStatus.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const index = state.products.data.findIndex((product) => product.id === action.payload.id);
        if (index !== -1) {
          state.products.data[index] = {
            ...state.products.data[index],
            status: action.payload.status,
          };
        }
      })
      .addCase(updateProductStatus.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })
      // Delete product
      .addCase(deleteProduct.pending, (state) => {
        state.deleteStatus = "loading";
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        state.products.data = state.products.data.filter(
          (product) => product.id !== action.payload.id
        );
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload;
      })
      // Update product adminLocked
      .addCase(updateProductAdminLocked.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateProductAdminLocked.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const index = state.products.data.findIndex((product) => product.id === action.payload.id);
        if (index !== -1) {
          state.products.data[index] = {
            ...state.products.data[index],
            adminLocked: action.payload.adminLocked,
          };
        }
      })
      .addCase(updateProductAdminLocked.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload;
      })
      // Refresh product status
      .addCase(refreshProductStatus.pending, (state) => {
        state.refreshStatus = "loading";
        state.refreshError = null;
      })
      .addCase(refreshProductStatus.fulfilled, (state, action) => {
        const updatedProduct = action.payload.data;
        if (state.products && state.products.data) {
          const idx = state.products.data.findIndex((p) => p.id === updatedProduct.id);
          if (idx !== -1) {
            state.products.data[idx] = { ...state.products.data[idx], ...updatedProduct };
          }
        }
      })
      .addCase(refreshProductStatus.rejected, (state, action) => {
        state.refreshStatus = "failed";
        state.refreshError = action.payload;
      })
      // Refresh all product statuses
      .addCase(refreshAllProductStatuses.pending, (state) => {
        state.refreshAllStatus = "loading";
        state.refreshAllError = null;
      })
      .addCase(refreshAllProductStatuses.fulfilled, (state, action) => {
        state.refreshAllStatus = "succeeded";
      })
      .addCase(refreshAllProductStatuses.rejected, (state, action) => {
        state.refreshAllStatus = "failed";
        state.refreshAllError = action.payload;
      });
  },
});

export const {} = productSlice.actions;

export default productSlice.reducer;
