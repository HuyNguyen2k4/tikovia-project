import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./AppRoutes";
import CodRemittanceTickets from "@src/pages/cod-ticket/CodRemittanceTickets";

const CodRemittanceTicketsRoutes = ({ userRole }) => {
  return (
    // Coi hết toàn bộ list thì chỉ có admin, manager, accountant, supPicker, supDelivery
    // Seller chỉ có thể xem và tạo mới đơn hàng của mình
    <ProtectedRoute allowedRoles={["admin", "accountant", "sup_shipper"]} userRole={userRole}>
      <Routes>
        <Route path="/" element={<CodRemittanceTickets />} />
      </Routes>
    </ProtectedRoute>
  );
};

export default CodRemittanceTicketsRoutes;