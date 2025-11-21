import React, { useEffect, useRef, useState } from "react";

import { FileTextOutlined, TeamOutlined } from "@ant-design/icons";
import { getListUsers } from "@src/services/userService";
import { fetchInventoryLotsByDepartmentAndProduct } from "@src/store/inventoryLotSlice";
import { fetchSalesOrderById } from "@src/store/salesOrdersSlice";
import { fetchTaskById, updateTask } from "@src/store/taskSlice";
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
  Tag,
  Typography,
  notification,
} from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;
const { Option } = Select;

const UpdateTaskModal = ({ visible, onCancel, task, onSuccess }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [lotsByItem, setLotsByItem] = useState({});

  // const users = useSelector((s) => s.user.users?.data) || [];
  const currentUser = useSelector((s) => s.auth.user);
  // Picker select
  const [pickerOptions, setPickerOptions] = useState([]);
  const pickerPageRef = useRef(0);
  const pickerHasMoreRef = useRef(true);
  const [pickerLoading, setPickerLoading] = useState(false);
  const pickerSearchRef = useRef("");

  /** === Khi mở modal === */
  useEffect(() => {
    if (visible && task) {
      // dispatch(fetchListUsers());
      initTaskData(task);
      pickerPageRef.current = 0;
      pickerHasMoreRef.current = true;
      setPickerOptions([]);
      fetchPickers();
    } else if (!visible) {
      form.resetFields();
      setItems([]);
      setLotsByItem({});
    }
  }, [visible, task]);
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
  const initTaskData = async (t) => {
    try {
      setLoading(true);
      let taskData = t;

      // Nếu task chưa có items, fetch lại từ server
      if (!t.items) {
        const res = await dispatch(fetchTaskById(t.id)).unwrap();
        taskData = res?.data;
      }

      // ✅ Fetch SalesOrder để lấy departmentId và productId
      const orderRes = await dispatch(fetchSalesOrderById(taskData.orderId)).unwrap();
      const orderData = orderRes?.data;

      const departmentId = orderData?.departmentId;
      if (!departmentId) {
        throw new Error("Không tìm thấy departmentId trong đơn hàng");
      }

      // Map lại items với productId từ order
      const mappedItems =
        taskData?.items?.map((i) => {
          const orderItem = orderData?.items?.find((oi) => oi.id === i.orderItemId);
          const initPreQty = Number(i.preQty || 0);
          const initRemain = Number(orderItem?.remain || 0);
          const initTotalNeeded = initPreQty + initRemain; // tổng cần chuẩn bị cố định

          return {
            key: i.id,
            orderItemId: i.orderItemId,
            lotId: i.lotId,
            preQty: i.preQty,
            postQty: i.postQty || 0,
            productName: i.productName || orderItem?.productName,
            remain: i.remain || orderItem?.remain || 0,
            note: i.note || "",
            productId: orderItem?.productId, // gán productId từ orderItem
            // snapshot để tính maxQty, KHÔNG thay đổi theo người dùng nhập
            initPreQty,
            initRemain,
            initTotalNeeded,
          };
        }) || [];

      // console.log("🧾 mappedItems:", mappedItems);

      setItems(mappedItems);

      form.setFieldsValue({
        packerId: taskData.packerId,
        deadline: taskData.deadline ? dayjs(taskData.deadline) : null,
        note: taskData.note || "",
      });

      // ✅ Fetch tất cả lots ngay tại đây
      if (departmentId && mappedItems.length > 0) {
        const results = await Promise.allSettled(
          mappedItems.map((i) =>
            dispatch(
              fetchInventoryLotsByDepartmentAndProduct({
                departmentId,
                productId: i.productId,
              })
            ).unwrap()
          )
        );

        const lotsMap = {};
        results.forEach((res, idx) => {
          const orderItemId = mappedItems[idx].orderItemId;
          if (res.status === "fulfilled") {
            const validLots =
              (res.value?.items || []).filter(
                (lot) => lot.qtyOnHand > 0 && new Date(lot.expiryDate) > new Date()
              ) || [];
            lotsMap[orderItemId] = validLots;
          } else {
            lotsMap[orderItemId] = [];
          }
        });
        setLotsByItem(lotsMap);
      }
    } catch (err) {
      notification.error({
        message: "Không thể tải dữ liệu nhiệm vụ",
        description: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  /** === Cột sản phẩm === */
  const columns = [
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      width: 250,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Còn lại",
      dataIndex: "remain",
      width: 80,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Lô hàng",
      dataIndex: "lotId",
      width: 250,
      render: (val, record) => (
        <Select
          value={val}
          placeholder="Chọn lô hàng"
          onChange={(v) =>
            setItems((prev) => prev.map((i) => (i.key === record.key ? { ...i, lotId: v } : i)))
          }
          style={{ width: "100%" }}
        >
          {(lotsByItem[record.orderItemId] || []).map((lot) => (
            <Option key={lot.id} value={lot.id}>
              {lot.lotNo} — {lot.qtyOnHand} ({lot.packUnit || lot.mainUnit})
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "SL Trước (preQty)",
      dataIndex: "preQty",
      width: 150,
      render: (val, record) => {
        // const selectedLot = (lotsByItem[record.orderItemId] || []).find(
        //   (l) => l.id === record.lotId
        // );
        // const lotQty = selectedLot?.qtyOnHand || 0;

        // === Tính toán theo dữ liệu gốc ===
        const sameProductItems = items.filter((i) => i.orderItemId === record.orderItemId);

        // ✅ Tổng pre gốc của tất cả dòng trong nhóm
        const initPreSum = sameProductItems.reduce(
          (sum, i) => sum + (Number(i.initPreQty) || 0),
          0
        );

        // ✅ Lấy initRemain đúng 1 lần cho cả nhóm (dùng max để tránh lặp dòng)
        const initRemainOnce =
          sameProductItems.length > 0
            ? Math.max(...sameProductItems.map((i) => Number(i.initRemain || 0)))
            : 0;

        // ✅ Trần nhóm cố định
        const groupTarget = initPreSum + initRemainOnce;

        // Tổng preQty hiện tại của các dòng khác cùng sản phẩm
        const totalOtherQty = sameProductItems
          .filter((i) => i.key !== record.key)
          .reduce((sum, i) => sum + (Number(i.preQty) || 0), 0);

        // Phần còn lại có thể nhập ở dòng này
        const remainAvailable = Math.max(groupTarget - totalOtherQty, 0);

        // Cho phép “hoán đổi” giữa các dòng trong nhóm (không khóa phần đã có của dòng hiện tại)
        const selectedLot = (lotsByItem[record.orderItemId] || []).find(
          (l) => l.id === record.lotId
        );
        const lotQty = selectedLot?.qtyOnHand || 0;
        const lotQtyAvailable = lotQty + Number(record.initPreQty || 0);

        const maxQty = Math.min(remainAvailable, lotQtyAvailable);

        // console.log("🔢 maxQty calculation:", {
        //   "Group Target": groupTarget,
        //   "Total Other Qty": totalOtherQty,
        //   "Remain Available": remainAvailable,
        //   "Lot Qty Available": lotQtyAvailable,
        //   "Max Qty": maxQty,
        // });
        return (
          <InputNumber
            min={0}
            max={maxQty}
            value={val}
            onChange={(v) => {
              let newVal = Number(v || 0);
              if (newVal > maxQty) {
                notification.warning({
                  message: "Vượt quá giới hạn cho phép",
                  description: `Tổng SL cho "${record.productName}" không thể vượt ${groupTarget}.`,
                });
                newVal = maxQty;
              }

              setItems((prev) =>
                prev.map((i) => (i.key === record.key ? { ...i, preQty: newVal } : i))
              );
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
  ];

  /** === Submit === */
  const handleSubmit = async (values) => {
    const validItems = items.filter((i) => i.lotId && i.preQty > 0);
    if (validItems.length === 0)
      return notification.warning({
        message: "Vui lòng chọn lô và nhập số lượng",
      });

    const payload = {
      id: task.id,
      orderId: task.orderId,
      packerId: values.packerId,
      deadline: values.deadline?.toISOString(),
      note: values.note,
      items: validItems.map((i) => ({
        orderItemId: i.orderItemId,
        lotId: i.lotId,
        preQty: i.preQty,
        postQty: i.postQty || 0,
        preEvd: "",
        postEvd: "",
        note: i.note,
      })),
    };

    setLoading(true);
    try {
      await dispatch(updateTask({ id: task.id, data: payload })).unwrap();
      notification.success({ message: "Cập nhật nhiệm vụ thành công!" });
      onSuccess?.();
      onCancel();
    } catch (err) {
      notification.error({
        message: "Không thể cập nhật nhiệm vụ",
        description: err?.message || "Đã xảy ra lỗi không xác định.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center" }}>
          <FileTextOutlined style={{ color: "#1677ff", fontSize: 20, marginRight: 8 }} />
          <span style={{ fontSize: 18 }}>Cập nhật nhiệm vụ</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={950}
      style={{
        top: "10%",
        transform: "translateY(-5%)",
      }}
    >
      <Spin spinning={loading}>
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
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

          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Form.Item
                label="Hạn chót"
                name="deadline"
                rules={[{ required: true, message: "Chọn hạn chót!" }]}
              >
                <DatePicker
                  format="DD/MM/YYYY HH:mm"
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

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={onCancel}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                Lưu thay đổi
              </Button>
            </Space>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};

export default UpdateTaskModal;
