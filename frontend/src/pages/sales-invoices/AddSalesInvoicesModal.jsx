import React, { useCallback, useEffect, useState } from "react";

import { FileAddOutlined } from "@ant-design/icons";
import { getProductById } from "@src/services/productService";
import { getTotalPostedQtyForOrderItem } from "@src/services/taskService";
import { createSalesInvoice } from "@src/store/salesInvoicesSlice";
import {
  Button,
  Col,
  Divider,
  Form,
  Image,
  InputNumber,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  notification,
} from "antd";
import { useDispatch } from "react-redux";

const { Text, Title } = Typography;

// Formatter: Chỉ đặt TỐI ĐA 2 chữ số thập phân
const currencyFormatter = (v) => {
  if (v === undefined || v === null || v === "" || isNaN(Number(v))) {
    return "";
  }
  return Number(v).toLocaleString("vi-VN", {
    // Bỏ minimumFractionDigits
    maximumFractionDigits: 2, // Chỉ định số chữ số thập phân tối đa
  });
};

// Parser: Giữ nguyên, vẫn phải thay ',' thành '.'
const currencyParser = (v) => {
  if (!v) return "";
  // Xóa '.' (hàng ngàn) và thay ',' (thập phân) bằng '.'
  return v.replace(/\./g, "").replace(",", ".");
};

