import React, { useEffect, useRef, useState } from "react";

import { CarOutlined, LinkOutlined, UserOutlined } from "@ant-design/icons";
import apiClient from "@src/services/apiClient";
import { getListUsers } from "@src/services/userService";
import { updateDeliveryRun } from "@src/store/deliveryRunsSlice";
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
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  notification,
} from "antd";
import dayjs from "dayjs";
import { message } from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Text, Title } = Typography;

const EditDeliveryRunModal = ({ visible, onCancel, onSuccess, runData }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const userRole = useSelector((state) => state.auth.user?.role); // Lấy role của user
  const updateStatus = useSelector((state) => state.deliveryRuns.updateStatus);
  const updateError = useSelector((state) => state.deliveryRuns.updateError);
  // Supervisor lazy loading
  const [supervisorOptions, setSupervisorOptions] = useState([]);
  const supervisorPageRef = useRef(0);
  const supervisorHasMoreRef = useRef(true);
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const supervisorSearchRef = useRef("");

  // Shipper lazy loading
  const [shipperOptions, setShipperOptions] = useState([]);
  const shipperPageRef = useRef(0);
  const shipperHasMoreRef = useRef(true);
  const [shipperLoading, setShipperLoading] = useState(false);
  const shipperSearchRef = useRef("");

  // Orders (chỉ update, không thêm/xóa)
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      // Load supervisor & shipper options
      supervisorPageRef.current = 0;
      supervisorHasMoreRef.current = true;
      setSupervisorOptions([]);
      supervisorSearchRef.current = "";
      loadSupervisors();

      shipperPageRef.current = 0;
      shipperHasMoreRef.current = true;
      setShipperOptions([]);
      shipperSearchRef.current = "";
      loadShippers();

      // Set form & orders
      if (runData) {
        form.setFieldsValue({
          supervisorId: runData.supervisorId,
          shipperId: runData.shipperId,
          vehicleNo: runData.vehicleNo,
          // Không set status - status tự động update
        });
        setOrders(
          (runData.orders || []).map((order, idx) => ({
            ...order,
            routeSeq: order.routeSeq || idx + 1,
          }))
        );
      }
    }
    if (!visible) {
      form.resetFields();
      setOrders([]);
    }
  }, [visible, runData, form]);
  // Lazy load supervisors
  const loadSupervisors = async (search = "", append = false) => {
    if (!supervisorHasMoreRef.current && append) return;
    setSupervisorLoading(true);
    try {
      const response = await getListUsers({
        role: "sup_shipper",
        q: search,
        limit: 20,
        offset: append ? supervisorPageRef.current * 20 : 0,
      });
      const data = response.data?.data || [];
      const hasMore = response.data?.pagination?.hasMore || false;
      if (append) {
        setSupervisorOptions((prev) => [...prev, ...data]);
      } else {
        setSupervisorOptions(data);
      }
      supervisorHasMoreRef.current = hasMore;
      if (append) supervisorPageRef.current += 1;
    } catch (error) {
      console.error("Error loading supervisors:", error);
    } finally {
      setSupervisorLoading(false);
    }
  };

  // Lazy load shippers
  const loadShippers = async (search = "", append = false) => {
    if (!shipperHasMoreRef.current && append) return;
    setShipperLoading(true);
    try {
      const response = await getListUsers({
        role: "shipper",
        q: search,
        limit: 20,
        offset: append ? shipperPageRef.current * 20 : 0,
      });
      const data = response.data?.data || [];
      const hasMore = response.data?.pagination?.hasMore || false;
      if (append) {
        setShipperOptions((prev) => [...prev, ...data]);
      } else {
        setShipperOptions(data);
      }
      shipperHasMoreRef.current = hasMore;
      if (append) shipperPageRef.current += 1;
    } catch (error) {
      console.error("Error loading shippers:", error);
    } finally {
      setShipperLoading(false);
    }
  };
  /**Upload ảnh */
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
  const isLoading = updateStatus === "loading";

  // Table columns for orders (CHỈ ĐƯỢC UPDATE GHI CHÚ)
  const columns = [
    {
      title: "STT",
      dataIndex: "routeSeq",
      key: "routeSeq",
      width: 60,
      align: "center",
      render: (seq) => <Tag color="blue">#{seq}</Tag>,
    },
    {
      title: "Mã đơn",
      dataIndex: "orderNo",
      key: "orderNo",
      width: 150,
      render: (_, record) => <span>{record.orderNo || record.id}</span>,
    },
    {
      title: "COD Amount",
      key: "codAmount",
      width: 150,
      render: (_, record) => (
        <InputNumber
          value={record.codAmount}
          min={0}
          style={{ width: "100%" }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
          disabled // LOCKED - không cho update
        />
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      render: (_, record) => {
        const statusColors = {
          assigned: "blue",
          in_progress: "processing",
          completed: "success",
          cancelled: "error",
        };
        const statusLabels = {
          assigned: "Đã phân công",
          in_progress: "Đang giao",
          completed: "Hoàn thành",
          cancelled: "Đã hủy",
        };
        return (
          <Tag color={statusColors[record.status]}>
            {statusLabels[record.status] || record.status}
          </Tag>
        );
      },
    },
    {
      title: "Minh chứng",
      key: "evdUrl",
      width: 120,
      align: "center",
      render: (_, record) => {
        if (record.evdUrl) {
          return (
            <Image
              width={80}
              height={80}
              src={record.evdUrl}
              alt="Evidence"
              style={{ objectFit: "cover", cursor: "pointer" }}
              preview={{
                mask: "Xem ảnh",
              }}
            />
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Ghi chú",
      key: "note",
      width: 150,
      render: (_, record) => (
        <Input
          value={record.note}
          placeholder="Ghi chú..."
          onChange={(e) => handleOrderChange(record.id, "note", e.target.value)}
        />
      ),
    },
  ];

  // Update order field
  const handleOrderChange = (orderId, field, value) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, [field]: value } : order))
    );
  };

  // Submit handler
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
      if (orders.length === 0) {
        notification.warning({
          message: "Chưa có đơn hàng",
          description: "Vui lòng kiểm tra lại danh sách đơn hàng",
          duration: 3,
        });
        return;
      }

      // Chỉ lấy các trường cần thiết cho API
      const body = {
        supervisorId: values.supervisorId,
        shipperId: values.shipperId,
        vehicleNo: values.vehicleNo,
        status: values.status,
        orders: orders.map((order) => ({
          id: order.id,
          routeSeq: order.routeSeq,
          codAmount: order.codAmount,
          status: order.status,
          actualPay: order.actualPay,
          evdUrl: imgUrl,
          note: order.note,
        })),
      };
        dispatch(updateDeliveryRun({ id: runData.id, data: body }))
          .unwrap()
          .then(() => {
            notification.success({
              message: "Cập nhật chuyến giao hàng thành công",
              description: "Thông tin chuyến giao hàng đã được cập nhật.",
              duration: 3,
            });
            form.resetFields();
            setOrders([]);
            onCancel();
            if (onSuccess) onSuccess();
          })
          .catch((error) => {
            notification.error({
              message: "Có lỗi xảy ra",
              description: error.message || "Không thể cập nhật chuyến giao hàng",
              duration: 5,
            });
          });
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: error.message,
        duration: 5,
      });
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CarOutlined />
          <span>Chỉnh sửa chuyến giao hàng</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1200}
      destroyOnHidden
      centered
    >
      <Divider />
      <Spin spinning={supervisorLoading || shipperLoading}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    <span>Mã người giám sát</span>
                    {userRole !== "admin" && <Tag color="red">Chỉ admin mới được đổi</Tag>}
                  </Space>
                }
                name="supervisorId"
                rules={[{ required: true, message: "Vui lòng chọn người giám sát!" }]}
              >
                <Select
                  showSearch
                  placeholder="Chọn người giám sát"
                  optionFilterProp="children"
                  loading={supervisorLoading}
                  disabled={userRole !== "admin"} // Chỉ admin mới được đổi
                  onPopupScroll={(e) => {
                    const { target } = e;
                    if (
                      target.scrollTop + target.offsetHeight === target.scrollHeight &&
                      supervisorHasMoreRef.current
                    ) {
                      loadSupervisors(supervisorSearchRef.current, true);
                    }
                  }}
                  onSearch={(value) => {
                    supervisorSearchRef.current = value;
                    supervisorPageRef.current = 0;
                    loadSupervisors(value, false);
                  }}
                  filterOption={false}
                  size="large"
                  notFoundContent={
                    supervisorLoading ? (
                      <Spin size="small" />
                    ) : (
                      <Empty description="Không có dữ liệu" />
                    )
                  }
                >
                  {supervisorOptions.map((sup) => (
                    <Select.Option key={sup.id} value={sup.id}>
                      <Space>
                        <UserOutlined />
                        {sup.username} - {sup.fullName}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    <span>Mã người giao hàng</span>
                  </Space>
                }
                name="shipperId"
                rules={[{ required: true, message: "Vui lòng chọn người giao hàng!" }]}
              >
                <Select
                  showSearch
                  placeholder="Chọn người giao hàng"
                  optionFilterProp="children"
                  loading={shipperLoading}
                  onPopupScroll={(e) => {
                    const { target } = e;
                    if (
                      target.scrollTop + target.offsetHeight === target.scrollHeight &&
                      shipperHasMoreRef.current
                    ) {
                      loadShippers(shipperSearchRef.current, true);
                    }
                  }}
                  onSearch={(value) => {
                    shipperSearchRef.current = value;
                    shipperPageRef.current = 0;
                    loadShippers(value, false);
                  }}
                  filterOption={false}
                  size="large"
                  notFoundContent={
                    shipperLoading ? (
                      <Spin size="small" />
                    ) : (
                      <Empty description="Không có dữ liệu" />
                    )
                  }
                >
                  {shipperOptions.map((shipper) => (
                    <Select.Option key={shipper.id} value={shipper.id}>
                      <Space>
                        <UserOutlined />
                        {shipper.username} - {shipper.fullName}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Biển số xe"
                name="vehicleNo"
                rules={[{ required: true, message: "Vui lòng nhập biển số xe!" }]}
              >
                <Input placeholder="Nhập biển số xe" size="large" prefix={<CarOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Trạng thái chuyến:</Text>
                <Tag 
                  color={
                    runData?.status === "assigned" ? "blue" :
                    runData?.status === "in_progress" ? "processing" :
                    runData?.status === "completed" ? "success" : "default"
                  }
                  style={{ marginLeft: 8 }}
                >
                  {runData?.status === "assigned" && "Đã phân công"}
                  {runData?.status === "in_progress" && "Đang giao"}
                  {runData?.status === "completed" && "Hoàn thành"}
                  {runData?.status === "cancelled" && "Đã hủy"}
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <i>* Trạng thái tự động cập nhật theo tiến trình giao hàng</i>
              </Text>
            </Col>
          </Row>

          <Divider orientation="left">
            <Space>
              <LinkOutlined />
              <Title level={5} style={{ margin: 0 }}>
                Danh sách đơn hàng
              </Title>
            </Space>
          </Divider>

          <div style={{ marginTop: 16 }}>
            <Table
              columns={columns}
              dataSource={orders}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1000 }}
              locale={{
                emptyText: (
                  <Empty description="Chưa có đơn hàng nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              }}
            />
          </div>

          <Divider />

          <Row justify="space-between" align="middle">
            <Col>
              <Text strong style={{ fontSize: 16 }}>
                Tổng cộng: {orders.length} đơn
              </Text>
            </Col>
            <Col>
              <Space size="middle">
                <Button onClick={onCancel} size="large">
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" size="large" loading={isLoading}>
                  Lưu thay đổi
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Spin>
    </Modal>
  );
};

export default EditDeliveryRunModal;
