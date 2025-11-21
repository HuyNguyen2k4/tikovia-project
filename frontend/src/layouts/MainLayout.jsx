import React, { useState } from "react";

import "@assets/MainLayout.css";
import DesktopSider from "@src/components/common/DesktopSider";
import MenuContent from "@src/components/common/MenuContent";
import TopHeader from "@src/components/common/TopHeader";
import UseMediaQuery from "@src/components/common/UseMediaQuery";
import { Drawer, Layout, notification, Spin } from "antd";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const { Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const isLgMobile = UseMediaQuery("(max-width: 991px)");
  const isMdMobile = UseMediaQuery("(max-width: 768px)");
  const [api, contextHolder] = notification.useNotification();

  // lg (≥ 992px)
  // md (≥ 768px)
  const siderWidth = 250;
  const collapsedSiderWidth = 80;
  const headerHeight = 64;

  const handleMenuClick = () => {
    if (isLgMobile) {
      setDrawerVisible(true);
    } else {
      setCollapsed(!collapsed);
    }
  };
  // chỉ cho phép user đã đăng nhập vào layout này
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth);
  const location = useLocation();

  // Check authentication trước khi render layout
  if (isLoading) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <Layout style={{ minHeight: "100vh" }} className="main-layout">
      {contextHolder}
      {isLgMobile ? (
        <Drawer
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          styles={{ body: { padding: 0 } }}
          width={siderWidth}
          closable={false}
        >
          <MenuContent collapsed={false} />
        </Drawer>
      ) : (
        <DesktopSider collapsed={collapsed} siderWidth={siderWidth} />
      )}
      <Layout
        style={{
          marginLeft: isLgMobile ? 0 : collapsed ? collapsedSiderWidth : siderWidth,
          transition: "margin-left 0.2s",
        }}
      >
        <TopHeader
          onMenuClick={handleMenuClick}
          isLgMobile={isLgMobile}
          isMdMobile={isMdMobile}
          collapsed={collapsed}
          siderWidth={siderWidth}
          collapsedSiderWidth={collapsedSiderWidth}
        />
        <Content style={{ marginTop: headerHeight, padding: 24, background: "#f8f9fa" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;