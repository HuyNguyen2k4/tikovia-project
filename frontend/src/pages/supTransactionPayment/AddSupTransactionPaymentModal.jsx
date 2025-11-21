import React, { useEffect, useRef, useState } from "react";

import { CreditCardOutlined, DollarOutlined, PlusOutlined } from "@ant-design/icons";
import apiClient from "@services/apiClient";
import { listSupplierTransactions } from "@src/services/supplierTransactionCombineService";
import { listUsers } from "@src/services/userService";
import { createSupTransactionPayment } from "@src/store/supTransactionPaymentSlice";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Typography,
  Upload,
  message,
  notification,
} from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

import SupTransactionPaymentForm from "./SupTransactionPaymentForm";

const { Text } = Typography;
const { Option } = Select;

const AddSupTransactionPaymentModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [fileList, setFileList] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const createStatus = useSelector((state) => state.supTransactionPayment.createStatus);
  const createError = useSelector((state) => state.supTransactionPayment.createError);

  // Transaction select
  const [txOptions, setTxOptions] = useState([]);
  const txPageRef = useRef(0);
  const txHasMoreRef = useRef(true);
  const [txLoading, setTxLoading] = useState(false);
  const txSearchRef = useRef("");

  // User select
  const [userOptions, setUserOptions] = useState([]);
  const userPageRef = useRef(0);
  const userHasMoreRef = useRef(true);
  const [userLoading, setUserLoading] = useState(false);
  const userSearchRef = useRef("");

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ paidAt: dayjs() });
      txPageRef.current = 0;
      txHasMoreRef.current = true;
      setTxOptions([]);
      userPageRef.current = 0;
      userHasMoreRef.current = true;
      setUserOptions([]);
      setFileList([]);
    }
  }, [visible, form]);

  // Fetch giao dịch
  const fetchTransactions = async (q = "", append = false) => {
    if (!txHasMoreRef.current && append) return;
    setTxLoading(true);
    const limit = 20;
    const offset = append ? (txPageRef.current + 1) * limit : 0;
    try {
      const res = await listSupplierTransactions({ q, limit, offset });
      const payload = res.data || {};
      const items = payload.data || [];
      const pagination = payload.pagination || {};
      txHasMoreRef.current = !!pagination.hasMore;
      txPageRef.current = append ? txPageRef.current + 1 : 0;
      const mapped = items.map((t) => ({
        value: t.id,
        label: `${t.supplierName || `${t.id}`} — ${t.docNo || t.id}`,
        raw: t,
      }));
      setTxOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
    } finally {
      setTxLoading(false);
    }
  };

  // Fetch người dùng
  const fetchUsers = async (q = "", append = false) => {
    if (!userHasMoreRef.current && append) return;
    setUserLoading(true);
    const limit = 20;
    const offset = append ? (userPageRef.current + 1) * limit : 0;
    try {
      const res = await listUsers({ q, limit, offset });
      const payload = res.data || {};
      const items = payload.data || [];
      const pagination = payload.pagination || {};
      userHasMoreRef.current = !!pagination.hasMore;
      userPageRef.current = append ? userPageRef.current + 1 : 0;
      const mapped = items.map((u) => ({
        value: u.name || u.id,
        label: `${u.username} — ${u.fullName}`,
        raw: u,
      }));
      setUserOptions((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
    } finally {
      setUserLoading(false);
    }
  };

  // Search debounce
  const txSearchTimer = useRef();
  const userSearchTimer = useRef();

  // Convert file to base64 for preview
  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleTxSearch = (val) => {
    txSearchRef.current = val;
    clearTimeout(txSearchTimer.current);
    txSearchTimer.current = setTimeout(() => {
      fetchTransactions(val, false);
    }, 400);
  };

  const handleUserSearch = (val) => {
    userSearchRef.current = val;
    clearTimeout(userSearchTimer.current);
    userSearchTimer.current = setTimeout(() => {
      fetchUsers(val, false);
    }, 400);
  };

  const handleTxPopupScroll = (e) => {
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!txLoading && txHasMoreRef.current) {
        fetchTransactions(txSearchRef.current, true);
      }
    }
  };

  const handleUserPopupScroll = (e) => {
    const target = e.target;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!userLoading && userHasMoreRef.current) {
        fetchUsers(userSearchRef.current, true);
      }
    }
  };
  const handleChange = async ({ file, fileList: newFileList }) => {
    let limitedFileList = newFileList.filter((f) => f.originFileObj).slice(-1);

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

  const handleRemove = (file) => {
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

  const handleSubmit = async (values) => {
    try {
      let evdUrl = "";

      if (fileList.length > 0 && fileList[0].originFileObj) {
        setIsUploading(true);
        const hideUploadMsg = message.loading("Đang upload ảnh chứng từ...", 0);

        try {
          evdUrl = await uploadImageToR2(fileList[0].originFileObj);
          hideUploadMsg();
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

      const paymentData = {
        transId: values.transId,
        amount: parseFloat(values.amount),
        paidAt: values.paidAt.toISOString(),
        paidBy: values.paidBy,
        evdUrl,
        note: values.note || null,
      };

      dispatch(createSupTransactionPayment(paymentData))
        .unwrap()
        .then(() => {
          notification.success({
            message: "Tạo thanh toán thành công",
            description: `Thanh toán đã được thêm vào hệ thống.`,
            duration: 5,
          });
          form.resetFields();
          setFileList([]);
          onCancel();
          if (onSuccess) onSuccess();
        })
        .catch(() => {
          notification.error({
            message: "Có lỗi xảy ra",
            description: createError || "Không thể tạo thanh toán",
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

  const handlePreview = async (file) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview || file.thumbUrl);
    setPreviewOpen(true);
  };

  const isLoading = createStatus === "loading" || isUploading;

  return (
    <Modal
      title={
        <Space>
          <CreditCardOutlined />
          <span style={{ fontSize: "18px" }}>Thêm thanh toán mới</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      centered
      maskClosable={!isLoading}
      destroyOnHidden
    >
      <Divider />
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={isLoading}>
        <Form.Item
          label="Chọn Giao dịch"
          name="transId"
          rules={[{ required: true, message: "Vui lòng chọn giao dịch!" }]}
        >
          <Select
            showSearch
            placeholder="Tìm hoặc chọn giao dịch"
            filterOption={false}
            onSearch={handleTxSearch}
            onPopupScroll={handleTxPopupScroll}
            notFoundContent={txLoading ? <Spin size="small" /> : null}
            optionLabelProp="label"
            onFocus={() => {
              if (txOptions.length === 0) fetchTransactions("", false);
            }}
            size="large"
            allowClear
          >
            {txOptions.map((opt) => (
              <Option key={opt.value} value={opt.value} label={opt.label}>
                {`${opt.raw?.supplierName || opt.label} — ${opt.raw?.docNo || opt.value}`}
              </Option>
            ))}
          </Select>
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
              <InputNumber
                min={0}
                // step={0.01}
                placeholder="0.00"
                size="large"
                style={{ width: "100%" }}
                formatter={(value) =>
                  value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                }
                parser={(value) => (value ? value.replace(/\./g, "") : "")}
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
              // rules={[{ required: true, message: "Vui lòng upload ảnh chứng từ!" }]}
            >
              <div>
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
              </div>
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
            <Button type="primary" htmlType="submit" loading={isLoading} size="large">
              {isLoading ? "Đang tạo..." : "Tạo thanh toán"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddSupTransactionPaymentModal;
