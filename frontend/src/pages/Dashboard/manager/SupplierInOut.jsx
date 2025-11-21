import React, { useMemo, useState, useEffect } from 'react';
import { Row, Col, Card, Select, DatePicker, Table, Divider, List, Badge, Typography, Spin, Tag, Tooltip, Button } from 'antd';
import { Bar, Pie } from '@ant-design/plots';
import { ExclamationCircleOutlined, TruckOutlined, ReloadOutlined, CheckCircleOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { getSupplierInOutData } from './mockData';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const SuppliersInOut = () => {
  const [supplier, setSupplier] = useState('all');
  const [range, setRange] = useState(null);
  const [supplierData, setSupplierData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Always fetch all data without date filter from API
        const data = await getSupplierInOutData({});
        if (data && Array.isArray(data)) {
          setSupplierData(data);
        }
      } catch (error) {
        console.error('Failed to load supplier in/out data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const suppliers = useMemo(() => {
    const uniqueSuppliers = ['all', ...supplierData.map((s) => s.code)];
    return uniqueSuppliers;
  }, [supplierData]);

  const filtered = useMemo(() => {
    let result = supplierData;

    // Filter by supplier code
    if (supplier !== 'all') {
      result = result.filter((s) => s.code === supplier);
    }

    // Filter by transaction date range
    if (range && range.length === 2) {
      const startDate = range[0].format('YYYY-MM-DD');
      const endDate = range[1].format('YYYY-MM-DD');

      result = result
        .map((supplierItem) => {
          // Filter transactions by date range
          const filteredTransactions = supplierItem.transactions.filter((transaction) => {
            return transaction.date >= startDate && transaction.date <= endDate;
          });

          // Only include supplier if they have transactions in the date range
          if (filteredTransactions.length > 0) {
            // Recalculate total price based on filtered transactions
            const totalPrice = filteredTransactions.reduce((sum, t) => {
              if (t.type === 'in') {
                return sum + (t.amount || 0);
              } else {
                return sum - (t.amount || 0);
              }
            }, 0);

            return {
              ...supplierItem,
              transactions: filteredTransactions,
              totalPrice: totalPrice,
            };
          }
          return null;
        })
        .filter((item) => item !== null);
    }

    return result;
  }, [supplier, supplierData, range]);

  const columns = [
    {
      title: 'Mã Supplier',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code) => <Tag color="blue" style={{ fontWeight: 'bold' }}>{code}</Tag>,
    },
    {
      title: 'Tên Supplier',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Số giao dịch',
      dataIndex: 'transactions',
      key: 'transactionCount',
      width: 130,
      align: 'center',
      render: (transactions) => <Tag color="purple">{transactions?.length || 0} giao dịch</Tag>,
    },
    {
      title: 'Tổng giá trị',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 180,
      align: 'right',
      render: (v) => <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: 14 }}>{v?.toLocaleString('vi-VN') || 0} ₫</Text>,
    },
  ];

  const expandedRowRender = (record) => {
    const transactionColumns = [
      {
        title: 'Mã chứng từ',
        dataIndex: 'docNo',
        key: 'docNo',
        render: (docNo) => <Tag color="#1677ff" style={{ fontWeight: 'bold' }}>{docNo}</Tag>,
      },
      {
        title: 'Loại',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        align: 'center',
        render: (type) => (
          <Tag color={type === 'in' ? 'green' : 'orange'} style={{ fontWeight: 'bold' }}>
            {type === 'in' ? 'Nhập' : 'Trả'}
          </Tag>
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status) => {
          const statusMap = {
            paid: { label: 'Đã thanh toán', color: 'success' },
            pending: { label: 'Chờ xử lý', color: 'warning' },
            draft: { label: 'Nháp', color: 'default' },
          };
          const config = statusMap[status] || { label: status, color: 'default' };
          return <Tag color={config.color} style={{ fontWeight: 'bold' }}>{config.label}</Tag>;
        },
      },
      {
        title: 'Ngày',
        dataIndex: 'date',
        key: 'date',
        width: 120,
        render: (date) => {
          if (!date) return null;
          // If it's a moment object (antd DatePicker), use format; otherwise try Date
          if (date && typeof date.format === 'function') {
            return <Text>{date.format('DD/MM/YYYY')}</Text>;
          }
          const d = new Date(date);
          if (isNaN(d.getTime())) return <Text>{date}</Text>;
          return <Text>{d.toLocaleDateString('en-GB')}</Text>; // en-GB -> DD/MM/YYYY
        },
      },
      {
        title: 'Số tiền',
        dataIndex: 'amount',
        key: 'amount',
        align: 'right',
        width: 150,
        render: (amount) => (
          <Text strong >
            {amount?.toLocaleString('vi-VN') || 0} ₫
          </Text>
        ),
      },
    ];

    return (
      <Table
        columns={transactionColumns}
        dataSource={record.transactions}
        pagination={false}
        rowKey="transactionId"
        size="small"
        style={{ marginLeft: 48 }}
      />
    );
  };

  // Chart 1: Top suppliers by total transaction value
  const topSuppliersByValue = useMemo(() => {
    return filtered
      .map((supplier) => ({
        supplier: supplier.name,
        value: Math.abs(supplier.totalPrice),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filtered]);

  // Chart 2: Transaction type breakdown (In vs Out)
  const transactionTypeBreakdown = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let countIn = 0;
    let countOut = 0;

    filtered.forEach((supplier) => {
      supplier.transactions.forEach((transaction) => {
        if (transaction.type === 'in') {
          totalIn += transaction.amount || 0;
          countIn += 1;
        } else if (transaction.type === 'out') {
          totalOut += transaction.amount || 0;
          countOut += 1;
        }
      });
    });

    return [
      { type: `Nhập hàng (${countIn} giao dịch)`, value: totalIn },
      { type: `Xuất/Trả hàng (${countOut} giao dịch)`, value: totalOut },
    ];
  }, [filtered]);

  const barConfig = { 
    data: topSuppliersByValue, 
    xField: 'value', 
    yField: 'supplier', 
    color: '#94f4b9ff',
    height: 260, 
    label: { 
      text: (d) => `${(d.value / 1000000).toFixed(1)}M ₫`,
      style: { fontWeight: 'bold' }
    },
    autoFit: true,
    axis: {
      x: {
        labelFormatter: (v) => `${(v / 1000000).toFixed(0)}M ₫`
      }
    }
  };
  
  const pieConfig = { 
    data: transactionTypeBreakdown, 
    angleField: 'value', 
    colorField: 'type', 
    innerRadius: 0.6, 
    legend: { position: 'bottom' }, 
    color: ['#52c41a', '#faad14'],
    height: 260,
    label: {
      text: (d) => `${(d.value / 1000000).toFixed(1)}M ₫`,
      style: { fontWeight: 'bold', fill: '#fff' }
    },
    tooltip: {
      title: (d) => d.type,
      items: [
        {
          field: 'value',
          name: 'Tổng giá trị',
          valueFormatter: (v) => `${v?.toLocaleString('vi-VN')} ₫`
        }
      ]
    }
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <Card title="Thống kê nhập/trả hàng " bordered={false} extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <RangePicker onChange={setRange} format="YYYY-MM-DD" />
            <Select
              value={supplier}
              onChange={setSupplier}
              style={{ width: 180 }}
              options={suppliers.map((s) => ({
                value: s,
                label: s === 'all' ? 'Tất cả' : s
              }))}
            />
          </div>
        }>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <Spin size="large" />
            </div>
          ) : (
            <Table
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={filtered}
              expandable={{
                expandedRowRender,
                rowExpandable: (record) => record.transactions && record.transactions.length > 0,
                expandIcon: ({ expanded, onExpand, record }) => (
                  <Tooltip title="Click để xem giao dịch">
                    {expanded ? (
                      <Button
                        type="text"
                        size="small"
                        icon={<span style={{ fontSize: 12 }}><MinusOutlined /></span>}
                        onClick={(e) => onExpand(record, e)}
                      />
                    ) : (
                      <Button
                        type="text"
                        size="small"
                        icon={<span style={{ fontSize: 12 }}><PlusOutlined /></span>}
                        onClick={(e) => onExpand(record, e)}
                      />
                    )}
                  </Tooltip>
                ),
              }}
              pagination={{ pageSize: 5, position: ['bottomRight'] }}
            />
          )}
          <Divider style={{ margin: '12px 0' }} />
          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Card title="Top 5 Suppliers theo giá trị giao dịch" size="small" bordered={false}>
                <Bar {...barConfig} />
              </Card>
            </Col>
            <Col xs={24} md={10}>
              <Card title="Tỷ lệ Nhập/Xuất hàng" size="small" bordered={false}>
                <Pie {...pieConfig} />
              </Card>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

export default SuppliersInOut;

