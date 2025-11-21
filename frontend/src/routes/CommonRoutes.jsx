import React from "react";

import { Route } from "react-router-dom";
import UserProfile from "@src/pages/user/UserProfile";
import GeneralSetting from "@src/pages/GeneralSetting";

/**
 * Routes dành cho tất cả các roles đã đăng nhập
 * Các route chung như profile, settings
 */
const CommonRoutes = () => {
  return (
    <>
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/general-setting" element={<GeneralSetting />} />
    </>
  );
};

export default CommonRoutes;