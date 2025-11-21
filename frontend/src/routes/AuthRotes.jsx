import React from "react";
import { Route } from "react-router-dom";
import Login from "@pages/auth/Login";
import ForgetPassword from "@pages/auth/ForgetPassword";
import ResetPassword from "@pages/auth/ResetPassword";

/**
 * Routes dành cho Authentication
 * Các route không yêu cầu đăng nhập
 */
const AuthRoutes = () => {
  return (
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/forget-password" element={<ForgetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </>
  );
};

export default AuthRoutes;