import React, { useEffect, useRef, useState } from "react";

import { SearchOutlined } from "@ant-design/icons";
import {
  clearTransactionInList,
  fetchSupplierTransactionsIn,
} from "@src/store/supplierTransactionCombineSlice";
import { Button, Input, Spin, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

const { Text } = Typography;

const RenderTransactionInList = ({ departmentId, supplierId, onSelectTransaction }) => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;
  const transactionsIn = useSelector((s) => s.supplierTransactionCombined.transactionsIn);
  const status = useSelector((s) => s.supplierTransactionCombined.transactionsInStatus);
  const data = transactionsIn?.data || [];
  const pagination = transactionsIn?.pagination || {};
  useEffect(() => {
    setSearch("");
    setCurrentPage(0);

    // Cleanup khi unmount
    return () => {
      dispatch(clearTransactionInList());
    };
  }, [dispatch]);

  useEffect(() => {
    if (departmentId && supplierId) {
      fetchData();
    }
    // eslint-disable-next-line
  }, [departmentId, supplierId, search, currentPage]);

  const fetchData = () => {
    dispatch(
      fetchSupplierTransactionsIn({
        type: "in",
        departmentId,
        supplierId,
        hasStock: true,
        includeItems: true,
        q: search || undefined,
        limit: pageSize,
        offset: currentPage * pageSize,
      })
    );
  };

  const columns = [
    {
      title: "Mã giao dịch",
      dataIndex: "docNo",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Nhà cung cấp",
      dataIndex: "supplierName",
    },
    {
      title: "Kho",
      dataIndex: "departmentName",
    },
    {
      title: "Ngày nhập",
      dataIndex: "transDate",
      render: (val) => (val ? dayjs(val).format("DD/MM/YYYY") : ""),
    },
    {
      title: "Sản phẩm",
      render: (_, r) => <Text type="secondary">{r.items?.length || 0}</Text>,
    },
    {
      title: "Chọn",
      render: (_, record) => (
        <Button type="link" onClick={() => onSelectTransaction?.(record)}>
          Chọn
        </Button>
      ),
    },
  ];

  return (
    <Spin spinning={status === "loading"}>
      <Input
        placeholder="Tìm theo mã giao dịch hoặc nhà cung cấp"
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(0);
        }}
        allowClear
        style={{ marginBottom: 12, maxWidth: 400 }}
      />
      <Table
        columns={columns}
        dataSource={data}
        pagination={{
          current: currentPage + 1,
          pageSize,
          total: pagination.total || 0,
          onChange: (page) => setCurrentPage(page - 1),
          showSizeChanger: false,
        }}
        rowKey="id"
        size="small"
      />
    </Spin>
  );
};

export default RenderTransactionInList;
