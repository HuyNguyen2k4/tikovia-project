import React, { useEffect, useState } from "react";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  TagOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Input,
  Modal,
  Pagination,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  notification,
  Tabs,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchListSuppliers,
  deleteSupplier,
} from "@src/store/supplierSlice";

import AddSupplierModal from "./AddSupplierModal";
import EditSupplierModal from "./EditSupplierModal";
import SupplierDetailModal from "./SupplierDetailModal";

import "@assets/TablePage.css";
import "@assets/supplier/SupplierManage.css";

const { Title, Text } = Typography;

const SupplierManage = () => {
  const dispatch = useDispatch();

  // State quản lý
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const supplierList = useSelector((state) => state.supplier.suppliers);
  const status = useSelector((state) => state.supplier.fetchStatus);
  const error = useSelector((state) => state.supplier.fetchError);

  const isLoading = status === "loading";
  const isIdle = status === "idle";
  const isSucceeded = status === "succeeded";
  const isFailed = status === "failed";

  // Fetch supplier list
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    dispatch(fetchListSuppliers(requestParams));
  };

  useEffect(() => {
    if (status === "idle") fetchData();
  }, [status]);

  useEffect(() => {
    if (status !== "idle") fetchData();
  }, [current, pageSize, debouncedSearchText]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchText(searchText), 700);
    return () => clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    if (isSucceeded && supplierList) {
      const suppliers = supplierList.data || [];
      const pagination = supplierList.pagination || {};
      const dataWithKeys = suppliers.map((s, i) => ({
        ...s,
        key: s.id || i.toString(),
      }));
      setData(dataWithKeys);
      setTotal(pagination.total || suppliers.length);
    }
  }, [supplierList, isSucceeded]);

  // Handlers
  const handleRefresh = () => fetchData();

  const handleSearch = (e) => setSearchText(e.target.value);

  const handlePageChange = (page, size) => {
    if (size !== pageSize) {
      setPageSize(size);
      setCurrent(1);
    } else {
      setCurrent(page);
    }
  };

  const handleRowClick = (record) => {
    setSelectedSupplier(record);
    setModalVisible(true);
  };

  const handleModalClose = () => setModalVisible(false);

  const handleAddSupplier = () => setAddModalVisible(true);

  const handleEditSupplier = (record) => {
    setEditingSupplier(record);
    setEditModalVisible(true);
  };

  const handleDeleteSupplier = (record) => {
    Modal.confirm({
      title: "Xác nhận xóa nhà cung cấp",
      content: `Bạn có chắc muốn xóa nhà cung cấp "${record.name}" không?`,
      okText: "Xác nhận",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        dispatch(deleteSupplier(record.id))
          .unwrap()
          .then(() => {
            notification.success({
              message: "Xóa thành công",
              description: `Nhà cung cấp "${record.name}" đã bị xóa.`,
            });
            fetchData();
          })
          .catch((err) =>
            notification.error({
              message: "Lỗi xóa nhà cung cấp",
              description: err || "Không thể xóa nhà cung cấp.",
            })
          );
      },
    });
  };

  const columns = [
    {
      title: (
        <Space>
          Mã NCC
          <Tooltip title="Mã định danh nhà cung cấp">
            <QuestionCircleOutlined />
          </Tooltip>
        </Space>
      ),
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Tên nhà cung cấp",
      dataIndex: "name",
      width: 200,
      minWidth: 200,
      key: "name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      width: 200,
      render: (text) => (
        <Space>
          <PhoneOutlined />
          {text || "Không có"}
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Space>
            <MailOutlined />
            {text || "Không có"}
          </Space>
        </Tooltip>
      ),
    },
    // {
    //   title: "Địa chỉ",
    //   dataIndex: "address",
    //   key: "address",
    //   width: 300,
    //   render: (text) => (
    //     <Tooltip title={text}>
    //       <span
    //         style={{
    //           maxWidth: "280px",
    //           overflow: "hidden",
    //           textOverflow: "ellipsis",
    //           whiteSpace: "nowrap",
    //           display: "inline-block",
    //         }}
    //       >
    //         {text || "Chưa cập nhật"}
    //       </span>
    //     </Tooltip>
    //   ),
    // },
    {
      title: "Mã số thuế",
      dataIndex: "taxCode",
      key: "taxCode",
      width: 150,
      render: (text) => (
        <Space>
          <TagOutlined />
          {text || "Không có"}
        </Space>
      ),
    },
    // {
    //   title: "Ghi chú",
    //   dataIndex: "note",
    //   key: "note",
    //   width: 200, 
    //   render: (text) => (
    //     <Tooltip title={text}>
    //       <Text ellipsis style={{ maxWidth: 150 }}>
    //         {text || "-"}
    //       </Text>
    //     </Tooltip>
    //   ),
    // },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditSupplier(record);
              }}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSupplier(record);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="table-page-container">
      <Card
        className="table-card"
        styles={{
          body: { padding: "16px", display: "flex", flexDirection: "column", height: "100%" },
        }}
      >
        {/* Header */}
        <div className="table-header">
          <div className="departManage-headerContainer">
            <Title level={3}>Danh sách nhà cung cấp</Title>
            <Button
              onClick={handleRefresh}
              icon={<ReloadOutlined />}
              loading={isLoading}
              disabled={isLoading}
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* Error */}
        {isFailed && (
          <div className="departManage-errorContainer">
            <WarningOutlined className="departManage-errorIcon" />
            <Text type="danger">Không thể tải dữ liệu</Text>
            <Text>{error}</Text>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Toolbar */}
        {(isSucceeded || isLoading) && (
          <div className="table-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <Input
              placeholder="Tìm kiếm theo tên, mã, email hoặc địa chỉ"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={handleSearch}
              allowClear
              size="middle"
              style={{ width: "300px" }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddSupplier}
              disabled={isLoading}
            >
              Thêm nhà cung cấp
            </Button>
          </div>
        )}

        {/* Table */}
        {(isSucceeded || isLoading) && (
          <>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <Table
                columns={columns}
                dataSource={data}
                pagination={false}
                loading={isLoading}
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  style: { cursor: "pointer" },
                })}
                scroll={{ x: "max-content" }}
                className="w-full"
                tableLayout="fixed"
              />
            </div>

            {/* Pagination */}
            <div className="table-footer">
              <Pagination
                current={current}
                pageSize={pageSize}
                total={total}
                onChange={handlePageChange}
                showSizeChanger
                pageSizeOptions={["5", "10", "20", "50"]}
                showTotal={(t, r) => `${r[0]}-${r[1]} của ${t} nhà cung cấp`}
                size="small"
              />
            </div>
          </>
        )}
      </Card>

      {/* Modal xem chi tiết */}
      <SupplierDetailModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        supplier={selectedSupplier}
      />

      {/* Modals thêm/sửa */}
      <AddSupplierModal visible={addModalVisible} onCancel={() => setAddModalVisible(false)} onSuccess={fetchData} />
      <EditSupplierModal
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onSuccess={fetchData}
        supplierData={editingSupplier}
      />
    </div>
  );
};

export default SupplierManage;
