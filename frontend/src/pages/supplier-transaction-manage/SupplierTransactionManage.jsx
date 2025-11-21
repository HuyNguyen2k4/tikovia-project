import React, { useEffect, useState } from "react";

import {
  ApartmentOutlined,
  CalendarOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FileTextOutlined,
  LockOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  TagOutlined,
  UnlockOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
import "@assets/supplier/SupplierManage.css";
import {
  deleteSupplierTransaction,
  fetchSupplierTransactions,
  setTransactionAdminLock,
} from "@src/store/supplierTransactionCombineSlice";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Input,
  Modal,
  Pagination,
  Row,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import viVN from "antd/es/date-picker/locale/vi_VN";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import AddSupplierImportModal from "./AddSupplierImportModal";
import AddSupplierReturnModal from "./AddSupplierReturnModal";
import EditSupplierTransactionModal from "./EditSupplierTransactionModal";
import SupplierTransactionDetailModal from "./SupplierTransactionDetailModal";

const { Title, Text } = Typography;

const SupplierTransactionManage = () => {
  const dispatch = useDispatch();

  // ===================== STATE =====================
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedTrans, setSelectedTrans] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Modal states
  const [isReturnModalVisible, setIsReturnModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("detail");
  const userRole = useSelector((state) => state.auth.user?.role);
  const transactionList = useSelector((state) => state.supplierTransaction.transactions);
  const status = useSelector((state) => state.supplierTransaction.fetchStatus);
  const error = useSelector((state) => state.supplierTransaction.fetchError);
  const isLoading = status === "loading";
  const isSucceeded = status === "succeeded";
  const isFailed = status === "failed";
  const location = useLocation();

  // ===================== FETCH =====================
  const fetchData = (params = {}) => {
    const requestParams = {
      q: debouncedSearchText,
      limit: pageSize,
      offset: (current - 1) * pageSize,
      ...params,
    };
    dispatch(fetchSupplierTransactions(requestParams));
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

  // Load data into table
  useEffect(() => {
    if (isSucceeded && transactionList) {
      const items = transactionList.data || [];
      const pagination = transactionList.pagination || {};
      const withKeys = items.map((t, i) => ({
        ...t,
        key: t.id || i.toString(),
      }));
      setData(withKeys);
      setTotal(pagination.total || items.length);
    }
  }, [transactionList, isSucceeded]);

  // Khi có query ?transactionId=... → mở modal chi tiết tự động
  useEffect(() => {
    const transaction = location.state?.selectedTransaction;
    const activeTab = location.state?.activeTab;

    if (transaction) {
      setSelectedTrans(transaction);
      setModalVisible(true);
      setActiveTab(activeTab || "detail");

      // ✅ Xóa state để khi F5 không bị mở lại
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // ===================== HANDLERS =====================
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
    setSelectedTrans(record);
    setModalVisible(true);
  };

  const handleDeleteTransaction = (record) => {
    Modal.confirm({
      title: "Xác nhận xóa giao dịch",
      content: `Bạn có chắc muốn xóa chứng từ "${record.docNo}" không?`,
      okText: "Xác nhận",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        dispatch(deleteSupplierTransaction(record.id))
          .unwrap()
          .then(() => {
            notification.success({
              message: "Xóa thành công",
              description: `Giao dịch "${record.docNo}" đã bị xóa.`,
            });
            fetchData();
          })
          .catch((err) =>
            notification.error({
              message: "Lỗi xóa giao dịch",
              description: err || "Không thể xóa giao dịch.",
            })
          );
      },
    });
  };
  //**Xử lý khóa giao dịch */
  const handleToggleAdminLock = (record) => {
    const action = record.adminLocked ? "mở khóa" : "khóa";
    Modal.confirm({
      title: `Xác nhận ${action} giao dịch`,
      content: `Bạn có chắc muốn ${action} chứng từ "${record.docNo}" không?`,
      okText: "Xác nhận",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        dispatch(
          // Gọi action cập nhật trường adminLocked
          setTransactionAdminLock({ id: record.id, adminLocked: !record.adminLocked })
        )
          .unwrap()
          .then(() => {
            notification.success({
              message: `${action.charAt(0).toUpperCase() + action.slice(1)} thành công`,
              description: `Giao dịch "${record.docNo}" đã được ${action} thành công.`,
            });
            fetchData();
          })
          .catch((err) =>
            notification.error({
              message: `Lỗi ${action} giao dịch`,
              description: err || `Không thể ${action} giao dịch.`,
            })
          );
      },
    });
  };

  //**Hiển thị màu tag của ngày đến hạn */
  const renderDateTag = (text) => {
    if (!text) return <Tag>-</Tag>;
    const date = new Date(text);
    const now = new Date();
    // Chỉ so sánh ngày/tháng/năm
    date.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    let color = "green";
    if (diffDays < 0) color = "red";
    else if (diffDays === 0 || diffDays <= 3) color = "orange";
    return <Tag color={color}>{date.toLocaleDateString("vi-VN")}</Tag>;
  };

  // ===================== TABLE COLUMNS =====================
  const columns = [
    {
      title: (
        <Space>
          Số chứng từ
          <Tooltip title="Mã số chứng từ giao dịch (doc_no)">
            <QuestionCircleOutlined />
          </Tooltip>
        </Space>
      ),
      dataIndex: "docNo",
      key: "doc_no",
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 70,
      render: (text) => (
        <Tag color={text === "in" ? "green" : "red"}>{text === "in" ? "Nhập" : "Trả"} hàng</Tag>
      ),
      filters: [
        { text: "Nhập", value: "in" },
        { text: "Trả", value: "out" },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 110,
      filters: [
        { text: "Nháp", value: "draft" },
        { text: "Đang chờ", value: "pending" },
        { text: "Đã thanh toán", value: "paid" },
        { text: "Hủy", value: "cancelled" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (text) => {
        const colorMap = {
          draft: "orange",
          paid: "green",
          pending: "yellow",
          cancelled: "red",
        };
        const textMap = {
          draft: "Nháp",
          paid: "Đã thanh toán",
          pending: "Đang chờ",
          cancelled: "Hủy",
        };
        return <Tag color={colorMap[text] || "default"}>{textMap[text] || text}</Tag>;
      },
    },
    {
      title: "Ngày giao dịch",
      dataIndex: "transDate",
      key: "trans_date",
      width: 150,
      render: (text) => (
        <Space>
          <CalendarOutlined />
          {text ? new Date(text).toLocaleDateString("vi-VN") : "-"}
        </Space>
      ),
      sorter: (a, b) => new Date(a.transDate) - new Date(b.transDate),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <DatePicker.RangePicker
            locale={viVN}
            style={{ width: 220 }}
            value={
              selectedKeys[0]
                ? [dayjs(selectedKeys[0][0]), dayjs(selectedKeys[0][1])]
                : [null, null]
            }
            format="DD/MM/YYYY"
            onChange={(dates) => {
              if (dates && dates.length === 2) {
                setSelectedKeys([[dates[0].format("YYYY-MM-DD"), dates[1].format("YYYY-MM-DD")]]);
              } else {
                setSelectedKeys([]);
              }
            }}
            placeholder={["Từ ngày", "Đến ngày"]}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="primary" size="small" onClick={() => confirm()}>
              Lọc
            </Button>
            <Button
              size="small"
              onClick={() => {
                clearFilters();
                confirm();
              }}
            >
              Xóa
            </Button>
          </div>
        </div>
      ),
      onFilter: (value, record) => {
        if (!record.transDate || !value || value.length !== 2) return false;
        const recordDate = new Date(record.transDate);
        const startDate = new Date(value[0]);
        const endDate = new Date(value[1]);

        // Đặt giờ về 00:00:00 để so sánh chính xác theo ngày
        recordDate.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        return recordDate >= startDate && recordDate <= endDate;
      },
    },
    {
      title: "Ngày đến hạn",
      dataIndex: "dueDate",
      key: "due_date",
      width: 160,
      render: (text) => (
        <Space>
          <CalendarOutlined />
          {renderDateTag(text)}
        </Space>
      ),
      sorter: (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <DatePicker.RangePicker
            locale={viVN}
            style={{ width: 220 }}
            value={
              selectedKeys[0]
                ? [dayjs(selectedKeys[0][0]), dayjs(selectedKeys[0][1])]
                : [null, null]
            }
            format="DD/MM/YYYY"
            onChange={(dates) => {
              if (dates && dates.length === 2) {
                setSelectedKeys([[dates[0].format("YYYY-MM-DD"), dates[1].format("YYYY-MM-DD")]]);
              } else {
                setSelectedKeys([]);
              }
            }}
            placeholder={["Từ ngày", "Đến ngày"]}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="primary" size="small" onClick={() => confirm()}>
              Lọc
            </Button>
            <Button
              size="small"
              onClick={() => {
                clearFilters();
                confirm();
              }}
            >
              Xóa
            </Button>
          </div>
        </div>
      ),
      onFilter: (value, record) => {
        if (!record.dueDate || !value || value.length !== 2) return false;
        const recordDate = new Date(record.dueDate);
        const startDate = new Date(value[0]);
        const endDate = new Date(value[1]);

        // Đặt giờ về 00:00:00 để so sánh chính xác theo ngày
        recordDate.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        return recordDate >= startDate && recordDate <= endDate;
      },
    },
    {
      title: "Tổng tiền (VNĐ)",
      dataIndex: "totalAmount",
      key: "total_amount",
      width: 160,
      render: (value) => (
        <>
          {userRole === "manager" ? (
            <Text strong>*****</Text>
          ) : (
            <Text>{value?.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</Text>
          )}
        </>
      ),
      sorter: (a, b) => a.totalAmount - b.totalAmount,
    },
    {
      title: "Đã thanh toán",
      dataIndex: "paidAmount",
      key: "paid_amount",
      width: 160,
      render: (value, record) => {
        const isPaidEnough = value >= record.totalAmount;
        const color = isPaidEnough ? "green" : "gold";
        return (
          <>
            {userRole === "manager" ? (
              <Text strong>*****</Text>
            ) : (
              <Tag color={color}>
                {value?.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </Tag>
            )}
          </>
        );
      },
      sorter: (a, b) => a.paidAmount - b.paidAmount,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setEditingRecord(record);
                setIsEditModalVisible(true);
              }}
            />
          </Tooltip>
          {/* ẩn nút nếu role là accountant */}
          {userRole === "accountant" ? null : (
            <Tooltip title="Xóa">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTransaction(record);
                }}
              />
            </Tooltip>
          )}
          {/* Chỉ admin mới thấy nút lock */}
          {userRole === "admin" && (
            <Tooltip title={record.adminLocked ? "Mở khóa giao dịch" : "Khóa giao dịch"}>
              <Button
                type="text"
                icon={record.adminLocked ? <UnlockOutlined /> : <LockOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleAdminLock(record);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ===================== RENDER =====================
  return (
    <div className="table-page-container">
      <Card className="table-card" style={{ height: "100%" }}>
        {/* Header */}
        <div className="table-header">
          <div className="departManage-headerContainer">
            <Title level={3}>Nhập / Trả hàng nhà cung cấp</Title>
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
          <div className="table-toolbar">
            <div className="table-search">
              <Input
                placeholder="Tìm kiếm theo mã chứng từ, loại, trạng thái..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={handleSearch}
                allowClear
                size="middle"
              />
            </div>
            <div className="table-actions">
              {/* ẩn nút nếu role là accountant */}
              {userRole === "accountant" ? null : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={isLoading}
                    onClick={() => setIsImportModalVisible(true)}
                  >
                    Nhập hàng
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={isLoading}
                    onClick={() => setIsReturnModalVisible(true)}
                  >
                    Trả hàng
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {(isSucceeded || isLoading) && (
          <>
            <div className="custom-table" style={{ width: "100%", overflowX: "auto" }}>
              <Table
                columns={columns}
                dataSource={data}
                pagination={false}
                loading={isLoading}
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  style: { cursor: "pointer" },
                })}
                scroll={{ x: true }}
                className="w-full"
              />
            </div>
            {/* Summary and Pagination in one row */}
            <div
              className="table-footer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                minHeight: 40,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  Tổng số: <b>{total}</b> | Trang hiện tại: <b>{data.length}</b>
                </span>
                {(() => {
                  // Status keys: "draft", "pending", "paid", "cancelled"
                  const statusConfig = {
                    draft: { color: "default", text: "Nháp" },
                    pending: { color: "orange", text: "Đang chờ" },
                    paid: { color: "green", text: "Đã thanh toán" },
                    cancelled: { color: "red", text: "Hủy" },
                  };
                  const statusCounts = {
                    draft: data.filter((t) => t.status === "draft").length,
                    pending: data.filter((t) => t.status === "pending").length,
                    paid: data.filter((t) => t.status === "paid").length,
                    cancelled: data.filter((t) => t.status === "cancelled").length,
                  };
                  return (
                    <>
                      <Tag
                        color={statusConfig.draft.color}
                        style={{
                          fontWeight: 500,
                          fontSize: 13,
                          padding: "1px 8px",
                          marginLeft: 6,
                          marginRight: 3,
                        }}
                      >
                        {statusConfig.draft.text}
                      </Tag>
                      <span style={{ fontWeight: 500, fontSize: 13, marginRight: 8 }}>
                        {statusCounts.draft}
                      </span>
                      <Tag
                        color={statusConfig.pending.color}
                        style={{
                          fontWeight: 500,
                          fontSize: 13,
                          padding: "1px 8px",
                          marginLeft: 6,
                          marginRight: 3,
                        }}
                      >
                        {statusConfig.pending.text}
                      </Tag>
                      <span style={{ fontWeight: 500, fontSize: 13, marginRight: 8 }}>
                        {statusCounts.pending}
                      </span>
                      <Tag
                        color={statusConfig.paid.color}
                        style={{
                          fontWeight: 500,
                          fontSize: 13,
                          padding: "1px 8px",
                          marginLeft: 6,
                          marginRight: 3,
                        }}
                      >
                        {statusConfig.paid.text}
                      </Tag>
                      <span style={{ fontWeight: 500, fontSize: 13, marginRight: 8 }}>
                        {statusCounts.paid}
                      </span>
                      <Tag
                        color={statusConfig.cancelled.color}
                        style={{
                          fontWeight: 500,
                          fontSize: 13,
                          padding: "1px 8px",
                          marginLeft: 6,
                          marginRight: 3,
                        }}
                      >
                        {statusConfig.cancelled.text}
                      </Tag>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>
                        {statusCounts.cancelled}
                      </span>
                    </>
                  );
                })()}
              </div>
              <Pagination
                current={current}
                pageSize={pageSize}
                total={total}
                onChange={handlePageChange}
                showSizeChanger
                pageSizeOptions={["5", "10", "20", "50"]}
                showTotal={(t, r) => `${r[0]}-${r[1]} của ${t} giao dịch`}
                size="small"
              />
            </div>
          </>
        )}
      </Card>

      {/* Modal chi tiết */}
      <SupplierTransactionDetailModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
        }}
        transactionId={selectedTrans?.id}
        defaultActiveTab={activeTab}
      />

      {/* Modal nhập hàng */}
      <AddSupplierImportModal
        visible={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        onSuccess={() => {
          setIsImportModalVisible(false);
          fetchData(); // load lại bảng
        }}
      />
      {/* Modal trả hàng */}
      <AddSupplierReturnModal
        visible={isReturnModalVisible}
        onCancel={() => setIsReturnModalVisible(false)}
        onSuccess={() => {
          setIsReturnModalVisible(false);
          fetchData(); // load lại bảng
        }}
      />

      {/* Modal chỉnh sửa giao dịch */}
      <EditSupplierTransactionModal
        visible={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onSuccess={() => {
          setIsEditModalVisible(false);
          fetchData(); // load lại bảng
        }}
        // transactionData={editingRecord}
        transactionId={editingRecord?.id}
      />
    </div>
  );
};

export default SupplierTransactionManage;
