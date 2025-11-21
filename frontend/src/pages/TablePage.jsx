import React, { useState } from "react";

import {
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import "@assets/TablePage.css";
import {
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Pagination,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";

const { Title, Text } = Typography;

// Dữ liệu demo cho lịch sử giao dịch
const getTransactionHistory = (supplierId) => {
  const transactions = {
    NCC000057: [
      {
        id: "PN004625",
        date: "07/05/2025 15:23",
        creator: "Thực phẩm Tích Đại Việt",
        amount: 27668095,
        status: "Đã nhập hàng",
      },
      {
        id: "PN004606",
        date: "05/05/2025 14:28",
        creator: "Thực phẩm Tích Đại Việt",
        amount: 4449350,
        status: "Đã nhập hàng",
      },
      {
        id: "PN004589",
        date: "02/05/2025 16:37",
        creator: "Thực phẩm Tích Đại Việt",
        amount: 21413665,
        status: "Đã nhập hàng",
      },
      {
        id: "PN004624",
        date: "29/04/2025 14:00",
        creator: "Thực phẩm Tích Đại Việt",
        amount: 26374950,
        status: "Đã nhập hàng",
      },
      {
        id: "PN004543",
        date: "25/04/2025 17:02",
        creator: "Thực phẩm Tích Đại Việt",
        amount: 17866800,
        status: "Đã nhập hàng",
      },
    ],
    NCC000059: [
      {
        id: "PN004701",
        date: "10/05/2025 09:15",
        creator: "Bee Bee Corp",
        amount: 3452400,
        status: "Đã nhập hàng",
      },
      {
        id: "PN004682",
        date: "08/05/2025 11:30",
        creator: "Bee Bee Corp",
        amount: 2452400,
        status: "Đang xử lý",
      },
      {
        id: "PN004655",
        date: "05/05/2025 14:20",
        creator: "Bee Bee Corp",
        amount: 1000000,
        status: "Đã nhập hàng",
      },
    ],
    NCC000055: [
      {
        id: "PN004800",
        date: "12/05/2025 10:30",
        creator: "Hoàng Gia Enterprise",
        amount: 15000000,
        status: "Đã nhập hàng",
      },
      {
        id: "PN004785",
        date: "09/05/2025 16:45",
        creator: "Hoàng Gia Enterprise",
        amount: 8500000,
        status: "Đã nhập hàng",
      },
      {
        id: "PN004756",
        date: "06/05/2025 11:15",
        creator: "Hoàng Gia Enterprise",
        amount: 22000000,
        status: "Chờ xác nhận",
      },
    ],
    NCC000041: [
      {
        id: "PN004920",
        date: "15/05/2025 08:00",
        creator: "Tổng Công Ty Dầu Khí",
        amount: 150000000,
        status: "Đã nhập hàng",
      },
      {
        id: "PN004901",
        date: "13/05/2025 14:30",
        creator: "Tổng Công Ty Dầu Khí",
        amount: 200000000,
        status: "Đã nhập hàng",
      },
      {
        id: "PN004887",
        date: "10/05/2025 09:45",
        creator: "Tổng Công Ty Dầu Khí",
        amount: 167000000,
        status: "Đang xử lý",
      },
    ],
  };

  return (
    transactions[supplierId] || [
      {
        id: "PN00" + Math.floor(Math.random() * 10000),
        date: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN"),
        creator: "Nhà cung cấp",
        amount: Math.floor(Math.random() * 50000000),
        status: "Đã nhập hàng",
      },
    ]
  );
};

// Dữ liệu demo cho bảng nhà cung cấp
const initialData = [
  {
    key: "1",
    id: "NCC000059",
    name: "Công ty Bee Bee",
    phone: "0905111555",
    email: "beebee@company.com",
    debt: 0,
    totalPurchase: 6904800,
  },
  {
    key: "2",
    id: "NCC000058",
    name: "Công ty Quân Bảo",
    phone: "0902954917",
    email: "quanbao@company.com",
    debt: 0,
    totalPurchase: 0,
  },
  {
    key: "3",
    id: "NCC000057",
    name: "Văn Long Tuyết (có bảy)",
    phone: "0905169048-1",
    email: "vanlong@company.com",
    debt: 36822836,
    totalPurchase: 296822836,
  },
  {
    key: "4",
    id: "NCC000056",
    name: "Nhà Phân Phối Mực Miền Trung",
    phone: "0905123456",
    email: "mucmientrung@company.com",
    debt: 0,
    totalPurchase: 45156414,
  },
  {
    key: "5",
    id: "NCC000055",
    name: "Công ty TNHH Hoàng Gia",
    phone: "0987654321",
    email: "hoanggia@company.com",
    debt: 12500000,
    totalPurchase: 125000000,
  },
  {
    key: "6",
    id: "NCC000054",
    name: "Công ty Thái Bình Dương",
    phone: "0943123456",
    email: "thaibinhduong@company.com",
    debt: 0,
    totalPurchase: 78900000,
  },
  {
    key: "7",
    id: "NCC000053",
    name: "Nhà Máy Sản Xuất ABC",
    phone: "0909876543",
    email: "nhamayabc@company.com",
    debt: 5400000,
    totalPurchase: 189000000,
  },
  {
    key: "8",
    id: "NCC000052",
    name: "Công ty Cổ Phần Việt Nam",
    phone: "0912345678",
    email: "vietnamcorp@company.com",
    debt: 0,
    totalPurchase: 234000000,
  },
  {
    key: "9",
    id: "NCC000051",
    name: "Doanh Nghiệp Tư Nhân Minh Anh",
    phone: "0976543210",
    email: "minhanh@company.com",
    debt: 8900000,
    totalPurchase: 67000000,
  },
  {
    key: "10",
    id: "NCC000050",
    name: "Công ty TNHH Đầu Tư Phát Triển",
    phone: "0938765432",
    email: "dautuphat@company.com",
    debt: 0,
    totalPurchase: 156000000,
  },
  {
    key: "11",
    id: "NCC000049",
    name: "Tập Đoàn Kinh Doanh Quốc Tế",
    phone: "0924681357",
    email: "kinhdoanhqt@company.com",
    debt: 25000000,
    totalPurchase: 345000000,
  },
  {
    key: "12",
    id: "NCC000048",
    name: "Công ty Xuất Nhập Khẩu Á Châu",
    phone: "0918273645",
    email: "xuatnhapachau@company.com",
    debt: 0,
    totalPurchase: 198000000,
  },
  {
    key: "13",
    id: "NCC000047",
    name: "Nhà Phân Phối Điện Tử Số",
    phone: "0956789123",
    email: "dientuso@company.com",
    debt: 3200000,
    totalPurchase: 89000000,
  },
  {
    key: "14",
    id: "NCC000046",
    name: "Công ty Logistics Vận Tải",
    phone: "0945612378",
    email: "logisticsvantai@company.com",
    debt: 0,
    totalPurchase: 112000000,
  },
  {
    key: "15",
    id: "NCC000045",
    name: "Doanh Nghiệp Sản Xuất Thực Phẩm",
    phone: "0967234589",
    email: "thucpham@company.com",
    debt: 7800000,
    totalPurchase: 145000000,
  },
  {
    key: "16",
    id: "NCC000044",
    name: "Công ty TNHH Công Nghệ Cao",
    phone: "0932145678",
    email: "congnghecao@company.com",
    debt: 0,
    totalPurchase: 267000000,
  },
  {
    key: "17",
    id: "NCC000043",
    name: "Nhà Cung Cấp Vật Liệu Xây Dựng",
    phone: "0914567890",
    email: "vatlieuxaydung@company.com",
    debt: 15600000,
    totalPurchase: 189000000,
  },
  {
    key: "18",
    id: "NCC000042",
    name: "Công ty Dệt May Việt Tiến",
    phone: "0983456789",
    email: "detmayviet@company.com",
    debt: 0,
    totalPurchase: 78000000,
  },
  {
    key: "19",
    id: "NCC000041",
    name: "Tổng Công Ty Dầu Khí",
    phone: "0921374685",
    email: "daukhi@company.com",
    debt: 45000000,
    totalPurchase: 567000000,
  },
  {
    key: "20",
    id: "NCC000040",
    name: "Công ty Nông Nghiệp Xanh",
    phone: "0975319864",
    email: "nongghiepxanh@company.com",
    debt: 0,
    totalPurchase: 123000000,
  },
  {
    key: "21",
    id: "NCC000039",
    name: "Nhà Máy Chế Biến Thủy Sản",
    phone: "0948261357",
    email: "chebienthuysan@company.com",
    debt: 9200000,
    totalPurchase: 156000000,
  },
  {
    key: "22",
    id: "NCC000038",
    name: "Công ty Phần Mềm Số Hóa",
    phone: "0936847251",
    email: "phanmemsohua@company.com",
    debt: 0,
    totalPurchase: 89000000,
  },
  {
    key: "23",
    id: "NCC000037",
    name: "Doanh Nghiệp Y Tế Đa Khoa",
    phone: "0927518364",
    email: "ytedakhoa@company.com",
    debt: 6700000,
    totalPurchase: 234000000,
  },
  {
    key: "24",
    id: "NCC000036",
    name: "Công ty Giải Pháp Kinh Doanh",
    phone: "0954738261",
    email: "giaiphapkd@company.com",
    debt: 0,
    totalPurchase: 178000000,
  },
  {
    key: "25",
    id: "NCC000035",
    name: "Nhà Phân Phối Ô Tô Xe Máy",
    phone: "0918364725",
    email: "otoxemay@company.com",
    debt: 18500000,
    totalPurchase: 456000000,
  },
];

const TablePage = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState(initialData);
  const [current, setCurrent] = useState(1);
  const [pageSize] = useState(15);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Xử lý tìm kiếm
  const handleSearch = (value) => {
    setSearchText(value);
    const filteredData = initialData.filter(
      (item) =>
        item.name.toLowerCase().includes(value.toLowerCase()) ||
        item.id.toLowerCase().includes(value.toLowerCase()) ||
        item.phone.includes(value) ||
        item.email.toLowerCase().includes(value.toLowerCase())
    );
    setData(filteredData);
    setCurrent(1);
  };

  // Tính toán dữ liệu cho trang hiện tại
  const getCurrentPageData = () => {
    const startIndex = (current - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  };

  const currentPageData = getCurrentPageData();

  // Xử lý click vào hàng
  const handleRowClick = (record) => {
    setSelectedSupplier(record);
    setModalVisible(true);
  };

  // Xử lý đóng modal
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedSupplier(null);
  };

  // Định nghĩa các cột của bảng
  const columns = [
    {
      title: (
        <Space>
          Mã nhà cung cấp
          <Tooltip title="Mã định danh duy nhất của nhà cung cấp">
            <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: "id",
      key: "id",
      width: 150,
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: (
        <Space>
          Tên nhà cung cấp
          <Tooltip title="Tên công ty hoặc cá nhân nhà cung cấp">
            <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: "name",
      key: "name",
      render: (text) => <span className="supplier-name-link">{text}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: (
        <Space>
          Điện thoại
          <Tooltip title="Số điện thoại liên hệ">
            <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: "phone",
      key: "phone",
      width: 130,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
    },
    {
      title: (
        <Space>
          Nợ cần trả hiện tại
          <Tooltip title="Số tiền còn nợ cần thanh toán">
            <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: "debt",
      key: "debt",
      width: 150,
      render: (value) => (
        <span className={`debt-amount ${value > 0 ? "positive" : "zero"}`}>
          {value.toLocaleString("vi-VN")}
        </span>
      ),
      sorter: (a, b) => a.debt - b.debt,
    },
    {
      title: (
        <Space>
          Tổng mua
          <Tooltip title="Tổng giá trị đã mua từ nhà cung cấp">
            <QuestionCircleOutlined style={{ color: "#8c8c8c" }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: "totalPurchase",
      key: "totalPurchase",
      width: 150,
      render: (value) => <span className="purchase-amount">{value.toLocaleString("vi-VN")}</span>,
      sorter: (a, b) => a.totalPurchase - b.totalPurchase,
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    onSelectAll: (selected, selectedRows, changeRows) => {
      if (selected) {
        setSelectedRowKeys(currentPageData.map((item) => item.key));
      } else {
        setSelectedRowKeys([]);
      }
    },
    getCheckboxProps: (record) => ({
      onClick: (e) => e.stopPropagation(), // Ngăn trigger click row
    }),
  };

  return (
    <div className="table-page-container">
      <Card
        className="table-card"
        bodyStyle={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%" }}
      >
        {/* Header */}
        <div className="table-header">
          <Title level={4}>Danh sách nhà cung cấp</Title>
        </div>

        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="table-search">
            <Input
              placeholder="Theo mã, tên, số điện thoại"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              size="middle"
              allowClear
            />
          </div>

          <div className="table-actions">
            <Button type="primary" icon={<PlusOutlined />} size="middle">
              Nhà cung cấp
            </Button>
            <Button icon={<ImportOutlined />} size="middle">
              Import file
            </Button>
            <Button icon={<ExportOutlined />} size="middle">
              Xuất file
            </Button>
            <Button icon={<SettingOutlined />} size="middle" />
            <Button icon={<QuestionCircleOutlined />} size="middle" />
          </div>
        </div>

        {/* Table */}
        <div className="custom-table">
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={currentPageData}
            pagination={false}
            scroll={{ x: 1200, y: "calc(100vh - 280px)" }}
            size="middle"
            onRow={(record) => ({
              onClick: (e) => {
                // Chỉ trigger click nếu không click vào checkbox
                if (!e.target.closest(".ant-checkbox-wrapper")) {
                  handleRowClick(record);
                }
              },
              style: { cursor: "pointer" },
            })}
          />
        </div>

        {/* Summary và Pagination */}
        <div className="table-footer">
          <div className="summary-section">
            <span className="summary-item">
              Tổng nợ: {data.reduce((sum, item) => sum + item.debt, 0).toLocaleString("vi-VN")}
            </span>
            <span className="summary-item">
              Tổng mua:{" "}
              {data.reduce((sum, item) => sum + item.totalPurchase, 0).toLocaleString("vi-VN")}
            </span>
          </div>

          <div className="pagination-section">
            <span className="pagination-info">
              {(current - 1) * pageSize + 1}-{Math.min(current * pageSize, data.length)} của{" "}
              {data.length} mục
            </span>
            <Pagination
              current={current}
              pageSize={pageSize}
              total={data.length}
              onChange={setCurrent}
              showSizeChanger={false}
              size="small"
            />
            <span className="pagination-info">{pageSize} / page</span>
          </div>
        </div>
      </Card>

      {/* Modal hiển thị chi tiết nhà cung cấp */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "16px", fontWeight: 600 }}>{selectedSupplier?.id}</span>
            <span style={{ fontSize: "18px", color: "#1890ff" }}>{selectedSupplier?.name}</span>
          </div>
        }
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={1000}
        style={{ top: 20 }}
      >
        {selectedSupplier && (
          <div>
            {/* Thông tin tổng quan */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
                padding: "16px",
                background: "#f8f9fa",
                borderRadius: "8px",
              }}
            >
              <div>
                <Text strong>Điện thoại: </Text>
                <Text>{selectedSupplier.phone}</Text>
              </div>
              <div>
                <Text strong>Email: </Text>
                <Text>{selectedSupplier.email}</Text>
              </div>
              <div>
                <Text strong>Nợ hiện tại: </Text>
                <Text
                  style={{
                    color: selectedSupplier.debt > 0 ? "#ff4d4f" : "#52c41a",
                    fontWeight: "bold",
                  }}
                >
                  {selectedSupplier.debt.toLocaleString("vi-VN")} VNĐ
                </Text>
              </div>
              <div>
                <Text strong>Tổng mua: </Text>
                <Text style={{ color: "#1890ff", fontWeight: "bold" }}>
                  {selectedSupplier.totalPurchase.toLocaleString("vi-VN")} VNĐ
                </Text>
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              defaultActiveKey="1"
              items={[
                {
                  key: "1",
                  label: "Thông tin",
                  children: (
                    <div style={{ padding: "16px 0" }}>
                      <Title level={5}>Thông tin chi tiết</Title>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <Text strong>Mã nhà cung cấp:</Text>
                          <br />
                          <Text>{selectedSupplier.id}</Text>
                        </div>
                        <div>
                          <Text strong>Tên nhà cung cấp:</Text>
                          <br />
                          <Text>{selectedSupplier.name}</Text>
                        </div>
                        <div>
                          <Text strong>Số điện thoại:</Text>
                          <br />
                          <Text>{selectedSupplier.phone}</Text>
                        </div>
                        <div>
                          <Text strong>Email:</Text>
                          <br />
                          <Text>{selectedSupplier.email}</Text>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "2",
                  label: "Lịch sử nhập/trả hàng",
                  children: (
                    <div>
                      <Table
                        columns={[
                          {
                            title: "Mã phiếu",
                            dataIndex: "id",
                            key: "id",
                            render: (text) => (
                              <span style={{ color: "#1890ff", cursor: "pointer" }}>{text}</span>
                            ),
                          },
                          {
                            title: "Thời gian",
                            dataIndex: "date",
                            key: "date",
                          },
                          {
                            title: "Người tạo",
                            dataIndex: "creator",
                            key: "creator",
                          },
                          {
                            title: "Tổng cộng",
                            dataIndex: "amount",
                            key: "amount",
                            render: (amount) => (
                              <span style={{ fontWeight: "bold", color: "#1890ff" }}>
                                {amount.toLocaleString("vi-VN")}
                              </span>
                            ),
                          },
                          {
                            title: "Trạng thái",
                            dataIndex: "status",
                            key: "status",
                            render: (status) => {
                              const color =
                                status === "Đã nhập hàng"
                                  ? "green"
                                  : status === "Đang xử lý"
                                    ? "orange"
                                    : "red";
                              return <Tag color={color}>{status}</Tag>;
                            },
                          },
                        ]}
                        dataSource={getTransactionHistory(selectedSupplier.id)}
                        pagination={{ pageSize: 5, size: "small" }}
                        size="small"
                        rowKey="id"
                      />
                    </div>
                  ),
                },
                {
                  key: "3",
                  label: "Nợ cần trả nhà cung cấp",
                  children: (
                    <div style={{ padding: "16px 0" }}>
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          background: selectedSupplier.debt > 0 ? "#fff2f0" : "#f6ffed",
                          borderRadius: "8px",
                          border: `1px solid ${selectedSupplier.debt > 0 ? "#ffccc7" : "#b7eb8f"}`,
                        }}
                      >
                        <Title
                          level={3}
                          style={{
                            color: selectedSupplier.debt > 0 ? "#ff4d4f" : "#52c41a",
                            margin: 0,
                          }}
                        >
                          {selectedSupplier.debt.toLocaleString("vi-VN")} VNĐ
                        </Title>
                        <Text type="secondary" style={{ fontSize: "16px" }}>
                          {selectedSupplier.debt > 0
                            ? "Số tiền cần thanh toán"
                            : "Không có nợ cần trả"}
                        </Text>
                        {selectedSupplier.debt > 0 && (
                          <div style={{ marginTop: "20px" }}>
                            <Button type="primary" size="large">
                              Tạo phiếu thanh toán
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TablePage;
