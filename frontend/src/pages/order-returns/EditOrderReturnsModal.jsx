import React, { useEffect, useState } from "react";

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import apiClient from "@src/services/apiClient";
import { updateOrderReturn } from "@src/store/OrderReturnsSlice";
import { fetchSalesInvoiceByOrderId } from "@src/store/salesInvoicesSlice";
import {
  Button,
  Col,
  Divider,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  // <-- THÊM IMPORT
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
const { Option } = Select;

// THÊM orderId VÀO PROPS
function EditOrderReturnsModal({ visible, onCancel, onSuccess, orderReturnData, orderId }) {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [returnItems, setReturnItems] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Lấy trạng thái update từ orderReturns
  const updateStatus = useSelector((state) => state.orderReturns.updateOrderReturnStatus);

  // LẤY DỮ LIỆU TỪ SALES INVOICE SLICE
  const { salesInvoiceByOrderId, fetchByOrderIdStatus } = useSelector(
    (state) => state.salesInvoices
  );
  const invoiceItems = salesInvoiceByOrderId?.items || [];
  const isInvoiceLoading = fetchByOrderIdStatus === "loading";
  useEffect(() => {
    // THÊM ĐIỀU KIỆN KIỂM TRA visible VÀ orderId
    if (visible && orderReturnData && orderId) {
      // Dispatch action để lấy danh sách item từ sales invoice
      dispatch(fetchSalesInvoiceByOrderId(orderId));

      // Set giá trị form như cũ
      form.setFieldsValue({
        note: orderReturnData.note,
        status: orderReturnData.status,
      });
      setReturnItems(orderReturnData.items || []);
      if (orderReturnData.evdUrl) {
        setFileList([
          {
            uid: "-1",
            name: "evidence.png",
            status: "done",
            url: orderReturnData.evdUrl,
          },
        ]);
      } else {
        setFileList([]);
      }
    } else {
      // Reset khi modal đóng
      form.resetFields();
      setFileList([]);
      setReturnItems([]);
      setPreviewImage("");
      setPreviewOpen(false);
    }
    // THÊM orderId VÀ dispatch VÀO DEPENDENCY ARRAY
  }, [visible, orderReturnData, form, orderId, dispatch]);

  const formatCurrency = (v) =>
    typeof v === "number" ? v.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) : "-";

  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleChange = async ({ file, fileList: newFileList }) => {
    let limitedFileList = newFileList.slice(-1);

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

  const handlePreview = async (file) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview || file.thumbUrl);
    setPreviewOpen(true);
  };

  const handleRemove = () => {
    setFileList([]);
    return true;
  };

  const uploadImageToR2 = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await apiClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data?.url;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const isLoading = updateStatus === "loading" || isUploading;

  const handleReturnQuantityChange = (value, record) => {
    const updatedItems = returnItems.map((item) =>
      item.productId === record.productId ? { ...item, qty: value } : item
    );
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
        notification.info({ message: "Đã xóa sản phẩm khỏi danh sách trả hàng", duration: 2 });
      },
    });
  };

  // HÀM MỚI: XỬ LÝ KHI THÊM SẢN PHẨM TỪ HÓA ĐƠN
  const handleAddProduct = (productId) => {
    const productToAdd = invoiceItems.find((item) => item.productId === productId);

    if (productToAdd) {
      // Tạo một object item mới cho danh sách trả hàng
      // Đảm bảo cấu trúc này khớp với cấu trúc item trong `returnItems`
      const newReturnItem = {
        ...productToAdd, // Lấy tất cả thông tin từ item của hóa đơn
        qty: 1, // Mặc định số lượng trả là 1
      };

      setReturnItems((prevItems) => [...prevItems, newReturnItem]);
      notification.success({ message: `Đã thêm ${productToAdd.productName}`, duration: 2 });
    }
  };

  const handleSubmit = async (values) => {
    if (!orderReturnData) return;

    let imgUrl = orderReturnData.evdUrl;

    if (fileList.length > 0 && fileList[0].originFileObj) {
      setIsUploading(true);
      const hideUploadMsg = message.loading("Đang upload ảnh...", 0);
      try {
        imgUrl = await uploadImageToR2(fileList[0].originFileObj);
        hideUploadMsg();
      } catch (uploadError) {
        hideUploadMsg();
        notification.error({
          message: "Lỗi upload ảnh",
          description:
            uploadError.response?.data?.message || uploadError.message || "Không thể upload ảnh",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    } else if (fileList.length === 0) {
      imgUrl = "";
    }

    const updatedOrderReturnData = {
      status: values.status,
      evdUrl: imgUrl,
      note: values.note || "",
      items: returnItems.map(({ productId, qty, unitPrice }) => ({
        productId,
        qty,
        unitPrice,
      })),
    };
    console.log("Cập nhật đơn trả hàng với dữ liệu:", updatedOrderReturnData);
    dispatch(updateOrderReturn({ id: orderReturnData.id, orderReturnData: updatedOrderReturnData }))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Cập nhật thành công",
          description: `Đơn trả hàng đã được cập nhật.`,
        });
        onSuccess();
      })
      .catch((error) => {
        notification.error({
          message: "Lỗi cập nhật",
          description: error.message || "Đã có lỗi xảy ra khi cập nhật đơn trả hàng.",
        });
      });
  };

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
    { title: "Tên sản phẩm", dataIndex: "productName", key: "productName" },
    { title: "Mã SKU", dataIndex: "skuCode", key: "skuCode" },
    {
      title: "Số lượng trả",
      dataIndex: "qty",
      key: "qty",
      width: 130,
      render: (val, record) => (
        <>
          <InputNumber
            min={1}
            // Tùy chọn: Giới hạn số lượng trả không vượt quá số lượng đã mua
            //   max={invoiceItems.find(item => item.productId === record.productId)?.qty}
            value={val}
            onChange={(value) => handleReturnQuantityChange(value, record)}
          />
          <br />
          {/* hiển thị giới hạn */}
          <Text type="secondary" style={{ marginLeft: 8 }}>
            (Tối đa: {invoiceItems.find((item) => item.productId === record.productId)?.qty})
          </Text>
        </>
      ),
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

  // TẠO DANH SÁCH SẢN PHẨM CÓ THỂ THÊM
  // Lọc ra các item từ hóa đơn mà chưa có trong danh sách trả hàng
  const availableInvoiceItems = invoiceItems.filter(
    (invoiceItem) =>
      !returnItems.some((returnItem) => returnItem.productId === invoiceItem.productId)
  );

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <EditOutlined />
          <Title level={5} style={{ margin: 0 }}>
            Cập nhật đơn trả hàng
          </Title>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" size="large" onClick={onCancel} disabled={isLoading}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          size="large"
          loading={isLoading}
          onClick={() => form.submit()}
        >
          Lưu thay đổi
        </Button>,
      ]}
      centered
      destroyOnHidden
      width={1000}
      styles={{ body: { padding: "0px 20px 20px 20px", background: "#f9fafb" } }}
    >
      <Divider />
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <Text strong style={{ minWidth: 110 }}>
                Đơn hàng:
              </Text>
              <Tag color="blue" style={{ margin: 0 }}>
                {orderReturnData?.orderNo}
              </Tag>
            </div>
            <Form.Item
              label="Trạng thái"
              name="status"
              rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
            >
              <Select placeholder="Chọn trạng thái" size="large">
                <Option value="draft">Nháp</Option>
                <Option value="pending">Chờ xử lý</Option>
                <Option value="cancelled">Đã hủy</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Ghi chú" name="note">
              <TextArea rows={8} placeholder="Nhập ghi chú (nếu có)" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item label="Ảnh minh chứng" name="evdUrl">
              <div style={{ width: "100%" }} className="orderReturns-uploadContainer">
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleChange}
                  onPreview={handlePreview}
                  onRemove={handleRemove}
                  beforeUpload={() => false}
                  style={{ width: "100%", minHeight: 320 }}
                  maxCount={1}
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
        </Row>
        <Divider orientation="center">
          <Title level={5}>Danh sách sản phẩm trả hàng</Title>
        </Divider>

        {/* THÊM SELECT ĐỂ THÊM SẢN PHẨM */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Select
              showSearch
              placeholder="Chọn sản phẩm từ hóa đơn để thêm vào danh sách trả"
              loading={isInvoiceLoading}
              disabled={isInvoiceLoading || availableInvoiceItems.length === 0}
              style={{ width: "100%" }}
              onChange={handleAddProduct} // Gọi hàm handleAddProduct khi chọn
              value={null} // Reset select sau khi chọn
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableInvoiceItems.map((item) => (
                <Option
                  key={item.productId}
                  value={item.productId}
                  // label dùng cho tìm kiếm
                  label={`${item.productName} (${item.skuCode})`}
                >
                  {/* Hiển thị chi tiết trong Option */}
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
        {/* KẾT THÚC PHẦN THÊM MỚI */}

        <Table
          columns={productColumns}
          dataSource={returnItems}
          bordered
          pagination={false}
          rowKey={(record) => record.productId}
          size="small"
          scroll={{ x: 800 }}
        />
      </Form>
    </Modal>
  );
}

export default EditOrderReturnsModal;
