import React, { useEffect, useRef, useState } from "react";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { updateSupTransactionPayment } from "@src/store/supTransactionPaymentSlice";
import { listUsers } from "@src/services/userService";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Typography,
  Upload,
  notification,
  message,
} from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import apiClient from "@services/apiClient";

const { Text } = Typography;
const { Option } = Select;

const EditSupTransactionPaymentModal = ({ visible, onCancel, onSuccess, paymentData }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [fileList, setFileList] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [imageManuallyDeleted, setImageManuallyDeleted] = useState(false); // Track manual deletion

  // User select state (lazy load / search + pagination)
  const [userOptions, setUserOptions] = useState([]);
  const userPageRef = useRef(0);
  const userHasMoreRef = useRef(true);
  const [userLoading, setUserLoading] = useState(false);
  const userSearchRef = useRef("");

  const updateStatus = useSelector((state) => state.supTransactionPayment.updateStatus);
  const updateError = useSelector((state) => state.supTransactionPayment.updateError);

  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  useEffect(() => {
    if (visible && paymentData) {
      form.setFieldsValue({
        transId: paymentData.transId,
        amount: paymentData.amount,
        paidAt: paymentData.paidAt ? dayjs(paymentData.paidAt) : null,
        paidBy: paymentData.paidBy, // Use ID, not name
        note: paymentData.note,
        evdUrl: paymentData.evdUrl
          ? [
              {
                uid: "-1",
                name: "Chứng từ",
                status: "done",
                url: paymentData.evdUrl,
              },
            ]
          : [],
      });
      
      // Pre-populate the user select with current payer
      if (paymentData.paidBy && paymentData.paidByName) {
        setUserOptions([{
          value: paymentData.paidBy,
          label: paymentData.paidByName,
          raw: { id: paymentData.paidBy, fullName: paymentData.paidByName }
        }]);
      }
      
      // Set original image URL
      if (paymentData.evdUrl) {
        setOriginalImageUrl(paymentData.evdUrl);
        setFileList([
          {
            uid: "-1",
            name: "Chứng từ",
            status: "done",
            url: paymentData.evdUrl,
          },
        ]);
      }
    }
    
    if (!visible) {
      form.resetFields();
      setFileList([]);
      setUserOptions([]);
      setOriginalImageUrl("");
      setImageManuallyDeleted(false);
    }
  }, [visible, paymentData, form]);

  const handleChange = async ({ file, fileList: newFileList }) => {
    let limitedFileList = newFileList.filter(f => f.originFileObj || f.url).slice(-1);
    
    if (limitedFileList.length > 0 && limitedFileList[0].originFileObj) {
      try {
        const preview = await getBase64(limitedFileList[0].originFileObj);
        limitedFileList[0].url = preview;
        limitedFileList[0].thumbUrl = preview;
        limitedFileList[0].status = 'done';
      } catch (error) {
        limitedFileList[0].status = 'error';
      }
    }
    
    setFileList(limitedFileList);
  };

  const extractKeyFromUrl = (url) => {
    if (!url) return null;
    
    try {
      if (url.includes('/uploads/')) {
        const urlParts = url.split('/uploads/');
        return 'uploads/' + urlParts[1];
      } else if (url.includes('.r2.dev/')) {
        const urlParts = url.split('.r2.dev/');
        return urlParts[1];
      } else {
        const urlParts = url.split('/');
        return urlParts.slice(-2).join('/');
      }
    } catch (error) {
      return null;
    }
  };

  // Delete image from R2
  const deleteImageFromR2 = async (url) => {
    try {
      const key = extractKeyFromUrl(url);
      if (!key) {
        return { success: false, message: 'Invalid URL' };
      }
      
      const encodedKey = encodeURIComponent(key);
      const hideLoading = message.loading('Đang xóa ảnh...', 0);
      
      const response = await apiClient.delete(`/upload/${encodedKey}`);
      hideLoading();
      
      if (response.data.success) {
        notification.success({ 
          message: "✅ Xóa ảnh thành công!", 
          description: "Ảnh đã được xóa",
          duration: 3
        });
        return { success: true };
      } else {
        notification.warning({
          message: "⚠️ Không thể xóa ảnh",
          description: response.data.message || "Có lỗi xảy ra khi xóa ảnh",
          duration: 3
        });
        return { success: false };
      }
    } catch (error) {
      notification.error({
        message: "❌ Lỗi xóa ảnh",
        description: error.response?.data?.message || "Không thể xóa ảnh khỏi R2",
        duration: 3,
      });
      return { success: false };
    }
  };

  const handleRemove = async (file) => {
    const urlToDelete = file.url || file.response?.url;
    
    if (urlToDelete && urlToDelete.startsWith('http')) {
      await deleteImageFromR2(urlToDelete);
      setImageManuallyDeleted(true); // Mark as manually deleted
    }
    
    return true;
  };

  const uploadImageToR2 = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.url) {
        return response.data.url;
      } else {
        throw new Error('Upload failed - no URL returned');
      }
    } catch (error) {
      throw error;
    }
  };

  const isLoading = updateStatus === "loading" || isUploading;

  const handlePreview = async (file) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview || file.thumbUrl);
    setPreviewOpen(true);
  };

  const fetchUsers = async (q = "", append = false) => {
    if (!userHasMoreRef.current && append) return;
    setUserLoading(true);
    const limit = 20;
    const offset = append ? (userPageRef.current + 1) * limit : 0;
    try {
      const res = await listUsers({ q: q || undefined, limit, offset });
      const payload = res.data || {};
      const items = payload.data || [];
      const pagination = payload.pagination || {};
      userHasMoreRef.current = !!pagination.hasMore;
      userPageRef.current = append ? userPageRef.current + 1 : 0;
      const mapped = items.map((u) => ({
        value: u.id,
        label: u.fullName || u.username || `${u.id}`,
        raw: u,
      }));
      setUserOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch (err) {
    } finally {
      setUserLoading(false);
    }
  };

  const handleUserSearch = (value) => {
    userSearchRef.current = value;
    fetchUsers(value, false);
  };

  const handleUserPopupScroll = (e) => {
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!userLoading && userHasMoreRef.current) {
        fetchUsers(userSearchRef.current, true);
      }
    }
  };

  const handleSubmit = async (values) => {
    try {
      let evdUrl = originalImageUrl;
      let needToDeleteOldImage = false;
      
      if (fileList.length > 0 && fileList[0].originFileObj) {
        setIsUploading(true);
        const hideUploadMsg = message.loading('Đang upload ảnh chứng từ mới...', 0);
        
        try {
          evdUrl = await uploadImageToR2(fileList[0].originFileObj);
          hideUploadMsg();
          
          if (originalImageUrl && originalImageUrl !== evdUrl) {
            needToDeleteOldImage = true;
          }
        } catch (uploadError) {
          hideUploadMsg();
          setIsUploading(false);
          notification.error({
            message: "Lỗi upload ảnh",
            description: uploadError.response?.data?.message || uploadError.message || "Không thể upload ảnh",
            duration: 5,
          });
          return;
        }
        setIsUploading(false);
      } else if (fileList.length === 0 && originalImageUrl) {
        // User removed the image without adding a new one
        needToDeleteOldImage = true;
        evdUrl = "";
      }

      const updateData = {
        amount: parseFloat(values.amount),
        paidAt: values.paidAt.toISOString(),
        paidBy: values.paidBy,
        evdUrl,
        note: values.note || null,
      };

      dispatch(updateSupTransactionPayment({
        paymentId: paymentData.id,
        paymentData: updateData,
      }))
        .unwrap()
        .then(async () => {
          // Only delete old image if it wasn't already manually deleted
          if (needToDeleteOldImage && originalImageUrl && !imageManuallyDeleted) {
            await deleteImageFromR2(originalImageUrl);
          }
          
          notification.success({
            message: "Cập nhật thành công",
            description: `Thông tin thanh toán đã được cập nhật.`,
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
            description: updateError?.message || err?.message || "Không thể cập nhật thanh toán",
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
          <EditOutlined />
          <span style={{ fontSize: "18px" }}>Chỉnh sửa thanh toán</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      centered
      maskClosable={!isLoading}
    >
      <Divider />
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={isLoading}>
        <Form.Item label="ID Giao dịch" name="transId">
          <Input disabled size="large" style={{ color: "#666" }} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Số tiền thanh toán"
              name="amount"
              rules={[
                { required: true, message: "Vui lòng nhập số tiền!" },
                { pattern: /^\d+(\.\d+)?$/, message: "Số tiền không hợp lệ" },
              ]}
            >
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                size="large"
                addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Ngày thanh toán"
              name="paidAt"
              rules={[{ required: true, message: "Vui lòng chọn ngày thanh toán!" }]}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                placeholder="Chọn ngày thanh toán"
                size="large"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Người thanh toán"
          name="paidBy"
          rules={[{ required: true, message: "Vui lòng chọn người thanh toán!" }]}
        >
          <Select
            showSearch
            placeholder="Tìm hoặc chọn người thanh toán"
            filterOption={false}
            onSearch={handleUserSearch}
            onPopupScroll={handleUserPopupScroll}
            notFoundContent={userLoading ? <Spin size="small" /> : null}
            options={userOptions}
            onFocus={() => {
              if (userOptions.length === 0) fetchUsers("", false);
            }}
            size="large"
            allowClear
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              label="Ảnh chứng từ"
              name="evdUrl"
              rules={[{ required: true, message: "Vui lòng upload ảnh chứng từ!" }]}
            >
              <div className="large-upload">
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleChange}
                  onPreview={handlePreview}
                  onRemove={handleRemove}
                  beforeUpload={() => false}
                  customRequest={() => {}}
                  maxCount={1}
                >
                  {fileList.length >= 1 ? null : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  )}
                </Upload>
              </div>
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
            </Form.Item>
          </Col>
          <Col span={18}>
            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea
                placeholder="Nhập ghi chú về thanh toán (tùy chọn)"
                rows={3}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Space>
            <Button onClick={onCancel} disabled={isLoading} size="large">
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
            >
              {isLoading ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditSupTransactionPaymentModal;