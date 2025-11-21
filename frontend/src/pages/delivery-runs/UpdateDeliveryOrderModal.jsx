import React, { useEffect, useState } from "react";

import { PlusOutlined, QrcodeOutlined, UploadOutlined } from "@ant-design/icons";
import apiClient from "@src/services/apiClient";
import { completeDeliveryRunOrder } from "@src/store/deliveryRunsSlice";
import {
  Button,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Typography,
  Upload,
  message,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

import PaymentPage from "../PaymentPage";

const { Text } = Typography;
const { TextArea } = Input;

const UpdateDeliveryOrderModal = ({ visible, onCancel, order, onSuccess }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Thay đổi cách quản lý file như AddProductModal
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);

  const userRole = useSelector((state) => state.auth.user?.role);
  const isShipper = userRole === "shipper";
  const isLocked = order?.status === "completed" || order?.status === "cancelled";

  // Reset form và fileList khi modal mở/đóng
  useEffect(() => {
    if (visible && order) {
      form.setFieldsValue({
        actualPay: order.actualPay || order.codAmount || 0,
        note: order.note,
      });

      // Nếu order đã có ảnh, hiển thị trong fileList
      if (order.evdUrl) {
        setFileList([
          {
            uid: "-1",
            name: "evidence.jpg",
            status: "done",
            url: order.evdUrl,
            thumbUrl: order.evdUrl,
          },
        ]);
      } else {
        setFileList([]);
      }
    } else {
      setFileList([]);
      setPreviewImage("");
      setPreviewOpen(false);
    }
  }, [visible, order, form]);

  // Convert file to base64 for preview (từ AddProductModal)
  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  // Xử lý khi upload thay đổi (từ AddProductModal)
  const handleChange = async ({ file, fileList: newFileList }) => {
    if (!isShipper) return;

    let limitedFileList = newFileList.filter((f) => f.originFileObj || f.url).slice(-1);

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

  // Xử lý khi click xem ảnh (từ AddProductModal)
  const handlePreview = async (file) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview || file.thumbUrl);
    setPreviewOpen(true);
  };

  // Xử lý khi xóa file (từ AddProductModal)
  const handleRemove = (file) => {
    if (!isShipper) return false;
    return true;
  };

  // Upload ảnh lên R2 (từ AddProductModal)
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

  /** Xử lý lưu cập nhật */
  const handleSaveUpdate = async () => {
    try {
      const values = await form.validateFields();
      const codAmount = Number(order.codAmount) || 0;
      const actualPay = Number(values.actualPay) || 0;
      if (actualPay > codAmount) {
        notification.error({
          message: "Lỗi cập nhật đơn hàng",
          description: "Số tiền thực trả không được vượt quá số tiền COD",
        });
        return;
      }
      setUploading(true);

      let evdUrl = order.evdUrl;

      // Upload ảnh nếu có file mới được chọn (từ AddProductModal)
      if (fileList.length > 0 && fileList[0].originFileObj) {
        setIsUploading(true);
        const hideUploadMsg = message.loading("Đang upload ảnh minh chứng...", 0);

        try {
          evdUrl = await uploadImageToR2(fileList[0].originFileObj);
          hideUploadMsg();
          console.log("Evidence image uploaded successfully:", evdUrl);
        } catch (uploadError) {
          hideUploadMsg();
          notification.error({
            message: "Lỗi upload ảnh",
            description:
              uploadError.response?.data?.message ||
              uploadError.message ||
              "Không thể upload ảnh minh chứng",
            duration: 5,
          });
          setIsUploading(false);
          setUploading(false);
          return;
        }
        setIsUploading(false);
      }

      // Gọi API cập nhật
      await dispatch(
        completeDeliveryRunOrder({
          orderId: order.id,
          data: {
            actualPay: values.actualPay,
            evdUrl: evdUrl,
            note: values.note,
          },
        })
      ).unwrap();

      notification.success({
        message: "Cập nhật đơn hàng thành công",
        description: "Thông tin giao hàng đã được cập nhật",
      });
      onSuccess?.();
      onCancel?.();
    } catch (err) {
      notification.error({
        message: "Lỗi cập nhật đơn hàng",
        description: err || "Không thể cập nhật đơn hàng.",
      });
    } finally {
      setUploading(false);
    }
  };

  const isLoading = uploading || isUploading;
  /** === QR === */
  const handleOpenQRModal = () => {
    form.setFieldsValue({ actualPay: 0 });
    setIsQRModalVisible(true);
  };
  return (
    <>
      <Modal
        open={visible}
        title="Cập nhật thông tin giao hàng"
        onCancel={onCancel}
        onOk={isShipper ? handleSaveUpdate : undefined}
        okText="Lưu cập nhật"
        cancelText="Hủy"
        confirmLoading={isLoading}
        destroyOnHidden={true}
        width={700}
        centered
        maskClosable={!isLoading}
        footer={
          isShipper && !isLocked
            ? [
                <Button key="cancel" onClick={onCancel} disabled={isLoading}>
                  Hủy
                </Button>,
                <Button key="submit" type="primary" loading={isLoading} onClick={handleSaveUpdate}>
                  Lưu cập nhật
                </Button>,
              ]
            : [
                <Button key="close" onClick={onCancel}>
                  Đóng
                </Button>,
              ]
        }
      >
        {/* Thông báo trạng thái đã bị khóa */}
        {isLocked && (
          <div
            style={{
              background: "#fff2f0",
              border: "1px solid #ffccc7",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 12,
            }}
          >
            <Text type="danger" strong>
              ⚠️ Đơn hàng đã {order.status === "completed" ? "hoàn thành" : "bị hủy"} — không thể
              chỉnh sửa.
            </Text>
          </div>
        )}

        {order ? (
          <>
            <Form
              form={form}
              layout="vertical"
              disabled={isLoading || isLocked} // ✅ Disable form khi locked
              initialValues={{
                actualPay: order.actualPay || order.codAmount || 0,
                note: order.note || "",
              }}
            >
              {/* === Thông tin đơn hàng === */}
              <div
                style={{ marginBottom: 16, padding: 12, background: "#f5f5f5", borderRadius: 8 }}
              >
                <Text strong style={{ fontSize: 16 }}>
                  {order.orderNo || order.id}
                </Text>
                <br />
                <Text type="secondary">
                  Khách hàng: {order.customer?.name || order.customerName || "-"}
                </Text>
                <br />
                <Text type="secondary">
                  Địa chỉ: {order.customer?.address || order.address || "-"}
                </Text>
              </div>

              {/* === 2 CỘT: COD Amount / Actual Pay === */}
              <Row gutter={16}>
                <Col xs={24} sm={12} md={12} lg={12} xl={12}>
                  <Form.Item label="Số tiền COD">
                    <Row gutter={8} align="middle">
                      <Col flex="auto">
                        <InputNumber
                          value={order.codAmount}
                          disabled
                          style={{
                            width: "100%",
                            cursor: "not-allowed",
                          }}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          suffix="₫"
                        />
                      </Col>
                      <Col flex="80px">
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<QrcodeOutlined />}
                          style={{ width: "100%" }}
                          onClick={handleOpenQRModal}
                        >
                          QR
                        </Button>
                      </Col>
                    </Row>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={12} lg={12} xl={12}>
                  <Form.Item
                    name="actualPay"
                    label="Số tiền mặt thực tế thu được"
                    rules={[
                      { required: true, message: "Vui lòng nhập số tiền thực tế" },
                      { type: "number", min: 0, message: "Số tiền phải lớn hơn 0" },
                    ]}
                  >
                    <InputNumber
                      min={0}
                      // max={order.codAmount}
                      readOnly={!isShipper || isLocked}
                      style={{
                        width: "100%",
                        cursor: !isShipper || isLocked ? "not-allowed" : "text",
                      }}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                      placeholder={
                        isShipper ? "Nhập số tiền thực tế" : "Chỉ shipper mới có thể chỉnh sửa"
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 0]}>
                <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                  {/* === Ảnh minh chứng === */}
                  <Form.Item label="Ảnh minh chứng giao hàng">
                    <div style={{ width: "100%" }} className="updateDelivery-uploadContainer">
                      <Upload
                        accept="image/*"
                        listType="picture-card"
                        fileList={fileList}
                        onChange={handleChange}
                        onPreview={handlePreview}
                        onRemove={handleRemove}
                        beforeUpload={() => false}
                        style={{ width: "100%", minHeight: 200 }}
                        maxCount={1}
                        disabled={!isShipper || isLocked} // ✅ thêm ở đây
                        previewFile={async (file) => {
                          if (file.originFileObj) return await getBase64(file.originFileObj);
                          return file.url || file.thumbUrl;
                        }}
                      >
                        {fileList.length >= 1 ? null : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              cursor: !isShipper || isLocked ? "not-allowed" : "pointer", // ✅ cập nhật
                            }}
                          >
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>
                              {!isShipper || isLocked ? "Chỉ xem" : "Tải ảnh lên"}
                            </div>
                          </div>
                        )}
                      </Upload>

                      <Text
                        type="secondary"
                        style={{ fontSize: 13, display: "block", marginTop: 8 }}
                      >
                        Định dạng: JPG, PNG, GIF. Dung lượng tối đa 2MB.
                      </Text>
                    </div>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                  {/* === Ghi chú === */}
                  <Form.Item name="note" label="Ghi chú">
                    <TextArea
                      rows={10}
                      readOnly={!isShipper || isLocked}
                      style={{
                        cursor: !isShipper || isLocked ? "not-allowed" : "text",
                      }}
                      placeholder={
                        isShipper
                          ? "Nhập ghi chú về tình trạng giao hàng (tùy chọn)..."
                          : "Chỉ shipper mới có thể chỉnh sửa ghi chú"
                      }
                      maxLength={500}
                      showCount={isShipper}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Thông báo quyền truy cập */}
              {(!isShipper || isLocked) && (
                <div
                  style={{
                    padding: 12,
                    background: isLocked ? "#fff2f0" : "#fff7e6",
                    border: `1px solid ${isLocked ? "#ffccc7" : "#ffd666"}`,
                    borderRadius: 8,
                    marginTop: 16,
                  }}
                >
                  <Text type={isLocked ? "danger" : "warning"} style={{ fontSize: 14 }}>
                    <strong>Lưu ý:</strong>{" "}
                    {isLocked
                      ? `Đơn hàng đã ${order.status === "completed" ? "hoàn thành" : "bị hủy"}, không thể chỉnh sửa thông tin.`
                      : "Chỉ có shipper mới có thể chỉnh sửa thông tin giao hàng. Bạn chỉ có thể xem thông tin."}
                  </Text>
                </div>
              )}
            </Form>
            {/* === Modal QR Code === */}
            <Modal
              width={700}
              open={isQRModalVisible}
              footer={null}
              centered
              onCancel={() => setIsQRModalVisible(false)}
            >
              <PaymentPage code={order?.orderNo} />
            </Modal>
          </>
        ) : (
          <Text type="secondary">Không có dữ liệu đơn hàng</Text>
        )}
      </Modal>

      {/* Preview Modal */}
      <Image
        wrapperStyle={{ display: "none" }}
        preview={{
          visible: previewOpen,
          onVisibleChange: (visible) => setPreviewOpen(visible),
          afterOpenChange: (visible) => !visible && setPreviewImage(""),
          zIndex: 2000,
        }}
        // ✅ SỬA TẠI ĐÂY
        src={previewImage || null}
      />
    </>
  );
};

export default UpdateDeliveryOrderModal;
