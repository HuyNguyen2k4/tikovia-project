import React, { useEffect, useState } from "react";

import {
  EnvironmentOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import "@assets/supplier/SupplierDetailModal.css";
import { LiquidGlassPanel } from "@src/components/common/LiquidGlassPanel";
import { fetchListSupTransactionPayments } from "@src/store/supTransactionPaymentSlice";
import { fetchTransactionsBySupplier } from "@src/store/supplierTransactionCombineSlice";
import { Modal, Space, Spin, Table, Tabs, Tag, Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import SupTransactionPaymentBySupId from "./SupTransactionPaymentBySupId";

const { Text } = Typography;

const SupplierDetailModal = ({ visible, onCancel, supplier }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const supTransactionPaymentList = useSelector(
    (state) => state.supTransactionPayment.supTransactionPayments
  );
  const fetchStatusPayments = useSelector((state) => state.supTransactionPayment.fetchStatus);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== FETCH TRANSACTIONS =====
  useEffect(() => {
    if (visible && supplier?.id) {
      setLoading(true);
      dispatch(fetchTransactionsBySupplier({ supplierId: supplier.id }))
        .unwrap()
        .then((res) => setTransactions(res?.data || []))
        .catch(() => setTransactions([]))
        .finally(() => setLoading(false));
    } else if (!visible) {
      setTransactions([]);
    }
  }, [visible, supplier, dispatch]);

  // ===== FETCH PAYMENTS (Initial load) =====
  useEffect(() => {
    if (visible && supplier?.id) {
      dispatch(
        fetchListSupTransactionPayments({
          supplierId: supplier.id,
          limit: 10,
          offset: 0,
        })
      );
    }
  }, [visible, supplier, dispatch]);

  // ===== HANDLE PAYMENT PAGE CHANGE =====
  const handlePaymentPageChange = (page, pageSize) => {
    if (!supplier?.id) return;

    const offset = (page - 1) * pageSize;
    dispatch(
      fetchListSupTransactionPayments({
        supplierId: supplier.id,
        limit: pageSize,
        offset: offset,
      })
    );
  };
  const supTransactionPayments = supTransactionPaymentList?.data || [];
  const pagination = supTransactionPaymentList?.pagination || {
    total: 0,
    limit: 10,
    offset: 0,
  };
  const loadingPayments = fetchStatusPayments === "loading";
  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "Số chứng từ",
      dataIndex: "docNo",
      key: "docNo",
      width: 160,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Loại giao dịch",
      dataIndex: "type",
      key: "type",
      width: 140,
      render: (text) => (
        <Tag color={text === "in" ? "green" : "volcano"}>
          {text === "in" ? "Nhập hàng" : "Xuất hàng"}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => {
        const colorMap = {
          done: "green",
          draft: "orange",
          unpaid: "red",
          paid: "blue",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Tổng tiền (VNĐ)",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "right",
      width: 180,
      render: (value) =>
        value
          ? value.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })
          : "0 ₫",
    },
  ];

  // ===== CLICK ROW =====
  const handleRowClick = (record) => {
    onCancel(); // đóng modal NCC
    navigate("/admin/common/supplier-transaction", {
      state: {
        selectedTransaction: record, // hoặc chỉ record.id nếu muốn nhẹ
        activeTab: "detail",
      },
    });
  };

  // ===== UI =====
  return (
    <Modal
      title={
        <div className="invenLotManage-modalTitleContainer">
          <ShopOutlined style={{ fontSize: 22, color: "#1677ff", flexShrink: 0 }} />
          <span className="invenLotManage-modalLotNo">
            {supplier?.name || "Chi tiết nhà cung cấp"}
          </span>
          <Tag color="blue" className="invenLotManage-modalDepartmentName">
            NCC#{supplier?.code}
          </Tag>
        </div>
      }
      className="invenLotManage-custom-modal"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      // bodyStyle={{
      //   maxHeight: "75vh",
      //   overflowY: "auto",
      //   padding: "16px 18px",
      // }}
      style={{ top: 32 }}
      destroyOnHidden
    >
      {supplier ? (
        <Tabs
          defaultActiveKey="detail"
          items={[
            {
              key: "detail",
              label: "Thông tin chi tiết",
              children: (
                <div className="lot-detail-grid">
                  <LiquidGlassPanel padding={12} radius={12}>
                    <Text type="secondary">Mã nhà cung cấp:</Text>
                    <div className="lot-detail-value">
                      <Tag color="blue">{supplier.code}</Tag>
                    </div>
                  </LiquidGlassPanel>

                  <LiquidGlassPanel padding={12} radius={12}>
                    <Text type="secondary">Tên nhà cung cấp:</Text>
                    <div className="lot-detail-value">{supplier.name}</div>
                  </LiquidGlassPanel>

                  <LiquidGlassPanel padding={12} radius={12}>
                    <Text type="secondary">Số điện thoại:</Text>
                    <div className="lot-detail-value">
                      <Space>
                        <PhoneOutlined />
                        {supplier.phone || "Không có"}
                      </Space>
                    </div>
                  </LiquidGlassPanel>

                  <LiquidGlassPanel padding={12} radius={12}>
                    <Text type="secondary">Email:</Text>
                    <div className="lot-detail-value">
                      <Space>
                        <MailOutlined />
                        {supplier.email || "Không có"}
                      </Space>
                    </div>
                  </LiquidGlassPanel>

                  <LiquidGlassPanel padding={12} radius={12}>
                    <Text type="secondary">Địa chỉ:</Text>
                    <div className="lot-detail-value">
                      <Space>
                        <EnvironmentOutlined />
                        {supplier.address || "Chưa cập nhật"}
                      </Space>
                    </div>
                  </LiquidGlassPanel>

                  <LiquidGlassPanel padding={12} radius={12}>
                    <Text type="secondary">Mã số thuế:</Text>
                    <div className="lot-detail-value">{supplier.taxCode || "Không có"}</div>
                  </LiquidGlassPanel>

                  <LiquidGlassPanel padding={12} radius={12}>
                    <Text type="secondary">Ghi chú:</Text>
                    <div className="lot-detail-value">{supplier.note || "Không có"}</div>
                  </LiquidGlassPanel>
                </div>
              ),
            },
            {
              key: "transactions",
              label: "Lịch sử nhập / xuất hàng",
              children: (
                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                  <Spin spinning={loading}>
                    <Table
                      columns={columns}
                      dataSource={transactions}
                      rowKey={(record) => record.id}
                      pagination={{
                        pageSize: 6,
                        showTotal: (t) => `Tổng ${t} giao dịch`,
                      }}
                      size="small"
                      bordered
                      scroll={false} // ✅ bỏ scroll cứng
                      onRow={(record) => ({
                        onClick: () => handleRowClick(record),
                        onMouseEnter: (e) => (e.currentTarget.style.backgroundColor = "#fafafa"),
                        onMouseLeave: (e) => (e.currentTarget.style.backgroundColor = ""),
                        title: "Bấm để xem chi tiết",
                        style: { cursor: "pointer" },
                      })}
                    />
                  </Spin>
                </div>
              ),
            },
            {
              key: "transactions-payments",
              label: "Lịch sử thanh toán",
              children: (
                <div>
                  <SupTransactionPaymentBySupId
                    data={supTransactionPayments}
                    loading={loadingPayments}
                    pagination={pagination}
                    onPageChange={handlePaymentPageChange}
                  />
                </div>
              ),
            },
          ]}
        />
      ) : (
        <Text type="secondary">Không có dữ liệu nhà cung cấp</Text>
      )}
    </Modal>
  );
};

export default SupplierDetailModal;
