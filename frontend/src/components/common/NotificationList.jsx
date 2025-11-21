import { BellOutlined, MoreOutlined } from "@ant-design/icons";
import styles from "@assets/NotificationList.module.css";
import { Avatar, Badge, Button, Divider, Dropdown, Empty, List, Space, Typography } from "antd";

const { Text } = Typography;

/**
 * @param {boolean} loading - Loading cho lần tải đầu tiên (hiển thị spinner cho cả list)
 * @param {boolean} loadingMore - Loading cho các lần tải thêm (hiển thị spinner trên nút)
 * @param {boolean} hasMore - True nếu còn data để tải thêm
 * @param {Function} onLoadMore - Hàm callback khi click nút "Tải thêm"
 */
export default function NotificationList({
  notifications,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onMarkAsRead,
  onDelete,
}) {
  const handleMenuClick = (item, { key }) => {
    if (key === "markAsRead") {
      onMarkAsRead?.(item.id);
    }
    if (key === "delete") {
      onDelete?.(item.id);
    }
  };
  return (
    <div className={styles.notificationList}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          padding: "8px 16px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <BellOutlined style={{ color: "#357abd", fontSize: 18 }} />
        <Text strong style={{ fontSize: 16 }}>
          Thông báo
        </Text>
      </div>
      <List
        itemLayout="horizontal"
        dataSource={notifications}
        loading={loading} // Chỉ loading cho lần tải đầu
        locale={{
          emptyText: (
            <Empty description="Không có thông báo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ),
        }}
        renderItem={(item) => (
          <List.Item
            // Thêm class 'unread' (bạn có thể style nó trong CSS)
            className={`${styles.notificationItem} ${item.status === "unread" ? styles.unread : ""}`}
            style={{ cursor: "pointer", transition: "background 0.2s" }}
            onClick={item.onClick}
            actions={[
              <Dropdown
                key="more"
                trigger={["click"]}
                menu={{
                  items: [
                    ...(item.status === "unread"
                      ? [{ key: "markAsRead", label: "Đánh dấu đã đọc" }]
                      : []),
                    { key: "delete", label: "Xóa thông báo", danger: true },
                  ],
                  onClick: (info) => {
                    if (info.domEvent) info.domEvent.stopPropagation();
                    handleMenuClick(item, info);
                  },
                }}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  onClick={(e) => e.stopPropagation()}
                  icon={<MoreOutlined />}
                  style={{ padding: 0 }}
                />
              </Dropdown>,
            ]}
          >
            <List.Item.Meta
              // avatar={
              //   <Avatar
              //     style={{ backgroundColor: "#e6f0ff", color: "#357abd" }}
              //     icon={<BellOutlined />}
              //     size={36}
              //   />
              // }
              title={
                // Thêm chấm xanh cho thông báo chưa đọc
                <Space>
                  <Text strong>{item.title}</Text>
                  {item.status === "unread" && <Badge status="processing" color="blue" />}
                </Space>
              }
              description={
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {item.description}
                </Text>
              }
            />
          </List.Item>
        )}
      />

      {/* Cập nhật footer: Hiển thị nút "Tải thêm" */}
      {hasMore && (
        <>
          <Divider style={{ margin: 0 }} />
          <div className={styles.viewAll}>
            <Button
              type="link"
              block
              onClick={onLoadMore} // Đổi từ onViewAll
              loading={loadingMore} // Dùng prop loadingMore
              style={{ fontWeight: 500 }}
            >
              Tải thêm
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
