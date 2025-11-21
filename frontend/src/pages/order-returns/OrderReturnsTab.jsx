import React, { useEffect, useState } from "react";

import { EditOutlined, PlusOutlined, ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import "@assets/orderReturns/OrderReturns.css";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import { fetchOrderReturnsByOrderId } from "@src/store/OrderReturnsSlice";
import {
  Button,
  Col,
  Divider,
  Empty,
  Image,
  Row,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { data } from "react-router-dom";

import AddOrderReturnsModal from "./AddOrderReturnsModal";
import EditOrderReturnsModal from "./EditOrderReturnsModal";

const { Text, Title } = Typography;
function OrderReturnsTab({ orderId, orderNo }) {
  //orderReturnsByOrderId: {};
  const orderReturnsByOrderId = useSelector((state) => state.orderReturns.orderReturnsByOrderId);
  const fetchStatus = useSelector((state) => state.orderReturns.fetchStatus);
  const fetchError = useSelector((state) => state.orderReturns.fetchError);
  const userRole = useSelector((state) => state.auth.user?.role);
  const dispatch = useDispatch();

  const isLoading = fetchStatus === "loading";
  const isFailed = fetchStatus === "failed";
  const isIdle = fetchStatus === "idle";

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  useEffect(() => {
    dispatch(fetchOrderReturnsByOrderId(orderId));
  }, [dispatch, orderId]);
  const handleRefreshData = () => {
    dispatch(fetchOrderReturnsByOrderId(orderId));
  };
  const statusMap = {
    draft: { color: "default", text: "Nháp" },
    pending: { color: "orange", text: "Chờ xử lý" },
    paid: { color: "green", text: "Đã thanh toán" },
    cancelled: { color: "red", text: "Đã hủy" },
  };
  const formatCurrency = (v) =>
    typeof v === "number" ? v.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) : "-";
  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString("vi-VN") : "Chưa có";
  const productColumns = [
    {
      title: "Ảnh sản phẩm",
      dataIndex: "imgUrl",
      key: "imgUrl",
      width: 120,
      render: (imgUrl) =>
        imgUrl ? (
          <Image
            src={imgUrl}
            alt="Ảnh sản phẩm"
            width="100%"
            height="auto"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: 60, background: "#f5f5f5" }} />
        ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Mã SKU",
      dataIndex: "skuCode",
      key: "skuCode",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Số lượng",
      dataIndex: "qty",
      key: "qty",
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 140,
      render: (text) => <Text>{formatCurrency(text)}</Text>,
    },
    {
      title: "Đơn vị đóng gói",
      dataIndex: "packUnit",
      key: "packUnit",
      width: 100,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Đơn vị chính",
      dataIndex: "mainUnit",
      key: "mainUnit",
      width: 80,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Thành tiền",
      dataIndex: "totalPrice",
      key: "totalPrice",
      width: 140,
      render: (text) => <Text>{formatCurrency(text)}</Text>,
    },
  ];
  return (
    <>
      {/* Loading state */}
      {isIdle || isLoading ? (
        <div className="orderReturns-loadingContainer">
          <Skeleton />
        </div>
      ) : (
        <>
          {orderReturnsByOrderId ? (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                <Title level={4} style={{ margin: 0 }}>
                  Thông tin đơn trả hàng
                </Title>
                {(userRole === "admin" || userRole === "accountant" || userRole === "seller") && (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    size="middle"
                    onClick={() => setEditModalVisible(true)}
                  >
                    Cập nhật đơn trả hàng
                  </Button>
                )}
                {/* Modal cập nhật */}
                <EditOrderReturnsModal
                  visible={editModalVisible}
                  onCancel={() => setEditModalVisible(false)}
                  onSuccess={() => {
                    setEditModalVisible(false);
                    dispatch(fetchOrderReturnsByOrderId(orderId));
                  }}
                  orderReturnData={orderReturnsByOrderId}
                  orderId={orderId}
                />
              </div>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                  <Image src={orderReturnsByOrderId.evdUrl} alt="Bằng chứng trả hàng" />
                </Col>
                <Col xs={24} sm={24} md={12} lg={16} xl={16}>
                  {/* Thông tin trả hàng */}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                      <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                        <Text strong>Mã khách hàng:</Text>
                        <br />
                        <Tag color="success">{orderReturnsByOrderId.customerCode}</Tag>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                        <Text strong>Tên doanh nghiệp khách hàng:</Text>
                        <br />
                        <Tag color="cyan">{orderReturnsByOrderId.customerName}</Tag>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                        <Text strong>Người tạo đơn trả hàng:</Text>
                        <br />
                        <Tag color="blue">{orderReturnsByOrderId.createdByName}</Tag>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                        <Text strong>Trạng thái đơn trả hàng:</Text>
                        <br />
                        <Tag color={statusMap[orderReturnsByOrderId.status]?.color || "default"}>
                          {statusMap[orderReturnsByOrderId.status]?.text ||
                            orderReturnsByOrderId.status}
                        </Tag>
                      </LiquidGlassPanel>
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                      <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                        <Text strong>Tổng tiền trả hàng:</Text>
                        <br />
                        <Text>{formatCurrency(orderReturnsByOrderId.totalAmount)}</Text>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                        <Text strong>Ngày tạo đơn: </Text>
                        <br />
                        <Text>{formatDate(orderReturnsByOrderId.createdAt)}</Text>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                        <Text strong>Ngày cập nhật đơn lần cuối: </Text>
                        <br />
                        <Text>{formatDate(orderReturnsByOrderId.updatedAt)}</Text>
                      </LiquidGlassPanel>
                      <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                        <Text strong>Ghi chú:</Text>
                        <br />
                        <Text>{orderReturnsByOrderId.note || "Không có ghi chú"}</Text>
                      </LiquidGlassPanel>
                    </Col>
                  </Row>
                </Col>
              </Row>
              {/* Danh sách sản phẩm trả hàng */}
              <Divider orientation="center">
                <Title level={5}>
                  Danh sách sản phẩm trả hàng ( {orderReturnsByOrderId?.items?.length || 0} )
                </Title>
              </Divider>
              <Table
                bordered
                dataSource={orderReturnsByOrderId?.items?.map((it, idx) => ({
                  ...it,
                  key: it.id || idx,
                }))}
                columns={productColumns}
                pagination={false}
                scroll={{ x: 600 }}
              />
            </>
          ) : (
            <>
              {(userRole === "admin" || userRole === "accountant" || userRole === "seller") && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="middle"
                    disabled={isLoading}
                    onClick={() => setIsAddModalVisible(true)}
                  >
                    Thêm hóa đơn trả hàng
                  </Button>
                </div>
              )}
              {/* Modal thêm mới */}
              <AddOrderReturnsModal
                visible={isAddModalVisible}
                onCancel={() => setIsAddModalVisible(false)}
                onSuccess={() => {
                  setIsAddModalVisible(false);
                  dispatch(fetchOrderReturnsByOrderId(orderId));
                }}
                orderId={orderId}
                orderNo={orderNo}
              />
              <div style={{ textAlign: "center", padding: 24 }}>
                <Empty description="Không tìm thấy đơn trả hàng liên quan đến đơn hàng này." />
              </div>
            </>
          )}
        </>
      )}
      {/* Error state */}
      {isFailed && (
        <div className="orderReturns-errorContainer">
          <div className="orderReturns-errorIconContainer">
            <WarningOutlined className="orderReturns-errorIcon" />
          </div>

          <div className="orderReturns-errorContent">
            <Text type="danger" className="orderReturns-errorTitle">
              Không thể tải dữ liệu
            </Text>
            <Text className="orderReturns-errorDescription">
              {fetchError || "Đã xảy ra lỗi khi tải thông tin đơn trả hàng. Vui lòng thử lại."}
            </Text>
          </div>

          <Space size="middle">
            <Button
              type="primary"
              size="large"
              onClick={handleRefreshData}
              icon={<ReloadOutlined />}
              className="orderReturns-retryButton"
            >
              Thử lại
            </Button>
            <Button
              size="large"
              onClick={() => window.location.reload()}
              className="orderReturns-reloadButton"
            >
              Tải lại trang
            </Button>
          </Space>
        </div>
      )}
    </>
  );
}

export default OrderReturnsTab;
