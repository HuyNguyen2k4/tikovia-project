import React, { use } from "react";

import { Table, Tag } from "antd";
import { useNavigate } from "react-router-dom"; 

const formatCurrency = (value) => {
  if (typeof value !== "number") return "0 ₫";
  return value.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function SupTransactionPaymentBySupId({ data, loading, pagination, onPageChange }) {
  const navigate = useNavigate();

  const columns = [
    {
      title: "Số chứng từ",
      dataIndex: "docNo",
      key: "docNo",
      width: 160,
      render: (text) => <Tag color="purple" onClick={() => console.log(text)}>{text}</Tag>,
    },
    {
      title: "Số tiền thanh toán",
      dataIndex: "amount",
      key: "amount",
      width: 180,
      render: (value) => <Tag color="green">{formatCurrency(value)}</Tag>,
    },
    {
      title: "Ngày thanh toán",
      dataIndex: "paidAt",
      key: "paidAt",
      width: 160,
      render: (text) => formatDate(text),
    },
    {
      title: "Người thanh toán",
      dataIndex: "paidByName",
      key: "paidByName",
      width: 150,
      ellipsis: true,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (text) => text || <span style={{ color: "#999" }}>Không có</span>,
    }
  ];

  // Logic để tính toán page hiện tại từ offset và limit của API
  const currentPage = Math.floor(pagination?.offset / pagination?.limit) + 1;

  // ===== CLICK ROW =====
  const handleRowClick = (record) => {
    navigate("/admin/common/supplier-transaction", {
      state: {
        selectedTransaction: { id: record.transId }, // hoặc chỉ record.id nếu muốn nhẹ
        activeTab: "payments",
      },
    });
  };

  return (
    <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        bordered
        size="small"
        pagination={{
          current: currentPage || 1,
          pageSize: pagination?.limit || 10,
          total: pagination?.total || 0,
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} thanh toán`,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          onChange: (page, pageSize) => {
            if (onPageChange) {
              onPageChange(page, pageSize);
            }
          },
          onShowSizeChange: (current, size) => {
            if (onPageChange) {
              onPageChange(1, size); // Reset về trang 1 khi thay đổi pageSize
            }
          },
        }}
        scroll={{ x: 800 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          onMouseEnter: (e) => (e.currentTarget.style.backgroundColor = "#fafafa"),
          onMouseLeave: (e) => (e.currentTarget.style.backgroundColor = ""),
          title: "Bấm để xem chi tiết",
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}

export default SupTransactionPaymentBySupId;