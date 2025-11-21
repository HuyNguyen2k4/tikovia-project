import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./AppRoutes";
import CustomerPaymentList from "@src/pages/customer-payment/CustomerPaymentList";

const CustomerPaymentRoutes = ({ userRole }) => {
  return (
    // Coi hết toàn bộ list thì chỉ có admin, manager, accountant, supPicker, supDelivery
    // Seller chỉ có thể xem và tạo mới đơn hàng của mình
    <ProtectedRoute allowedRoles={["admin", "seller", "accountant"]} userRole={userRole}>
      <Routes>
        <Route path="/" element={<CustomerPaymentList />} />
      </Routes>
    </ProtectedRoute>
  );
};

export default CustomerPaymentRoutes;