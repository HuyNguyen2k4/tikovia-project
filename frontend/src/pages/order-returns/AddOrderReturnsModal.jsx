import React, { useEffect, useState } from "react";

import { DeleteOutlined, FileAddOutlined, PlusOutlined } from "@ant-design/icons";
import apiClient from "@src/services/apiClient";
import { createOrderReturn } from "@src/store/OrderReturnsSlice";
import { fetchSalesInvoiceByOrderId } from "@src/store/salesInvoicesSlice";
import {
  Button,
  Col,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Table,
  Tag,
  Typography,
  Upload,
  message,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Title, Text } = Typography;
const { TextArea } = Input;

function AddOrderReturnsModal({ visible, onCancel, onSuccess, orderId, orderNo }) {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [returnItems, setReturnItems] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const createStatus = useSelector((state) => state.orderReturns.createOrderReturnStatus);
  const createError = useSelector((state) => state.orderReturns.createOrderReturnError);
  //   fetch data của hóa đơn
  const salesInvoicesByOrderId = useSelector((state) => state.salesInvoices.salesInvoiceByOrderId);
  const isInvoiceLoading =
    useSelector((state) => state.salesInvoices.fetchByOrderIdStatus) === "loading";
  const fetchByOrderIdStatus = useSelector((state) => state.salesInvoices.fetchByOrderIdStatus);
  const invoiceItems = salesInvoicesByOrderId?.items || [];

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setFileList([]);
      setPreviewImage("");
      setPreviewOpen(false);
      const mappedReturnItems = (salesInvoicesByOrderId?.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        skuCode: item.skuCode,
        imgUrl: item.imgUrl,
        qty: item.qty,
        unitPrice: item.unitPrice,
      }));
      setReturnItems(mappedReturnItems);
    }
  }, [visible, form]);
  //   fetch data của hóa đơn thông qua orderId
  useEffect(() => {
    try {
      dispatch(fetchSalesInvoiceByOrderId(orderId));
    } catch (error) {
      console.error("Error fetching sales invoice by order ID:", error);
    }
  }, [dispatch, orderId]);
  const formatCurrency = (v) =>
    typeof v === "number" ? v.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) : "-";
  const currencyParser = (v) => {
    if (typeof v === "string") {
      return Number(v.replace(/[^0-9.-]+/g, ""));
    }
  };
  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
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
  const handleReturnQuantityChange = (value, record) => {
    const updatedItems = returnItems.map((item) => {
      if (item.productId === record.productId) {
        return { ...item, qty: value };
      }
      return item;
    });
    setReturnItems(updatedItems);
  };
  const handlePriceChange = (value, record) => {
    const updatedItems = returnItems.map((item) => {
      if (item.productId === record.productId) {
        return { ...item, unitPrice: value };
      }
      return item;
    });
    setReturnItems(updatedItems);
  };
  const handleRemoveItem = (productId) => {
    Modal.confirm({
      title: "Xác nhận xóa sản phẩm này khỏi danh sách trả hàng?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => {
        setReturnItems((prev) => prev.filter((item) => item.productId !== productId));
        notification.info({
          message: "Đã xóa sản phẩm khỏi danh sách trả hàng",
          duration: 2,
        });
      },
    });
  };
  const handleAddProduct = (productId) => {
    const productToAdd = invoiceItems.find((item) => item.productId === productId);

    if (productToAdd) {
      const newReturnItem = {
        ...productToAdd,
        qty: 1, // Mặc định số lượng trả là 1
      };

      setReturnItems((prevItems) => [...prevItems, newReturnItem]);
      notification.success({ message: `Đã thêm ${productToAdd.productName}`, duration: 2 });
    }
  };
  const handleSubmit = async (values) => {
    try {
      let imgUrl = "";

      // Nếu có ảnh được chọn, upload lên R2
      if (fileList.length > 0 && fileList[0].originFileObj) {
        setIsUploading(true);
        const hideUploadMsg = message.loading("Đang upload ảnh...", 0);

        try {
          imgUrl = await uploadImageToR2(fileList[0].originFileObj);
          hideUploadMsg();
          console.log("Image uploaded successfully:", imgUrl);
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
      const orderReturnData = {
        orderId: orderId,
        evdUrl: imgUrl,
        note: values.note || "",
        items: returnItems,
      };
      //   kiểm tra max số lượng trả ko vượt quá số lượng đã mua
      for (const item of orderReturnData.items) {
        const salesInvoiceItem = salesInvoicesByOrderId.items.find(
          (siItem) => siItem.productId === item.productId
        );
        if (salesInvoiceItem && item.qty > salesInvoiceItem.qty) {
          notification.error({
            message: "Lỗi",
            description: `Số lượng trả hàng cho sản phẩm ${item.productName} không được vượt quá số lượng đã mua (${salesInvoiceItem.qty}).`,
            duration: 5,
          });
          setIsUploading(false);
          return;
        }
      }
      dispatch(createOrderReturn(orderReturnData))
        .unwrap()
        .then(() => {
          notification.success({
            message: "Tạo đơn trả hàng thành công",
            description: `Đơn trả hàng cho đơn ${orderNo} đã được tạo thành công.`,
            duration: 4,
          });
          form.resetFields();
          setFileList([]);
          onSuccess();
        })
        .catch((error) => {
          notification.error({
            message: "Lỗi tạo đơn trả hàng",
            description:
              error.message || "Đã có lỗi xảy ra khi tạo đơn trả hàng. Vui lòng thử lại.",
            duration: 5,
          });
        });
      //   if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting order return:", error);
      notification.error({
        message: "Lỗi",
        description: "Đã có lỗi xảy ra. Vui lòng thử lại.",
        duration: 5,
      });
    }
  };

  const productColumns = [
    {
      title: "Ảnh sản phẩm",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 120,
      render: (imgUrl) =>
        imgUrl ? (
          <Image
            src={imgUrl}
            alt="Ảnh sản phẩm"
            width={100}
            height={60}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: 100, height: 60, background: "#f5f5f5" }} />
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
    },
    {
      title: "Số lượng trả",
      dataIndex: "qty",
      key: "qty",
      width: 130,
      render: (val, record) => {
        return (
          <>
            <InputNumber
              min={1}
              value={val}
              onChange={(value) => handleReturnQuantityChange(value, record)}
            />
            <br />
            {/* hiển thị số lượng tối đa */}
            <Text type="secondary" style={{ marginLeft: 8 }}>
              (Tối đa: {invoiceItems.find((item) => item.productId === record.productId)?.qty || 0})
            </Text>
          </>
        );
      },
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 180,
      align: "right",
      render: (price, record) => {
        return (
          <InputNumber
            min={0}
            value={price}
            style={{ width: "100%" }}
            formatter={(value) =>
              value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
            }
            parser={(value) => (value ? value.replace(/\./g, "") : "")}
            addonAfter="VND"
            onChange={(value) => handlePriceChange(value, record)}
          />
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      align: "center",
      width: 100,
      render: (_, record) => (
        <Button danger type="link" onClick={() => handleRemoveItem(record.productId)}>
          <DeleteOutlined />
        </Button>
      ),
    },
  ];
  const availableInvoiceItems = invoiceItems.filter(
    (invoiceItem) =>
      !returnItems.some((returnItem) => returnItem.productId === invoiceItem.productId)
  );
  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileAddOutlined />
          <Title level={5} style={{ margin: 0 }}>
            Thêm đơn trả hàng
          </Title>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={
        <div style={{ textAlign: "right" }}>
          <Button size="large" onClick={onCancel} style={{ marginRight: 8 }} disabled={isLoading}>
            Hủy
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={() => form.submit()}
            loading={isLoading}
            disabled={isLoading}
          >
            Xác nhận
          </Button>
        </div>
      }
      centered
      destroyOnHidden
      width={1000}
      styles={{ body: { padding: "0px 20px 20px 20px", background: "#f9fafb" } }}
    >
      <Divider />
      {/* Nội dung của modal */}
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Text strong style={{ minWidth: 110 }}>
                Đơn hàng:
              </Text>
              <Tag color="blue" style={{ margin: 0 }}>
                {orderNo}
              </Tag>
            </div>
            <Divider />
            <Form.Item label="Ghi chú" name="note">
              <TextArea rows={11} placeholder="Nhập ghi chú (nếu có)" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item
              label="Ảnh minh chứng"
              name="evdUrl"
              rules={[{ required: true, message: "Vui lòng upload ảnh minh chứng" }]}
            >
              <div style={{ width: "100%" }} className="orderReturns-uploadContainer">
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleChange}
                  onPreview={handlePreview}
                  onRemove={handleRemove}
                  beforeUpload={() => false} // Prevent auto upload
                  style={{ width: "100%", minHeight: 320 }}
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
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Định dạng: JPG, PNG, GIF. Dung lượng tối đa 2MB.
                  <br />
                  Ảnh sản phẩm sẽ hiển thị ở trang quản lý và chi tiết sản phẩm.
                </Text>
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
        </Row>
        <Divider orientation="center">
          <Title level={5}>Danh sách sản phẩm trả hàng</Title>
        </Divider>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Select
              showSearch
              placeholder="Chọn sản phẩm từ hóa đơn để thêm vào danh sách trả"
              loading={isInvoiceLoading}
              disabled={isInvoiceLoading || availableInvoiceItems.length === 0}
              style={{ width: "100%" }}
              onChange={handleAddProduct}
              value={null}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableInvoiceItems.map((item) => (
                <Option
                  key={item.productId}
                  value={item.productId}
                  label={`${item.productName} (${item.skuCode})`}
                >
                  <div>
                    <Text strong>
                      {item.productName} ({item.skuCode})
                    </Text>
                    <br />
                    <Text type="secondary">
                      Đã mua: {item.qty} | Đơn giá: {formatCurrency(item.unitPrice)}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
            {availableInvoiceItems.length === 0 && !isInvoiceLoading && invoiceItems.length > 0 && (
              <Text type="secondary" style={{ marginTop: 8, display: "block" }}>
                Tất cả sản phẩm từ hóa đơn đã được thêm vào danh sách trả.
              </Text>
            )}
          </Col>
        </Row>
        {/* Lưu ý với danh sách sản phẩm trả hàng sẽ lấy theo danh sách hiện đang có trong sales invoices */}
        <Table
          columns={productColumns}
          dataSource={returnItems}
          bordered
          pagination={false}
          rowKey={(record) => record.productId}
          loading={fetchByOrderIdStatus === "loading"}
          noDataElement={<Empty description="Không có sản phẩm nào" />}
          size="small"
          scroll={{ x: 800 }}
        />
      </Form>
    </Modal>
  );
}

export default AddOrderReturnsModal;
