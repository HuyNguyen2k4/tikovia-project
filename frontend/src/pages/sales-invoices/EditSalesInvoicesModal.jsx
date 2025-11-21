import React, { useCallback, useEffect, useState } from "react";

import { FileAddOutlined } from "@ant-design/icons";
import { getProductById } from "@src/services/productService";
import { getTotalPostedQtyForOrderItem } from "@src/services/taskService";
import { updateSalesInvoice } from "@src/store/salesInvoicesSlice";
// adjust if your action name is different
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

const EditSalesInvoicesModal = ({ visible, onCancel, onSuccess, salesInvoiceData }) => {
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
      const source = itemsArg || items;
      const idsToFetch = source.map((it) => it.productId).filter((id) => id && !productDetails[id]);
      if (idsToFetch.length === 0) return;
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
      } catch (e) {
        // ignore
      }
    },
    [items, productDetails]
  );

  useEffect(() => {
    if (visible && salesInvoiceData) {
      // populate form with existing invoice
      const taxPercentInit =
        typeof salesInvoiceData.taxAmount === "number"
          ? salesInvoiceData.taxAmount * 100
          : Number(salesInvoiceData.taxAmount || 0) * 100;
      form.setFieldsValue({
        invoiceId: salesInvoiceData.id,
        orderId: salesInvoiceData.orderId,
        taxPercent: taxPercentInit,
        discountAmount: Number(salesInvoiceData.discountAmount || 0),
        surcharge: Number(salesInvoiceData.surcharge || 0),
      });

      const mapped = (salesInvoiceData.items || []).map((it) => ({
        key: it.id || it.orderItemId || `${it.productId}-${Math.random()}`,
        orderItemId: it.orderItemId || it.id,
        productId: it.productId,
        productName: it.productName || it.name || "-",
        skuCode: it.skuCode || "-",
        qty: it.qty || 0,
        postQty: 0, // will be updated
        imgUrl: it.imgUrl || null,
        unitPrice: typeof it.unitPrice !== "undefined" ? Number(it.unitPrice) : 0,
      }));
      setItems(mapped);
      fetchProductsDetails(mapped);
      fetchPostedQtyForItems(mapped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, salesInvoiceData]);

  const updateItemPrice = (key, value) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, unitPrice: Number(value) || 0 } : it))
    );
  };

  const subtotal = items.reduce((s, it) => s + Number(it.unitPrice || 0) * Number(it.qty || 0), 0);

  // watch fields so totals update on change
  const taxPercent = Number(Form.useWatch("taxPercent", form) || 0);
  const discountAmount = Number(Form.useWatch("discountAmount", form) || 0);
  const taxDecimal = taxPercent / 100;
  const totalAfterTaxAndDiscount = subtotal * (1 + taxDecimal) - discountAmount;

  const handleSubmit = async (vals) => {
    if (!salesInvoiceData?.id) {
      notification.warning({ message: "Invoice ID không hợp lệ" });
      return;
    }
    if (!items || items.length === 0) {
      notification.warning({ message: "Không có item để cập nhật" });
      return;
    }

    const payloadItems = items.map((it) => ({
      orderItemId: it.orderItemId,
      unitPrice: String(Number(it.unitPrice || 0)),
    }));
    const invalidUnitPrice = payloadItems.some((it) => Number(it.unitPrice) <= 0);
    if (invalidUnitPrice) {
      notification.warning({ message: "Đơn giá phải lớn hơn 0" });
      return;
    }
    const missingOrderItemId = payloadItems.some((it) => !it.orderItemId);
    if (missingOrderItemId) {
      notification.warning({ message: "Một số item thiếu orderItemId" });
      return;
    }

    const payload = {
      id: salesInvoiceData.id,
      //   orderId: salesInvoiceData.orderId,
      taxAmount: String(Number(vals.taxPercent || 0) / 100),
      discountAmount: String(Number(vals.discountAmount || 0)),
      surcharge: String(Number(vals.surcharge || 0)),
      items: payloadItems,
    };
    setLoading(true);
    try {
      await dispatch(updateSalesInvoice({ id: salesInvoiceData.id, data: payload })).unwrap();
      notification.success({
        message: "Cập nhật hóa đơn thành công",
        description: `Cập nhật hóa đơn ${salesInvoiceData.invoiceNo} thành công`,
        duration: 3,
      });
      onSuccess?.();
      onCancel?.();
    } catch (err) {
      console.error("updateSalesInvoice error", err);
      notification.error({
        message: "Cập nhật thất bại",
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
          step={0.001}
          formatter={(v) => currencyFormatter(v)}
          parser={(v) => currencyParser(v)}
          onChange={(v) => updateItemPrice(record.key, v)}
        />
      ),
    },
    {
      title: "Thành tiền",
      key: "amount",
      width: 160,
      align: "right",
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
            Chỉnh sửa hóa đơn bán hàng
          </Title>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      centered
      destroyOnHidden
      styles={{ body: { padding: "0px 20px 20px 20px", background: "#f9fafb" } }}
    >
      <Divider />
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ taxPercent: 0, discountAmount: 0 }}
      >
        {/* hidden fields */}
        <Form.Item name="invoiceId" style={{ display: "none" }}>
          <InputNumber />
        </Form.Item>
        <Form.Item name="orderId" style={{ display: "none" }}>
          <InputNumber />
        </Form.Item>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={6}>
            <div>
              <Text strong style={{ minWidth: 110 }}>
                Mã hóa đơn:
              </Text>
              <br />
              <Tag color="cyan" style={{ margin: 0 }}>
                {salesInvoiceData?.invoiceNo}
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
              <InputNumber min={0} max={100} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Giảm giá (VNĐ)" name="discountAmount" style={{ marginBottom: 12 }}>
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                formatter={(v) => currencyFormatter(v)}
                parser={(v) => currencyParser(v)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="Phụ phí (VNĐ)" name="surcharge" style={{ marginBottom: 12 }}>
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                formatter={(v) => currencyFormatter(v)}
                parser={(v) => currencyParser(v)}
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

        <Space
          direction="vertical"
          align="end"
          size="small"
          style={{ width: "100%", marginTop: 16 }}
        >
          <div
            style={{
              border: "2px dashed #eee",
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

        <Form.Item style={{ margin: 0, textAlign: "right" }}>
          <Space>
            <Button onClick={onCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {loading ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditSalesInvoicesModal;
