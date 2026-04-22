import React, { useEffect, useMemo, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const API = "http://localhost:5000/api/dashboard";

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const RevenueCategoryChart = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [openDetail, setOpenDetail] = useState(false);

  useEffect(() => {
    setLoading(true);

    fetch(`${API}/revenue-by-category?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d?.data) ? d.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = useMemo(
    () => items.reduce((sum, item) => sum + Number(item?.value || 0), 0),
    [items],
  );

  const chartData = {
    labels: items.map((item) => item.name),
    datasets: [
      {
        data: items.map((item) => Number(item.value || 0)),
        backgroundColor: items.map((item) => item.color || "#B4B2A9"),
        borderColor: "#fff",
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: { display: false },
      tooltip: {
        titleColor: "#111",
        bodyColor: "#111",
        backgroundColor: "rgba(255,255,255,0.96)",
        borderColor: "rgba(0,0,0,0.08)",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const value = Number(ctx.raw || 0);
            const percent =
              totalRevenue > 0 ? ((value / totalRevenue) * 100).toFixed(1) : 0;
            return `${ctx.label}: ${formatCurrency(value)} (${percent}%)`;
          },
        },
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
            Doanh thu theo danh mục
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
            Chưa có dữ liệu.
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: "100%", height: 220 }}>
              <Doughnut data={chartData} options={chartOptions} />
            </div>
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
              maxWidth: 720,
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
                Chi tiết doanh thu theo danh mục
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

            <div style={{ height: 320, marginBottom: 20 }}>
              <Doughnut data={chartData} options={chartOptions} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item, index) => {
                const value = Number(item.value || 0);
                const percent =
                  totalRevenue > 0
                    ? ((value / totalRevenue) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={`${item.name}-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "18px 1fr auto",
                      alignItems: "center",
                      gap: 10,
                      background: "#f5f5f3",
                      borderRadius: 8,
                      padding: "12px 14px",
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: item.color || "#B4B2A9",
                        display: "inline-block",
                      }}
                    />
                    <div>
                      <p
                        style={{
                          margin: "0 0 4px",
                          fontWeight: 600,
                          color: "#222",
                        }}
                      >
                        {item.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
                        Chiếm {percent}% tổng doanh thu
                      </p>
                    </div>
                    <p style={{ margin: 0, fontWeight: 600, color: "#222" }}>
                      {formatCurrency(value)}
                    </p>
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

export default RevenueCategoryChart;
