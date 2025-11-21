import React, { useEffect, useState } from "react";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  SendOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/task/TaskDetailModal.css";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import { fetchInventoryLotById } from "@src/store/inventoryLotSlice";
import { fetchSalesOrderById } from "@src/store/salesOrdersSlice";
import { fetchTaskById, updateTaskReview, updateTaskStatus } from "@src/store/taskSlice";
import {
  Button,
  Col,
  Divider,
  Image,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Steps,
  Table,
  Tabs,
  Tag,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

import UpdateTaskItemModal from "./UpdateTaskItemModal";

const { Text, Title } = Typography;
const { Step } = Steps;

const TaskDetailModal = ({ visible, onCancel, task, onRefresh }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role;

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [taskDetail, setTaskDetail] = useState(null);
  const [taskItems, setTaskItems] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const [reviewReason, setReviewReason] = useState("");
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [lotInfoMap, setLotInfoMap] = useState({});

  /** === Fetch task + order mỗi khi mở modal === */
  useEffect(() => {
    if (!visible || !task?.id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch task chi tiết
        const res = await dispatch(fetchTaskById(task.id)).unwrap();
        const data = res?.data || res;
        setTaskDetail(data);
        setTaskItems(res?.items || data?.items || []);

        // Fetch thông tin lot cho từng item
        const lotIds = (res?.items || data?.items || []).map((i) => i.lotId).filter(Boolean);

        if (lotIds.length > 0) {
          const results = await Promise.allSettled(
            lotIds.map((lotId) => dispatch(fetchInventoryLotById(lotId)).unwrap())
          );

          const map = {};
          results.forEach((res, idx) => {
            const lotId = lotIds[idx];
            if (res.status === "fulfilled") {
              map[lotId] = res.value?.data || res.value;
            }
          });
          setLotInfoMap(map);
        }

        // Luôn fetch thông tin đơn hàng
        if (data?.orderId) {
          const orderRes = await dispatch(fetchSalesOrderById(data.orderId)).unwrap();
          setOrderDetail(orderRes?.data || orderRes);
        } else {
          setOrderDetail(null);
        }
      } catch (err) {
        console.error("Lỗi load chi tiết task:", err);
        setTaskDetail(null);
        setTaskItems([]);
        setOrderDetail(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [visible, task, dispatch]);

  /** === Map trạng thái === */
  const statusColorMap = {
    assigned: "blue",
    in_progress: "gold",
    pending_review: "orange",
    completed: "green",
    cancelled: "red",
  };
  const statusLabelMap = {
    assigned: "Đã phân công",
    in_progress: "Đang thực hiện",
    pending_review: "Chờ duyệt",
    completed: "Hoàn thành",
  };
  const isCancelled = taskDetail?.status === "cancelled" || orderDetail?.status === "cancelled";

  const taskSteps = isCancelled
    ? [{ key: "cancelled", label: "Đã hủy" }]
    : [
        { key: "assigned", label: "Đã phân công" },
        { key: "in_progress", label: "Đang thực hiện" },
        { key: "pending_review", label: "Chờ duyệt" },
        { key: "completed", label: "Hoàn thành" },
      ];

  const currentStatusIndex = taskSteps.findIndex((s) => s.key === taskDetail?.status);

  /** === Hàm cập nhật trạng thái === */
  const handleUpdateStatus = async (newStatus) => {
    if (!taskDetail?.id) return;
    setUpdating(true);
    try {
      await dispatch(updateTaskStatus({ id: taskDetail.id, status: newStatus })).unwrap();
      notification.success({
        message: "Cập nhật trạng thái thành công",
        description: `Trạng thái đã chuyển sang: ${statusLabelMap[newStatus] || newStatus}`,
      });

      const refreshed = await dispatch(fetchTaskById(taskDetail.id)).unwrap();
      setTaskDetail(refreshed?.data || refreshed);
      setTaskItems(refreshed?.items || refreshed?.data?.items || []);
      onRefresh?.();
    } catch (err) {
      notification.error({
        message: "Lỗi cập nhật trạng thái",
        description: err?.message || "Không thể thay đổi trạng thái.",
      });
    } finally {
      setUpdating(false);
    }
  };

  /** === Duyệt / Từ chối === */
  const handleReviewTask = async (result) => {
    if (!taskDetail?.id) return;
    setUpdating(true);
    try {
      await dispatch(
        updateTaskReview({
          id: taskDetail.id,
          data: { result, reason: reviewReason },
        })
      ).unwrap();

      notification.success({
        message: result === "confirmed" ? "Đã duyệt nhiệm vụ" : "Đã từ chối nhiệm vụ",
      });

      if (result === "confirmed") {
        await dispatch(updateTaskStatus({ id: taskDetail.id, status: "completed" })).unwrap();
      }

      const refreshed = await dispatch(fetchTaskById(taskDetail.id)).unwrap();
      setTaskDetail(refreshed?.data || refreshed);
      setTaskItems(refreshed?.items || refreshed?.data?.items || []);
      setReviewReason("");
      onRefresh?.();
    } catch (err) {
      notification.error({
        message: "Lỗi cập nhật review",
        description: err?.message || "Không thể cập nhật review nhiệm vụ.",
      });
    } finally {
      setUpdating(false);
    }
  };
  const renderStatusTag = (status) => {
    const statusMap = {
      draft: { color: "default", text: "Nháp" },
      pending_preparation: { color: "orange", text: "Chờ chuẩn bị" },
      assigned_preparation: { color: "gold", text: "Đã phân công chuẩn bị" },
      confirmed: { color: "blue", text: "Xác nhận" },
      prepared: { color: "green", text: "Chờ giao hàng" },
      delivering: { color: "cyan", text: "Đang giao" },
      delivered: { color: "green", text: "Đã giao" },
      completed: { color: "success", text: "Hoàn thành" },
      cancelled: { color: "red", text: "Đã hủy" },
    };
    const cfg = statusMap[status] || { color: "default", text: status || "-" };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };
  /** === Mở modal cập nhật sản phẩm === */
  const openUpdateModal = (item) => {
    setCurrentItem(item);
    setUpdateModalVisible(true);
  };

  /** === Cột sản phẩm === */
  const columns = [
    {
      title: "Mã sản phẩm",
      dataIndex: "skuCode",
      render: (text) => <Tag color="blue">{text}</Tag>,
      width: 140,
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      render: (text) => <Text strong>{text}</Text>,
      width: 200,
    },
    {
      title: "Lô hàng",
      dataIndex: "lotId",
      width: 180,
      render: (lotId) => {
        const lot = lotInfoMap[lotId];
        if (!lot) return <Text type="secondary">Chưa có</Text>;
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{lot.lotNo || "—"}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              SL còn: {lot.qtyOnHand ?? 0} {lot.packUnit || lot.mainUnit || ""}
            </Text>
            {lot.expiryDate && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                HSD: {new Date(lot.expiryDate).toLocaleDateString("vi-VN")}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "Số lượng yêu cầu",
      dataIndex: "preQty",
      width: 80,
      render: (val) => val?.toLocaleString("vi-VN") || 0,
    },
    {
      title: "Số lượng hoàn thành",
      dataIndex: "postQty",
      width: 100,
      render: (val) => val?.toLocaleString("vi-VN") || 0,
    },
    {
      title: "Ảnh trước",
      dataIndex: "preEvd",
      width: 80,
      render: (url) =>
        url ? (
          <Image
            src={url}
            width={60}
            height={60}
            style={{ borderRadius: 6, objectFit: "cover", cursor: "pointer" }}
            preview={{ mask: "Xem ảnh" }}
          />
        ) : (
          <Text type="secondary">Chưa có</Text>
        ),
    },
    {
      title: "Ảnh sau",
      dataIndex: "postEvd",
      width: 80,
      render: (url) =>
        url ? (
          <Image
            src={url}
            width={60}
            height={60}
            style={{ borderRadius: 6, objectFit: "cover", cursor: "pointer" }}
            preview={{ mask: "Xem ảnh" }}
          />
        ) : (
          <Text type="secondary">Chưa có</Text>
        ),
    },
    ...(userRole === "picker" && taskDetail?.status === "in_progress"
      ? [
          {
            title: "Hành động",
            key: "action",
            width: 140,
            render: (_, record) => (
              <Button size="small" type="primary" onClick={() => openUpdateModal(record)}>
                Cập nhật
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Modal
      title={
        <div className="taskDetailModal-titleContainer">
          <FileTextOutlined style={{ fontSize: 22, color: "#1677ff" }} />
          <span className="taskDetailModal-titleText">
            {taskDetail?.orderCode
              ? `Task cho đơn hàng ${taskDetail.orderCode}`
              : "Chi tiết nhiệm vụ"}
          </span>
          {taskDetail?.status &&
            (() => {
              const labelMap = {
                assigned: "Đã phân công",
                in_progress: "Đang thực hiện",
                pending_review: "Chờ duyệt",
                completed: "Hoàn thành",
                cancelled: "Đã huỷ",
              };

              return (
                <Tag
                  color={statusColorMap[taskDetail.status] || "default"}
                  style={{ marginLeft: 8 }}
                >
                  {labelMap[taskDetail.status] || taskDetail.status.toUpperCase()}
                </Tag>
              );
            })()}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={950}
      destroyOnClose
      style={{ top: 32 }}
    >
      <Spin spinning={loading || updating}>
        {taskDetail ? (
          <>
            {/* === Thanh tiến trình === */}
            <Divider style={{ margin: "12px 0" }}>Tiến trình nhiệm vụ</Divider>

            {isCancelled ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <CloseCircleOutlined style={{ fontSize: 40, color: "red" }} />
                <Title level={5} type="danger" style={{ marginTop: 8 }}>
                  Nhiệm vụ hoặc đơn hàng đã bị hủy
                </Title>
              </div>
            ) : (
              <Steps
                size="small"
                current={currentStatusIndex}
                responsive
                style={{ marginBottom: 12 }}
              >
                {taskSteps.map((st, index) => {
                  // === Lấy thời gian tương ứng cho từng mốc ===
                  let time = null;
                  if (st.key === "assigned") time = taskDetail?.createdAt;
                  if (st.key === "in_progress") time = taskDetail?.startedAt;
                  if (st.key === "completed") time = taskDetail?.completedAt;

                  const isDone =
                    index < currentStatusIndex ||
                    (st.key === "completed" && taskDetail?.status === "completed");
                  const isCurrent = index === currentStatusIndex;

                  // === Chọn màu icon ===
                  const iconColor = isDone || isCurrent ? "#52c41a" : "#d9d9d9";

                  return (
                    <Step
                      key={st.key}
                      title={
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                          }}
                        >
                          <span>{st.label}</span>
                          {time && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(time).toLocaleString("vi-VN")}
                            </Text>
                          )}
                        </div>
                      }
                      icon={
                        <CheckCircleOutlined
                          style={{
                            fontSize: 18,
                            color: iconColor,
                          }}
                        />
                      }
                      status={isCurrent ? "process" : isDone ? "finish" : "wait"}
                    />
                  );
                })}
              </Steps>
            )}

            {/* === Nút hành động === */}
            {!isCancelled && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                {userRole === "picker" && taskDetail?.status === "assigned" && (
                  <Popconfirm
                    title="Bắt đầu làm nhiệm vụ?"
                    onConfirm={() => handleUpdateStatus("in_progress")}
                  >
                    <Button type="primary" icon={<PlayCircleOutlined />} loading={updating}>
                      Bắt đầu làm
                    </Button>
                  </Popconfirm>
                )}

                {userRole === "picker" && taskDetail?.status === "in_progress" && (
                  <Popconfirm
                    title="Gửi yêu cầu duyệt nhiệm vụ?"
                    okText="Gửi duyệt"
                    cancelText="Hủy"
                    onConfirm={() => handleUpdateStatus("pending_review")}
                  >
                    <Button type="primary" icon={<SendOutlined />} loading={updating}>
                      Yêu cầu duyệt
                    </Button>
                  </Popconfirm>
                )}
              </div>
            )}

            {/* === Supervisor / Admin duyệt nhiệm vụ === */}
            {!isCancelled && userRole !== "picker" && taskDetail?.status === "pending_review" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <Input.TextArea
                  placeholder="Nhập lý do (bắt buộc nếu từ chối)"
                  rows={2}
                  style={{ width: "100%" }}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                />

                <Space>
                  <Popconfirm
                    title="Xác nhận duyệt nhiệm vụ?"
                    okText="Duyệt"
                    cancelText="Hủy"
                    onConfirm={() => handleReviewTask("confirmed")}
                  >
                    <Button type="primary" icon={<CheckCircleOutlined />} loading={updating}>
                      Duyệt
                    </Button>
                  </Popconfirm>

                  <Popconfirm
                    title="Từ chối nhiệm vụ này?"
                    description="Nhiệm vụ sẽ bị trả lại, yêu cầu nhập lý do rõ ràng."
                    okText="Từ chối"
                    cancelText="Hủy"
                    onConfirm={() => {
                      if (!reviewReason.trim()) {
                        notification.warning({
                          message: "Vui lòng nhập lý do từ chối trước khi gửi!",
                        });
                        return;
                      }
                      handleReviewTask("rejected");
                    }}
                  >
                    <Button danger icon={<CloseCircleOutlined />} loading={updating}>
                      Từ chối
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            )}

            {/* === Tabs chính === */}
            <Divider style={{ margin: "16px 0" }} />
            <Tabs
              defaultActiveKey="detail"
              items={[
                {
                  key: "detail",
                  label: "Thông tin nhiệm vụ",
                  children: (
                    <div className="taskDetailModal-grid">
                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Mã đơn hàng:</Text>
                        <div className="lot-detail-value">
                          <Tag color="blue">{orderDetail?.orderNo || "Không rõ"}</Tag>
                        </div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Người giám sát:</Text>
                        <div className="lot-detail-value">
                          <Space>
                            <UserOutlined />
                            {taskDetail.supervisorName || "Không có"}
                          </Space>
                        </div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Người đóng gói:</Text>
                        <div className="lot-detail-value">
                          <Space>
                            <TeamOutlined />
                            {taskDetail.packerName || "Không có"}
                          </Space>
                        </div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Hạn chót:</Text>
                        <div className="lot-detail-value">
                          <Space>
                            <CalendarOutlined />
                            {taskDetail.deadline
                              ? new Date(taskDetail.deadline).toLocaleString("vi-VN")
                              : "—"}
                          </Space>
                        </div>
                      </LiquidGlassPanel>
                    </div>
                  ),
                },
                {
                  key: "items",
                  label: "Danh sách sản phẩm",
                  children: (
                    <Table
                      columns={columns}
                      dataSource={taskItems}
                      rowKey={(record) => record.id}
                      size="small"
                      bordered
                      pagination={{ pageSize: 6 }}
                      scroll={{ x: "max-content" }}
                    />
                  ),
                },
                {
                  key: "order",
                  label: "Thông tin đơn hàng",
                  children: orderDetail ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                      }}
                    >
                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Mã đơn hàng:</Text>
                        <div className="lot-detail-value">
                          <Tag color="blue">{orderDetail.orderNo}</Tag>
                        </div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Trạng thái đơn hàng:</Text>
                        <div className="lot-detail-value">
                          {renderStatusTag(orderDetail.status) || "Không rõ"}
                        </div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Khách hàng:</Text>
                        <div className="lot-detail-value">
                          <Space>
                            <ShoppingCartOutlined />
                            {orderDetail.customerName || "Không có"}
                          </Space>
                        </div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Số điện thoại:</Text>
                        <div className="lot-detail-value">{orderDetail.phone || "—"}</div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Địa chỉ giao hàng:</Text>
                        <div className="lot-detail-value">{orderDetail.address || "—"}</div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Kho giao hàng:</Text>
                        <div className="lot-detail-value">{orderDetail.departmentName || "—"}</div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Thời gian giao hàng dự kiến:</Text>
                        <div className="lot-detail-value">
                          {orderDetail.slaDeliveryAt
                            ? new Date(orderDetail.slaDeliveryAt).toLocaleString("vi-VN")
                            : "—"}
                        </div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel padding={12} radius={12}>
                        <Text type="secondary">Ngày tạo đơn:</Text>
                        <div className="lot-detail-value">
                          {orderDetail.createdAt
                            ? new Date(orderDetail.createdAt).toLocaleString("vi-VN")
                            : "—"}
                        </div>
                      </LiquidGlassPanel>

                      <LiquidGlassPanel
                        padding={12}
                        radius={12}
                        style={{ gridColumn: "1 / span 2" }} // Gộp full 2 cột
                      >
                        <Text type="secondary">Ghi chú:</Text>
                        <div className="lot-detail-value">{orderDetail.note || "Không có"}</div>
                      </LiquidGlassPanel>
                    </div>
                  ) : (
                    <Text type="secondary">Không có thông tin đơn hàng</Text>
                  ),
                },
                ...(taskDetail?.review
                  ? [
                      {
                        key: "review",
                        label: "Đánh giá",
                        children: (
                          <div style={{ padding: "12px 8px" }}>
                            <Row gutter={[16, 16]}>
                              <Col xs={24} sm={8}>
                                <LiquidGlassPanel padding={12} radius={12}>
                                  <Text type="secondary">Kết quả đánh giá:</Text>
                                  <div className="lot-detail-value">
                                    <Tag
                                      color={
                                        taskDetail.review.result === "confirmed"
                                          ? "green"
                                          : taskDetail.review.result === "rejected"
                                            ? "red"
                                            : "orange"
                                      }
                                    >
                                      {taskDetail.review.result === "confirmed"
                                        ? "Đã duyệt"
                                        : taskDetail.review.result === "rejected"
                                          ? "Từ chối"
                                          : "Đang chờ duyệt"}
                                    </Tag>
                                  </div>
                                </LiquidGlassPanel>
                              </Col>

                              <Col xs={24} sm={8}>
                                <LiquidGlassPanel padding={12} radius={12}>
                                  <Text type="secondary">Người đánh giá:</Text>
                                  <div className="lot-detail-value">
                                    {taskDetail.review.reviewerName || "Không rõ"}
                                  </div>
                                </LiquidGlassPanel>
                              </Col>

                              <Col xs={24} sm={8}>
                                <LiquidGlassPanel padding={12} radius={12}>
                                  <Text type="secondary">Thời gian đánh giá:</Text>
                                  <div className="lot-detail-value">
                                    {taskDetail.review.updatedAt
                                      ? new Date(taskDetail.review.updatedAt).toLocaleString(
                                          "vi-VN"
                                        )
                                      : "Không rõ"}
                                  </div>
                                </LiquidGlassPanel>
                              </Col>

                              {/* Hàng thứ hai: lý do */}
                              <Col span={24}>
                                <LiquidGlassPanel padding={12} radius={12}>
                                  <Text type="secondary">Lý do / Ghi chú:</Text>
                                  <div className="lot-detail-value">
                                    {taskDetail.review.reason || "Không có ghi chú"}
                                  </div>
                                </LiquidGlassPanel>
                              </Col>
                            </Row>
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />

            <UpdateTaskItemModal
              visible={updateModalVisible}
              onCancel={() => setUpdateModalVisible(false)}
              item={currentItem}
              task={taskDetail}
              onSuccess={async () => {
                const refreshed = await dispatch(fetchTaskById(taskDetail.id)).unwrap();
                setTaskDetail(refreshed?.data || refreshed);
                setTaskItems(refreshed?.items || refreshed?.data?.items || []);
              }}
            />
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <WarningOutlined style={{ fontSize: 40, color: "#aaa" }} />
            <Title level={5} type="secondary" style={{ marginTop: 12 }}>
              Không có dữ liệu nhiệm vụ
            </Title>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default TaskDetailModal;
