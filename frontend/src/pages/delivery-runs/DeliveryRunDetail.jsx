import React, { useEffect, useState } from "react";

import {
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  ShoppingOutlined,
  StopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "@assets/delivery-runs/DeliveryRunsManage.css";
import {
  cancelDeliveryRun,
  cancelDeliveryRunOrder,
  completeDeliveryRun,
  completeDeliveryRunOrder,
  reopenDeliveryRunOrder,
  startDeliveryRun,
  startDeliveryRunOrder,
} from "@src/store/deliveryRunsSlice";
import {
  Button,
  Col,
  Divider,
  Input,
  Modal,
  Row,
  Space,
  Tag,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

import UpdateDeliveryOrderModal from "./UpdateDeliveryOrderModal";

const { Title, Text } = Typography;

/** UI mapping cho nhãn trạng thái + màu viền trái */
const ORDER_STATUS_UI = {
  assigned: { label: "Đã phân công", tagColor: "geekblue", border: "#2f54eb" },
  in_progress: { label: "Đang giao", tagColor: "processing", border: "#1890ff" },
  completed: { label: "Hoàn thành", tagColor: "success", border: "#52c41a" },
  cancelled: { label: "Đã hủy", tagColor: "error", border: "#ff4d4f" },
};

/** Tag trạng thái (dùng ở hàng trên, to hơn, nổi bật hơn) */
const renderStatusTagTop = (status) => {
  const ui = ORDER_STATUS_UI[status] || { label: status || "-", tagColor: "default" };
  return (
    <Tag
      color={ui.tagColor}
      className="
        px-4 py-1.5 rounded-lg
        text-[14px] md:text-[15.5px] font-bold
        tracking-wide shadow-sm
      "
      style={{
        // lineHeight: 1.2,
        transform: "scale(1.05)", // hơi to hơn bình thường một chút
      }}
    >
      {ui.label}
    </Tag>
  );
};

/** Tag run status (khu vực mô tả header run) */
const renderStatusTag = (status) => {
  const statusMap = {
    assigned: { color: "blue", text: "Đã phân công", icon: <ClockCircleOutlined /> },
    in_progress: { color: "processing", text: "Đang giao", icon: <CarOutlined /> },
    completed: { color: "success", text: "Hoàn thành", icon: <CheckCircleOutlined /> },
    cancelled: { color: "error", text: "Đã hủy", icon: <CloseCircleOutlined /> },
    pending: { color: "default", text: "Chờ xử lý", icon: <ClockCircleOutlined /> },
    failed: { color: "error", text: "Thất bại", icon: <ExclamationCircleOutlined /> },
  };
  const cfg = statusMap[status] || { color: "default", text: status || "-" };
  return (
    <Tag color={cfg.color} icon={cfg.icon}>
      {cfg.text}
    </Tag>
  );
};

const DeliveryRunDetail = ({ visible, runData, onClose, onRefresh }) => {
  const dispatch = useDispatch();
  const userRole = useSelector((state) => state.auth.user?.role);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loadingState, setLoadingState] = useState({ id: null, action: null });

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);

  // ===== RUN actions =====
  const handleStartRun = () => {
    Modal.confirm({
      title: "Bắt đầu chuyến giao hàng",
      content: "Bạn có chắc muốn bắt đầu chuyến giao hàng này không?",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        dispatch(startDeliveryRun(runData.id))
          .unwrap()
          .then(() => {
            notification.success({ message: "Bắt đầu chuyến giao hàng thành công", duration: 3 });
            onRefresh();
            onClose();
          })
          .catch((error) => {
            notification.error({
              message: "Không thể bắt đầu chuyến giao hàng",
              description: error.message || "Đã xảy ra lỗi",
              duration: 5,
            });
          });
      },
    });
  };

  const handleCompleteRun = () => {
    Modal.confirm({
      title: "Hoàn thành chuyến giao hàng",
      content: "Bạn có chắc muốn hoàn thành chuyến giao hàng này không?",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        dispatch(completeDeliveryRun(runData.id))
          .unwrap()
          .then(() => {
            notification.success({
              message: "Hoàn thành chuyến giao hàng thành công",
              duration: 3,
            });
            onRefresh();
            onClose();
          })
          .catch((error) => {
            notification.error({
              message: "Không thể hoàn thành chuyến giao hàng",
              description: error.message || "Đã xảy ra lỗi",
              duration: 5,
            });
          });
      },
    });
  };

  const handleCancelRun = () => {
    Modal.confirm({
      title: "Hủy chuyến giao hàng",
      content: (
        <div>
          <p>Bạn có chắc muốn hủy chuyến giao hàng này không?</p>
          <p>
            <strong>Mã chuyến:</strong> {runData.deliveryNo}
          </p>
          <p>
            <strong>Trạng thái:</strong> {runData.status}
          </p>
        </div>
      ),
      okText: "Xác nhận hủy",
      cancelText: "Đóng",
      okType: "danger",
      onOk: () => {
        return dispatch(cancelDeliveryRun(runData.id))
          .unwrap()
          .then(() => {
            notification.success({ message: "Hủy chuyến giao hàng thành công", duration: 3 });
            onRefresh();
            onClose();
          })
          .catch((error) => {
            notification.error({
              message: "Không thể hủy chuyến giao hàng",
              description: error?.message || error?.error || "Đã xảy ra lỗi.",
              duration: 5,
            });
          });
      },
    });
  };

  // ===== ORDER actions =====
  const handleStartOrder = (orderId) => {
    Modal.confirm({
      title: "Bắt đầu giao hàng",
      content: "Bạn có chắc muốn bắt đầu giao đơn hàng này không?",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        // ✅ Bắt đầu loading
        setLoadingState({ id: orderId, action: "start" });
        dispatch(startDeliveryRunOrder(orderId))
          .unwrap()
          .then(() => {
            notification.success({ message: "Bắt đầu giao hàng thành công", duration: 3 });
            onRefresh();
          })
          .catch((error) => {
            notification.error({
              message: "Không thể bắt đầu giao hàng",
              description: error.message || "Đã xảy ra lỗi",
              duration: 5,
            });
          })
          // ✅ Dừng loading khi hoàn tất (thành công hoặc thất bại)
          .finally(() => {
            setLoadingState({ id: null, action: null });
          });
      },
    });
  };

  const handleCompleteOrder = (orderId) => {
    let actualPay = "";
    let evdUrl = "";
    let note = "";

    Modal.confirm({
      title: "Hoàn thành giao hàng",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>Nhập thông tin hoàn thành giao hàng:</Text>
          <Input
            placeholder="Số tiền thực tế thu được (VND)"
            value={actualPay}
            onChange={(e) => (actualPay = e.target.value)}
            type="number"
          />
          <Input
            placeholder="URL ảnh chứng minh (tùy chọn)"
            value={evdUrl}
            onChange={(e) => (evdUrl = e.target.value)}
          />
          <Input.TextArea
            placeholder="Ghi chú (tùy chọn)"
            value={note}
            onChange={(e) => (note = e.target.value)}
            rows={3}
          />
        </Space>
      ),
      okText: "Hoàn thành",
      cancelText: "Hủy",
      onOk: () => {
        const data = {};
        if (actualPay) data.actualPay = parseFloat(actualPay);
        if (evdUrl) data.evdUrl = evdUrl.trim();
        if (note) data.note = note.trim();

        dispatch(completeDeliveryRunOrder({ orderId, data }))
          .unwrap()
          .then(() => {
            notification.success({ message: "Hoàn thành giao hàng thành công", duration: 3 });
            onRefresh();
          })
          .catch((error) => {
            notification.error({
              message: "Không thể hoàn thành giao hàng",
              description: error.message || "Đã xảy ra lỗi",
              duration: 5,
            });
          });
      },
    });
  };

  const handleCancelOrder = (orderId) => {
    let note = "";
    Modal.confirm({
      title: "Hủy giao hàng",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>Nhập lý do hủy giao hàng:</Text>
          <Input.TextArea
            placeholder="Lý do hủy (tùy chọn)"
            onChange={(e) => (note = e.target.value)}
            rows={3}
          />
        </Space>
      ),
      okText: "Hủy",
      cancelText: "Đóng",
      okType: "danger",
      onOk: () => {
        // ✅ Bắt đầu loading
        setLoadingState({ id: orderId, action: "cancel" });
        const data = note ? { note: note.trim() } : {};
        dispatch(cancelDeliveryRunOrder({ orderId, data }))
          .unwrap()
          .then(() => {
            notification.success({ message: "Hủy giao hàng thành công", duration: 3 });
            onRefresh();
          })
          .catch((error) => {
            notification.error({
              message: "Không thể hủy giao hàng",
              description: error.message || "Đã xảy ra lỗi",
              duration: 5,
            });
          })
          // ✅ Dừng loading khi hoàn tất
          .finally(() => {
            setLoadingState({ id: null, action: null });
          });
      },
    });
  };

  // ✅ Thêm handler mở lại order
  const handleReopenOrder = (orderId) => {
    Modal.confirm({
      title: "Mở lại giao hàng",
      content:
        "Bạn có chắc muốn mở lại đơn hàng này không? Trạng thái sẽ chuyển về 'Đã phân công'.",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => {
        // ✅ Bắt đầu loading
        setLoadingState({ id: orderId, action: "reopen" });
        dispatch(reopenDeliveryRunOrder({ orderId, data: {} }))
          .unwrap()
          .then(() => {
            notification.success({
              message: "Mở lại giao hàng thành công",
              description: "Đơn hàng đã được chuyển về trạng thái 'Đã phân công'",
              duration: 3,
            });
            onRefresh();
          })
          .catch((error) => {
            notification.error({
              message: "Không thể mở lại giao hàng",
              description: error.message || "Đã xảy ra lỗi",
              duration: 5,
            });
          })
          // ✅ Dừng loading khi hoàn tất
          .finally(() => {
            setLoadingState({ id: null, action: null });
          });
      },
    });
  };

  // Update modal
  const handleOpenUpdateModal = (order) => {
    setCurrentOrder(order);
    setUpdateModalVisible(true);
  };

  useEffect(() => {
    if (currentOrder) {
      // console.log("Current order updated:", currentOrder);
    }
  }, [currentOrder]);

  const handleCloseUpdateModal = () => {
    setUpdateModalVisible(false);
    setCurrentOrder(null);
  };

  const handleUpdateSuccess = () => {
    onRefresh();
    handleCloseUpdateModal();
  };

  if (!runData) return null;

  // Permissions
  const canComplete =
    runData.status === "in_progress" && ["admin", "sup_shipper", "shipper"].includes(userRole);
  const canCancel =
    runData.status !== "completed" && runData.status !== "cancelled" && userRole === "admin";

  const canStartOrder = (orderStatus) =>
    orderStatus === "assigned" && ["admin", "sup_shipper", "shipper"].includes(userRole);
  const canCompleteOrder = (orderStatus) =>
    orderStatus === "in_progress" && ["admin", "sup_shipper", "shipper"].includes(userRole);
  const canCancelOrder = (orderStatus) =>
    orderStatus !== "completed" &&
    orderStatus !== "cancelled" &&
    ["admin", "sup_shipper"].includes(userRole);
  const canUpdateOrder = (orderStatus) =>
    (orderStatus === "assigned" || orderStatus === "in_progress" || orderStatus === "completed") &&
    ["shipper", "sup_shipper", "admin"].includes(userRole);
  const canReopenOrder = (
    orderStatus // ✅ Thêm permission cho reopen
  ) => orderStatus === "cancelled" && ["admin", "sup_shipper"].includes(userRole);

  return (
    <Modal
      title={
        <Space>
          <CarOutlined />
          <span style={{ fontSize: "16px" }}>Chi tiết chuyến giao hàng - {runData.deliveryNo}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      centered
      width="90vw"
      style={{ maxWidth: "1200px", top: 20 }}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ].filter(Boolean)}
      className="delivery-detail-modal"
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* RUN meta */}
        <div className="p-4 bg-[#fafafa] rounded-lg border border-[#f0f0f0]">
          <Row gutter={[16, 12]}>
            <Col xs={24} md={12}>
              <div className="flex justify-between items-center">
                <Text type="secondary" className="text-[13px] font-medium">
                  Mã chuyến
                </Text>
                <Tag color="blue" className="text-[14px] px-2 py-1">
                  {runData.deliveryNo}
                </Tag>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="flex justify-between items-center">
                <Text type="secondary" className="text-[13px] font-medium">
                  Trạng thái
                </Text>
                {renderStatusTag(runData.status)}
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="flex justify-between items-center">
                <Text type="secondary" className="text-[13px] font-medium">
                  Biển số xe
                </Text>
                <Space className="text-[14px] font-medium">
                  <CarOutlined className="text-[#1890ff]" />
                  <Text>{runData.vehicleNo}</Text>
                </Space>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="flex justify-between items-center">
                <Text type="secondary" className="text-[13px] font-medium">
                  Số đơn hàng
                </Text>
                <Text className="text-[14px] font-semibold text-[#1890ff]">
                  {runData.orders?.length || 0} đơn
                </Text>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="flex justify-between items-center">
                <Text type="secondary" className="text-[13px] font-medium">
                  Giám sát
                </Text>
                <Space className="text-[14px] font-medium">
                  <UserOutlined className="text-[#52c41a]" />
                  <Text>{runData.supervisorName || "-"}</Text>
                </Space>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="flex justify-between items-center">
                <Text type="secondary" className="text-[13px] font-medium">
                  Người giao
                </Text>
                <Space className="text-[14px] font-medium">
                  <UserOutlined className="text-[#fa8c16]" />
                  <Text>{runData.shipperName || "-"}</Text>
                </Space>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="flex justify-between items-center">
                <Text type="secondary" className="text-[13px] font-medium">
                  Ngày tạo
                </Text>
                <Space className="text-[13px]">
                  <ClockCircleOutlined className="text-[#666]" />
                  <Text>{formatDate(runData.createdAt)}</Text>
                </Space>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="flex justify-between items-center">
                <Text type="secondary" className="text-[13px] font-medium">
                  Ngày cập nhật
                </Text>
                <Space className="text-[13px]">
                  <ClockCircleOutlined className="text-[#666]" />
                  <Text>{formatDate(runData.updatedAt)}</Text>
                </Space>
              </div>
            </Col>

            {runData.startedAt && (
              <Col xs={24} md={12}>
                <div className="flex justify-between items-center">
                  <Text type="secondary" className="text-[13px] font-medium">
                    Bắt đầu
                  </Text>
                  <Space className="text-[13px]">
                    <ClockCircleOutlined className="text-[#52c41a]" />
                    <Text>{formatDate(runData.startedAt)}</Text>
                  </Space>
                </div>
              </Col>
            )}

            {runData.completedAt && (
              <Col xs={24} md={12}>
                <div className="flex justify-between items-center">
                  <Text type="secondary" className="text-[13px] font-medium">
                    Hoàn thành
                  </Text>
                  <Space className="text-[13px]">
                    <CheckCircleOutlined className="text-[#52c41a]" />
                    <Text>{formatDate(runData.completedAt)}</Text>
                  </Space>
                </div>
              </Col>
            )}
          </Row>
        </div>

        <Divider orientation="left">
          <Space>
            <ShoppingOutlined />
            <Title level={5} style={{ margin: 0 }}>
              Danh sách đơn hàng ({runData.orders?.length || 0})
            </Title>
          </Space>
        </Divider>

        {runData.orders && runData.orders.length > 0 ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {runData.orders.map((order, index) => {
              const ui = ORDER_STATUS_UI[order.status] || { border: "#d9d9d9" };

              return (
                <div
                  key={order.id || index}
                  className="
                    cursor-pointer rounded-lg border border-[#e8e8e8] bg-white shadow
                    transition-all duration-200 mb-2 hover:shadow-lg hover:-translate-y-[1px]
                    p-3 md:p-4
                  "
                  style={{ borderLeft: `4px solid ${ui.border}` }}
                  onClick={() => handleOpenUpdateModal(order)}
                >
                  {/* HEADER: routeSeq + orderNo (trái) | status + actions (phải) */}
                  <Row gutter={[12, 8]} align="top" className="mb-3 md:mb-4">
                    <Col xs={24} md={14}>
                      <div className="flex items-center flex-wrap gap-2 md:gap-3">
                        <div className="bg-[#1890ff] text-white px-2 md:px-3 py-[2px] md:py-1 rounded-[12px] text-xs md:text-sm font-semibold">
                          #{order.routeSeq}
                        </div>
                        <Text strong className="text-sm md:text-base text-[#1890ff]">
                          {order.orderNo}
                        </Text>
                      </div>
                    </Col>

                    <Col xs={24} md={10}>
                      <div
                        className="flex items-center gap-2 flex-wrap justify-start md:justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Trạng thái to, hiển thị trên header */}
                        {renderStatusTagTop(order.status)}

                        {/* Button "Bắt đầu" */}
                        {canStartOrder(order.status) && userRole === "shipper" && (
                          <Button
                            type="primary"
                            size="middle"
                            icon={<PlayCircleOutlined />}
                            loading={
                              loadingState.id === order.id && loadingState.action === "start"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartOrder(order.id);
                            }}
                            className="text-xs md:text-sm"
                          >
                            Bắt đầu
                          </Button>
                        )}

                        {/* Button "Hủy" */}
                        {canCancelOrder(order.status) && (
                          <Button
                            danger
                            size="middle"
                            icon={<StopOutlined />}
                            loading={
                              loadingState.id === order.id && loadingState.action === "cancel"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(order.id);
                            }}
                            className="text-xs md:text-sm"
                          >
                            Hủy
                          </Button>
                        )}

                        {/* ✅ Button "Mở lại" cho order đã hủy */}
                        {canReopenOrder(order.status) && (
                          <Button
                            type="default"
                            size="middle"
                            icon={<PlayCircleOutlined />}
                            loading={
                              loadingState.id === order.id && loadingState.action === "reopen"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReopenOrder(order.id);
                            }}
                            className="text-xs md:text-sm"
                            style={{
                              borderColor: "#52c41a",
                              color: "#52c41a",
                            }}
                          >
                            Mở lại
                          </Button>
                        )}
                      </div>
                    </Col>
                  </Row>

                  {/* CUSTOMER INFO */}
                  <Row gutter={[12, 8]} className="mb-3 md:mb-4">
                    <Col xs={24} md={12}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <UserOutlined className="text-[#1890ff] text-base md:text-lg flex-shrink-0" />
                        <Text
                          strong
                          className="text-sm md:text-base text-[#262626] truncate"
                          title={order.customer?.name || "-"}
                        >
                          {order.customer?.name || "-"}
                        </Text>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex items-center gap-1.5">
                        <PhoneOutlined className="text-[#52c41a] text-base md:text-lg" />
                        <Text className="text-[13px] md:text-[15px] text-[#595959] font-medium">
                          {order.customer?.phone || "-"}
                        </Text>
                      </div>
                    </Col>

                    {/* Địa chỉ (không còn hiển thị trạng thái ở đây) */}
                    <Col xs={24}>
                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <EnvironmentOutlined className="text-[#fa8c16] text-base md:text-lg mt-[2px] flex-shrink-0" />
                        <Text className="text-[13px] md:text-[15px] text-[#595959] leading-[1.4] break-words">
                          {order.customer?.address || "-"}
                        </Text>
                      </div>
                    </Col>
                  </Row>

                  {/* COD */}
                  <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-md p-2.5 md:p-3">
                    <Row gutter={[12, 8]} align="middle" justify="space-between">
                      <Col>
                        <div className="text-[#666] uppercase text-[10px] md:text-xs font-medium mb-0.5">
                          Số tiền COD
                        </div>
                        <div className="text-[14px] md:text-[16px] font-semibold text-[#1890ff]">
                          {formatCurrency(order.codAmount)}
                        </div>
                      </Col>

                      <Col>
                        {order.actualPay > 0 ? (
                          <div className="text-right">
                            <div className="text-[#666] uppercase text-[10px] md:text-xs font-medium mb-0.5">
                              Thực tế thu được
                            </div>
                            <div className="text-[16px] md:text-[18px] font-bold text-[#52c41a] bg-[#f6ffed] inline-block rounded border border-[#b7eb8f] px-2 md:px-3 py-0.5">
                              {formatCurrency(order.actualPay)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="text-[#bfbfbf] uppercase text-[10px] md:text-xs font-medium mb-0.5">
                              Chưa thu tiền
                            </div>
                            <div className="text-[12px] md:text-[14px] text-[#bfbfbf] italic">
                              ---
                            </div>
                          </div>
                        )}
                      </Col>
                    </Row>
                  </div>

                  {/* NOTE */}
                  {order.note && (
                    <div className="mt-2.5 md:mt-3 bg-[#fff7e6] rounded border-l-4 border-[#ffc53d] p-2 md:p-2.5">
                      <Text className="text-[12px] md:text-[14px]" type="secondary" italic>
                        💬 {order.note}
                      </Text>
                    </div>
                  )}
                </div>
              );
            })}
          </Space>
        ) : (
          <div className="text-center p-10 bg-[#fafafa] rounded-lg border-2 border-dashed border-[#d9d9d9]">
            <div className="text-[40px] text-[#d9d9d9] mb-3">📦</div>
            <Text type="secondary" className="text-[14px]">
              Chưa có đơn hàng nào trong chuyến giao hàng này
            </Text>
          </div>
        )}
      </Space>

      {/* Modal cập nhật đơn */}
      <UpdateDeliveryOrderModal
        visible={updateModalVisible}
        onCancel={handleCloseUpdateModal}
        order={currentOrder}
        onSuccess={handleUpdateSuccess}
      />
    </Modal>
  );
};

export default DeliveryRunDetail;
