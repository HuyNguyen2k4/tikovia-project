import React, { useEffect, useRef, useState } from "react";

import { CreditCardOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { getSalesInvoicesByCustomerAndStatus } from "@src/services/salesInvoicesService";
import { updatePaymentCombined } from "@src/store/paymentsCombinedSlice";
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
  notification,
} from "antd";
import locale from "antd/es/date-picker/locale/vi_VN";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

// Thêm import API lấy hóa đơn

const { Text } = Typography;
const { Option } = Select;

const methodpaymentMap = {
  bank: { text: "Ngân hàng", color: "blue" },
  cash: { text: "Tiền mặt", color: "green" },
  cod: { text: "COD", color: "orange" },
};
const directionPaymentMap = {
  in: { text: "Thanh toán thu", color: "green" },
  out: { text: "Thanh toán chi", color: "red" },
};

function EditCustomerPayment({ visible, onCancel, onSuccess, paymentData }) {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const updateStatus = useSelector((state) => state.paymentsCombined.updatePaymentStatus);
  const isLoading = updateStatus === "loading";
  const [items, setItems] = useState([]);

  // State và ref cho chọn hóa đơn
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const invoicePageRef = useRef(0);
  const invoiceHasMoreRef = useRef(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const invoiceSearchRef = useRef("");
  const invoiceSearchTimer = useRef();
  useEffect(() => {
    const fetchInitialInvoices = async () => {
      if (visible && paymentData && paymentData.allocations?.length > 0) {
        const customerId = paymentData.customerId;
        const invoiceIds = paymentData.allocations.map((item) => item.invoiceId);
        // Gọi API lấy chi tiết các hóa đơn theo danh sách id
        try {
          const res = await getSalesInvoicesByCustomerAndStatus({
            customerId,
            ids: invoiceIds, // Thêm tham số ids vào API, cần hỗ trợ ở backend
          });
          const items = res.data?.data || [];
          const mapped = items.map((u) => ({
            value: u.id,
            label: `${u.invoiceNo}`,
            raw: u,
          }));
          setInvoiceOptions(mapped);
        } catch {
          setInvoiceOptions([]);
        }
      }
    };

    if (visible && paymentData) {
      form.setFieldsValue({
        method: paymentData.method,
        direction: paymentData.direction,
        amount: paymentData.amount,
        receivedAt: paymentData.receivedAt ? dayjs(paymentData.receivedAt) : null,
        note: paymentData.note || "",
      });
      setItems(
        (paymentData.allocations || []).map((item) => ({
          ...item,
          _uid: `${item.invoiceId}-${item.amount}-${Math.random()}`,
        }))
      );
      setInvoiceOptions([]);
      invoicePageRef.current = 0;
      invoiceHasMoreRef.current = true;
      fetchInitialInvoices(); // <-- Thêm dòng này
    }
    if (!visible) {
      form.resetFields();
      setItems([]);
      setInvoiceOptions([]);
    }
  }, [visible, paymentData, form]);
  // Lấy danh sách hóa đơn theo customerId
  const fetchInvoices = async (q = "", append = false) => {
    const customerId = paymentData?.customerId;
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
        customerId,
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

  useEffect(() => {
    if (visible && paymentData) {
      form.setFieldsValue({
        method: paymentData.method,
        direction: paymentData.direction,
        amount: paymentData.amount,
        receivedAt: paymentData.receivedAt ? dayjs(paymentData.receivedAt) : null,
        note: paymentData.note || "",
      });
      setItems(
        (paymentData.allocations || []).map((item) => ({
          ...item,
          _uid: `${item.invoiceId}-${item.amount}-${Math.random()}`,
        }))
      );
      setInvoiceOptions([]);
      invoicePageRef.current = 0;
      invoiceHasMoreRef.current = true;
    }
    if (!visible) {
      form.resetFields();
      setItems([]);
      setInvoiceOptions([]);
    }
  }, [visible, paymentData, form]);

  // Tính tổng số tiền từ các mục phân bổ
  useEffect(() => {
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    form.setFieldsValue({ amount: totalAmount });
  }, [items, form]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { _uid: `${Date.now()}-${Math.random()}`, invoiceId: null, amount: null, note: "" },
    ]);
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

  // Cột phân bổ hóa đơn: chọn hóa đơn động
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
            disabled={record.status === "cancelled"}
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
          value={record.amount}
          onChange={(value) => handleItemChange(index, "amount", value)}
          formatter={(value) =>
            value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
          }
          parser={(value) => (value ? value.replace(/\./g, "") : "")}
          addonAfter="VND"
          disabled={record.status === "cancelled"}
        />
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      render: (val, record, index) => (
        <Input
          value={record.note}
          placeholder="Nhập ghi chú về phân bổ (tùy chọn)"
          size="middle"
          onChange={(e) => handleItemChange(index, "note", e.target.value)}
          disabled={record.status === "cancelled"}
        />
      ),
    },
    {
      key: "actions",
      align: "center",
      width: 60,
      render: (_, record, index) => (
        <Button
          danger
          type="text"
          onClick={() => handleRemoveItem(index)}
          disabled={record.status === "cancelled"}
        >
          <DeleteOutlined />
        </Button>
      ),
    },
  ];

  const handleSubmit = async (values) => {
    if (items.length === 0) {
      Modal.warning({
        title: "Thiếu phân bổ hóa đơn",
        content: "Vui lòng thêm ít nhất một phân bổ hóa đơn cho thanh toán.",
      });
      return;
    }
    const paymentUpdateData = {
      method: values.method,
      direction: values.direction,
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
    dispatch(updatePaymentCombined({ id: paymentData.id, paymentData: paymentUpdateData }))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Cập nhật thành công",
          description: "Thanh toán đã được cập nhật.",
        });
        form.resetFields();
        onCancel();
        if (onSuccess) onSuccess();
      })
      .catch((err) => {
        notification.error({
          message: "Có lỗi xảy ra",
          description: err.message || "Không thể cập nhật thanh toán",
        });
      });
  };

  return (
    <Modal
      title={
        <Space>
          <CreditCardOutlined />
          <span style={{ fontSize: "18px" }}>Chỉnh sửa thanh toán</span>
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
        {/* Không cho sửa khách hàng */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Phương thức thanh toán"
              name="method"
              rules={[{ required: true, message: "Vui lòng chọn phương thức thanh toán!" }]}
            >
              <Select placeholder="Chọn phương thức thanh toán" size="large">
                {Object.entries(methodpaymentMap).map(([key, { text, color }]) => (
                  <Option key={key} value={key} style={{ color }}>
                    {text}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Hướng thanh toán"
              name="direction"
              rules={[{ required: true, message: "Vui lòng chọn hướng thanh toán!" }]}
            >
              <Select placeholder="Chọn hướng thanh toán" size="large">
                {Object.entries(directionPaymentMap).map(([key, { text, color }]) => (
                  <Option key={key} value={key} style={{ color }}>
                    {text}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
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
          <Col span={12}>
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
            <div className="flex justify-between items-center">
              <Text>Hình ảnh chứng từ: </Text>
              <Text type="secondary">* Chỉ được xem không thể thay đổi</Text>
            </div>
            <div className="mt-2">
              <Image src={paymentData?.evdUrl} alt="Payment" />
            </div>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea
                placeholder="Nhập ghi chú về thanh toán (tùy chọn)"
                rows={4}
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
          rowKey={(record) => record._uid}
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
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default EditCustomerPayment;
