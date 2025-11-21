import React, { useEffect, useState } from "react";

import {
  ApartmentOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
  ShopOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { fetchSupplierTransactionById } from "@src/store/supplierTransactionCombineSlice";
import {
  Button,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import PaymentPage from "../PaymentPage";
import SupplierTransactionPaymentTab from "./SupplierTransactionPaymentTab";

const { Text, Title } = Typography;

const SupplierTransactionDetailModal = ({
  visible,
  onCancel,
  transactionId,
  defaultActiveTab = "detail",
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const {
    selectedTransaction: transaction,
    fetchStatus,
    fetchError,
  } = useSelector((state) => state.supplierTransactionCombined);
  const userRole = useSelector((state) => state.auth.user?.role);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const isLoading = fetchStatus === "loading";
  const isFailed = fetchStatus === "failed";
  const [amountValue, setAmountValue] = useState(null);

  // === Fetch transaction + payments ===
  useEffect(() => {
    if (visible && transactionId) {
      dispatch(fetchSupplierTransactionById(transactionId))
        .unwrap()
        .catch(() =>
          notification.warning({
            message: "Không thể tải lịch sử thanh toán",
          })
        );
    }
  }, [visible, transactionId, dispatch]);

  // === Màu sắc trạng thái ===
  const colorMap = {
    draft: "orange",
    paid: "green",
    pending: "gold",
    cancelled: "red",
  };

  const transColor = transaction?.type === "in" ? "green" : "red";
  const statusColor = colorMap[transaction?.status] || "default";

  // === Cột chi tiết sản phẩm ===
  const itemColumns = [
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      key: "productName",
      render: (text, record) => (
        <Space
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/products?productId=${record.productId}`)}
        >
          <ShoppingOutlined />
          <Text>{text || "Không rõ"}</Text>
        </Space>
      ),
    },
    {
      title: "Mã SKU",
      dataIndex: "skuCode",
      key: "skuCode",
      width: 160,
      render: (val, record) => (
        <Tag
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/products?productId=${record.productId}`)}
        >
          {val}
        </Tag>
      ),
    },
    {
      title: "Lô hàng",
      dataIndex: "lotNo",
      key: "lotNo",
      width: 160,
      render: (val, record) => (
        <Tag
          color="blue"
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/inventory-lot?lotId=${record.lotId}`)}
        >
          {val || "Không có"}
        </Tag>
      ),
    },
    {
      title: "HSD",
      dataIndex: "expiryDate",
      key: "expiryDate",
      width: 100,
      render: (val) => (val ? <Text>{new Date(val).toLocaleDateString("vi-VN")}</Text> : "-"),
    },
    {
      title: "Số lượng",
      dataIndex: "qty",
      key: "qty",
      align: "right",
      render: (val) => <Text>{Number(val || 0).toLocaleString("vi-VN")}</Text>,
    },
    {
      title: "Đơn giá (VNĐ)",
      dataIndex: "unitPrice",
      key: "unitPrice",
      align: "right",
      render: (val) => (
        <>
          {userRole === "manager"
            ? "*****"
            : val
              ? val.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
              : "-"}
        </>
      ),
    },
    {
      title: "Thành tiền (VNĐ)",
      dataIndex: "lineTotal",
      key: "lineTotal",
      align: "right",
      render: (val) => (
        <>
          {userRole === "manager"
            ? "*****"
            : val
              ? val.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
              : "-"}
        </>
      ),
    },
  ];
  const totalPayment = Math.round(transaction?.totalAmount - transaction?.paidAmount) || 0;
  const handleSubmit = (values) => {
    if (values.amount > totalPayment) {
      notification.warning({
        message: "Số tiền thanh toán không được vượt quá tổng tiền giao dịch!",
      });
      return;
    }
    setAmountValue(values.amount);
    setIsQRModalVisible(true);
  };
  useEffect(() => {
    if (transaction) {
      form.setFieldsValue({
        amount: totalPayment,
      });
    }
  }, [transaction, form]);

  return (
    <Modal
      title={
        transaction ? (
          <div className="invenLotManage-modalTitleContainer">
            <FileTextOutlined style={{ fontSize: 22, color: "#1677ff", flexShrink: 0 }} />
            <span className="invenLotManage-modalLotNo">
              Số chứng từ: {transaction.docNo || transaction.id}
            </span>
            <Tag color={statusColor} className="invenLotManage-modalDepartmentName">
              {transaction.status?.toUpperCase()}
            </Tag>
          </div>
        ) : (
          "Chi tiết giao dịch"
        )
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={950}
      style={{ top: 32 }}
    >
      <Spin spinning={isLoading}>
        {isFailed ? (
          <Text type="danger">
            Lỗi tải dữ liệu: {fetchError?.message || "Không thể tải chi tiết giao dịch."}
          </Text>
        ) : transaction ? (
          <Tabs
            defaultActiveKey={defaultActiveTab}
            items={[
              {
                key: "detail",
                label: "Thông tin chung",
                children: (
                  <>
                    <Descriptions bordered size="middle" column={2} style={{ marginBottom: 12 }}>
                      <Descriptions.Item label="Mã giao dịch">{transaction.id}</Descriptions.Item>
                      <Descriptions.Item label="Loại giao dịch">
                        <Tag color={transColor}>
                          {transaction.type === "in" ? "Nhập hàng" : "Trả hàng"}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Trạng thái">
                        <Tag color={statusColor}>{transaction.status}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Nhà cung cấp">
                        {transaction.supplierName ? (
                          <Space>
                            <ShopOutlined />
                            <Text>{transaction.supplierName}</Text>
                            <Tag>{transaction.supplierCode}</Tag>
                          </Space>
                        ) : (
                          "-"
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Kho / Cơ sở">
                        {transaction.departmentName ? (
                          <Space>
                            <ApartmentOutlined />
                            <Text>{transaction.departmentName}</Text>
                            <Tag color="blue">{transaction.departmentCode}</Tag>
                          </Space>
                        ) : (
                          "-"
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngày giao dịch">
                        {transaction.transDate
                          ? new Date(transaction.transDate).toLocaleDateString("vi-VN")
                          : "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Tổng tiền">
                        <Text strong style={{ color: "#1677ff" }}>
                          {userRole === "manager"
                            ? "*****"
                            : transaction.totalAmount?.toLocaleString("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              })}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngày đến hạn">
                        {transaction.dueDate
                          ? new Date(transaction.dueDate).toLocaleDateString("vi-VN")
                          : "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Đã thanh toán">
                        <Text strong style={{ color: "#52c41a" }}>
                          {userRole === "manager"
                            ? "*****"
                            : transaction.paidAmount?.toLocaleString("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              })}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Ghi chú">
                        {transaction.note || "-"}
                      </Descriptions.Item>
                    </Descriptions>

                    <Divider />
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                      <Title level={5} style={{ margin: 0 }}>
                        Tổng kết
                      </Title>
                      {transaction.type === "out" && (
                        <Form form={form} layout="inline" onFinish={handleSubmit}>
                          <Form.Item
                            name="amount"
                            rules={[
                              { required: true, message: "Vui lòng nhập số tiền thanh toán!" },
                            ]}
                          >
                            <InputNumber
                              placeholder="Nhập số tiền..."
                              min={0}
                              style={{ width: 250 }}
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
                      )}
                    </div>

                    {/* Modal QR Code */}
                    <Modal
                      // title="Mã QR Thanh Toán"
                      width={700}
                      open={isQRModalVisible}
                      footer={null}
                      centered
                      onCancel={() => setIsQRModalVisible(false)}
                    >
                      <PaymentPage amount={amountValue} code={transaction.docNo} />
                    </Modal>

                    <Descriptions bordered size="small" column={2}>
                      <Descriptions.Item label="Số mặt hàng">
                        {transaction.summary?.itemCount || 0}
                      </Descriptions.Item>

                      <Descriptions.Item label="Tổng giá trị tính toán">
                        <Text strong>
                          {userRole === "manager"
                            ? "*****"
                            : transaction.summary?.calculatedTotal?.toLocaleString("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              })}
                        </Text>
                      </Descriptions.Item>

                      <Descriptions.Item label="Ảnh hưởng tồn kho">
                        <Tag color="purple">
                          {transaction.summary?.inventoryImpact === "increase"
                            ? "Tăng tồn kho"
                            : "Giảm tồn kho"}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </>
                ),
              },
              {
                key: "items",
                label: "Chi tiết sản phẩm",
                children: (
                  <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                    <Table
                      columns={itemColumns}
                      dataSource={(transaction.items || []).map((i) => ({
                        ...i,
                        key: i.id,
                      }))}
                      pagination={false}
                      size="small"
                      bordered
                    />
                  </div>
                ),
              },
              {
                key: "payments",
                label: "Lịch sử thanh toán",
                children: (
                  <SupplierTransactionPaymentTab
                    transactionId={transactionId}
                    transactionData={transaction}
                  />
                ),
              },
            ]}
          />
        ) : (
          <Text>Không có dữ liệu giao dịch.</Text>
        )}
      </Spin>
    </Modal>
  );
};

export default SupplierTransactionDetailModal;
