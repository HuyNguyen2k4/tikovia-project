import React, { useEffect, useState } from "react";
import { Card, Table, Grid } from "antd";
import { customersBySeller } from "./mockData";

const RecentCustomers = ({ panelHeight = 500 }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const res = await customersBySeller();
        setData(res);
      } catch (error) {
        console.error("Error loading recent customers:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const columns = [
    { title: "Mã KH", dataIndex: "code", key: "code", width: 120 },
    { title: "Tên khách hàng", dataIndex: "name", key: "name", width: 220 },
    { title: "Số điện thoại", dataIndex: "phone", key: "phone", width: 120 },
    { title: "Mã số thuế", dataIndex: "taxCode", key: "taxCode", width: 120 },
    { title: "Email", dataIndex: "email", key: "email", width: 120 },
  ];

  return (
    <Card
      title="Khách hàng gần đây / khách quen"
      bordered={false}
      style={{ height: panelHeight }}
      bodyStyle={{ 
        height: 'calc(100% - 57px)', 
        padding: 16, 
        overflow: 'auto' 
      }}
    >
      <Table
        size={isMobile ? "small" : "middle"}
        columns={columns}
        rowKey="key"
        dataSource={data}
        loading={loading}
        pagination={false}
      />
    </Card>
  );
};

export default RecentCustomers;
