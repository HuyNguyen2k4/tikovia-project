import React from "react";

import styles from "@assets/MenuContent.module.css";
import { Layout } from "antd";

import MenuContent from "./MenuContent";

const { Sider } = Layout;

const DesktopSider = ({ collapsed, siderWidth }) => (
  <Sider
    trigger={null}
    collapsible
    collapsed={collapsed}
    width={siderWidth}
    className={`${styles["custom-sider"]} px-3`} // Kết hợp class custom-sider và px-3
    style={{
      overflow: "auto", // Cho phép cuộn
    }}
  >
    <MenuContent collapsed={collapsed} />
  </Sider>
);

export default DesktopSider;
