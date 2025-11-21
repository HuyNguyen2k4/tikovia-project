import React from "react";

import {
  AppstoreOutlined,
  BankOutlined,
  BlockOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  GiftOutlined,
  GoldOutlined,
  LogoutOutlined,
  ReconciliationOutlined,
  ScheduleOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import styles from "@assets/MenuContent.module.css";
import { logoutUserAsync } from "@src/store/authSlice";
import path from "@src/utils/path";
import { Menu, Modal, Typography, notification } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

const { Title } = Typography;

// ✅ NHÓM 1: DASHBOARD
const dashboardItems = [
  { key: "1", icon: <DashboardOutlined />, label: "Dashboard", path: "/dashboard" },
];

// ✅ NHÓM 2: QUẢN LÝ SẢN PHẨM & KHO
const inventoryItems = [
  { key: "2", icon: <AppstoreOutlined />, label: "Sản phẩm", path: "/products" },
  { key: "3", icon: <GoldOutlined />, label: "Lô hàng tồn kho", path: "/inventory-lot" },
  {
    key: "10",
    icon: <CarryOutOutlined />,
    label: "Quản lý soạn hàng",
    path: "/task-management",
    roles: ["admin", "manager", "accountant", "picker", "sup_picker"],
  },
];

// ✅ NHÓM 3: QUẢN LÝ ĐỐI TÁC
const partnerItems = [
  {
    key: "4",
    icon: <UsergroupAddOutlined />,
    label: "Nhà cung cấp",
    path: "/admin/common/supplier-management",
    roles: ["admin", "manager", "accountant"],
  },
  {
    key: "15",
    icon: <TeamOutlined />,
    label: "Khách hàng",
    path: "/customers",
    roles: ["admin", "seller", "accountant"],
  },
];

// ✅ NHÓM 4: GIAO DỊCH & ĐỀN HÀNG
const transactionItems = [
  {
    key: "5",
    icon: <FileTextOutlined />,
    label: "Giao dịch nhà cung cấp",
    path: "/admin/common/supplier-transaction",
    roles: ["admin", "manager", "accountant"],
  },
  {
    key: "6",
    icon: <ScheduleOutlined />,
    label: "Đơn hàng",
    path: "/sales-orders",
    roles: ["admin", "manager", "seller", "accountant", "sup_picker", "sup_shipper"],
  },
  {
    key: "6.5",
    icon: <CarryOutOutlined />,
    label: "Đơn giao hàng",
    path: "/delivery/delivery-runs",
    roles: ["admin", "sup_shipper", "shipper"],
  },
];

// ✅ NHÓM 5: THANH TOÁN & TÀI CHÍNH
const paymentItems = [
  {
    key: "7",
    icon: <CreditCardOutlined />,
    label: "Công nợ nhà cung cấp",
    path: "/payment/supplier-transaction-payment",
    roles: ["admin", "accountant"],
  },
  {
    key: "8",
    icon: <DollarOutlined />,
    label: "Công nợ khách hàng",
    path: "/customer-payments",
    roles: ["admin", "seller", "accountant"],
  },
  // {
  //   key: "16",
  //   icon: <BlockOutlined />,
  //   label: "Thanh toán QR Cash",
  //   path: "/qr-cash",
  //   roles: ["admin", "accountant", "manager", "seller"],
  // },
  {
    key: "9",
    icon: <ReconciliationOutlined />,
    label: "Đối soát COD",
    path: "/cod-remittance-tickets",
    roles: ["admin", "accountant", "sup_shipper"],
  },
];

// ✅ NHÓM 6: HỆ THỐNG & QUẢN TRỊ
const systemItems = [
  {
    key: "13",
    icon: <UserOutlined />,
    label: "Quản lý người dùng",
    path: "/admin/user-management",
    roles: ["admin"],
  },
  {
    key: "14",
    icon: <BankOutlined />,
    label: "Phòng ban/Kho hàng",
    path: "/admin/department-management",
    roles: ["admin"],
  },
  {
    key: "17",
    icon: <ExclamationCircleOutlined />,
    label: "Báo cáo lỗi (Issue)",
    path: "/issue-management",
  },
];

const MenuContent = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const userRole = useSelector((state) => state.auth.user?.role);

  /** Xác định key menu đang active dựa trên pathname */
  const getActiveMenuKey = () => {
    const currentPath = location.pathname;

    const allMenuItems = [
      ...dashboardItems,
      ...inventoryItems.filter((item) => !item.roles || item.roles.includes(userRole)),
      ...partnerItems.filter((item) => !item.roles || item.roles.includes(userRole)),
      ...transactionItems.filter((item) => !item.roles || item.roles.includes(userRole)),
      ...paymentItems.filter((item) => !item.roles || item.roles.includes(userRole)),
      ...systemItems.filter((item) => !item.roles || item.roles.includes(userRole)),
    ];

    const activeItem = allMenuItems.find((item) => item.path === currentPath);
    if (activeItem) return activeItem.key;
    if (currentPath === "/general-setting") return "settings_bottom";
    return "1";
  };

  /** Xử lý click từng item menu */
  const handleMenuClick = async ({ key }) => {
    // Đăng xuất
    if (key === "logout_bottom") {
      Modal.confirm({
        title: "Xác nhận đăng xuất",
        icon: <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />,
        content: "Bạn có chắc chắn muốn đăng xuất? Bạn sẽ cần đăng nhập lại.",
        okText: "Có, đăng xuất",
        cancelText: "Hủy",
        okType: "danger",
        centered: true,
        onOk: async () => {
          try {
            await dispatch(logoutUserAsync());
            notification.success({
              message: "Đăng xuất thành công",
              description: "Bạn đã đăng xuất.",
              duration: 3,
              showProgress: true,
            });
            navigate("/login", { replace: true });
          } catch (error) {
            notification.error({
              message: "Đăng xuất thất bại",
              description: error?.message || "Có vấn đề xảy ra khi đăng xuất.",
              duration: 4,
              showProgress: true,
            });
          }
        },
      });
      return;
    }

    // Cài đặt
    if (key === "settings_bottom") {
      navigate("/general-setting");
      return;
    }

    // Các item menu bình thường
    const allMenuItems = [
      ...dashboardItems,
      ...inventoryItems,
      ...partnerItems,
      ...transactionItems,
      ...paymentItems,
      ...systemItems,
    ];
    const selectedItem = allMenuItems.find((item) => item.key === key);
    if (selectedItem?.path) navigate(selectedItem.path);
  };

  // ✅ Filter items theo role
  const getFilteredItems = (items) =>
    items.filter((item) => !item.roles || item.roles.includes(userRole));

  return (
    <div className={styles.menuWrapper}>
      {/* Logo */}
      <div className={styles.logoContainer}>
        <Link to={"/dashboard"}>
          <Title
            level={4}
            style={{
              margin: 0,
              color: "#4A90E2",
              display: collapsed ? "none" : "block",
            }}
          >
            TikoSmart
          </Title>
          <BlockOutlined
            style={{
              fontSize: 28,
              color: "#4A90E2",
              display: collapsed ? "block" : "none",
            }}
          />
        </Link>
      </div>

      {/* Menu chính */}
      <div className={styles.menuMain}>
        <Menu
          mode="inline"
          className="custom-menu"
          selectedKeys={[getActiveMenuKey()]}
          onClick={handleMenuClick}
          items={[
            // ✅ DASHBOARD
            ...dashboardItems,

            { type: "divider" },

            // ✅ QUẢN LÝ SẢN PHẨM & KHO
            ...(getFilteredItems(inventoryItems).length > 0
              ? [
                  { type: "group", label: "QUẢN LÝ KHO & SẢN PHẨM", key: "inventory-group" },
                  ...getFilteredItems(inventoryItems),
                  { type: "divider" },
                ]
              : []),

            // ✅ QUẢN LÝ ĐỐI TÁC
            ...(getFilteredItems(partnerItems).length > 0
              ? [
                  { type: "group", label: "QUẢN LÝ ĐỐI TÁC", key: "partner-group" },
                  ...getFilteredItems(partnerItems),
                  { type: "divider" },
                ]
              : []),

            // ✅ GIAO DỊCH & ĐƠN HÀNG
            ...(getFilteredItems(transactionItems).length > 0
              ? [
                  { type: "group", label: "GIAO DỊCH & ĐƠN HÀNG", key: "transaction-group" },
                  ...getFilteredItems(transactionItems),
                  { type: "divider" },
                ]
              : []),

            // ✅ THANH TOÁN & TÀI CHÍNH
            ...(getFilteredItems(paymentItems).length > 0
              ? [
                  { type: "group", label: "THANH TOÁN & TÀI CHÍNH", key: "payment-group" },
                  ...getFilteredItems(paymentItems),
                  { type: "divider" },
                ]
              : []),

            // ✅ HỆ THỐNG & QUẢN TRỊ
            ...(getFilteredItems(systemItems).length > 0
              ? [
                  { type: "group", label: "HỆ THỐNG & QUẢN TRỊ", key: "system-group" },
                  ...getFilteredItems(systemItems),
                  { type: "divider" },
                ]
              : []),

            // ✅ ĐĂNG XUẤT
            { key: "logout_bottom", icon: <LogoutOutlined />, label: "Đăng xuất" },
          ]}
        />
      </div>
    </div>
  );
};

export default MenuContent;
