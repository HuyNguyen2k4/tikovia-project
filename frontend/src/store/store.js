import { configureStore } from "@reduxjs/toolkit";

import orderReturnsReducer from "./OrderReturnsSlice";
import authReducer from "./authSlice";
import categoryReducer from "./categorySlice";
import codRemittanceTicketsReducer from "./codRemittanceTicketsSlice";
import customerReducer from "./customerSlice";
import deliveryRunsReducer from "./deliveryRunsSlice";
import departmentReducer from "./departmentSlice";
import inventoryLotReducer from "./inventoryLotSlice";
import notificationReducer from "./notificationSlice";
import paymentsCombinedReducer from "./paymentsCombinedSlice";
import productReducer from "./productSlice";
import salesInvoicesReducer from "./salesInvoicesSlice";
// import unitConversionReducer from "./unitConversionSlice";
import salesOrdersReducer from "./salesOrdersSlice";
import supTransactionPaymentReducer from "./supTransactionPaymentSlice";
import supplierReducer from "./supplierSlice";
import supplierTransactionReducer from "./supplierTransactionCombineSlice";
import supplierTransactionCombinedReducer from "./supplierTransactionCombineSlice";
import supplierTransactionItemReducer from "./supplierTransactionItemSlice";
import taskReducer from "./taskSlice";
import userReducer from "./userSlice";
import issueReducer from "./issueSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    notifications: notificationReducer,
    inventoryLot: inventoryLotReducer,
    category: categoryReducer,
    product: productReducer,
    department: departmentReducer,
    // unitConversion: unitConversionReducer,
    supplier: supplierReducer,
    supplierTransaction: supplierTransactionReducer,
    supplierTransactionItem: supplierTransactionItemReducer,
    supplierTransactionCombined: supplierTransactionCombinedReducer,
    supTransactionPayment: supTransactionPaymentReducer,
    salesOrders: salesOrdersReducer,
    deliveryRuns: deliveryRunsReducer,
    customer: customerReducer,
    salesInvoices: salesInvoicesReducer,
    orderReturns: orderReturnsReducer,
    paymentsCombined: paymentsCombinedReducer,
    task: taskReducer,
    codRemittanceTickets: codRemittanceTicketsReducer,
    issue: issueReducer,
  },
});
