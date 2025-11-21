import SalesOrdersManage from "@src/pages/sales-orders/SalesOrdersManage";
import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./AppRoutes";

const SalesOrdersRoutes = ({ userRole }) => {
  return (
    // Coi hết toàn bộ list thì chỉ có admin, manager, accountant, supPicker, supDelivery
    // Seller chỉ có thể xem và tạo mới đơn hàng của mình
    <ProtectedRoute
      allowedRoles={["admin", "manager", "seller", "accountant", "sup_picker", "sup_shipper"]}
      userRole={userRole}
    >
      <Routes>
        <Route path="/" element={<SalesOrdersManage />} />
      </Routes>
    </ProtectedRoute>
  );
};

export default SalesOrdersRoutes;
