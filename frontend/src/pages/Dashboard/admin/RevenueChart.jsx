import React, { useState, useEffect } from 'react';
import { Card, Radio, Select, Space, Typography, message } from 'antd';
import { Column } from '@ant-design/plots';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

import { getRevenueTimeline } from './mockData';

dayjs.extend(isoWeek);

const { Text } = Typography;

const RevenueChart = ({ timePeriod, onTimePeriodChange }) => {
  const currentWeek = dayjs().isoWeek();
  const currentMonth = dayjs().month() + 1; // dayjs month is 0-indexed
  const currentYear = dayjs().year();

  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // DATA để hiển thị chart
  const [chartData, setChartData] = useState();

  // ----------------------------
  // FETCH API KHI ĐỔI FILTER
  // ----------------------------
  const fetchRevenue = async () => {
    try {
      let params = {};

      if (timePeriod === "week") {
        params = { filter: "week", week: selectedWeek, year: selectedYear };
      }

      if (timePeriod === "month") {
        params = { filter: "month", month: selectedMonth, year: selectedYear };
      }

      if (timePeriod === "year") {
        params = { filter: "year", year: selectedYear };
      }

      const apiData = await getRevenueTimeline(params);

      setChartData(apiData);

    } catch (err) {
      console.error("Load revenue failed:", err);
    }
  };

  // Gọi API mỗi khi đổi filter hoặc tuần/tháng/năm
  useEffect(() => {
    fetchRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod, selectedWeek, selectedMonth, selectedYear]);
  const formatVN = (v) => {
    if (v >= 1_000_000) {
      return `${(v / 1_000_000).toFixed(1)}M ₫`;
    }

    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(v);
  };

  // Config chart
  const config = {
    data: chartData,
    xField: 'label',
    yField: 'revenue',
    color: '#1890ff',
    style: { inset: 5 },
    tooltip: {
      title: (d) => d.label,
      items: [
        {
          field: 'revenue',
          valueFormatter: (v) =>
            new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND'
            }).format(v)
        }
      ]
    },
    axis: {
      y: {
        labelFormatter: (v) => formatVN(v)
      }
    },
    legend: false,
    height: 320,
    autoFit: true
  };

  // UI: chọn tuần / tháng / năm
  const renderExtraOptions = () => {
    if (timePeriod === "week") {
      return (
        <Space>
          <Select
            style={{ width: 220 }}
            value={selectedWeek}
            onChange={setSelectedWeek}
            options={[...Array(52).keys()].map(i => {
              const weekNum = i + 1;
              const start = dayjs().year(selectedYear).isoWeek(weekNum).startOf("isoWeek");
              const end = dayjs().year(selectedYear).isoWeek(weekNum).endOf("isoWeek");
              return {
                label: `Tuần ${weekNum}: ${start.format("DD/MM")} → ${end.format("DD/MM")}`,
                value: weekNum
              };
            })}
          />
        </Space>
      );
    }

    if (timePeriod === "month") {
      return (
        <Select
          style={{ width: 120 }}
          value={selectedMonth}
          onChange={setSelectedMonth}
          options={[...Array(12).keys()].map(i => ({
            label: `Tháng ${i + 1}`,
            value: i + 1
          }))}
        />
      );
    }

    if (timePeriod === "year") {
      return (
        <Select
          style={{ width: 120 }}
          value={selectedYear}
          onChange={setSelectedYear}
          options={[2023, 2024, 2025, 2026].map(y => ({
            label: `Năm ${y}`,
            value: y
          }))}
        />
      );
    }

    return null;
  };

  return (
    <Card
      title="Doanh thu bán hàng"
      bordered={false}
      style={{ height: 400 }}
      bodyStyle={{ height: 'calc(100% - 57px)', padding: 16 }}
      extra={
        <Space>
          <Radio.Group value={timePeriod} onChange={onTimePeriodChange} size="small">
            <Radio.Button value="week">Tuần</Radio.Button>
            <Radio.Button value="month">Tháng</Radio.Button>
            <Radio.Button value="year">Năm</Radio.Button>
          </Radio.Group>

          {renderExtraOptions()}
        </Space>
      }
    >
      <Column {...config} />
    </Card>
  );
};

export default RevenueChart;
