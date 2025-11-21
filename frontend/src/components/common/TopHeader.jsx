import React, { useEffect, useState } from "react";

import {
  BellOutlined,
  CloseOutlined,
  DownCircleOutlined,
  ExclamationCircleOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoreOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import styles from "@assets/TopHeader.module.css";
import { logoutUserAsync } from "@src/store/authSlice";
import {
  deleteNotification,
  fetchNotifications,
  markNotificationAsRead,
} from "@src/store/notificationSlice";
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Dropdown,
  Empty,
  Input,
  List,
  Menu,
  Modal,
  Space,
  Spin,
  Typography,
  notification,
} from "antd";
import { Header } from "antd/es/layout/layout";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import useNotificationSocket from "../socket/UseNotificationSocket";
import NotificationList from "./NotificationList";

const { Text } = Typography;

/** Menu người dùng (dropdown góc phải) */
const userMenuItems = [
  { key: "profile", label: "Hồ sơ người dùng", icon: <UserOutlined /> },
  // { key: "settings", label: "Cài đặt" },
  { type: "divider" },
  { key: "logout", label: "Đăng xuất", icon: <LogoutOutlined /> },
];

/**
 * TopHeader
 */
const TopHeader = ({
  onMenuClick,
  isLgMobile, // true: màn nhỏ (ẩn search desktop)
  isMdMobile, // true: breakpoint md trở xuống
  siderWidth, // chiều rộng sider khi mở
  collapsedSiderWidth, // chiều rộng sider khi thu gọn
  collapsed, // trạng thái sider
}) => {
  const [searchVisible, setSearchVisible] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false); // drawer thông báo (mobile)

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // --- LẤY STATE TỪ REDUX ---
  const currentUser = useSelector((state) => state.auth?.user || state.auth?.currentUser) || {};
  const userId = currentUser?.id; // Lấy userId để fetch và join socket

  // Lấy state thông báo từ Redux
  const { data: notificationsData, pagination } = useSelector(
    (state) => state.notifications.notifications
  );
  const fetchStatus = useSelector((state) => state.notifications.fetchStatus);
  const unreadCount = pagination?.unreadCount || 0; // Lấy số lượng chưa đọc

  // Tính toán các trạng thái loading
  const initialLoading = fetchStatus === "loading" && (notificationsData?.length || 0) === 0;
  const loadingMore = fetchStatus === "loading" && (notificationsData?.length || 0) > 0;

  // Tính toán xem còn data để tải không
  const hasMoreNotifications = pagination?.total > (notificationsData?.length || 0);

  // --- GỌI HOOKS ---

  // Gọi hook socket để lắng nghe thông báo real-time
  useNotificationSocket();

  // Fetch thông báo ban đầu khi user đăng nhập
  useEffect(() => {
    // Chỉ fetch khi có userId và đang ở trạng thái 'idle' (chưa fetch)
    if (userId && fetchStatus === "idle") {
      dispatch(fetchNotifications({ limit: 10, offset: 0 })); // Lấy 10 thông báo mới nhất
    }
  }, [userId, dispatch, fetchStatus]);

  // Khi từ mobile quay lại desktop → tắt ô search di động
  useEffect(() => {
    if (!isLgMobile) setSearchVisible(false);
  }, [isLgMobile]);

  /** Thông tin user (ví dụ) */
  const userName = currentUser?.fullName || currentUser?.name || "User";
  const userRole = currentUser?.role || "";
  const userAvatar = currentUser?.avatar; // có thể là URL, nếu không có sẽ dùng icon mặc định
  const roleMap = {
    admin: "Quản trị viên",
    manager: "Quản lý",
    accountant: "Kế toán",
    picker: "Nhân viên soạn hàng",
    sup_picker: "Trưởng soạn hàng",
    shipper: "Người giao hàng",
    sup_shipper: "Trưởng giao hàng",
    seller: "Người bán",
  };
  const userRoleDisplay = roleMap[userRole] || userRole;

  // --- HANDLERS ---

  /** Xử lý click các mục trong menu user */
  const handleUserMenuClick = ({ key }) => {
    if (key === "profile") {
      navigate("/profile");
      return;
    }
    if (key === "settings") {
      navigate("/general-setting");
      return;
    }
    if (key === "logout") {
      Modal.confirm({
        title: "Xác nhận đăng xuất",
        icon: <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />,
        content: "Bạn có chắc chắn muốn đăng xuất? Bạn sẽ cần đăng nhập lại.",
        okText: "Có, đăng xuất",
        cancelText: "Hủy",
        okType: "danger",
        centered: true,
        // onOk có thể async để chờ dispatch hoàn tất
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
          } catch (err) {
            notification.error({
              message: "Đăng xuất thất bại",
              description: err?.message || "Có vấn đề xảy ra khi đăng xuất.",
              duration: 4,
              showProgress: true,
            });
          }
        },
      });
      return;
    }
  };

  /** Xử lý khi click vào 1 thông báo (cho cả desktop và mobile) */
  const handleNotificationClick = (item) => {
    // Đánh dấu đã đọc nếu là 'unread'
    if (item.status === "unread") {
      dispatch(markNotificationAsRead(item.id));
    }
    // Điều hướng nếu có link
    if (item.link) {
      navigate(item.link);
    }
    // Đóng drawer (nếu đang ở mobile)
    setNotificationDrawerOpen(false);
    // Dropdown của Antd (desktop) sẽ tự đóng khi click
  };

  /** Xử lý tải thêm thông báo */
  const handleLoadMore = () => {
    // Chỉ tải thêm nếu không có request nào đang chạy
    if (fetchStatus === "loading") return;

    const currentLimit = pagination?.limit || 10;
    // Offset tiếp theo = số lượng thông báo đang có
    const nextOffset = notificationsData?.length || 0;

    dispatch(fetchNotifications({ limit: currentLimit, offset: nextOffset }));
  };

  /** Format data cho NotificationList (desktop) */
  const formattedNotifications = (notificationsData || []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.body, // API dùng 'body', component NotificationList dùng 'description'
    status: item.status,
    link: item.link,
    onClick: () => handleNotificationClick(item), // Gắn hàm handler
  }));
  const handleMarkAsRead = (id) => {
    dispatch(markNotificationAsRead(id)).then(() => {
      dispatch(fetchNotifications({ limit: 10, offset: 0 }));
    });
  };
  const handleDelete = (id) => {
    dispatch(deleteNotification(id)).then(() => {
      dispatch(fetchNotifications({ limit: 10, offset: 0 }));
    });
  };

  /** * Chuyển notifications thành items cho Menu (mobile Drawer)
   * Lưu ý: Tên biến vẫn là 'notificationMenuItems' nhưng sẽ được dùng cho <List>
   */
  const notificationMenuItems = (notificationsData || []).map((item) => ({
    key: item.id,
    label: ( // Chúng ta sẽ render 'label' này bên trong <List.Item>
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}
        className={styles.notificationItem}
      >
        {/* <Avatar
          style={{ backgroundColor: "#e6f0ff", color: "#357abd" }}
          icon={<BellOutlined />}
          size={36}
        /> */}

        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <Text
            strong
            style={{
              fontSize: 15,
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {item.title}
            {item.status === "unread" && (
              <Badge status="processing" color="blue" style={{ marginLeft: 8 }} />
            )}
          </Text>
          <Text
            type="secondary"
            style={{
              fontSize: 13,
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {item.body}
          </Text>
        </div>
        {/* Nút ba chấm cho menu thao tác */}
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              ...(item.status === "unread"
                ? [{ key: `markAsRead-${item.id}`, label: "Đánh dấu đã đọc" }]
                : []),
              { key: `delete-${item.id}`, label: "Xóa thông báo", danger: true },
            ],
            onClick: ({ key }) => {
              if (key === `markAsRead-${item.id}`) {
                handleMarkAsRead(item.id);
              }
              if (key === `delete-${item.id}`) {
                handleDelete(item.id);
              }
            },
          }}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreOutlined />} style={{ padding: 0, marginLeft: 8 }} />
        </Dropdown>
      </div>
    ),
  }));

  return (
    <Header
      className={styles.topHeader}
      // Giữ header không đè lên sider: canh trái theo trạng thái sider
      style={{ left: isLgMobile ? 0 : collapsed ? collapsedSiderWidth : siderWidth }}
    >
      {/* Bên trái: nút mở sider + ô search desktop */}
      <div className={styles.headerLeft}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onMenuClick}
          className={styles.menuButton}
        />
        {/* <div className={styles.desktopSearch}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search"
            className={styles.headerSearch}
            size="large"
          />
        </div> */}
      </div>

      {/* Mobile: ô search toàn chiều rộng (ấn icon kính lúp để bật) */}
      {isLgMobile && searchVisible ? (
        // <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
        //   <Input
        //     prefix={<SearchOutlined />}
        //     placeholder="Search..."
        //     autoFocus
        //     className={styles.headerSearch}
        //     size="large"
        //     style={{ flex: 1 }}
        //   />
        //   <Button type="text" icon={<CloseOutlined />} onClick={() => setSearchVisible(false)} />
        // </div>
        <></>
      ) : (
        // Bên phải: chuông + avatar + menu user
        <div className={styles.headerRight}>
          {/* Icon bật ô search ở mobile */}
          {/* <div className={styles.mobileSearchIcon}>
            <Button
              type="text"
              shape="circle"
              icon={<SearchOutlined style={{ fontSize: 18 }} />}
              onClick={() => setSearchVisible(true)}
            />
          </div> */}
          {/* Thông báo: mobile dùng Drawer, desktop dùng Dropdown */}
          {isMdMobile ? (
            <>
              {/* CẬP NHẬT COUNT */}
              <Badge count={unreadCount} overflowCount={99}>
                <Button
                  type="text"
                  shape="circle"
                  icon={<BellOutlined />}
                  onClick={() => setNotificationDrawerOpen(true)}
                />
              </Badge>

              <Drawer
                title="Thông báo"
                placement="right"
                open={notificationDrawerOpen}
                onClose={() => setNotificationDrawerOpen(false)}
                width={280}
                styles={{
                  body: {
                    padding: 0,
                  },
                }}
                footer={
                  hasMoreNotifications && (
                    <Button type="link" block onClick={handleLoadMore} loading={loadingMore}>
                      Tải thêm
                    </Button>
                  )
                }
              >
                {/* Phần nội dung (list) cho mobile */}
                {initialLoading ? (
                  // Hiển thị Spin khi tải lần đầu
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: 150,
                    }}
                  >
                    <Spin />
                  </div>
                ) : notificationsData?.length === 0 ? (
                  // Hiển thị Empty khi không có data
                  <Empty
                    description="Không có thông báo"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ padding: "20px 0" }}
                  />
                ) : (
                  <List
                    dataSource={notificationMenuItems}
                    renderItem={(item) => (
                      <List.Item
                        key={item.key}
                        style={{
                          padding: "12px 16px",
                          borderBlockEnd: "1px solid #f0f0f0",
                        }}
                      >
                        {item.label}
                      </List.Item>
                    )}
                    style={{ border: "none", padding: 0 }}
                  />
                )}
              </Drawer>
            </>
          ) : (
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              popupRender={() => (
                <NotificationList
                  notifications={formattedNotifications} // Dùng data đã format
                  loading={initialLoading} // Trạng thái loading ban đầu
                  loadingMore={loadingMore} // Trạng thái loading cho nút "Tải thêm"
                  hasMore={hasMoreNotifications} // Còn data hay không
                  onLoadMore={handleLoadMore} // Hàm xử lý tải thêm
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              )}
            >
              {/* CẬP NHẬT COUNT */}
              <Badge count={unreadCount} overflowCount={99}>
                <Button
                  type="text"
                  shape="circle"
                  style={{ border: "2px solid #d8dde3ff" }}
                  icon={<BellOutlined />}
                />
              </Badge>
            </Dropdown>
          )}

          {/* Avatar + Tên + Role + Dropdown menu user */}
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            trigger={["click"]}
          >
            <Space style={{ cursor: "pointer", padding: "0 10px" }}>
              {/* Nếu không có avatar → hiển thị icon mặc định */}
              {userAvatar ? <Avatar src={userAvatar} /> : <Avatar icon={<UserOutlined />} />}

              {/* Ẩn text user ở màn md trở xuống để gọn UI */}
              {!isMdMobile && (
                <>
                  <div
                    className={`${styles.headerText} mx-3`}
                    style={{ display: "flex", flexDirection: "column" }}
                  >
                    <Text strong className={styles.headerText}>
                      {userName}
                    </Text>
                    {userRole ? (
                      <Text type="secondary" className={styles.headerUserRole}>
                        {userRoleDisplay}
                      </Text>
                    ) : null}
                  </div>
                  <DownCircleOutlined
                    style={{ fontSize: 18, color: "#5C5C5C" }}
                    className={styles.headerText}
                  />
                </>
              )}
            </Space>
          </Dropdown>
        </div>
      )}
    </Header>
  );
};

export default TopHeader;