import React, { useCallback, useEffect, useState } from "react";

import { getProductById } from "@src/services/productService";
import { Image, Skeleton, Spin, Table, Tag } from "antd";

const ProductListTab = ({ items = [] }) => {
  const [productDetails, setProductDetails] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchProductsDetails = useCallback(async () => {
    const idsToFetch = items.map((it) => it.productId).filter((id) => id && !productDetails[id]);
    if (idsToFetch.length === 0) return;
    setLoading(true);
    try {
      const promises = idsToFetch.map((id) =>
        getProductById(id)
          .then((res) => res.data?.data || res.data || null)
          .then((product) => ({ id, product }))
          .catch(() => ({ id, product: null }))
      );
      const results = await Promise.all(promises);
      setProductDetails((prev) => {
        const next = { ...prev };
        results.forEach(({ id, product }) => {
          if (product) next[id] = product;
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [items, productDetails]);

  useEffect(() => {
    fetchProductsDetails();
  }, [fetchProductsDetails]);

  const columns = [
    {
      title: "Ảnh sản phẩm",
      dataIndex: "productId",
      key: "image",
      width: 140,
      render: (pid) => {
        const p = productDetails[pid];
        const img = p?.imgUrl || null;
        return img ? (
          <Image width={"100%"} src={img} alt="img" />
        ) : (
          <div style={{ width: 64, height: 48, background: "#f5f5f5" }} />
        );
      },
    },
    {
      title: "Mã SKU",
      dataIndex: "skuCode",
      key: "skuCode",
      render: (_, row) => {
        const p = productDetails[row.productId];
        return <Tag color="blue">{p?.skuCode || row.skuCode || "-"}</Tag>;
      },
      width: 60,
    },
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      key: "productName",
      render: (_, row) => {
        const p = productDetails[row.productId];
        return p?.name || row?.productName;
      },
    },
    {
      title: "Lượng chờ phân bổ soạn",
      dataIndex: "remain",
      key: "remain",
      width: 150,
    },
    {
      title: "Số lượng",
      dataIndex: "qty",
      key: "qty",
      width: 120,
    },
    {
      title: "Đơn vị",
      dataIndex: "mainUnit",
      key: "mainUnit",
      width: 80,
      render: (_, row) => {
        const p = productDetails[row.productId];
        const mainUnit = p?.mainUnit || null;
        return mainUnit || "-";
      },
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
    },
  ];

  const dataSource = items.map((it, idx) => ({ key: it.id || idx, ...it }));

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        {/* <Spin /> */}
        <Skeleton />
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      rowKey={(r) => r.id || r.productId}
      scroll={{ x: true }}
    />
  );
};

export default ProductListTab;
