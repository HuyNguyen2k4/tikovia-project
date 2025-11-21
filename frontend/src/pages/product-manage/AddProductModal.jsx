import React, { useEffect, useState } from "react";

// Giả sử bạn có slice này để lấy danh mục
import { AppstoreOutlined, PlusOutlined } from "@ant-design/icons";
import "@assets/product-manage/AddProductModal.css";
import apiClient from "@services/apiClient";
import { fetchListAllCategories } from "@src/store/categorySlice";
import { createProduct } from "@src/store/productSlice";
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
  Typography,
  Upload,
  message,
  notification,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
const { Text } = Typography;
const { Option } = Select;

const AddProductModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const location = useLocation();

  const createStatus = useSelector((state) => state.product.createStatus);
  const createError = useSelector((state) => state.product.createError);

  // Giả sử bạn có categories trong Redux
  const categoryList = useSelector((state) => state.category.allCategories);
  const categoryFetchStatus = useSelector((state) => state.category.fetchListAllStatus);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setFileList([]);
      setPreviewImage("");
      setPreviewOpen(false);
      // if (!categoryList || categoryFetchStatus === "idle") {
      dispatch(fetchListAllCategories());
    }
  }, [visible, form, dispatch]);
  // useEffect riêng để xử lý auto-fill khi categories đã load xong
  useEffect(() => {
    if (visible && categoryList && categoryList.length > 0) {
      const queryParams = new URLSearchParams(location.search);

      const formData = {
        skuCode: queryParams.get("skuCode") || undefined,
        name: queryParams.get("name") || undefined,
        lowStockThreshold: queryParams.get("lowStockThreshold")
          ? Number(queryParams.get("lowStockThreshold"))
          : undefined,
        nearExpiryDays: queryParams.get("nearExpiryDays")
          ? Number(queryParams.get("nearExpiryDays"))
          : undefined,
        packUnit: queryParams.get("packUnit") || undefined,
        mainUnit: queryParams.get("mainUnit") || undefined,
      };

      // Xử lý categoryId hoặc categoryName
      const categoryIdParam = queryParams.get("categoryId");
      const categoryNameParam = queryParams.get("categoryName");

      if (categoryIdParam) {
        formData.categoryId = categoryIdParam;
      } else if (categoryNameParam) {
        // Tìm category theo tên (case-insensitive)
        const foundCategory = categoryList.find(
          (cat) => cat.name.toLowerCase() === categoryNameParam.toLowerCase()
        );
        if (foundCategory) {
          formData.categoryId = foundCategory.id;
        }
      }

      // Chỉ set các field có giá trị
      const fieldsToSet = Object.entries(formData)
        .filter(([_, value]) => value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      if (Object.keys(fieldsToSet).length > 0) {
        form.setFieldsValue(fieldsToSet);
      }
    }
  }, [visible, categoryList, location.search, form]);

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

      const productData = {
        skuCode: values.skuCode,
        name: values.name,
        categoryId: values.categoryId,
        lowStockThreshold: values.lowStockThreshold,
        nearExpiryDays: values.nearExpiryDays,
        imgUrl,
        packUnit: values.packUnit,
        mainUnit: values.mainUnit,
      };

      dispatch(createProduct(productData))
        .unwrap()
        .then(() => {
          notification.success({
            message: "Tạo sản phẩm thành công",
            description: `Sản phẩm đã được thêm vào hệ thống.`,
            duration: 5,
          });
          form.resetFields();
          setFileList([]);
          onCancel();
          if (onSuccess) onSuccess();
        })
        .catch((err) => {
          notification.error({
            message: "Có lỗi xảy ra",
            description: err.message || "Không thể tạo sản phẩm",
            duration: 5,
          });
        });
    } catch (error) {
      console.error("Submit error:", error);
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
          <AppstoreOutlined />
          <span style={{ fontSize: "18px" }}>Thêm sản phẩm mới</span>
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
            <Form.Item
              label="Ảnh sản phẩm"
              name="imgUrl"
              // rules={[{ required: true, message: "Vui lòng upload ảnh sản phẩm!" }]}
            >
              <div style={{ width: "100%" }} className="addProduct-uploadContainer">
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
          </Col>
        </Row>
        <Form.Item className="addProduct-submitContainer">
          <Space className="addProduct-buttonGroup">
            <Button
              onClick={onCancel}
              disabled={isLoading}
              size="large"
              className="addProduct-cancelButton"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
              className="addProduct-submitButton"
            >
              {isLoading ? "Đang tạo..." : "Tạo sản phẩm"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddProductModal;
