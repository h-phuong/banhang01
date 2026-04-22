import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const API = "http://localhost:5000/api/dashboard";

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const TopProductsRevenueChart = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [openDetail, setOpenDetail] = useState(false);

  useEffect(() => {
    setLoading(true);

    fetch(`${API}/top-products?limit=5&t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(Array.isArray(d?.data) ? d.data : []);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = useMemo(
    () => items.reduce((sum, item) => sum + Number(item?.revenue || 0), 0),
    [items],
  );

  const chartData = {
    labels: items.map((item) => item.name),
    datasets: [
      {
        label: "Doanh thu",
        data: items.map((item) => Number(item.revenue || 0)),
        backgroundColor: "#8B80F9",
        borderColor: "#6F63E9",
        borderWidth: 1.5,
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  };

  const chartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        titleColor: "#111",
        bodyColor: "#111",
        backgroundColor: "rgba(255,255,255,0.96)",
        borderColor: "rgba(0,0,0,0.08)",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `Doanh thu: ${formatCurrency(ctx.raw)}`,
          afterLabel: (ctx) => {
            const item = items[ctx.dataIndex];
            return `Số lượng bán: ${Number(item?.quantity || 0)}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: "#555",
          font: {
            family: "Roboto, sans-serif",
            size: 12,
            weight: "500",
          },
          callback: (value) => formatCurrency(value),
        },
        grid: { color: "rgba(0,0,0,0.08)" },
        border: { display: false },
      },
      y: {
        ticks: {
          color: "#222",
          font: {
            family: "Roboto, sans-serif",
            size: 12,
            weight: "500",
          },
          callback: function (value) {
            const label = this.getLabelForValue(value);
            return label.length > 28 ? `${label.slice(0, 28)}...` : label;
          },
        },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  return (
    <>
      <div
        onClick={() => setOpenDetail(true)}
        style={{
          fontFamily: "Roboto, sans-serif",
          background: "#fff",
          borderRadius: 8,
          padding: "16px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          cursor: "pointer",
          height: 310,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h5 style={{ fontWeight: 600, color: "#222", margin: 0 }}>
            Top 5 sản phẩm theo doanh thu
          </h5>

          <div
            style={{
              fontSize: 13,
              color: "#666",
              background: "#f5f5f3",
              padding: "6px 12px",
              borderRadius: 20,
              fontWeight: 500,
            }}
          >
            Tổng: {formatCurrency(totalRevenue)}
          </div>
        </div>

        {loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            Đang tải dữ liệu...
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            Chưa có dữ liệu top sản phẩm.
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0 }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      {openDetail && (
        <div
          onClick={() => setOpenDetail(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 920,
              maxHeight: "85vh",
              overflow: "auto",
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none",
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              fontFamily: "Roboto, sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                gap: 12,
              }}
            >
              <h4 style={{ margin: 0, color: "#222" }}>
                Chi tiết top 5 sản phẩm theo doanh thu
              </h4>

              <button
                onClick={() => setOpenDetail(false)}
                style={{
                  border: "none",
                  background: "#f1f1ef",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontFamily: "Roboto, sans-serif",
                }}
              >
                Đóng
              </button>
            </div>

            <div style={{ height: 340, marginBottom: 20 }}>
              <Bar data={chartData} options={chartOptions} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item, index) => {
                const revenue = Number(item.revenue || 0);
                const percent =
                  totalRevenue > 0
                    ? ((revenue / totalRevenue) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={`${item.name}-${index}`}
                    style={{
                      background: "#f5f5f3",
                      borderRadius: 8,
                      padding: "12px 14px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#222",
                      }}
                    >
                      {index + 1}. {item.name}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        fontSize: 12,
                        color: "#666",
                        marginBottom: 4,
                      }}
                    >
                      <span>Doanh thu</span>
                      <span>{formatCurrency(revenue)}</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        fontSize: 12,
                        color: "#666",
                        marginBottom: 4,
                      }}
                    >
                      <span>Số lượng bán</span>
                      <span>{Number(item.quantity || 0)}</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        fontSize: 12,
                        color: "#666",
                      }}
                    >
                      <span>Tỷ trọng</span>
                      <span>{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopProductsRevenueChart;
