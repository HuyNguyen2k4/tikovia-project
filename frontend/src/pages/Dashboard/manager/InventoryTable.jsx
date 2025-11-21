import React, { useMemo, useState, useEffect } from 'react';
import { Card, Table, Select, DatePicker, Button, Tag, Typography, Spin, Tooltip } from 'antd';
import { ReloadOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { getProductInStockData } from './mockData';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('vi-VN');
};

const getExpiryMeta = (expiry) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${expiry}T00:00:00`);
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (Number.isNaN(diffDays)) {
    return { color: 'default', label: 'N/A' };
  }

  if (diffDays < 0) {
    return { color: '#f5222d', label: `Đã hết ${Math.abs(diffDays)} ngày` };
  }
  if (diffDays <= 30) {
    return { color: '#faad14', label: `Còn ${diffDays} ngày` };
  }
  if (diffDays <= 60) {
    return { color: '#52c41a', label: `Còn ${diffDays} ngày` };
  }
  return { color: '#52c41a', label: `> ${diffDays} ngày` };
};

const InventoryTable = () => {
  const [dateFilterType, setDateFilterType] = useState('receivedDate');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [range, setRange] = useState(null);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getProductInStockData();
        if (data && Array.isArray(data)) {
          setInventoryData(data);
        }
      } catch (error) {
        console.error('Failed to load inventory data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const bounds = useMemo(() => {
    if (!range || range.length !== 2 || !range[0] || !range[1]) return null;
    const start = range[0].startOf ? range[0].startOf('day').toDate() : range[0].toDate();
    const end = range[1].endOf ? range[1].endOf('day').toDate() : range[1].toDate();
    return { start, end };
  }, [range]);

  const matchesRange = (targetDate) => {
    if (!bounds || !targetDate) return true;
    const time = new Date(`${targetDate}T00:00:00`).getTime();
    if (Number.isNaN(time)) return true;
    return time >= bounds.start.getTime() && time <= bounds.end.getTime();
  };

  const matchesExpiryScope = (batches) => {
    if (expiryFilter === 'all') return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiryFilter === 'soon') {
      return batches.some((batch) => {
        const date = new Date(`${batch.expiry}T00:00:00`);
        const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      });
    }

    if (expiryFilter === 'expired') {
      return batches.some((batch) => {
        const date = new Date(`${batch.expiry}T00:00:00`);
        const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays < 0;
      });
    }

    return true;
  };

  const dataSource = useMemo(() => {
    return inventoryData
      .filter((product) => {
        const rangeMatch =
          !bounds ||
          (dateFilterType === 'expiry'
            ? product.batches.some((batch) => matchesRange(batch.expiry))
            : matchesRange(product[dateFilterType]));

        const expiryMatch = matchesExpiryScope(product.batches);
        return rangeMatch && expiryMatch;
      })
      .map((product) => ({
        ...product,
        stock:
          product.stock ?? product.batches.reduce((total, batch) => total + (batch.quantity || 0), 0),
      }));
  }, [inventoryData, bounds, dateFilterType, expiryFilter]);

  const columns = useMemo(
    () => [
      {
        title: 'Mã SKU',
        dataIndex: 'sku',
        key: 'sku',
        width: 120,
      },
      {
        title: 'Tên sản phẩm',
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
      },
      {
        title: 'Danh mục',
        dataIndex: 'category',
        key: 'category',
        width: 100,
      },
      {
        title: 'Tồn kho',
        dataIndex: 'stock',
        key: 'stock',
        align: 'right',
        width: 100,
        render: (value) => value.toLocaleString('vi-VN'),
      },
      {
        title: 'Số lô hàng',
        dataIndex: 'batches',
        key: 'batchCount',
        align: 'center',
        width: 100,
        render: (batches) => (
          <Tag color="blue">{batches?.length || 0} lô</Tag>
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status) => {
          const statusMap = {
            active: { label: 'Đang bán', color: 'success' },
            inactive: { label: 'Ngừng bán', color: 'error' },
            warning: { label: 'Cảnh báo', color: 'warning' },
          };
          const config = statusMap[status] || { label: status, color: 'default' };
          return <Tag color={config.color} style={{ fontWeight: 'bold' }}>{config.label}</Tag>;
        },
      },
      {
        title: 'Ngày nhập hàng',
        dataIndex: 'receivedDate',
        key: 'receivedDate',
        render: (date) => formatDate(date),
        width: 130,
      },
    ],
    []
  );

  const expandedRowRender = (record) => {
    const batchColumns = [
      {
        title: 'Mã lô',
        dataIndex: 'batch',
        key: 'batch',
        render: (batch) => (
          <Tag color="#1677ff" style={{ fontWeight: 'bold' }}>
            {batch}
          </Tag>
        ),
      },
      {
        title: 'Số lượng',
        dataIndex: 'quantity',
        key: 'quantity',
        align: 'right',
        render: (quantity) => (
          <Text strong>{quantity.toLocaleString('vi-VN')}</Text>
        ),
      },
      {
        title: 'Kho',
        dataIndex: 'warehouse',
        key: 'warehouse',
        render: (warehouse) => (
          <Tag color="default" style={{ fontWeight: 'bold' }}>{warehouse}</Tag>
        ),
      },
      {
        title: 'Hạn sử dụng',
        dataIndex: 'expiry',
        key: 'expiry',
        render: (expiry) => {
          const meta = getExpiryMeta(expiry);
          return (
            <Tag
              color={meta.color === 'default' ? undefined : meta.color} style={{ fontWeight: 'bold' }}
            >
              {formatDate(expiry)} • {meta.label}
            </Tag>
          );
        },
      },
    ];

    return (
      <Table
        columns={batchColumns}
        dataSource={record.batches}
        pagination={false}
        rowKey={(batch, index) => `${record.sku}-${batch.batch}-${index}`}
        size="small"
        style={{ marginLeft: 48 }}
      />
    );
  };

  const handleReset = async () => {
    setDateFilterType('receivedDate');
    setExpiryFilter('all');
    setRange(null);

    // Reload data from API
    setLoading(true);
    try {
      const data = await getProductInStockData();
      if (data && Array.isArray(data)) {
        setInventoryData(data);
      }
    } catch (error) {
      console.error('Failed to reload inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  // const scrollY = Math.max(160, height - 220);

  return (
    <Card
      title="Tồn kho sản phẩm"
      style={{ height: 'auto', display: 'flex', flexDirection: 'column' }}
      extra={
        <div style={{ display: 'flex', gap: 8 }}>
        <RangePicker onChange={setRange} allowClear style={{ minWidth: 220 }} />
        <Select 
          value={expiryFilter}
          onChange={setExpiryFilter}
          style={{ minWidth: 200 }}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'soon', label: 'Sắp hết hạn (≤30 ngày)' },
            { value: 'expired', label: 'Đã hết hạn' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={handleReset} type="default" loading={loading}>
          Làm mới
        </Button>
      </div>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          rowKey="sku"
          dataSource={dataSource}
          columns={columns}
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.batches && record.batches.length > 0,
            expandIcon: ({ expanded, onExpand, record }) => (
              <Tooltip title="Click để xem lô hàng">
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
          size="small"
          pagination={{ pageSize: 5, position: ['bottomRight'] }}
          style={{ flex: 1 }}
        // scroll={{ y: scrollY }}
        />
      )}
    </Card>
  );
};

export default InventoryTable;

