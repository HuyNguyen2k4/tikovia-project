import React, { use, useEffect, useRef, useState } from "react";

import {
  CarOutlined,
  DeleteOutlined,
  LinkOutlined,
  PlusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "@assets/delivery-runs/DeliveryRunsManage.css";
import { getListSalesOrders, getListSalesOrdersWithInvoice } from "@src/services/salesOrdersService";
import { getListUsers } from "@src/services/userService";
import { createDeliveryRun } from "@src/store/deliveryRunsSlice";
import {
  Button,
  Col,
  Divider,
  Empty,
  Form,
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
import { useDispatch, useSelector } from "react-redux";

const { Text, Title } = Typography;

const AddDeliveryRunModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const [orders, setOrders] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);

  const createStatus = useSelector((state) => state.deliveryRuns.createStatus);

  // State cho Supervisor lazy loading
  const [supervisorOptions, setSupervisorOptions] = useState([]);
  const supervisorPageRef = useRef(0);
  const supervisorHasMoreRef = useRef(true);
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const supervisorSearchRef = useRef("");

  // State cho Shipper lazy loading
  const [shipperOptions, setShipperOptions] = useState([]);
  const shipperPageRef = useRef(0);
  const shipperHasMoreRef = useRef(true);
  const [shipperLoading, setShipperLoading] = useState(false);
  const shipperSearchRef = useRef("");

  // State cho Sales Order lazy loading
  const [orderOptions, setOrderOptions] = useState([]);
  const orderPageRef = useRef(0);
  const orderHasMoreRef = useRef(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const orderSearchRef = useRef("");

  const isLoading = createStatus === "loading";

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setOrders([]);

      // Reset supervisor select
      supervisorPageRef.current = 0;
      supervisorHasMoreRef.current = true;
      setSupervisorOptions([]);
      supervisorSearchRef.current = "";
      loadSupervisors();

      // Reset shipper select
      shipperPageRef.current = 0;
      shipperHasMoreRef.current = true;
      setShipperOptions([]);
      shipperSearchRef.current = "";
      loadShippers();

      // Reset order select
      orderPageRef.current = 0;
      orderHasMoreRef.current = true;
      setOrderOptions([]);
      orderSearchRef.current = "";
      // loadOrders();
    }
  }, [visible]);

  // Load Supervisors (users with role sup_shipper)
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

  // Load Shippers (users with role shipper)
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
  useEffect(() => {
    if (visible && selectedDepartmentId) {
      orderPageRef.current = 0;
      orderHasMoreRef.current = true;
      setOrderOptions([]);
      orderSearchRef.current = "";
      loadOrders(); // gọi API khi có departmentId
    }
  }, [selectedDepartmentId, visible]);

  // Load Orders (chỉ lấy orders ở trạng thái "confirmed")
  const loadOrders = async (search = "", append = false) => {
    if (!orderHasMoreRef.current && append) return;

    setOrderLoading(true);
    try {
      const response = await getListSalesOrdersWithInvoice({
        departmentId: form.getFieldValue("departmentId"),
        status: "confirmed",
        q: search,
        limit: 20,
        offset: append ? orderPageRef.current * 20 : 0,
      });

      const data = response.data?.data || [];
      const hasMore = response.data?.pagination?.hasMore || false;

      if (append) {
        setOrderOptions((prev) => [...prev, ...data]);
      } else {
        setOrderOptions(data);
      }

      orderHasMoreRef.current = hasMore;
      if (append) orderPageRef.current += 1;
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setOrderLoading(false);
    }
  };

  // Add order to list
  const handleAddOrder = () => {
    const selectedOrderId = form.getFieldValue("selectedOrder");
    if (!selectedOrderId) {
      notification.warning({
        message: "Chưa chọn đơn hàng",
        description: "Vui lòng chọn đơn hàng trước khi thêm",
        duration: 3,
      });
      return;
    }

    const selectedOrder = orderOptions.find((o) => o.id === selectedOrderId);
    if (!selectedOrder) return;

    // Check if order already added
    if (orders.some((o) => o.id === selectedOrder.id)) {
      notification.warning({
        message: "Đơn hàng đã tồn tại",
        description: "Đơn hàng này đã được thêm vào danh sách",
        duration: 3,
      });
      return;
    }

    const newOrder = {
      id: selectedOrder.id,
      orderId: selectedOrder.id,
      orderNo: selectedOrder.orderNo,
      customerName: selectedOrder.customerName,
      address: selectedOrder.address,
      slaDeliveryAt: selectedOrder.slaDeliveryAt,
      routeSeq: orders.length + 1,
      codAmount: selectedOrder?.invoice?.remainingReceivables || 0,
      note: "",
    };

    setOrders([...orders, newOrder]);
    form.setFieldsValue({ selectedOrder: undefined });
  };

  // Remove order from list
  const handleRemoveOrder = (orderId) => {
    const newOrders = orders.filter((o) => o.id !== orderId);
    // Re-calculate route sequence
    const reSequenced = newOrders.map((order, index) => ({
      ...order,
      routeSeq: index + 1,
    }));
    setOrders(reSequenced);
  };

  // Update order in list
  const handleUpdateOrder = (orderId, field, value) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, [field]: value } : order))
    );
  };

  // Handle submit
  const handleSubmit = async (values) => {
    if (orders.length === 0) {
      notification.warning({
        message: "Chưa có đơn hàng",
        description: "Vui lòng thêm ít nhất một đơn hàng vào chuyến giao hàng",
        duration: 3,
      });
      return;
    }

    const deliveryRunData = {
      deliveryNo: values.deliveryNo,
      supervisorId: values.supervisorId,
      shipperId: values.shipperId,
      vehicleNo: values.vehicleNo,
      status: "assigned",
      orders: orders.map((order) => ({
        orderId: order.orderId,
        routeSeq: order.routeSeq,
        codAmount: order.codAmount || 0,
        note: order.note || null,
      })),
    };

    dispatch(createDeliveryRun(deliveryRunData))
      .unwrap()
      .then(() => {
        notification.success({
          message: "Tạo chuyến giao hàng thành công",
          description: "Chuyến giao hàng đã được thêm vào hệ thống",
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
          description: error.message || "Không thể tạo chuyến giao hàng",
          duration: 5,
        });
      });
  };

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
      width: 120,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 150,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      ellipsis: true,
    },
    {
      title: "Deadline",
      dataIndex: "slaDeliveryAt",
      key: "slaDeliveryAt",
      width: 140,
      render: (date) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"),
    },
    {
      title: "COD Amount",
      key: "codAmount",
      width: 150,
      render: (_, record) => (
        <InputNumber
          value={record.codAmount}
          onChange={(value) => handleUpdateOrder(record.id, "codAmount", value || 0)}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
          style={{ width: "100%" }}
          min={0}
          placeholder="Số tiền COD"
          disabled
        />
      ),
    },
    {
      title: "Ghi chú",
      key: "note",
      width: 150,
      render: (_, record) => (
        <Input
          value={record.note}
          onChange={(e) => handleUpdateOrder(record.id, "note", e.target.value)}
          placeholder="Ghi chú..."
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveOrder(record.id)}
        />
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <CarOutlined />
          <span>Thêm chuyến giao hàng mới</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1200}
      destroyOnHidden
      centered
      maskClosable={!isLoading}
    >
      <Divider />
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={isLoading}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={12} lg={12} xl={12}>
            <Form.Item
              label={
                <Space>
                  <span>Mã người giám sát</span>
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
                {supervisorOptions.map((supervisor) => (
                  <Select.Option key={supervisor.id} value={supervisor.id}>
                    <Space>
                      <UserOutlined />
                      {supervisor.username} - {supervisor.fullName}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={12} lg={12} xl={12}>
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
                onChange={(value) => {
                  const selectedShipper = shipperOptions.find((shipper) => shipper.id === value);
                  const deptId = selectedShipper?.departmentId || "";
                  form.setFieldsValue({
                    shipperId: value,
                    departmentId: deptId,
                  });
                  setSelectedDepartmentId(deptId);
                }}
                filterOption={false}
                size="large"
                notFoundContent={
                  shipperLoading ? <Spin size="small" /> : <Empty description="Không có dữ liệu" />
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
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Item
              label={
                <Space>
                  <span>Phòng ban</span>
                </Space>
              }
              name="departmentId"
              rules={[{ required: true, message: "Vui lòng chọn phòng ban!" }]}
            >
              <Select
                placeholder="Chọn phòng ban"
                size="large"
                disabled // chỉ cho chọn qua shipper, không cho user tự chọn
                optionLabelProp="label"
              >
                {shipperOptions
                  .filter(
                    (shipper, idx, arr) =>
                      arr.findIndex((s) => s.departmentId === shipper.departmentId) === idx
                  )
                  .map((shipper) => (
                    <Select.Option
                      key={shipper.departmentId}
                      value={shipper.departmentId}
                      label={shipper.departmentName}
                    >
                      {shipper.departmentName}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Item
              label="Biển số xe"
              name="vehicleNo"
              rules={[{ required: true, message: "Vui lòng nhập biển số xe!" }]}
            >
              <Input placeholder="Nhập biển số xe" size="large" prefix={<CarOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={8} lg={8} xl={8}>
            <Form.Item label="Ghi chú" name="note">
              <Input placeholder="Ghi chú thêm..." size="large" />
            </Form.Item>
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

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={24} className="mb-2">
            <Text strong>Đơn hàng</Text>
          </Col>
          <Col xs={24} sm={24} md={18} lg={19} xl={20}>
            <Form.Item name="selectedOrder" style={{ marginBottom: 0 }}>
              <Select
                showSearch
                placeholder="Chọn đơn hàng"
                optionFilterProp="children"
                loading={orderLoading}
                onPopupScroll={(e) => {
                  const { target } = e;
                  if (
                    target.scrollTop + target.offsetHeight === target.scrollHeight &&
                    orderHasMoreRef.current
                  ) {
                    loadOrders(orderSearchRef.current, true);
                  }
                }}
                onSearch={(value) => {
                  orderSearchRef.current = value;
                  orderPageRef.current = 0;
                  loadOrders(value, false);
                }}
                filterOption={false}
                size="large"
                notFoundContent={
                  orderLoading ? <Spin size="small" /> : <Empty description="Không có dữ liệu" />
                }
              >
                {orderOptions.map((order) => (
                  <Select.Option key={order.id} value={order.id} disabled={order.invoice === null}>
                    <Space>
                      <Tag color="blue">{order.orderNo}</Tag>
                      <span>{order.customerName} {order.invoice ? "" : "(Chưa có hóa đơn)"}</span>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={6} lg={5} xl={4}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddOrder}
              size="large"
              block
            >
              Thêm đơn hàng
            </Button>
          </Col>
        </Row>

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

        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Text strong style={{ fontSize: 16 }}>
              Tổng cộng: {orders.length} đơn
            </Text>
          </Col>
          <Col>
            <Space size="middle">
              <Button onClick={onCancel} disabled={isLoading} size="large">
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={isLoading} size="large">
                {isLoading ? "Đang tạo..." : "Xác nhận"}
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default AddDeliveryRunModal;
