import React, { useEffect, useState } from "react";

import { fetchInventoryLots } from "@src/store/inventoryLotSlice";
import { Alert, Spin, Table, Tag, Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

function InventoryLotByProduct({ productId, lowStockThreshold, nearExpiryDays }) {
  const dispatch = useDispatch();
  const inventoryLotsObj = useSelector((state) => state.inventoryLot.inventoryLotsByProductId);
  const fetchStatus = useSelector((state) => state.inventoryLot.fetchStatus);
  const fetchError = useSelector((state) => state.inventoryLot.fetchError);

  const inventoryLots = inventoryLotsObj?.data || [];
  const pagination = inventoryLotsObj?.pagination || { total: 0, limit: 10, offset: 0 };

  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const handleRowClick = (record) => {
    navigate(`/inventory-lot?lotId=${record.id}`);
  };

  useEffect(() => {
    if (productId) {
      dispatch(
        fetchInventoryLots({
          productId,
          params: { limit: pagination.limit, offset: (currentPage - 1) * pagination.limit },
        })
      );
    }
  }, [dispatch, productId, currentPage, pagination.limit]);
  const handleTableChange = (paginationObj) => {
    setCurrentPage(paginationObj.current);
  };
  // Tổng qtyOnHand
  // làm tròn an toàn đến 2 chữ số thập phân
  const totalQtyRaw = inventoryLots.reduce((sum, lot) => sum + Number(lot.qtyOnHand || 0), 0);
  const totalQty = Math.round((totalQtyRaw + Number.EPSILON) * 1000) / 1000;
  const lowStock = Math.round((Number(lowStockThreshold || 0) + Number.EPSILON) * 1000) / 1000;
  // Chọn màu cho tổng tồn kho
  let qtyColor = "green";
  if (totalQty === 0) qtyColor = "red";
  else if (totalQty < lowStock) qtyColor = "orange";

  // Chọn màu cho hạn sử dụng
  const getExpiryColor = (expiryDate) => {
    if (!expiryDate) return "default";
    const msPerDay = 24 * 60 * 60 * 1000;
    const today = new Date();
    // normalize both dates to local start of day to avoid time-of-day issues
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const expiry = new Date(expiryDate);
    const expiryStart = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    const diffDays = Math.floor((expiryStart - todayStart) / msPerDay);
    if (diffDays < 0) return "red";
    if (diffDays <= Number(nearExpiryDays || 0)) return "orange";
    return "green";
  };

  const columns = [
    {
      title: "Lô hàng",
      dataIndex: "lotNo",
      key: "lotNo",
      width: 140,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
      width: 160,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Mã SKU",
      dataIndex: "skuCode",
      key: "skuCode",
      width: 120,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Phòng ban",
      dataIndex: "departmentName",
      key: "departmentName",
      width: 120,
      render: (text, record) => (
        <span>
          <Tag color="blue" style={{ marginLeft: 4 }}>
            {record.departmentCode}
          </Tag>
        </span>
      ),
    },
    {
      title: "Số lượng tồn kho",
      dataIndex: "qtyOnHand",
      key: "qtyOnHand",
      width: 120,
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: "Hạn sử dụng",
      dataIndex: "expiryDate",
      key: "expiryDate",
      width: 100,
      render: (text) => {
        if (!text) return <Text type="secondary">Không có</Text>;
        const color = getExpiryColor(text);
        return (
          <Tag color={color}>
            {new Date(text).toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </Tag>
        );
      },
    },
    {
      title: "Tỉ lệ chuyển đổi",
      dataIndex: "conversionRate",
      key: "conversionRate",
      width: 120,
      render: (text, record) => (
        <Text>
          1 {record.packUnit} = {record.conversionRate} {record.mainUnit}
        </Text>
      ),
    }
  ];

  if (fetchStatus === "loading") {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (fetchStatus === "failed") {
    return (
      <Alert
        type="error"
        message="Không thể tải danh sách lô hàng"
        description={fetchError?.message || "Đã xảy ra lỗi khi tải dữ liệu."}
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text strong>Tổng số lượng tồn kho: </Text>
        <Tag color={qtyColor} style={{ fontSize: 16, padding: "2px 12px" }}>
          {totalQty}
        </Tag>
        <Text style={{ marginLeft: 8, color: "#888" }}>(Ngưỡng cảnh báo: {lowStock})</Text>
      </div>
      <Table
        columns={columns}
        dataSource={inventoryLots.map((lot) => ({ ...lot, key: lot.id }))}
        pagination={{
          current: currentPage,
          pageSize: pagination.limit,
          total: pagination.total,
          showSizeChanger: false,
        }}
        size="small"
        bordered
        locale={{
          emptyText: "Không có lô hàng nào cho sản phẩm này.",
        }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: "pointer" },
        })}
        scroll={{ x: 800 }}
      />
    </div>
  );
}

export default InventoryLotByProduct;
