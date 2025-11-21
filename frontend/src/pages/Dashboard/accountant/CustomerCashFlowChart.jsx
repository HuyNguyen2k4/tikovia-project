import React, { useState, useEffect } from 'react';
import { Card, Spin, Empty } from 'antd'; 
import { Column } from '@ant-design/plots';
import { getCustomerTransactionData } from './mockData'; 

const CustomerCashFlowChart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const wideData = await getCustomerTransactionData();

        const longData = [];
        wideData.forEach(item => {
          // Format date: "2025-10" -> "Tháng 10"
          const monthNum = item.date.split('-')[1]; // Lấy phần tháng
          const formattedDate = `Tháng ${parseInt(monthNum)}`;

          // Thêm entry cho Tiền vào
          longData.push({
            date: formattedDate,
            type: 'Tiền vào',
            value: item.moneyIn
          });
          // Thêm entry cho Tiền ra
          longData.push({
            date: formattedDate,
            type: 'Tiền ra',
            value: item.moneyOut
          });
        });

        setChartData(longData);

      } catch (error) {
        console.error("Lỗi tải dữ liệu biểu đồ khách hàng:", error);
        setChartData([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const config = {
    data: chartData, 
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    isGroup: true,
    color: ({ type }) => (type === 'Tiền vào' ? '#389e0d' : '#cf1322'),
    height: 320,
    autoFit: true,
    label: {
      text: (datum) => {
        const value = datum.value;
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} tỷ`;
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)} tr`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)} k`;
        return value.toLocaleString('vi-VN');
      },
      position: 'top',
      style: {
        fontSize: 10,
        fill: '#000',
      },
    },
    tooltip: {
      title: (datum) => datum.date,
      items: [
        {
          channel: 'y',
          valueFormatter: (value) => {
            return new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          },
        },
      ],
    },
    axis: {
      y: {
        labelFormatter: (v) => {
          if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)} tỷ`;
          if (v >= 1000000) return `${(v / 1000000).toFixed(1)} tr`;
          if (v >= 1000) return `${(v / 1000).toFixed(0)} k`;
          return v.toLocaleString('vi-VN');
        },
      },
    },
  };

  const renderChart = () => {
    if (loading) {
      return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin /></div>;
    }
    if (chartData.length === 0) {
      return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Empty description="Không có dữ liệu" /></div>;
    }
    return <Column {...config} />;
  };

  return (
    <Card title="Dòng tiền vào – ra phía khách hàng" bordered={false} style={{ height: 400 }} bodyStyle={{ height: 'calc(100% - 57px)', padding: 16 }}>
      {renderChart()}
    </Card>
  );  
};

export default CustomerCashFlowChart;
