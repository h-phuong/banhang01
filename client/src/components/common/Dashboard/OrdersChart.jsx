// Đơn hàng theo thời gian - Biểu đồ kết hợp cột và đường cho ngày/tuần/tháng
import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
);

const API = "http://localhost:5000/api/dashboard";

const VIEW_CONFIG = {
  day: {
    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
    labelCurrent: "Hôm nay",
    labelPrev: "Hôm qua",
    labelAvg: "TB mỗi giờ",
    endpoint: "daily-orders",
  },
  week: {
    labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    labelCurrent: "Tuần này",
    labelPrev: "Tuần trước",
    labelAvg: "TB mỗi ngày",
    endpoint: "weekly-orders",
  },
  month: {
    labels: [
      "T1",
      "T2",
      "T3",
      "T4",
      "T5",
      "T6",
      "T7",
      "T8",
      "T9",
      "T10",
      "T11",
      "T12",
    ],
    labelCurrent: "Năm nay",
    labelPrev: "Năm trước",
    labelAvg: "TB mỗi tháng",
    endpoint: "monthly-orders",
  },
};

const extractSeries = (data) => {
  if (!data) return { current: [], prev: [] };
  if (Array.isArray(data.current) && Array.isArray(data.prev)) {
    return { current: data.current, prev: data.prev };
  }
  if (data.weeklyOrders) {
    return {
      current: Array.isArray(data.weeklyOrders.thisWeek)
        ? data.weeklyOrders.thisWeek
        : [],
      prev: Array.isArray(data.weeklyOrders.lastWeek)
        ? data.weeklyOrders.lastWeek
        : [],
    };
  }
  return { current: [], prev: [] };
};

const OrdersChart = () => {
  const [view, setView] = useState("week");
  const [loading, setLoading] = useState(true);
  const [ordersData, setOrdersData] = useState({
    day: { current: [], prev: [] },
    week: { current: [], prev: [] },
    month: { current: [], prev: [] },
  });

  useEffect(() => {
    const { endpoint } = VIEW_CONFIG[view];
    setLoading(true);

    fetch(`${API}/${endpoint}?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        const series = extractSeries(d);
        setOrdersData((prev) => ({
          ...prev,
          [view]: series,
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [view]);

  const cfg = VIEW_CONFIG[view];
  const current = ordersData[view]?.current ?? [];
  const prev = ordersData[view]?.prev ?? [];

  const totalCurrent = current.reduce((a, b) => a + b, 0);
  const totalPrev = prev.reduce((a, b) => a + b, 0);
  const growth =
    totalPrev > 0
      ? (((totalCurrent - totalPrev) / totalPrev) * 100).toFixed(1)
      : "0.0";
  const avg =
    current.length > 0 ? Math.round(totalCurrent / current.length) : 0;

  const chartData = {
    labels: cfg.labels,
    datasets: [
      {
        type: "bar",
        label: cfg.labelCurrent,
        data: current,
        backgroundColor: "#AFA9EC",
        borderColor: "#7F77DD",
        borderWidth: 1.5,
        borderRadius: 4,
        order: 1,
      },
      {
        type: "line",
        label: cfg.labelPrev,
        data: prev,
        borderColor: "#B4B2A9",
        borderWidth: 2,
        borderDash: [5, 4],
        pointRadius: 3,
        pointBackgroundColor: "#B4B2A9",
        fill: false,
        tension: 0.3,
        order: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} đơn`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          color: "#888780",
          font: { size: 12 },
        },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 5,
          color: "#888780",
          font: { size: 11 },
          callback: (v) => `${v} đơn`,
        },
        grid: { color: "rgba(136,135,128,0.12)" },
        border: { display: false },
      },
    },
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 8,
        padding: "20px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h5 style={{ fontWeight: 500, color: "#333", margin: 0 }}>
          Đơn hàng theo thời gian
        </h5>

        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "day", label: "Ngày" },
            { key: "week", label: "Tuần" },
            { key: "month", label: "Năm" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                padding: "5px 16px",
                borderRadius: 20,
                border: view === key ? "none" : "1px solid #ddd",
                background: view === key ? "#7F77DD" : "transparent",
                color: view === key ? "#fff" : "#888",
                fontWeight: view === key ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: cfg.labelCurrent, value: `${totalCurrent} đơn` },
          { label: cfg.labelPrev, value: `${totalPrev} đơn` },
          {
            label: "Tăng trưởng",
            value: `${Number(growth) > 0 ? "+" : ""}${growth}%`,
            color: Number(growth) >= 0 ? "#1D9E75" : "#E24B4A",
          },
          { label: cfg.labelAvg, value: `${avg} đơn` },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              background: "#f5f5f3",
              borderRadius: 8,
              padding: "12px 16px",
            }}
          >
            <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>
              {item.label}
            </p>
            <p
              style={{
                fontSize: 20,
                fontWeight: 500,
                margin: 0,
                color: item.color || "#333",
              }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "relative",
          height: 260,
          opacity: loading ? 0.5 : 1,
        }}
      >
        {totalCurrent === 0 && totalPrev === 0 && !loading ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              fontSize: 14,
            }}
          >
            Chưa có dữ liệu đơn hàng cho mốc này.
          </div>
        ) : (
          <Chart type="bar" data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
};

export default OrdersChart;
