import React from "react";

import CircleStatus from "@src/components/common/CircleStatus";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import { Avatar, Col, Divider, Modal, Row, Tabs, Tag, Typography } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("vi");

const { Title, Text } = Typography;

export default function UserDetailModal({
  visible,
  onCancel,
  user,
  getDepartmentName,
  getDepartmentInfo,
  renderStatusTag,
  renderRoleTag,
  formatDate,
}) {
  if (!user) return null;
  const getLastActiveText = (user) => {
    // Ưu tiên lastOnline, nếu không có thì dùng lastOffline
    if (user.online) return "Đang hoạt động";
    const lastActive = user.lastOnline || user.lastOffline || user.updatedAt;
    if (!lastActive) return "Không xác định";
    return `Hoạt động ${dayjs(lastActive).fromNow()}`;
  };
  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      style={{ top: 20 }}
      className="custom-modal"
    >
      <div>
        {/* Thông tin tổng quan */}
        <Row gutter={24} align="middle">
          <Col flex="80px">
            <div style={{ position: "relative" }}>
              <Avatar
                src={user?.avatar}
                size={64}
                style={{ border: "2px solid #eee", background: "#fafafa" }}
              >
                {!user?.avatar && user?.fullName?.charAt(0)?.toUpperCase()}
                {/* Icon trạng thái online/offline ở góc phải dưới */}
              </Avatar>
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 5,
                  zIndex: 2,
                }}
              >
                <CircleStatus width={20} height={20} online={user.online} />
              </span>
            </div>
          </Col>
          <Col flex="auto">
            <Title level={4} style={{ marginBottom: 4 }}>
              {user.fullName}
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              @{user.username}
            </Text>
            <Divider type="vertical" />
            <Text type="secondary" style={{ fontSize: 13 }}>
              {getLastActiveText(user)}
            </Text>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              {renderStatusTag(user.status)}
              {renderRoleTag(user.role)}
              <Tag color="blue">#{getDepartmentInfo(user).name}</Tag>
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: "18px 0 12px 0" }} />
        {/* Thông tin liên hệ & cơ sở */}
        <div className="userManage-summaryContainer">
          <Row gutter={[16, 16]}>
            {/* responsive col */}
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <div>
                <Text strong>Email: </Text>
                <Text>{user.email}</Text>
              </div>
            </Col>
            {/* responsive col */}
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <div>
                <Text strong>Điện thoại: </Text>
                <Text>{user.phone}</Text>
              </div>
            </Col>
            {/* responsive col */}
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <div>
                <Text strong>Chức danh: </Text>
                {renderRoleTag(user.role)}
              </div>
            </Col>
            {/* responsive col */}
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <div>
                <Text strong>Cơ sở: </Text>
                <Text>{getDepartmentName(user)}</Text>
                {getDepartmentInfo(user) && (
                  <Text type="secondary" style={{ fontSize: "12px", marginLeft: "8px" }}>
                    (#{getDepartmentInfo(user).code})
                  </Text>
                )}
              </div>
            </Col>
          </Row>
        </div>

        {/* Tabs */}
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: "Thông tin cơ bản",
              children: (
                <div className="userManage-tabContent">
                  <Title level={5}>Thông tin chi tiết</Title>
                  <div className="userManage-detailGrid">
                    <LiquidGlassPanel>
                      <Text strong>Tên đăng nhập:</Text>
                      <br />
                      <Text>{user.username}</Text>
                    </LiquidGlassPanel>
                    <LiquidGlassPanel>
                      <Text strong>Họ và tên:</Text>
                      <br />
                      <Text>{user.fullName}</Text>
                    </LiquidGlassPanel>
                    <LiquidGlassPanel>
                      <Text strong>Email:</Text>
                      <br />
                      <Text>{user.email}</Text>
                    </LiquidGlassPanel>
                    <LiquidGlassPanel>
                      <Text strong>Số điện thoại:</Text>
                      <br />
                      <Text>{user.phone}</Text>
                    </LiquidGlassPanel>
                    <LiquidGlassPanel>
                      <Text strong>Trạng thái:</Text>
                      <br />
                      {renderStatusTag(user.status)}
                    </LiquidGlassPanel>
                    {/* <LiquidGlassPanel>
                      <Text strong>Google ID:</Text>
                      <br />
                      <Text className="userManage-googleIdText">
                        {user.googleId || "Chưa liên kết"}
                      </Text>
                    </LiquidGlassPanel> */}
                    <LiquidGlassPanel>
                      <Text strong>Loại tài khoản:</Text>
                      <br />
                      <Tag color={user.googleId ? "blue" : "default"}>
                        {user.googleId ? "Đăng nhập Google" : "Tài khoản thường"}
                      </Tag>
                    </LiquidGlassPanel>
                    <LiquidGlassPanel>
                      <Text strong>Ngày tạo:</Text>
                      <br />
                      <Text>{formatDate(user.createdAt)}</Text>
                    </LiquidGlassPanel>
                    <LiquidGlassPanel>
                      <Text strong>Cập nhật lần cuối:</Text>
                      <br />
                      <Text>{formatDate(user.updatedAt)}</Text>
                    </LiquidGlassPanel>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}
