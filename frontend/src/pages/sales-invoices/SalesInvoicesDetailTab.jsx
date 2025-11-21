import React, { useEffect, useRef, useState } from "react";

import { EditOutlined, PlusOutlined, PrinterOutlined, QrcodeOutlined } from "@ant-design/icons";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import { fetchSalesInvoiceByOrderId } from "@src/store/salesInvoicesSlice";
import {
  Button,
  Col,
  Divider,
  Empty,
  Form,
  Image,
  InputNumber,
  Modal,
  Row,
  Skeleton,
  Table,
  Tag,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";

import PaymentPage from "../PaymentPage";
import AddSalesInvoicesModal from "./AddSalesInvoicesModal";
import EditSalesInvoicesModal from "./EditSalesInvoicesModal";
import SalesInvoicePrintView from "./SalesInvoicePrintView";

const { Text, Title } = Typography;
function SalesInvoicesDetailTab({ orderId, orderNo, orderItems = [] }) {
  const salesInvoicesByOrderId = useSelector((state) => state.salesInvoices.salesInvoiceByOrderId);
  const fetchByOrderIdStatus = useSelector((state) => state.salesInvoices.fetchByOrderIdStatus);
  const fetchByOrderIdError = useSelector((state) => state.salesInvoices.fetchByOrderIdError);
  const userRole = useSelector((state) => state.auth.user?.role);
  const isLoading = fetchByOrderIdStatus === "loading";
  const isFailed = fetchByOrderIdStatus === "failed";
  const [amountValue, setAmountValue] = useState(null);
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchSalesInvoiceByOrderId(orderId));
  }, [dispatch, orderId]);
  // In hóa đơn
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: salesInvoicesByOrderId?.invoiceNo || "Invoice",
    pageStyle: `
    @page {
      size: 80mm auto;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      background: #fff;
    }
  `,
  });

  const statusColor = {
    open: { color: "green", text: "Đang mở" },
    paid: { color: "blue", text: "Đã thanh toán" },
    cancelled: { color: "red", text: "Đã hủy" },
    draft: { color: "orange", text: "Nháp" },
  };

  // format tiền
  const formatCurrency = (v) =>
    typeof v === "number" ? v.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) : "-";
  // format thuế -> %
  const formatTax = (v) => (typeof v === "number" ? `${parseFloat((v * 100).toFixed(2))}%` : "-");
  // format date dd/mm/yyyy
  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString("vi-VN") : "Chưa có";
  const productColumns = [
    {
      title: "Ảnh sản phẩm",
      dataIndex: "imgUrl",
      key: "image",
      width: 130,
      render: (imgUrl) =>
        imgUrl ? (
          <Image src={imgUrl} alt="Product" style={{ width: "100%", height: "auto" }} />
        ) : (
          <div style={{ width: "100%", height: 60, background: "#f5f5f5" }} />
        ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "Mã SKU",
      dataIndex: "skuCode",
      key: "skuCode",
      width: 120,
      render: (skuCode) => <Tag color="blue">{skuCode}</Tag>,
    },
    {
      title: "Số lượng",
      dataIndex: "qty",
      key: "qty",
      width: 100,
    },
    {
      title: "Số lượng đã soạn",
      dataIndex: "postQty",
      key: "postQty",
      width: 120,
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      render: (unitPrice) => formatCurrency(unitPrice),
    },
  ];
  const handleEditSalesInvoices = () => {
    setEditModalVisible(true);
  };
  const total = Number(salesInvoicesByOrderId?.remainingReceivables || 0);

  const handleSubmit = (values) => {
    if (values.amount > Math.round(total)) {
      notification.warning({
        message: "Số tiền thanh toán không được vượt quá tổng tiền giao dịch!",
      });
      return;
    }
    setAmountValue(values.amount);
    setIsQRModalVisible(true);
  };
  useEffect(() => {
    if (salesInvoicesByOrderId) {
      // round to nearest integer (57536.64 -> 57537)
      form.setFieldsValue({
        amount: Math.round(total),
      });
    }
  }, [salesInvoicesByOrderId, form]);
  return (
    <div>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Skeleton />
        </div>
      ) : (
        <>
          {salesInvoicesByOrderId ? (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                <Title level={4} style={{ margin: 0 }}>
                  Thông tin hóa đơn bán hàng liên quan đến đơn hàng
                </Title>
                <div>
                  {userRole === "admin" && (
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={() => handleEditSalesInvoices()}
                    >
                      Cập nhật hóa đơn
                    </Button>
                  )}
                  {/* chỉ khi status là "paid" trở đi */}
                  <Button
                    type="default"
                    className="mx-2"
                    onClick={handlePrint}
                    icon={<PrinterOutlined />}
                  >
                    In hóa đơn
                  </Button>
                </div>
              </div>
              <div className="mb-3">
                <Form form={form} layout="inline" onFinish={handleSubmit}>
                  <Form.Item
                    name="amount"
                    label="Thanh toán"
                    rules={[{ required: true, message: "Vui lòng nhập số tiền thanh toán!" }]}
                  >
                    <InputNumber
                      placeholder="Nhập số tiền..."
                      min={0}
                      step={1}
                      style={{ width: "100%" }}
                      addonAfter="VNĐ"
                      formatter={(value) =>
                        value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                      }
                      parser={(value) => (value ? value.replace(/\./g, "") : "")}
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<QrcodeOutlined />}>
                      QR
                    </Button>
                  </Form.Item>
                </Form>
              </div>

              <Row gutter={[24, 16]}>
                <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Mã hóa đơn:</Text>
                    <br />
                    <Tag color="cyan">{salesInvoicesByOrderId.invoiceNo}</Tag>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Mã đơn hàng:</Text>
                    <br />
                    <Tag color="gold">{salesInvoicesByOrderId.orderNo}</Tag>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Tên doanh nghiệp:</Text>
                    <br />
                    <Tag color="magenta">{salesInvoicesByOrderId.customerName}</Tag>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Trạng thái:</Text>
                    <br />
                    <Tag color={statusColor[salesInvoicesByOrderId.status]?.color || "default"}>
                      {statusColor[salesInvoicesByOrderId.status]?.text ||
                        salesInvoicesByOrderId.status}
                    </Tag>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Thanh toán gần nhất:</Text>
                    <br />
                    <Text>{formatDate(salesInvoicesByOrderId.lastPaymentAt)}</Text>
                  </LiquidGlassPanel>
                </Col>
                <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Thuế:</Text>
                    <br />
                    <Text>{formatTax(salesInvoicesByOrderId.taxAmount)}</Text>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <div className="flex items-center">
                      <div>
                        <Text strong>Chiết khấu:</Text>
                        <br />
                        <Text>{formatCurrency(salesInvoicesByOrderId.discountAmount)}</Text>
                      </div>
                      <Divider type="vertical" style={{ height: "40px", margin: "0 16px" }} />
                      <div>
                        <Text strong>Phụ phí:</Text>
                        <br />
                        <Text>{formatCurrency(salesInvoicesByOrderId.surcharge)}</Text>
                      </div>
                    </div>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Tổng tiền đã thu vào:</Text>
                    <br />
                    <Text>{formatCurrency(salesInvoicesByOrderId.receivedIn)}</Text>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Tổng giá trị hàng trả đã được duyệt:</Text>
                    <br />
                    <Text>{formatCurrency(salesInvoicesByOrderId.approvedReturns)}</Text>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <div className="flex items-center">
                      <div>
                        <Text strong>Ngày tạo:</Text>
                        <br />
                        <Text>{formatDate(salesInvoicesByOrderId.createdAt)}</Text>
                      </div>
                      <Divider type="vertical" style={{ height: "40px", margin: "0 16px" }} />
                      <div>
                        <Text strong>Ngày cập nhật:</Text>
                        <br />
                        <Text>{formatDate(salesInvoicesByOrderId.updatedAt)}</Text>
                      </div>
                    </div>
                  </LiquidGlassPanel>
                </Col>
                <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Tổng tiền:</Text>
                    <br />
                    <Text>{formatCurrency(salesInvoicesByOrderId.subtotal)}</Text>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Tổng thanh toán:</Text>
                    <br />
                    <Text>{formatCurrency(salesInvoicesByOrderId.total)}</Text>
                  </LiquidGlassPanel>
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Công nợ còn lại:</Text>
                    <br />
                    <Text>{formatCurrency(salesInvoicesByOrderId.remainingReceivables)}</Text>
                  </LiquidGlassPanel>
                  {/* <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Số tiền dự kiến thu:</Text>
                    <br />
                    <Text>{formatCurrency(salesInvoicesByOrderId.expectedReceivables)}</Text>
                  </LiquidGlassPanel> */}
                  <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Tổng tiền đã hoàn trả:</Text>
                    <br />
                    <Text>{formatCurrency(salesInvoicesByOrderId.refundedOut)}</Text>
                  </LiquidGlassPanel>
                  {/* <LiquidGlassPanel padding={12} radius={12} style={{ marginBottom: 16 }}>
                    <Text strong>Số tiền hoàn trả còn lại:</Text>
                    <br />
                    <Text>
                      {formatCurrency(
                        salesInvoicesByOrderId.approvedReturns - salesInvoicesByOrderId.refundedOut
                      )}
                    </Text>
                  </LiquidGlassPanel> */}
                </Col>
              </Row>
              <Table
                bordered
                columns={productColumns}
                dataSource={salesInvoicesByOrderId?.items?.map((it, idx) => ({
                  key: it.id || idx,
                  ...it,
                }))}
                pagination={false}
                scroll={{ x: 600 }}
              />
              {/* Modal edit */}
              <EditSalesInvoicesModal
                visible={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onSuccess={() => {
                  setEditModalVisible(false);
                  dispatch(fetchSalesInvoiceByOrderId(orderId));
                }}
                salesInvoiceData={salesInvoicesByOrderId}
              />
              {/* Modal QR Code */}
              <Modal
                // title="Mã QR Thanh Toán"
                width={700}
                open={isQRModalVisible}
                footer={null}
                centered
                onCancel={() => setIsQRModalVisible(false)}
              >
                <PaymentPage amount={amountValue} code={salesInvoicesByOrderId.invoiceNo} />
              </Modal>
            </>
          ) : (
            <>
              {/* chỉ có admin và accountant mới được cập nhật */}
              {(userRole === "admin" || userRole === "accountant") && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="middle"
                    disabled={isLoading}
                    onClick={() => setIsAddModalVisible(true)}
                  >
                    Thêm hóa đơn
                  </Button>
                </div>
              )}
              <div style={{ textAlign: "center", padding: 24 }}>
                <Empty description="Không tìm thấy hóa đơn bán hàng liên quan đến đơn hàng này." />
              </div>
              <AddSalesInvoicesModal
                visible={isAddModalVisible}
                onCancel={() => setIsAddModalVisible(false)}
                onSuccess={() => {
                  setIsAddModalVisible(false);
                  dispatch(fetchSalesInvoiceByOrderId(orderId));
                }}
                orderId={orderId}
                orderNo={orderNo}
                orderItems={orderItems}
              />
            </>
          )}
        </>
      )}
      {isFailed && (
        <div style={{ textAlign: "center", padding: 24, color: "red" }}>
          Lỗi khi tải hóa đơn bán hàng: {fetchByOrderIdError?.message || "Lỗi không xác định"}
        </div>
      )}
      <div style={{ visibility: "hidden", position: "absolute", top: "-9999px" }}>
        <SalesInvoicePrintView
          ref={printRef}
          salesInvoice={salesInvoicesByOrderId}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatTax={formatTax}
          productColumns={productColumns}
          statusColor={statusColor}
        />
      </div>
    </div>
  );
}

export default SalesInvoicesDetailTab;
