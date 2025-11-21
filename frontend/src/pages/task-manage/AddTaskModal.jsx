import React, { useEffect, useRef, useState } from "react";


import {
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FileAddOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { getListUsers } from "@src/services/userService";
import { fetchInventoryLotsByDepartmentAndProduct } from "@src/store/inventoryLotSlice";
import { fetchSalesOrders } from "@src/store/salesOrdersSlice";
import { createTask } from "@src/store/taskSlice";
import { fetchListUsers } from "@src/store/userSlice";
import {
  Button,
  Col,
  DatePicker,
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
  Tabs,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import locale from "antd/es/date-picker/locale/vi_VN";

const { Text } = Typography;
const { Option } = Select;

const AddTaskModal = ({ visible, onCancel, onSuccess }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("1");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [lotsByItem, setLotsByItem] = useState({});
  const [lotsLoading, setLotsLoading] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");

  // Picker select
  const [pickerOptions, setPickerOptions] = useState([]);
  const pickerPageRef = useRef(0);
  const pickerHasMoreRef = useRef(true);
  const [pickerLoading, setPickerLoading] = useState(false);
  const pickerSearchRef = useRef("");

  // Redux data
  const orders = useSelector((s) => s.salesOrders.salesOrders?.data) || [];
  const currentUser = useSelector((s) => s.auth.user);

  /** === Load dữ liệu cơ bản === */
  useEffect(() => {
    if (visible) {
      // dispatch(fetchListUsers());
      dispatch(fetchSalesOrders({ status: ["pending_preparation", "assigned_preparation"] }));
      form.resetFields();
      setItems([]);
      setSelectedOrder(null);
      setActiveTab("1");

      pickerPageRef.current = 0;
      pickerHasMoreRef.current = true;
      setPickerOptions([]);
      fetchPickers();
    }
  }, [visible]);
  // Fetch users theo role 'picker'
  const fetchPickers = async (q = "", append = false) => {
    if (!pickerHasMoreRef.current && append) return;

    setPickerLoading(true);
    try {
      const response = await getListUsers({
        role: "picker",
        q: q,
        limit: 20,
        offset: append ? pickerPageRef.current * 20 : 0,
      });

      const data = response.data?.data || [];
      const hasMore = response.data?.pagination?.hasMore || false;

      if (append) {
        setPickerOptions((prev) => [...prev, ...data]);
      } else {
        setPickerOptions(data);
      }

      pickerHasMoreRef.current = hasMore;
      if (append) pickerPageRef.current += 1;
    } catch (error) {
      console.error("Error loading pickers:", error);
    } finally {
      setPickerLoading(false);
    }
  };

  /** === Khi chọn 1 đơn hàng === */
  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    form.setFieldsValue({
      orderId: order.id,
      departmentName: order.departmentName,
      note: order.note || "",
    });

    // auto fill danh sách sản phẩm có remain > 0
    const validItems = order.items
      .filter((i) => i.remain > 0)
      .map((i) => ({
        key: i.id,
        orderItemId: i.id,
        lotId: undefined,
        preQty: 0,
        note: "",
        productName: i.productName,
        remain: i.remain,
        productId: i.productId,
      }));
    setItems(validItems);
    setActiveTab("2");
  };

  /** === Fetch lots theo orderItem === */
  const handleFetchLots = async (orderItemId) => {
    if (!orderItemId || !selectedOrder) return;

    const orderItem = selectedOrder.items.find((i) => i.id === orderItemId);
    if (!orderItem) return;

    const departmentId = selectedOrder.departmentId;
    const productId = orderItem?.productId;
    if (!departmentId || !productId) {
      console.warn("Thiếu departmentId hoặc productId:", { departmentId, productId });
      return;
    }

    setLotsLoading((prev) => ({ ...prev, [orderItemId]: true }));
    try {
      const res = await dispatch(
        fetchInventoryLotsByDepartmentAndProduct({ departmentId, productId })
      ).unwrap();

      const data =
        (res?.items || []).filter(
          (lot) => lot.qtyOnHand > 0 && new Date(lot.expiryDate) > new Date()
        ) || [];
      setLotsByItem((prev) => ({ ...prev, [orderItemId]: data }));
    } catch (err) {
      notification.error({
        message: "Lỗi tải lô hàng",
        description: err?.message || "Không thể lấy danh sách lô hàng.",
      });
    } finally {
      setLotsLoading((prev) => ({ ...prev, [orderItemId]: false }));
    }
  };

  /** === Table sản phẩm === */
  const columns = [
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      width: 200,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Còn lại",
      dataIndex: "remain",
      width: 70,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Lô hàng",
      dataIndex: "lotId",
      width: 240,
      render: (val, record) => (
        <Select
          value={val}
          placeholder="Chọn lô hàng"
          loading={lotsLoading[record.orderItemId]}
          onFocus={() => handleFetchLots(record.orderItemId)}
          onChange={(v) =>
            setItems((prev) => prev.map((i) => (i.key === record.key ? { ...i, lotId: v } : i)))
          }
          style={{ width: "100%" }}
        >
          {(lotsByItem[record.orderItemId] || []).map((lot) => (
            <Option key={lot.id} value={lot.id}>
              <Tooltip
                title={
                  <>
                    <div>
                      <b>Mã Lô:</b> {lot.lotNo}
                    </div>
                    <div>
                      <b>Tồn kho:</b> {lot.qtyOnHand} {lot.mainUnit}
                    </div>
                    <div>
                      <b>Hạn sử dụng:</b>{" "}
                      {lot.expiryDate ? dayjs(lot.expiryDate).format("DD/MM/YYYY") : "N/A"}{" "}
                    </div>
                  </>
                }
                placement="left"
              >
                {lot.lotNo} — {lot.qtyOnHand} {lot.mainUnit}
              </Tooltip>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "SL chuẩn bị",
      dataIndex: "preQty",
      width: 120,
      render: (val, record) => {
        const selectedLot = (lotsByItem[record.orderItemId] || []).find(
          (l) => l.id === record.lotId
        );
        const lotQty = selectedLot?.qtyOnHand || 0;

        // Tổng preQty của tất cả dòng cùng orderItemId (trừ dòng hiện tại)
        const totalOtherQty = items
          .filter((i) => i.orderItemId === record.orderItemId && i.key !== record.key)
          .reduce((sum, i) => sum + (Number(i.preQty) || 0), 0);

        // remain - totalOtherQty là số lượng còn có thể nhập ở dòng này
        const remainAvailable = Math.max(record.remain - totalOtherQty, 0);
        const maxQty = Math.min(remainAvailable, lotQty);

        return (
          <InputNumber
            min={0}
            max={maxQty}
            value={val}
            onChange={(v) => {
              // nếu nhập quá giới hạn thì cảnh báo
              if (v > maxQty) {
                notification.warning({
                  message: "Vượt quá số lượng cho phép",
                  description: `Tổng số lượng cho sản phẩm "${record.productName}" không thể vượt ${record.remain}.`,
                });
                v = maxQty;
              }

              setItems((prev) => prev.map((i) => (i.key === record.key ? { ...i, preQty: v } : i)));
            }}
            style={{ width: "100%" }}
            placeholder={`≤ ${maxQty}`}
          />
        );
      },
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (val, record) => (
        <Input
          value={val}
          onChange={(e) =>
            setItems((prev) =>
              prev.map((i) => (i.key === record.key ? { ...i, note: e.target.value } : i))
            )
          }
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space>
          {/* ➕ Thêm dòng phụ */}
          <Tooltip title="Thêm lô hàng khác">
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={() => {
                const newRow = {
                  ...record,
                  key: `${record.key}-sub-${Date.now()}`,
                  lotId: undefined,
                  preQty: 0,
                  note: "",
                };
                setItems((prev) => [...prev, newRow]);
              }}
            />
          </Tooltip>

          {/* 🗑️ Xoá dòng */}
          <Tooltip title="Xoá dòng">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => setItems((prev) => prev.filter((i) => i.key !== record.key))}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  /** === Gửi form === */
  const handleSubmit = async (values) => {
    const validItems = items.filter((i) => i.lotId && i.preQty > 0);
    if (validItems.length === 0)
      return notification.warning({ message: "Vui lòng chọn lô và nhập số lượng" });

    const grouped = validItems.reduce((acc, i) => {
      acc[i.orderItemId] = (acc[i.orderItemId] || 0) + i.preQty;
      return acc;
    }, {});

    for (const [orderItemId, totalQty] of Object.entries(grouped)) {
      const itemInfo = selectedOrder.items.find((x) => x.id === orderItemId);
      if (totalQty > itemInfo.remain) {
        return notification.error({
          message: "Vượt quá số lượng cần chuẩn bị",
          description: `Tổng preQty của sản phẩm "${itemInfo.productName}" (${totalQty}) vượt quá số lượng còn lại (${itemInfo.remain}).`,
        });
      }
    }

    const payload = {
      orderId: selectedOrder.id,
      packerId: values.packerId,
      deadline: values.deadline?.toISOString(),
      note: values.note,
      items: validItems.map((i) => ({
        orderItemId: i.orderItemId,
        lotId: i.lotId,
        preQty: i.preQty,
        postQty: 0,
        preEvd: "",
        postEvd: "",
        note: i.note,
      })),
    };

    setLoading(true);
    try {
      await dispatch(createTask(payload)).unwrap();
      notification.success({ message: "Tạo nhiệm vụ thành công!" });
      onSuccess?.();
      onCancel();
    } catch (err) {
      notification.error({
        message: "Không thể tạo nhiệm vụ",
        description: err?.message || "Đã xảy ra lỗi không xác định.",
      });
    } finally {
      setLoading(false);
    }
  };

  /** === Tab 1: Danh sách đơn hàng === */
  const renderOrderList = () => {
    const filtered = orders
      // Lọc đơn hàng còn ít nhất 1 sản phẩm chưa chuẩn bị xong
      .filter((o) => o.items?.some((i) => i.remain > 0))
      // Lọc theo từ khóa tìm kiếm
      .filter(
        (o) =>
          o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
          o.customerName.toLowerCase().includes(search.toLowerCase())
      );

    const orderColumns = [
      {
        title: "Mã đơn",
        dataIndex: "orderNo",
        render: (text) => <Tag color="blue">{text}</Tag>,
      },
      { title: "Khách hàng", dataIndex: "customerName" },
      { title: "Phòng ban", dataIndex: "departmentName" },
      {
        title: "Sản phẩm còn lại",
        render: (_, r) => (
          <Text type="secondary">{r.items?.filter((i) => i.remain > 0).length || 0}</Text>
        ),
      },
      {
        title: "Chọn",
        render: (_, record) => (
          <Button type="link" onClick={() => handleSelectOrder(record)}>
            Chọn
          </Button>
        ),
      },
    ];

    return (
      <>
        <Input
          placeholder="Tìm theo mã đơn hoặc khách hàng"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ marginBottom: 12 }}
        />
        <Table
          columns={orderColumns}
          dataSource={filtered}
          pagination={{ pageSize: 6 }}
          rowKey="id"
          size="small"
          scroll={items.length >= 3 ? { y: 240 } : undefined}
        />
      </>
    );
  };

  /** === Tab 2: Form tạo task === */
  const renderTaskForm = () => (
    <Spin spinning={loading}>
      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        {/* Đơn hàng */}
        <Form.Item label="Đơn hàng">
          <Input value={selectedOrder?.orderNo} disabled />
        </Form.Item>

        {/* Hàng 1: Giám sát + Người đóng gói */}
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item label="Giám sát">
              <Input value={currentUser?.username} disabled />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Người đóng gói"
              name="packerId"
              rules={[{ required: true, message: "Chọn người đóng gói!" }]}
            >
              <Select
                placeholder="Chọn người đóng gói"
                showSearch
                optionFilterProp="children"
                loading={pickerLoading}
                onPopupScroll={(e) => {
                  const { target } = e;
                  if (
                    target.scrollTop + target.offsetHeight === target.scrollHeight &&
                    pickerHasMoreRef.current
                  ) {
                    fetchPickers(pickerSearchRef.current, true);
                  }
                }}
                onSearch={(value) => {
                  pickerSearchRef.current = value;
                  pickerPageRef.current = 0;
                  fetchPickers(value, false);
                }}
                filterOption={false}
                notFoundContent={
                  pickerLoading ? (
                    <Spin size="small" />
                  ) : (
                    <Empty description="Không tìm thấy người đóng gói" />
                  )
                }
              >
                {pickerOptions.map((u) => (
                  <Option key={u.id} value={u.id}>
                    <TeamOutlined /> {u.username}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Hàng 2: Hạn chót + Ghi chú */}
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Form.Item
              label="Hạn chót"
              name="deadline"
              rules={[{ required: true, message: "Chọn hạn chót!" }]}
            >
              <DatePicker
                format="DD/MM/YYYY HH:mm"
                locale={locale}
                showTime
                style={{ width: "100%" }}
                disabledDate={(d) => d && d < dayjs().startOf("day")}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Ghi chú" name="note">
              <Input.TextArea placeholder="Ghi chú thêm..." rows={1} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Danh sách sản phẩm</Divider>
        <Table columns={columns} dataSource={items} pagination={false} bordered size="small" />

        {/* Nút hành động */}
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Space>
            <Button onClick={() => setActiveTab("1")}>Quay lại</Button>
            <Button type="primary" htmlType="submit">
              Tạo nhiệm vụ
            </Button>
          </Space>
        </div>
      </Form>
    </Spin>
  );

  /** === Render Modal === */
  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center" }}>
          <FileAddOutlined style={{ color: "#1677ff", fontSize: 20, marginRight: 8 }} />
          <span style={{ fontSize: 18 }}>Tạo nhiệm vụ chuẩn bị hàng</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={950}
      style={{
        top: "10%", // 👈 Đẩy modal lên cao hơn (mặc định ~20%)
        transform: "translateY(-5%)", // Giúp canh vị trí hợp lý trên màn hình
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: "1", label: "Chọn đơn hàng", children: renderOrderList() },
          { key: "2", label: "Tạo nhiệm vụ", children: renderTaskForm() },
        ]}
      />
    </Modal>
  );
};

export default AddTaskModal;
