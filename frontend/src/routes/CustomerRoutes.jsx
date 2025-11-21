import React, { use } from "react";

import CustomerList from "@src/pages/customers/CustomerList";
import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./AppRoutes";

const CustomerRoutes = ({ userRole }) => {
  return (
    <ProtectedRoute allowedRoles={["admin", "seller", "accountant"]} userRole={userRole}>
      <Routes>
        <Route path="/" element={<CustomerList />} />
      </Routes>
    </ProtectedRoute>
  );
};

export default CustomerRoutes;
