import React, { useEffect, useRef, useState } from "react";

import { CreditCardOutlined, PlusOutlined } from "@ant-design/icons";
import SupTransactionPaymentForm from "@src/pages/supTransactionPayment/SupTransactionPaymentForm";
import apiClient from "@src/services/apiClient";
import { listUsers } from "@src/services/userService";
import {
  createSupTransactionPayment,
  fetchAllPaymentsByTransactionId,
} from "@src/store/supTransactionPaymentSlice";
import {
  Button,
  Form,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const SupplierTransactionPaymentTab = ({ transactionId, transactionData }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // User states for form
  const [userOptions, setUserOptions] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  // Upload states for form
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const { supTransactionPayments, fetchStatus } = useSelector(
    (state) => state.supTransactionPayment
  );

  const isPaymentLoading = fetchStatus === "loading";
  const payments = supTransactionPayments?.data || [];
  const userPageRef = useRef(0);
  const userHasMoreRef = useRef(true);
  const userSearchRef = useRef("");
  /** === Fetch payment data when transactionId changes === */
  useEffect(() => {
    if (transactionId) {
      dispatch(fetchAllPaymentsByTransactionId(transactionId))
        .unwrap()
        .catch(() =>
          notification.warning({
            message: "Không thể tải lịch sử thanh toán",
          })
        );
    }
  }, [transactionId, dispatch]);
  const uploadImageToR2 = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.url) {
        return response.data.url;
      } else {
        throw new Error("Upload failed - no URL returned");
      }
    } catch (error) {
      throw error;
    }
  };
  /** === Form handlers === */
  const handleSubmit = async (values) => {
    setIsLoading(true);
    try {
      let evdUrl = "";

      // Upload image if exists
      if (fileList.length > 0 && fileList[0].originFileObj) {
        setIsUploading(true);
        const hideUploadMsg = message.loading("Đang upload ảnh chứng từ...", 0);

        try {
          evdUrl = await uploadImageToR2(fileList[0].originFileObj);
          hideUploadMsg();
          setIsUploading(false);
        } catch (uploadError) {
          hideUploadMsg();
          setIsUploading(false);
          notification.error({
            message: "Lỗi upload ảnh",
            description:
              uploadError.response?.data?.message || uploadError.message || "Không thể upload ảnh",
            duration: 5,
          });
          setIsLoading(false);
          return;
        }
      }

      // Prepare payment data
      const paymentData = {
        transId: transactionId, // Use pre-selected transaction ID
        amount: parseFloat(values.amount),
        paidAt: values.paidAt.toISOString(),
        paidBy: values.paidBy,
        evdUrl,
        note: values.note || null,
      };
      const amountToPay = transactionData?.totalAmount - (transactionData?.paidAmount || 0);
      if (paymentData.amount > amountToPay) {
        notification.warning({
          message: "Số tiền thanh toán vượt quá số tiền cần thanh toán",
          description: `Số tiền cần thanh toán là ${formatCurrency(amountToPay)}`,
          duration: 5,
        });
        setIsLoading(false);
        return;
      }

      // Create payment
      await dispatch(createSupTransactionPayment(paymentData)).unwrap();

      notification.success({
        message: "Tạo thanh toán thành công",
        description: "Thanh toán đã được thêm vào hệ thống.",
        duration: 5,
      });

      // Reset form and close modal
      form.resetFields();
      setFileList([]);
      setIsPaymentModalVisible(false);

      // Refresh payment data
      if (transactionId) {
        dispatch(fetchAllPaymentsByTransactionId(transactionId));
      }
    } catch (error) {
      notification.error({
        message: "Tạo thanh toán thất bại",
        description: error || "Không thể tạo thanh toán",
        duration: 5,
      });
    } finally {
      setIsLoading(false);
    }
  };
  const isFormLoading = isLoading || isUploading;
  // Search debounce
  const userSearchTimer = useRef();

  const handleUserSearch = (value) => {
    userSearchRef.current = value;
    clearTimeout(userSearchTimer.current);
    userSearchTimer.current = setTimeout(() => {
      fetchUsers(value, false);
    }, 400);
  };

  const handleUserPopupScroll = (e) => {
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!userLoading && userHasMoreRef.current) {
        fetchUsers(userSearchRef.current, true);
      }
    }
  };

  const fetchUsers = async (q = "", append = false) => {
    if (!userHasMoreRef.current && append) return;
    setUserLoading(true);
    const limit = 20;
    const offset = append ? (userPageRef.current + 1) * limit : 0;
    try {
      const res = await listUsers({ q, limit, offset });
      const payload = res.data || {};
      const items = payload.data || [];
      const pagination = payload.pagination || {};
      userHasMoreRef.current = !!pagination.hasMore;
      userPageRef.current = append ? userPageRef.current + 1 : 0;
      const mapped = items.map((u) => ({
        value: u.name || u.id,
        label: `${u.username} — ${u.fullName}`,
        raw: u,
      }));
      setUserOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
    } finally {
      setUserLoading(false);
    }
  };

  const handleChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handlePreview = async (file) => {
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
  };

  const handleRemove = () => {
    setFileList([]);
  };

  /** === Helpers === */
  const formatCurrency = (value) => {
    if (typeof value !== "number") return "0 ₫";
    return value.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /** === Columns === */
  const paymentColumns = [
    {
      title: "Số chứng từ",
      dataIndex: "docNo",
      key: "docNo",
      width: 160,
      render: (text) => (
        <Tag color="purple" style={{ cursor: "pointer" }}>
          {text || "N/A"}
        </Tag>
      ),
    },
    {
      title: "Số tiền thanh toán",
      dataIndex: "amount",
      key: "amount",
      width: 180,
      render: (value) => <Tag color="green">{formatCurrency(value)}</Tag>,
    },
    {
      title: "Ngày thanh toán",
      dataIndex: "paidAt",
      key: "paidAt",
      width: 180,
      render: (text) => formatDate(text),
    },
    {
      title: "Người thanh toán",
      dataIndex: "paidByName",
      key: "paidByName",
      width: 180,
      ellipsis: true,
      render: (val) => val || <Text type="secondary">Không rõ</Text>,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (text) => text || <span style={{ color: "#999" }}>Không có</span>,
    },
  ];

  const handleRowClick = (record) => {
    navigate("/payment/supplier-transaction-payment", {
      state: {
        selectedPayment: record,
      },
    });
  };

  const handleAddPayment = () => {
    setIsPaymentModalVisible(true);
    form.resetFields();
    setFileList([]);
  };

  const handleCancelForm = () => {
    setIsPaymentModalVisible(false);
    form.resetFields();
    setFileList([]);
  };

  return (
    <>
      <Spin spinning={isPaymentLoading}>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <Table
            columns={paymentColumns}
            dataSource={payments.map((p, index) => ({ ...p, key: p.id || `payment-${index}` }))}
            pagination={false}
            size="small"
            bordered
            locale={{
              emptyText: "Chưa có lịch sử thanh toán",
            }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              onMouseEnter: (e) => (e.currentTarget.style.backgroundColor = "#fafafa"),
              onMouseLeave: (e) => (e.currentTarget.style.backgroundColor = ""),
              title: "Bấm để xem chi tiết",
              style: { cursor: "pointer" },
            })}
          />
        </div>
        {/* Khi status là paid thì sẽ ẩn nút */}
        {transactionData.status === "paid" ? null : (
          <div style={{ marginTop: 10 }}>
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddPayment}>
              Thêm thanh toán
            </Button>
          </div>
        )}
      </Spin>

      {/* Modal chứa form thanh toán */}
      <Modal
        title={
          <Space>
            <CreditCardOutlined />
            <span style={{ fontSize: "18px" }}>Thêm thanh toán mới</span>
          </Space>
        }
        open={isPaymentModalVisible}
        onCancel={handleCancelForm}
        footer={null}
        width={600}
        centered
        maskClosable={!isLoading}
        destroyOnHidden
      >
        <SupTransactionPaymentForm
          form={form}
          isLoading={isFormLoading}
          handleSubmit={handleSubmit}
          onCancel={handleCancelForm}
          transactionId={transactionId}
          transactionData={transactionData}
          userOptions={userOptions}
          userLoading={userLoading}
          handleUserSearch={handleUserSearch}
          handleUserPopupScroll={handleUserPopupScroll}
          fetchUsers={fetchUsers}
          fileList={fileList}
          handleChange={handleChange}
          handlePreview={handlePreview}
          handleRemove={handleRemove}
          previewImage={previewImage}
          previewOpen={previewOpen}
          setPreviewImage={setPreviewImage}
          setPreviewOpen={setPreviewOpen}
        />
      </Modal>
    </>
  );
};

export default SupplierTransactionPaymentTab;
