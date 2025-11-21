// import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
// import {
//   // createUnitConversion as createUnitConversionAPI,
//   updateUnitConversion as updateUnitConversionAPI,
//   // deleteUnitConversion as deleteUnitConversionAPI,
//   fetchUnitConversionsByLotId as fetchUnitConversionsByLotIdAPI,
// } from "@src/services/unitConversionService";

// const initialState = {
//   units: {
//     data: {},
//   },
//   fetchStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
//   // createStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
//   updateStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
//   // deleteStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
//   fetchError: null,
//   // createError: null,
//   updateError: null,
//   // deleteError: null,
// };

// export const fetchUnits = createAsyncThunk(
//   "unitConversion/fetchUnits",
//   async (lotId, { rejectWithValue }) => {
//     try {
//       const response = await fetchUnitConversionsByLotIdAPI(lotId);
//       return response.data;
//     } catch (error) {
//       return rejectWithValue({
//         message: error.response?.data?.message || error.message,
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // export const createUnitConversion = createAsyncThunk(
// //   "unitConversion/createUnitConversion",
// //   async (unitData, { rejectWithValue }) => {
// //     try {
// //       const response = await createUnitConversionAPI(unitData);
// //       return response.data;
// //     } catch (error) {
// //       return rejectWithValue({
// //         message: error.response?.data?.message || error.message,
// //         status: error.response?.status,
// //       });
// //     }
// //   }
// // );

// export const updateUnitConversion = createAsyncThunk(
//   "unitConversion/updateUnitConversion",
//   async ({ unitId, unitData }, { rejectWithValue }) => {
//     try {
//       const response = await updateUnitConversionAPI(unitId, unitData);
//       return response.data;
//     } catch (error) {
//       return rejectWithValue({
//         message: error.response?.data?.message || error.message,
//         status: error.response?.status,
//       });
//     }
//   }
// );

// // export const deleteUnitConversion = createAsyncThunk(
// //   "unitConversion/deleteUnitConversion",
// //   async (unitId, { rejectWithValue }) => {
// //     try {
// //       const response = await deleteUnitConversionAPI(unitId);
// //       return response.data;
// //     } catch (error) {
// //       return rejectWithValue({
// //         message: error.response?.data?.message || error.message,
// //         status: error.response?.status,
// //       });
// //     }
// //   }
// // );

// const unitConversionSlice = createSlice({
//   name: "unitConversion",
//   initialState,
//   reducers: {},
//   extraReducers: (builder) => {
//     builder
//       // Fetch Units
//       .addCase(fetchUnits.pending, (state) => {
//         state.fetchStatus = "loading";
//         state.fetchError = null;
//       })
//       .addCase(fetchUnits.fulfilled, (state, action) => {
//         state.fetchStatus = "succeeded";
//         state.units.data = action.payload.data;
//       })
//       .addCase(fetchUnits.rejected, (state, action) => {
//         state.fetchStatus = "failed";
//         state.fetchError = action.payload || action.error.message;
//       })
//       // Update Unit Conversion
//       .addCase(updateUnitConversion.pending, (state) => {
//         state.updateStatus = "loading";
//         state.updateError = null;
//       })
//       .addCase(updateUnitConversion.fulfilled, (state, action) => {
//         state.updateStatus = "succeeded";
//         state.units.data = action.payload.data;
//       })
//       .addCase(updateUnitConversion.rejected, (state, action) => {
//         state.updateStatus = "failed";
//         state.updateError = action.payload || action.error.message;
//       })
//       // Delete Unit Conversion
//       // .addCase(deleteUnitConversion.pending, (state) => {
//       //   state.deleteStatus = "loading";
//       //   state.deleteError = null;
//       // })
//       // .addCase(deleteUnitConversion.fulfilled, (state, action) => {
//       //   state.deleteStatus = "succeeded";
//       //   state.units.data = state.units.data.filter((unit) => unit.id !== action.payload.id);
//       // })
//       // .addCase(deleteUnitConversion.rejected, (state, action) => {
//       //   state.deleteStatus = "failed";
//       //   state.deleteError = action.payload || action.error.message;
//       // });
//   },
// });

// export const {} = unitConversionSlice.actions;
// export default unitConversionSlice.reducer;
