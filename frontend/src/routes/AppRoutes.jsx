import React, { use } from "react";

import Login from "@pages/auth/Login";
import ErrorPage from "@pages/error/ErrorPage";
import NotDevelopFeature from "@src/components/common/NotDevelopFeature";
import MainLayout from "@src/layouts/MainLayout";
import Dashboard from "@src/pages/Dashboard/Dashboard";
import GeneralSetting from "@src/pages/GeneralSetting";
import PaymentPage from "@src/pages/PaymentPage";
import ForgetPassword from "@src/pages/auth/ForgetPassword";
import ResetPassword from "@src/pages/auth/ResetPassword";
import CodRemittanceTickets from "@src/pages/cod-ticket/CodRemittanceTickets";
import DeliveryRunsManage from "@src/pages/delivery-runs/DeliveryRunsManage";
import DepartmentManage from "@src/pages/department/DepartmentManage";
import InvenLotManage from "@src/pages/inventoryLot-manage/InvenLotManage";
import IssueManage from "@src/pages/issue-manage/IssueManage";
import ProductManage from "@src/pages/product-manage/ProductManage";
import SupTransactionPaymentManage from "@src/pages/supTransactionPayment/SupTransactionPaymentManage";
import SupplierManage from "@src/pages/supplier-manage/SupplierManage";
import SupplierTransactionManage from "@src/pages/supplier-transaction-manage/SupplierTransactionManage";
import TaskManage from "@src/pages/task-manage/TaskManage";
import UserManage from "@src/pages/user/UserManage";
import UserProfile from "@src/pages/user/UserProfile";
import { useSelector } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";

import CodRemittanceTicketsRoutes from "./CodRemittanceTicketsRoutes";
import CustomerPaymentRoutes from "./CustomerPaymentRoutes";
import CustomerRoutes from "./CustomerRoutes";
import SalesOrdersRoutes from "./SalesOrdersRoutes";

// import các page khác nếu có
export const ProtectedRoute = ({ children, allowedRoles = [], userRole }) => {
  // Kiểm tra nếu user role không có trong danh sách allowed roles
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/error" replace />;
  }
  return children;
};

const AppRoutes = () => {
  const userRole = useSelector((state) => state.auth.user?.role);
  return (
    <Routes>
      <Route path="*" element={<ErrorPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forget-password" element={<ForgetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<MainLayout />}>
        <Route path="/general-setting" element={<GeneralSetting />} />
        <Route path="/profile" element={<UserProfile />} />
        {/* Thêm các route khác có sử dụng header và sider ở đây */}
        {/* Menu Items Group 1 */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<ProductManage />} />

        <Route path="/inventory-lot" element={<InvenLotManage />} />
        <Route
          path="/payment/*"
          element={
            <ProtectedRoute allowedRoles={["admin", "accountant"]} userRole={userRole}>
              <Routes>
                <Route
                  path="/supplier-transaction-payment"
                  element={<SupTransactionPaymentManage />}
                />
              </Routes>
            </ProtectedRoute>
          }
        />
        <Route path="/sales-orders/*" element={<SalesOrdersRoutes userRole={userRole} />} />
        <Route
          path="/delivery/*"
          element={
            <ProtectedRoute allowedRoles={["admin", "sup_shipper", "shipper"]} userRole={userRole}>
              <Routes>
                <Route path="/delivery-runs" element={<DeliveryRunsManage />} />
              </Routes>
            </ProtectedRoute>
          }
        />

        <Route path="/table" element={<NotDevelopFeature />} />
        <Route path="/inbox" element={<NotDevelopFeature />} />
        <Route path="/stock" element={<NotDevelopFeature />} />

        {/* Menu Items Group 2 */}
        <Route
          path="/customer-payments/*"
          element={<CustomerPaymentRoutes userRole={userRole} />}
        />
        <Route
          path="/cod-remittance-tickets"
          element={<CodRemittanceTicketsRoutes userRole={userRole} />}
        />
        <Route path="/todo" element={<NotDevelopFeature />} />
        <Route path="/contact" element={<NotDevelopFeature />} />
        <Route path="/invoice" element={<NotDevelopFeature />} />
        <Route path="/customers/*" element={<CustomerRoutes userRole={userRole} />} />
        {/* test qrPayment */}
        <Route path="/qr-cash" element={<PaymentPage />} />

        <Route path="/issue-management" element={<IssueManage />} />

        {/* Chỉ có admin mới vào được */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]} userRole={userRole}>
              <Routes>
                <Route path="user-management" element={<UserManage />} />
                <Route path="department-management" element={<DepartmentManage />} />
              </Routes>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/common/*"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "accountant"]} userRole={userRole}>
              <Routes>
                <Route path="supplier-management" element={<SupplierManage />} />
                <Route path="supplier-transaction" element={<SupplierTransactionManage />} />
              </Routes>
            </ProtectedRoute>
          }
        />

        <Route
          path="/task-management"
          element={
            <ProtectedRoute
              allowedRoles={["admin", "manager", "accountant", "picker", "sup_picker"]}
              userRole={userRole}
            >
              <TaskManage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
