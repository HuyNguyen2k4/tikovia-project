import React, { useEffect, useRef, useState } from "react";

import { CreditCardOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import "@assets/customerPayments/CustomerPaymentList.css";
import apiClient from "@src/services/apiClient";
import { getListCustomersWithInvoiceStats } from "@src/services/customerService";
import { getSalesInvoicesByCustomerAndStatus } from "@src/services/salesInvoicesService";
import { createPaymentCombined } from "@src/store/paymentsCombinedSlice";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tooltip,
  Typography,
  Upload,
  message,
  notification,
} from "antd";
import locale from "antd/es/date-picker/locale/vi_VN";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;
const { Option } = Select;

const AddCustomerPayment = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const createStatus = useSelector((state) => state.paymentsCombined.createPaymentStatus);
  const createError = useSelector((state) => state.paymentsCombined.createPaymentError);
  // const isLoading = createStatus === "loading";
  const [items, setItems] = useState([]);
  // Customer select
  const [customerOptions, setCustomerOptions] = useState([]);
  const customerPageRef = useRef(0);
  const customerHasMoreRef = useRef(true);
  const [customerLoading, setCustomerLoading] = useState(false);
  const customerSearchRef = useRef("");

  // Invoice select
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const invoicePageRef = useRef(0);
  const invoiceHasMoreRef = useRef(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const invoiceSearchRef = useRef("");

  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ paidAt: dayjs() });
      customerPageRef.current = 0;
      customerHasMoreRef.current = true;
      setCustomerOptions([]);

      invoicePageRef.current = 0;
      invoiceHasMoreRef.current = true;
      setInvoiceOptions([]);
      setItems([]);

      setFileList([]);
      setPreviewImage("");
      setPreviewOpen(false);
    }
  }, [visible, form]);
  /**Upload ảnh */
  // Convert file to base64 for preview
  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  // Xử lý khi upload thay đổi - CHỈ PREVIEW, CHƯA UPLOAD
  const handleChange = async ({ file, fileList: newFileList }) => {
    let limitedFileList = newFileList.filter((f) => f.originFileObj).slice(-1);

    if (limitedFileList.length > 0 && limitedFileList[0].originFileObj) {
      try {
        const preview = await getBase64(limitedFileList[0].originFileObj);
        limitedFileList[0].url = preview;
        limitedFileList[0].thumbUrl = preview;
        limitedFileList[0].status = "done";
      } catch (error) {
        console.error("Error generating preview:", error);
        limitedFileList[0].status = "error";
      }
    }

    setFileList(limitedFileList);
  };

  // Xử lý khi click xem ảnh
  const handlePreview = async (file) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview || file.thumbUrl);
    setPreviewOpen(true);
  };

  // Xử lý khi xóa file - CHỈ XÓA KHỎI UI, không cần gọi API vì chưa upload
  const handleRemove = (file) => {
    // console.log('Removing file from preview:', file.name);
    return true; // Allow removal from UI
  };

  // Upload ảnh lên R2
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
      console.error("Upload error:", error);
      throw error;
    }
  };

  const isLoading = createStatus === "loading" || isUploading;
  ///////////////////////////////////////////////
  // Fetch khách hàng
  const fetchCustomers = async (q = "", append = false) => {
    if (!customerHasMoreRef.current && append) return;
    setCustomerLoading(true);
    const limit = 20;
    const offset = append ? (customerPageRef.current + 1) * limit : 0;
    try {
      const res = await getListCustomersWithInvoiceStats({ q, limit, offset });
      const payload = res.data || {};
      const items = payload.data || [];
      const pagination = payload.pagination || {};
      customerHasMoreRef.current = !!pagination.hasMore;
      customerPageRef.current = append ? customerPageRef.current + 1 : 0;
      const mapped = items.map((u) => ({
        value: u.id,
        label: `${u.name} — ${u.code} (${u.invoiceStats?.totalCount || 0}) hóa đơn`,
        raw: u,
      }));
      setCustomerOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
    } finally {
      setCustomerLoading(false);
    }
  };

  //Fetch invoices
  const fetchInvoices = async (q = "", append = false) => {
    const customerId = form.getFieldValue("customerId");
    if (!customerId) {
      setInvoiceOptions([]);
      invoicePageRef.current = 0;
      invoiceHasMoreRef.current = true;
      return;
    }
    if (!invoiceHasMoreRef.current && append) return;
    setInvoiceLoading(true);
    const limit = 20;
    const offset = append ? (invoicePageRef.current + 1) * limit : 0;
    try {
      const res = await getSalesInvoicesByCustomerAndStatus({
        q,
        customerId: form.getFieldValue("customerId"),
        status: "open",
        limit,
        offset,
      });
      const payload = res.data || {};
      const items = payload.data || [];
      const pagination = payload.pagination || {};
      invoiceHasMoreRef.current = !!pagination.hasMore;
      invoicePageRef.current = append ? invoicePageRef.current + 1 : 0;
      const mapped = items.map((u) => ({
        value: u.id,
        label: `${u.invoiceNo}`,
        raw: u,
      }));
      setInvoiceOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Search debounce
  const customerSearchTimer = useRef();
  const invoiceSearchTimer = useRef();

  const handleCustomerSearch = (val) => {
    customerSearchRef.current = val;
    clearTimeout(customerSearchTimer.current);
    customerSearchTimer.current = setTimeout(() => {
      fetchCustomers(val, false);
    }, 400);
  };

  const handleCustomerPopupScroll = (e) => {
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!customerLoading && customerHasMoreRef.current) {
        fetchCustomers(customerSearchRef.current, true);
      }
    }
  };

  const handleInvoiceSearch = (val) => {
    invoiceSearchRef.current = val;
    clearTimeout(invoiceSearchTimer.current);
    invoiceSearchTimer.current = setTimeout(() => {
      fetchInvoices(val, false);
    }, 400);
  };
  const handleInvoicePopupScroll = (e) => {
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!invoiceLoading && invoiceHasMoreRef.current) {
        fetchInvoices(invoiceSearchRef.current, true);
      }
    }
  };
  const methodpaymentMap = {
    bank: { text: "Ngân hàng", color: "blue" },
    cash: { text: "Tiền mặt", color: "green" },
    cod: { text: "COD", color: "orange" },
  };
  const directionPaymentMap = {
    in: { text: "Thanh toán thu", color: "green" },
    out: { text: "Thanh toán chi", color: "red" },
  };

  const allocationPaymentColumns = [
    {
      title: "Hóa đơn",
      dataIndex: "invoiceId",
      key: "invoiceId",
      width: 230,
      render: (val, record, index) => {
        // Lấy danh sách invoiceId đã chọn ở các dòng khác
        const selectedInvoiceIds = items
          .map((item, idx) => (idx !== index ? item.invoiceId : null))
          .filter(Boolean);

        // Lọc option, chỉ giữ những hóa đơn chưa được chọn ở dòng khác hoặc là chính hóa đơn đang chọn
        const filteredOptions = invoiceOptions.filter(
          (opt) => !selectedInvoiceIds.includes(opt.value) || opt.value === val
        );

        return (
          <Select
            style={{ width: "100%" }}
            value={val}
            showSearch
            placeholder="Tìm hoặc chọn hóa đơn"
            filterOption={false}
            onSearch={handleInvoiceSearch}
            notFoundContent={
              invoiceLoading ? <Spin size="small" /> : <Empty description="Không có hóa đơn" />
            }
            onPopupScroll={handleInvoicePopupScroll}
            optionLabelProp="label"
            size="middle"
            allowClear
            onChange={(value) => handleItemChange(index, "invoiceId", value)}
            onFocus={() => {
              if (invoiceOptions.length === 0) fetchInvoices("", false);
            }}
          >
            {filteredOptions.map((opt) => (
              <Option key={opt.value} value={opt.value} label={opt.label}>
                <Tooltip
                  title={
                    <>
                      <div>
                        <b>Số hóa đơn:</b> {opt.raw?.invoiceNo}
                      </div>
                      <div>
                        <b>Khách hàng:</b> {opt.raw?.customerName}
                      </div>
                      <div>
                        <b>Tổng tiền:</b> {opt.raw?.total?.toLocaleString("vi-VN")} VND
                      </div>
                    </>
                  }
                  placement="left"
                >
                  {`${opt.raw?.invoiceNo || opt.label}`}
                </Tooltip>
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: "Số tiền phân bổ",
      dataIndex: "amount",
      key: "amount",
      width: 240,
      render: (val, record, index) => (
        <InputNumber
          placeholder="Nhập số tiền phân bổ"
          style={{ width: "100%" }}
          min={0}
          size="middle"
          formatter={(value) =>
            value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
          }
          parser={(value) => (value ? value.replace(/\./g, "") : "")}
          addonAfter="VND"
          onChange={(value) => handleItemChange(index, "amount", value)}
          disabled={!record.invoiceId}
          required
        />
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      render: (val, record, index) => (
        <Input
          value={val}
          placeholder="Nhập ghi chú về phân bổ (tùy chọn)"
          size="middle"
          onChange={(e) => handleItemChange(index, "note", e.target.value)}
        />
      ),
    },
    {
      key: "actions",
      align: "center",
      width: 60,
      render: (_, record, index) => (
        <Button danger type="text" onClick={() => handleRemoveItem(index)}>
          <DeleteOutlined />
        </Button>
      ),
    },
  ];

  const handleSubmit = async (values) => {
    try {
      let evdUrl = "";

      // Nếu có ảnh được chọn, upload lên R2
      if (fileList.length > 0 && fileList[0].originFileObj) {
        setIsUploading(true);
        const hideUploadMsg = message.loading("Đang upload ảnh...", 0);

        try {
          evdUrl = await uploadImageToR2(fileList[0].originFileObj);
          hideUploadMsg();
          console.log("Image uploaded successfully:", evdUrl);
        } catch (uploadError) {
          hideUploadMsg();
          notification.error({
            message: "Lỗi upload ảnh",
            description:
              uploadError.response?.data?.message || uploadError.message || "Không thể upload ảnh",
            duration: 5,
          });
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }
      // kiểm tra phải có ít nhất 1 items
      if (items.length === 0) {
        notification.warning({
          message: "Thiếu phân bổ hóa đơn",
          description: "Vui lòng thêm ít nhất một phân bổ hóa đơn cho thanh toán.",
          duration: 5,
        });
        return;
      }
      const paymentData = {
        customerId: values.customerId,
        method: values.method,
        direction: values.direction,
        evdUrl: evdUrl,
        amount: values.amount,
        receivedAt: values.receivedAt ? values.receivedAt.toISOString() : null,
        note: values.note || "",
        allocations: items
          .filter((item) => item.invoiceId && item.amount)
          .map((item) => ({
            invoiceId: item.invoiceId,
            amount: item.amount,
            note: item.note || "",
          })),
      };
      console.log("Submitting payment data:", paymentData);
      dispatch(createPaymentCombined(paymentData))
        .unwrap()
        .then(() => {
          notification.success({
            message: "Tạo thanh toán thành công",
            description: `Thanh toán đã được thêm vào hệ thống.`,
            duration: 5,
          });
          form.resetFields();
          onCancel();
          if (onSuccess) onSuccess();
        })
        .catch((err) => {
          notification.error({
            message: "Có lỗi xảy ra",
            description: err.message || "Không thể tạo thanh toán",
            duration: 5,
          });
        });
    } catch (error) {
      notification.error({
        message: "Có lỗi xảy ra",
        description: error.message || "Không thể tạo thanh toán",
        duration: 5,
      });
    }
  };
  // Tính tổng số tiền từ các mục phân bổ
  useEffect(() => {
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    form.setFieldsValue({ amount: totalAmount });
  }, [items, form]);

  const addItem = () => {
    setItems((prev) => [...prev, { invoiceId: null, amount: null, note: "" }]);
  };
  const handleRemoveItem = (index) => {
    Modal.confirm({
      title: "Xác nhận xóa dòng phân bổ?",
      content: "Bạn có chắc muốn xóa dòng này khỏi danh sách phân bổ không?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
      },
    });
  };
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <Modal
      title={
        <Space>
          <CreditCardOutlined />
          <span style={{ fontSize: "18px" }}>Thêm thanh toán mới</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      centered
      maskClosable={!isLoading}
      destroyOnHidden
    >
      <Divider />
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={isLoading}>
        <Form.Item
          label="Chọn khách hàng"
          name="customerId"
          rules={[{ required: true, message: "Vui lòng chọn khách hàng!" }]}
        >
          <Select
            showSearch
            placeholder="Tìm hoặc chọn khách hàng"
            filterOption={false}
            onSearch={handleCustomerSearch}
            onPopupScroll={handleCustomerPopupScroll}
            notFoundContent={customerLoading ? <Spin size="small" /> : null}
            optionLabelProp="label"
            onFocus={() => {
              if (customerOptions.length === 0) fetchCustomers("", false);
            }}
            size="large"
            allowClear
            onChange={(value) => {
              // Reset danh sách hóa đơn
              setInvoiceOptions([]);
              invoicePageRef.current = 0;
              invoiceHasMoreRef.current = true;
              invoiceSearchRef.current = "";
              setItems((prev) =>
                prev.map((item) => ({
                  ...item,
                  invoiceId: null,
                }))
              );
            }}
          >
            {customerOptions.map((opt) => (
              <Option key={opt.value} value={opt.value} label={opt.label}>
                <Tooltip
                  title={
                    <>
                      <div>
                        <b>Hóa đơn mở:</b> {opt.raw?.invoiceStats?.openCount ?? 0}
                      </div>
                      <div>
                        <b>Hóa đơn đã thanh toán:</b> {opt.raw?.invoiceStats?.paidCount ?? 0}
                      </div>
                      <div>
                        <b>Hóa đơn đã hủy:</b> {opt.raw?.invoiceStats?.cancelledCount ?? 0}
                      </div>
                    </>
                  }
                  placement="left"
                >{`${opt.raw?.name || opt.label} — ${opt.raw?.code || opt.value} | (${opt.raw?.invoiceStats?.totalCount || 0}) hóa đơn`}</Tooltip>
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={12} lg={12} xl={12}>
            <Form.Item
              label="Phương thức thanh toán"
              name="method"
              rules={[{ required: true, message: "Vui lòng chọn phương thức thanh toán!" }]}
            >
              <Select placeholder="Chọn phương thức thanh toán" size="large">
                {Object.entries(methodpaymentMap).map(([key, { text, color }]) => (
                  <Option key={key} value={key}>
                    <div className="customerPayment-paymentOption">
                      <div
                        className={`customerPayment-paymentIndicator customerPayment-paymentIndicator--${color}`}
                      />
                      {text}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={12} lg={12} xl={12}>
            <Form.Item
              label="Hướng thanh toán"
              name="direction"
              rules={[{ required: true, message: "Vui lòng chọn hướng thanh toán!" }]}
            >
              <Select placeholder="Chọn hướng thanh toán" size="large">
                {Object.entries(directionPaymentMap).map(([key, { text, color }]) => (
                  <Option key={key} value={key}>
                    <div className="customerPayment-paymentOption">
                      <div
                        className={`customerPayment-paymentIndicator customerPayment-paymentIndicator--${color}`}
                      />
                      {text}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={12} lg={12} xl={12}>
            <Form.Item
              label="Số tiền thanh toán"
              name="amount"
              rules={[{ required: true, message: "Vui lòng nhập số tiền thanh toán!" }]}
            >
              <InputNumber
                placeholder="Nhập số tiền thanh toán"
                style={{ width: "100%" }}
                min={0}
                size="large"
                formatter={(value) =>
                  value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                }
                parser={(value) => (value ? value.replace(/\./g, "") : "")}
                addonAfter="VND"
                disabled
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={12} lg={12} xl={12}>
            <Form.Item
              label="Ngày nhận thanh toán"
              name="receivedAt"
              rules={[{ required: true, message: "Vui lòng chọn ngày nhận thanh toán!" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                size="large"
                format="DD/MM/YYYY HH:mm"
                showTime={{ defaultValue: dayjs("00:00", "HH:mm") }}
                locale={locale}
                disabledDate={(current) => current && current > dayjs().endOf("day")}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item
              label="Ảnh chứng từ"
              name="evdUrl"
              rules={[{ required: true, message: "Vui lòng upload ảnh chứng từ!" }]}
            >
              <div style={{ width: "100%" }} className="customerPayment-uploadContainer">
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleChange}
                  onPreview={handlePreview}
                  onRemove={handleRemove}
                  beforeUpload={() => false} // Prevent auto upload
                  style={{ width: "100%" }}
                  maxCount={1}
                  previewFile={async (file) => {
                    // Luôn trả về ảnh gốc base64 để thumbnail rõ nét
                    return await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onload = () => resolve(reader.result);
                      reader.onerror = (err) => reject(err);
                    });
                  }}
                >
                  {fileList.length >= 1 ? null : (
                    <div className="upload-dragger-inner">
                      <PlusOutlined />
                      <div className="upload-text">Tải ảnh lên</div>
                    </div>
                  )}
                </Upload>
                {previewImage && (
                  <Image
                    wrapperStyle={{ display: "none" }}
                    preview={{
                      visible: previewOpen,
                      onVisibleChange: (visible) => setPreviewOpen(visible),
                      afterOpenChange: (visible) => !visible && setPreviewImage(""),
                    }}
                    src={previewImage}
                  />
                )}
              </div>
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea
                placeholder="Nhập ghi chú về thanh toán (tùy chọn)"
                rows={8}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>
        <Divider orientation="center">Phân bổ hóa đơn</Divider>
        <Table
          columns={allocationPaymentColumns}
          dataSource={items}
          pagination={false}
          rowKey={(record, idx) => idx}
          notFoundContent={<Empty description="Chưa có hóa đơn nào được phân bổ" />}
          bordered
          size="small"
          scroll={{ x: 700 }}
        />
        <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} className="mt-3">
          Thêm hóa đơn
        </Button>
        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Space>
            <Button onClick={onCancel} disabled={isLoading} size="large">
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={isLoading} size="large">
              {isLoading ? "Đang tạo..." : "Tạo thanh toán"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddCustomerPayment;
