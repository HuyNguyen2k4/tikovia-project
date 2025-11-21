import React, { useEffect, useState } from "react";

import { UploadOutlined } from "@ant-design/icons";
import apiClient from "@services/apiClient";
import { updateTaskItemByPicker } from "@src/store/taskSlice";
import { Button, Col, Form, InputNumber, Modal, Row, Typography, Upload, notification } from "antd";
import { useDispatch } from "react-redux";

const { Text } = Typography;

const UpdateTaskItemModal = ({ visible, onCancel, item, task, onSuccess }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [preEvdFile, setPreEvdFile] = useState(null);
  const [postEvdFile, setPostEvdFile] = useState(null);
  useEffect(() => {
    if (item) {
      form.setFieldsValue({ postQty: item.postQty });
      setPreEvdFile(null);
      setPostEvdFile(null);
    }
  }, [item, form]);
  /** Upload ảnh lên R2 */
  const uploadImageToR2 = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.url;
  };

  /** Xử lý lưu cập nhật */
  const handleSaveUpdate = async () => {
    try {
      const { postQty } = await form.validateFields();
      setUploading(true);

      let preUrl = item.preEvd;
      let postUrl = item.postEvd;

      if (preEvdFile) preUrl = await uploadImageToR2(preEvdFile);
      if (postEvdFile) postUrl = await uploadImageToR2(postEvdFile);

      await dispatch(
        updateTaskItemByPicker({
          taskId: task.id,
          itemId: item.id,
          data: { postQty, preEvd: preUrl, postEvd: postUrl },
        })
      ).unwrap();

      notification.success({ message: "Cập nhật sản phẩm thành công" });
      onSuccess?.();
      onCancel?.();
    } catch (err) {
      notification.error({
        message: "Lỗi cập nhật sản phẩm",
        description: err?.message || "Không thể cập nhật sản phẩm.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={visible}
      title="Cập nhật sản phẩm"
      onCancel={onCancel}
      onOk={handleSaveUpdate}
      okText="Lưu"
      confirmLoading={uploading}
      destroyOnClose
      width={700}
    >
      {item ? (
        <Form form={form} layout="vertical" initialValues={{ postQty: item.postQty }}>
          {/* === Tên sản phẩm === */}
          <Form.Item>
            <Text strong style={{ fontSize: 16 }}>
              {item.productName}
            </Text>
          </Form.Item>

          {/* === 2 CỘT: preQty / postQty === */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Số lượng yêu cầu">
                <InputNumber value={item.preQty} disabled style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="postQty"
                label="Số lượng hoàn thành"
                rules={[{ required: true, message: "Vui lòng nhập số lượng hoàn thành" }]}
              >
                <InputNumber
                  min={0}
                  max={item.preQty} // ✅ Giới hạn không vượt quá preQty
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* === 2 CỘT: Ảnh Pre / Ảnh Post === */}
          <Row gutter={16}>
            {/* Cột trái - Ảnh Pre */}
            <Col span={12}>
              <Form.Item label="Ảnh trước khi soạn (Pre)">
                <Upload
                  beforeUpload={(file) => {
                    setPreEvdFile(file);
                    return false;
                  }}
                  maxCount={1}
                  accept="image/*"
                  showUploadList={false} // ✅ Ẩn tên file để tránh tràn
                >
                  <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
                </Upload>

                {/* Ảnh cũ */}
                {item.preEvd && (
                  <img
                    src={item.preEvd}
                    alt="Pre"
                    style={{
                      width: "100%",
                      maxWidth: 180,
                      height: 120,
                      marginTop: 8,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                )}
                {/* Ảnh mới chọn */}
                {preEvdFile && (
                  <img
                    src={URL.createObjectURL(preEvdFile)}
                    alt="Pre Preview"
                    style={{
                      width: "100%",
                      maxWidth: 180,
                      height: 120,
                      marginTop: 8,
                      borderRadius: 8,
                      objectFit: "cover",
                      border: "1px dashed #999",
                    }}
                  />
                )}
              </Form.Item>
            </Col>

            {/* Cột phải - Ảnh Post */}
            <Col span={12}>
              <Form.Item label="Ảnh sau khi soạn (Post)">
                <Upload
                  beforeUpload={(file) => {
                    setPostEvdFile(file);
                    return false;
                  }}
                  maxCount={1}
                  accept="image/*"
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
                </Upload>

                {/* Ảnh cũ */}
                {item.postEvd && (
                  <img
                    src={item.postEvd}
                    alt="Post"
                    style={{
                      width: "100%",
                      maxWidth: 180,
                      height: 120,
                      marginTop: 8,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                )}
                {/* Ảnh mới chọn */}
                {postEvdFile && (
                  <img
                    src={URL.createObjectURL(postEvdFile)}
                    alt="Post Preview"
                    style={{
                      width: "100%",
                      maxWidth: 180,
                      height: 120,
                      marginTop: 8,
                      borderRadius: 8,
                      objectFit: "cover",
                      border: "1px dashed #999",
                    }}
                  />
                )}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      ) : (
        <Text type="secondary">Không có dữ liệu sản phẩm</Text>
      )}
    </Modal>
  );
};

export default UpdateTaskItemModal;
