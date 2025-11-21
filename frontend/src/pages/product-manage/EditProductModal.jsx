import React, { useEffect, useState } from "react";

import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import "@assets/product-manage/EditProductModal.css";
import apiClient from "@services/apiClient";
import { fetchListAllCategories } from "@src/store/categorySlice";
import { updateProduct } from "@src/store/productSlice";
import {
  Button,
  Col,
  Divider,
  Form,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
  message,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Option } = Select;
const { Text } = Typography;

const EditProductModal = ({ visible, onCancel, onSuccess, productData }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [imageManuallyDeleted, setImageManuallyDeleted] = useState(false);

  const updateStatus = useSelector((state) => state.product.updateStatus);
  const updateError = useSelector((state) => state.product.updateError);
  const userRole = useSelector((state) => state.auth.user?.role);

  const categoryList = useSelector((state) => state.category.allCategories);
  const categoryFetchStatus = useSelector((state) => state.category.fetchListAllStatus);

  useEffect(() => {
    if (visible) {
      dispatch(fetchListAllCategories());
    }
  }, [visible, dispatch]);

  useEffect(() => {
    if (visible && productData) {
      form.setFieldsValue({
        skuCode: productData.skuCode,
        name: productData.name,
        categoryId: productData.categoryId,
        lowStockThreshold: productData.lowStockThreshold,
        nearExpiryDays: productData.nearExpiryDays,
        packUnit: productData.packUnit,
        mainUnit: productData.mainUnit,
        adminLocked: productData.adminLocked,
        imgUrl: productData.imgUrl,
      });

      if (productData.imgUrl) {
        setOriginalImageUrl(productData.imgUrl);
        setFileList([
          {
            uid: "-1",
            name: "Ảnh sản phẩm",
            status: "done",
            url: productData.imgUrl,
          },
        ]);
      }
    }

    if (!visible) {
      form.resetFields();
      setFileList([]);
      setPreviewImage("");
      setPreviewOpen(false);
      setOriginalImageUrl("");
      setImageManuallyDeleted(false);
    }
  }, [visible, productData, form]);

  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleChange = async ({ file, fileList: newFileList }) => {
    let limitedFileList = newFileList.filter((f) => f.originFileObj || f.url).slice(-1);

    if (limitedFileList.length > 0 && limitedFileList[0].originFileObj) {
      try {
        const preview = await getBase64(limitedFileList[0].originFileObj);
        limitedFileList[0].url = preview;
        limitedFileList[0].thumbUrl = preview;
        limitedFileList[0].status = "done";
      } catch (error) {
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

  const extractKeyFromUrl = (url) => {
    if (!url) return null;

    try {
      if (url.includes("/uploads/")) {
        const urlParts = url.split("/uploads/");
        return "uploads/" + urlParts[1];
      } else if (url.includes(".r2.dev/")) {
        const urlParts = url.split(".r2.dev/");
        return urlParts[1];
      } else {
        const urlParts = url.split("/");
        return urlParts.slice(-2).join("/");
      }
    } catch (error) {
      return null;
    }
  };

  const deleteImageFromR2 = async (url) => {
    try {
      const key = extractKeyFromUrl(url);
      if (!key) {
        return { success: false, message: "Invalid URL" };
      }
      const encodedKey = encodeURIComponent(key);
      const hideLoading = message.loading("Đang xóa ảnh...", 0);
      const response = await apiClient.delete(`/upload/${encodedKey}`);
      hideLoading();
      if (response.data.success) {
        notification.success({
          message: "Xóa ảnh thành công!",
          description: "Ảnh đã được xóa",
          duration: 3,
        });
        return { success: true };
      } else {
        notification.warning({
          message: "Không thể xóa ảnh",
          description: response.data.message || "Có lỗi xảy ra khi xóa ảnh",
          duration: 3,
        });
        return { success: false };
      }
    } catch (error) {
      notification.error({
        message: "Lỗi xóa ảnh",
        description: error.response?.data?.message || "Không thể xóa ảnh khỏi R2",
        duration: 3,
      });
      return { success: false };
    }
  };

  const handleRemove = async (file) => {
    const urlToDelete = file.url || file.response?.url;

    if (urlToDelete && urlToDelete.startsWith("http")) {
      await deleteImageFromR2(urlToDelete);
      setImageManuallyDeleted(true);
    }

    return true;
  };

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

  const isLoading = updateStatus === "loading" || isUploading;

  const handleSubmit = async (values) => {
    try {
      let imgUrl = originalImageUrl;
      let needToDeleteOldImage = false;
      if (fileList.length > 0 && fileList[0].originFileObj) {
        setIsUploading(true);
        const hideUploadMsg = message.loading("Đang upload ảnh mới...", 0);
        try {
          imgUrl = await uploadImageToR2(fileList[0].originFileObj);
          hideUploadMsg();
          if (originalImageUrl && originalImageUrl !== imgUrl) {
            needToDeleteOldImage = true;
          }
        } catch (uploadError) {
          hideUploadMsg();
          setIsUploading(false);
          notification.error({
            message: "Lỗi upload ảnh",
            description:
              uploadError.response?.data?.message || uploadError.message || "Không thể upload ảnh",
            duration: 5,
          });
          return;
        }
        setIsUploading(false);
      } else if (fileList.length === 0 && originalImageUrl) {
        needToDeleteOldImage = true;
        imgUrl = "";
      }
      const updateData = {
        skuCode: values.skuCode,
        name: values.name,
        categoryId: values.categoryId,
        lowStockThreshold: values.lowStockThreshold,
        nearExpiryDays: values.nearExpiryDays,
        packUnit: values.packUnit,
        mainUnit: values.mainUnit,
        adminLocked: values.adminLocked,
        imgUrl,
      };
      dispatch(updateProduct({ productId: productData.id, productData: updateData }))
        .unwrap()
        .then(async () => {
          if (needToDeleteOldImage && originalImageUrl && !imageManuallyDeleted) {
            await deleteImageFromR2(originalImageUrl);
          }
          notification.success({
            message: "Cập nhật thành công",
            description: `Thông tin sản phẩm đã được cập nhật.`,
            duration: 5,
          });
          form.resetFields();
          setFileList([]);
          setOriginalImageUrl("");
          setImageManuallyDeleted(false);
          onCancel();
          if (onSuccess) onSuccess();
        })
        .catch((err) => {
          notification.error({
            message: "Có lỗi xảy ra",
            description: updateError?.message || err?.message || "Không thể cập nhật sản phẩm",
            duration: 5,
          });
        });
    } catch (error) {
      notification.error({
        message: "Có lỗi xảy ra",
        description: error.message,
        duration: 5,
      });
    }
  };
  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span style={{ fontSize: "18px" }}>Chỉnh sửa sản phẩm</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      destroyOnHidden
      centered
      maskClosable={!isLoading}
    >
      <Divider />
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={isLoading}>
        <Row gutter={16}>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item label="Ảnh sản phẩm" name="imgUrl">
              <div style={{ width: "100%" }} className="editProduct-uploadContainer">
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
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item
              label="Mã SKU"
              name="skuCode"
              rules={[{ required: true, message: "Vui lòng nhập mã SKU!" }]}
            >
              <Input placeholder="Nhập mã SKU" size="large" />
            </Form.Item>
            <Form.Item
              label="Tên sản phẩm"
              name="name"
              rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm!" }]}
            >
              <Input placeholder="Nhập tên sản phẩm" size="large" />
            </Form.Item>
            <Form.Item
              label="Danh mục"
              name="categoryId"
              rules={[{ required: true, message: "Vui lòng chọn danh mục!" }]}
            >
              <Select
                placeholder="Chọn danh mục"
                loading={categoryFetchStatus === "loading"}
                showSearch
                optionFilterProp="children"
                size="large"
              >
                {(categoryList || []).map((cat) => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Ngưỡng cảnh báo gần hết hàng"
                  name="lowStockThreshold"
                  rules={[{ required: true, message: "Nhập ngưỡng tồn kho!" }]}
                >
                  <Input type="number" min={0} placeholder="0" step={0.001} size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Ngưỡng cảnh báo gần hết hạn"
                  name="nearExpiryDays"
                  rules={[{ required: true, message: "Nhập số ngày!" }]}
                >
                  <Input type="number" min={0} placeholder="7" size="large" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Đơn vị đóng gói"
                  name="packUnit"
                  rules={[{ required: true, message: "Nhập đơn vị đóng gói!" }]}
                >
                  <Input type="text" placeholder="Nhập đơn vị đóng gói" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Đơn vị chính"
                  name="mainUnit"
                  rules={[{ required: true, message: "Nhập đơn vị chính!" }]}
                >
                  <Input type="text" placeholder="Nhập đơn vị chính" size="large" />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>Khóa sản phẩm:</span>
              <Form.Item name="adminLocked" valuePropName="checked" noStyle>
                <Switch
                  checkedChildren="Mở"
                  unCheckedChildren="Khóa"
                  disabled={userRole !== "admin"}
                />
              </Form.Item>
            </div>
          </Col>
        </Row>

        <Form.Item className="editProduct-submitContainer">
          <Space className="editProduct-buttonGroup">
            <Button
              onClick={onCancel}
              disabled={isLoading}
              size="large"
              className="editProduct-cancelButton"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
              className="editProduct-submitButton"
            >
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditProductModal;
