import React, { useEffect, useState } from "react";

import { EditOutlined } from "@ant-design/icons";
import { fetchInventoryLotById, updateInventoryLot } from "@src/store/inventoryLotSlice";
import { Button, Form, Input, Modal, Spin, Table, Typography, notification } from "antd";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;

const UnitConversion = ({ lotId, onUpdate }) => {
  const dispatch = useDispatch();

  // Redux state
  const userRole = useSelector((state) => state.auth.user?.role);
  const inventoryLotById = useSelector((state) => state.inventoryLot.inventoryLotsById);
  const fetchByIdStatus = useSelector((state) => state.inventoryLot.fetchByIdStatus);
  const updateStatus = useSelector((state) => state.inventoryLot.updateStatus);

  // Local state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [form] = Form.useForm();

  // Fetch data khi lotId thay đổi
  useEffect(() => {
    if (lotId && (!inventoryLotById || inventoryLotById.id !== lotId)) {
      dispatch(fetchInventoryLotById(lotId));
    }
  }, [dispatch, lotId, inventoryLotById?.id]);

  // Mở modal sửa
  const handleEdit = (unit) => {
    setEditingUnit(unit);
    form.setFieldsValue(unit);
    setModalVisible(true);
  };

  // Gửi cập nhật
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      dispatch(
        updateInventoryLot({
          inventoryLotId: lotId,
          data: values,
        })
      )
        .unwrap()
        .then((responseData) => {
          notification.success({
            message: "Cập nhật thành công!",
            description: "Đã cập nhật quy đổi đơn vị.",
            duration: 2,
          });
          setModalVisible(false);

          // Fetch lại data mới từ server
          dispatch(fetchInventoryLotById(lotId));

          // Notify parent component nếu có callback
          if (onUpdate && responseData) {
            onUpdate(responseData);
          }
        })
        .catch((error) => {
          notification.error({
            message: "Cập nhật thất bại!",
            description: error?.message || "Có lỗi xảy ra, vui lòng thử lại.",
            duration: 3,
          });
        });
    });
  };

  // Loading hoặc chưa có data
  if (fetchByIdStatus === "loading" || !inventoryLotById || inventoryLotById.id !== lotId) {
    return <Spin style={{ margin: "32px auto", display: "block" }} />;
  }

  // Dữ liệu hiển thị bảng
  const dataSource = [
    {
      key: inventoryLotById.id,
      id: inventoryLotById.id,
      packUnit: inventoryLotById.packUnit,
      mainUnit: inventoryLotById.mainUnit,
      conversionRate: inventoryLotById.conversionRate,
    },
  ];
  const formatNumber = (v) => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(v);
    if (Number.isNaN(n)) return v;
    if (Number.isInteger(n)) return String(n);
    // hiển thị tối đa 3 chữ số thập phân, bỏ số 0 thừa
    return n.toFixed(3).replace(/\.?0+$/, "");
  };
  // Cột bảng
  const columns = [
    { title: "Đơn vị đóng gói", dataIndex: "packUnit", key: "packUnit" },
    { title: "Đơn vị chính", dataIndex: "mainUnit", key: "mainUnit" },
    {
      title: "Tỉ lệ quy đổi",
      dataIndex: "conversionRate",
      key: "conversionRate",
      render: (val) => <span>{formatNumber(val)}</span>,
    },
  ];

  if (userRole === "admin") {
    columns.push({
      title: "Thao tác",
      key: "actions",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
      ),
    });
  }

  return (
    <div>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        locale={{ emptyText: "Không có dữ liệu quy đổi đơn vị." }}
        scroll={{ x: 300 }}
      />

      {/* Modal sửa */}
      <Modal
        title="Sửa quy đổi đơn vị"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="Cập nhật"
        cancelText="Hủy"
        confirmLoading={updateStatus === "loading"}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Đơn vị đóng gói"
            name="packUnit"
            rules={[{ required: true, message: "Vui lòng nhập đơn vị đóng gói" }]}
          >
            <Input size="large" placeholder="Thùng, gói,..." disabled />
          </Form.Item>

          <Form.Item
            label="Đơn vị chính"
            name="mainUnit"
            rules={[{ required: true, message: "Vui lòng nhập đơn vị chính" }]}
          >
            <Input size="large" placeholder="Kilogram, gam,..." disabled />
          </Form.Item>

          <Form.Item
            label="Tỉ lệ quy đổi"
            name="conversionRate"
            rules={[
              { required: true, message: "Vui lòng nhập tỉ lệ quy đổi" },
              { pattern: /^\d+(\.\d+)?$/, message: "Chỉ nhập số" },
            ]}
          >
            <Input size="large" placeholder="1" min={1} step={0.001} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UnitConversion;