const AddSalesInvoicesModal = ({
  visible,
  onCancel,
  onSuccess,
  orderId, // required - will be disabled in form
  orderNo, // display value (order number)
  orderItems = [], // array of items from order: each: { id: orderItemId, productName, qty }
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productDetails, setProductDetails] = useState({});

  const fetchPostedQtyForItems = useCallback(
    async (itemsArg) => {
      const sourceItems = itemsArg || items;
      if (!sourceItems.length) return;

      setLoading(true);
      try {
        const promises = sourceItems.map(async (it) => {
          if (!it.orderItemId) return { id: it.key, postQty: 0 };

          const res = await getTotalPostedQtyForOrderItem(it.orderItemId);
          const postQtyString = res?.data?.data?.postQty || "0";
          const qty = parseFloat(postQtyString) || 0;
          return { id: it.key, postQty: qty };
        });

        const results = await Promise.all(promises);

        // Cập nhật qty trong items
        setItems((prev) =>
          prev.map((it) => {
            const found = results.find((r) => r.id === it.key);
            return found ? { ...it, postQty: found.postQty } : it;
          })
        );
      } catch (err) {
        console.error("fetchPostedQtyForItems error", err);
      } finally {
        setLoading(false);
      }
    },
    [items]
  );

  const fetchProductsDetails = useCallback(
    async (itemsArg) => {
      const sourceItems = itemsArg || items;
      const idsToFetch = sourceItems
        .map((it) => it.productId)
        .filter((id) => id && !productDetails[id]);

      if (idsToFetch.length === 0) return;
      setLoading(true);
      try {
        const promises = idsToFetch.map((id) =>
          getProductById(id)
            .then((res) => res.data?.data || res.data || null)
            .then((product) => ({ id, product }))
            .catch(() => ({ id, product: null }))
        );
        const results = await Promise.all(promises);
        setProductDetails((prev) => {
          const next = { ...prev };
          results.forEach(({ id, product }) => {
            if (product) next[id] = product;
          });
          return next;
        });
      } finally {
        setLoading(false);
      }
    },
    [items, productDetails]
  );
  // init when modal opens or orderItems change
  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ taxPercent: 0, discountAmount: 0, orderId: orderId || "" });
      // map orderItems to internal items shape
      const mapped = (orderItems || []).map((it) => ({
        key: it.id || `${it.productId}-${Math.random()}`,
        orderItemId: it.id || it.orderItemId,
        productId: it.productId,
        productName: it.productName || it.name || "-",
        skuCode: it.skuCode || "-",
        qty: it.qty || 0,
        postQty: 0, // will be updated
        imgUrl: it.imgUrl || null,
        unitPrice: it.unitPrice || 0,
      }));
      setItems(mapped);
      fetchProductsDetails(mapped);
      fetchPostedQtyForItems(mapped);
    }
  }, [visible, orderItems, orderId]);

  const updateItemPrice = (key, value) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, unitPrice: Number(value) || 0 } : it))
    );
  };

  const subtotal = items.reduce((s, it) => s + Number(it.unitPrice || 0) * Number(it.qty || 0), 0);
  const taxPercent = Number(Form.useWatch("taxPercent", form) || 0);
  const discountAmount = Number(Form.useWatch("discountAmount", form) || 0);
  const surcharge = Number(Form.useWatch("surcharge", form) || 0);
  const taxDecimal = taxPercent / 100;
  const totalAfterTaxAndDiscount = subtotal * (1 + taxDecimal) - discountAmount - surcharge;

  const handleSubmit = async (vals) => {
    if (!orderId) {
      notification.warning({ message: "Order ID không hợp lệ" });
      return;
    }
    if (!items || items.length === 0) {
      notification.warning({ message: "Không có item để tạo hóa đơn" });
      return;
    }

    // ensure each item has orderItemId and unitPrice
    const payloadItems = items.map((it) => ({
      orderItemId: it.orderItemId,
      unitPrice: String(Number(it.unitPrice || 0)),
    }));
    const invalidUnitPrice = payloadItems.some((it) => Number(it.unitPrice) <= 0);
    if (invalidUnitPrice) {
      notification.warning({ message: "Đơn giá phải lớn hơn 0" });
      return;
    }
    const invalid = payloadItems.some((it) => !it.orderItemId);
    if (invalid) {
      notification.warning({ message: "Một số item thiếu orderItemId" });
      return;
    }

    // Chuyển đổi tax (percent -> decimal string) và discount (number -> string)
    const taxAmountString = String(Number(vals.taxPercent || 0) / 100);
    const discountAmountString = String(Number(vals.discountAmount || 0));
    const surchargeString = String(Number(vals.surcharge || 0));

    const payload = {
      orderId: orderId,
      taxAmount: taxAmountString, // e.g: "0.1"
      discountAmount: discountAmountString, // e.g: "0"
      surcharge: surchargeString,
      items: payloadItems,
    };
    setLoading(true);
    try {
      await dispatch(createSalesInvoice(payload)).unwrap();
      notification.success({
        message: "Tạo hóa đơn thành công",
        description: `Tạo hóa đơn cho đơn hàng ${orderNo} thành công`,
        duration: 3,
      });
      form.resetFields();
      setItems([]);
      onSuccess?.();
      onCancel?.();
    } catch (err) {
      console.error("createSalesInvoice error", err);
      notification.error({
        message: "Tạo hóa đơn thất bại",
        description: err?.message || err || "Lỗi không xác định",
        duration: 3,
      });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "imgUrl",
      key: "img",
      width: 90,
      render: (_, row) => {
        const p = productDetails[row.productId];
        const src = p?.imgUrl || row.imgUrl || null;
        return src ? (
          <Image src={src} width={80} height={60} style={{ objectFit: "cover" }} />
        ) : (
          <div style={{ width: 80, height: 60, background: "#f5f5f5" }} />
        );
      },
    },
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      key: "productName",
      render: (_, row) => {
        const p = productDetails[row.productId];
        return (
          <>
            <div style={{ fontWeight: 600 }}>{p?.name || row.productName}</div>
            <div style={{ marginTop: 6 }}>
              <Tag color="blue">{p?.skuCode || row.skuCode || "-"}</Tag>
            </div>
          </>
        );
      },
    },
    {
      title: "Số lượng",
      dataIndex: "qty",
      key: "qty",
      width: 120,
      render: (v) => <InputNumber value={v} disabled style={{ width: "100%" }} />,
    },
    {
      title: "Số lượng đã soạn",
      dataIndex: "postQty",
      key: "postQty",
      width: 120,
      render: (v) => <InputNumber value={v} disabled style={{ width: "100%" }} />,
    },
    {
      title: "Đơn giá (VNĐ)",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 180,
      render: (val, record) => (
        <InputNumber
          min={0}
          value={val}
          style={{ width: "100%" }}
          formatter={(v) => currencyFormatter(v)}
          parser={(v) => currencyParser(v)}
          onChange={(v) => updateItemPrice(record.key, v)}
          addonAfter="VNĐ"
          step={0.001}
        />
      ),
    },
    {
      title: "Thành tiền",
      key: "amount",
      width: 160,
      align: "right", // Căn phải cho đẹp
      render: (_, rec) =>
        (Number(rec.qty || 0) * Number(rec.unitPrice || 0) || 0).toLocaleString("vi-VN", {
          style: "currency",
          currency: "VND",
        }),
    },
  ];
  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileAddOutlined />
          <Title level={5} style={{ margin: 0 }}>
            Thêm hóa đơn bán hàng
          </Title>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null} // Tắt footer mặc định để dùng Form.Item
      width={1000}
      centered
      destroyOnHidden
      // CSS Cải tiến: Thêm padding và màu nền
      styles={{ body: { padding: "0px 20px 20px 20px", background: "#f9fafb" } }}
    >
      <Divider />
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ taxPercent: 0, discountAmount: 0, surcharge: 0 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={6}>
            <div>
              <Text strong style={{ minWidth: 110 }}>
                Đơn hàng:
              </Text>
              <br />
              <Tag color="blue" style={{ margin: 0 }}>
                {orderNo}
              </Tag>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="Thuế (%)"
              name="taxPercent"
              rules={[{ required: true, message: "Vui lòng nhập % thuế" }]}
              style={{ marginBottom: 12 }}
            >
              <InputNumber min={0} max={100} style={{ width: "100%" }} addonAfter="%" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Giảm giá (VNĐ)" name="discountAmount" style={{ marginBottom: 12 }}>
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                formatter={(v) => currencyFormatter(v)}
                parser={(v) => currencyParser(v)}
                addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={6}>
            <Form.Item label="Phụ phí (VNĐ)" name="surcharge" style={{ marginBottom: 12 }}>
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                formatter={(v) => currencyFormatter(v)}
                parser={(v) => currencyParser(v)}
                addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="center" style={{ margin: "8px 0 16px 0" }}>
          Sản phẩm
        </Divider>

        <Table
          columns={columns}
          bordered
          dataSource={items}
          pagination={false}
          rowKey={(r) => r.orderItemId || r.key}
          size="small"
          scroll={{ x: 800 }}
        />

        {/* CSS Cải tiến: Bố cục phần tổng tiền */}
        <Space
          direction="vertical"
          align="end"
          size="small"
          style={{
            width: "100%",
            marginTop: 16,
          }}
        >
          <div
            style={{
              border: "2px solid #eee",
              borderStyle: "dashed",
              padding: 15,
              borderRadius: 4,
            }}
          >
            <Row justify="space-between" style={{ width: 280, marginBottom: 8 }}>
              <Text type="secondary">Subtotal:</Text>
              <Text strong>
                {subtotal.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </Text>
            </Row>

            <Row justify="space-between" style={{ width: 280, marginBottom: 8 }}>
              <Text type="secondary">Thuế:</Text>
              <Text strong>{(taxPercent || 0).toFixed(2)}%</Text>
            </Row>

            <Row justify="space-between" style={{ width: 280, marginBottom: 8 }}>
              <Text type="secondary">Giảm giá:</Text>
              <Text strong>
                {discountAmount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </Text>
            </Row>
            <Row justify="space-between" style={{ width: 280, marginBottom: 8 }}>
              <Text type="secondary">Phụ phí:</Text>
              <Text strong>
                {(Number(Form.useWatch("surcharge", form)) || 0).toLocaleString("vi-VN", {
                  style: "currency",
                  currency: "VND",
                })}
              </Text>
            </Row>

            <Divider style={{ margin: "4px 0" }} />

            <Row justify="space-between" style={{ width: 280, marginBottom: 8 }}>
              <Title level={5} style={{ margin: 0 }}>
                Tổng cộng:
              </Title>
              <Title level={5} style={{ margin: 0, color: "#1677ff" }}>
                {Number(totalAfterTaxAndDiscount || 0).toLocaleString("vi-VN", {
                  style: "currency",
                  currency: "VND",
                })}
              </Title>
            </Row>
          </div>
        </Space>

        <Divider style={{ margin: "20px 0 16px 0" }} />

        {/* CSS Cải tiến: Đặt nút ở cuối modal */}
        <Form.Item style={{ margin: 0, textAlign: "right" }}>
          <Space>
            <Button onClick={onCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {loading ? "Đang tạo..." : "Tạo hóa đơn"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddSalesInvoicesModal;
