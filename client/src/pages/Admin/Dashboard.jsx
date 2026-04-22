import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OrdersChart from "../../components/common/Dashboard/OrdersChart"; // Biểu đồ đơn hàng theo thời gian
import RevenueCategoryChart from "../../components/common/Dashboard/RevenueCategoryChart"; // Biểu đồ doanh thu theo danh mục
import TopProductsRevenueChart from "../../components/common/Dashboard/TopProductsRevenueChart"; // Biểu đồ top sản phẩm theo doanh thu

const API = "http://localhost:5000/api/dashboard";

const formatCurrency = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v,
  );

const Dashboard = () => {
  const [stats, setStats] = useState({
    orders: 0,
    revenue: 0,
    users: 0,
    products: 0,
  });

  useEffect(() => {
    fetch(`${API}/stats?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.stats);
      })
      .catch(console.error);
  }, []);

  return (
    <div>
      {/* ===== 4 BOX ===== */}
      <div className="row" style={{ marginBottom: 30 }}>
        {[
          {
            bg: "bg-info",
            icon: "fa-shopping-bag",
            value: stats.orders,
            label: "Tổng đơn hàng",
            footer: (
              <Link to="/admin/orders" style={{ color: "#fff" }}>
                Xem chi tiết <i className="fas fa-arrow-circle-right" />
              </Link>
            ),
          },
          {
            bg: "bg-success",
            icon: "fa-money-bill-wave",
            value: formatCurrency(stats.revenue),
            label: "Doanh thu (Đã giao)",
            footer: (
              <Link to="/admin" style={{ color: "#fff" }}>
                Xem báo cáo <i className="fas fa-arrow-circle-right" />
              </Link>
            ),
          },
          {
            bg: "bg-warning",
            icon: "fa-user-plus",
            value: stats.users,
            label: "Thành viên",
            footer: (
              <Link to="/admin/users" style={{ color: "#fff" }}>
                Quản lý user <i className="fas fa-arrow-circle-right" />
              </Link>
            ),
          },
          {
            bg: "bg-danger",
            icon: "fa-box-open",
            value: stats.products,
            label: "Tổng sản phẩm",
            footer: (
              <Link to="/admin/products" style={{ color: "#fff" }}>
                Xem chi tiết <i className="fas fa-arrow-circle-right" />
              </Link>
            ),
          },
        ].map((card, i) => (
          <div key={i} className="col-lg-3 col-md-6 col-sm-6 mb-3">
            <div
              className={`small-box ${card.bg}`}
              style={{
                position: "relative",
                borderRadius: 5,
                padding: 10,
                color: "#fff",
              }}
            >
              <div className="inner">
                <h3 style={{ fontSize: i === 1 ? 22 : undefined }}>
                  {card.value}
                </h3>
                <p>{card.label}</p>
              </div>

              <div
                className="icon"
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  opacity: 0.5,
                  fontSize: 40,
                }}
              >
                <i className={`fas ${card.icon}`} />
              </div>

              <div
                className="small-box-footer"
                style={{ display: "block", marginTop: 10, color: "#fff" }}
              >
                {card.footer}
              </div>
            </div>
          </div>
        ))}
      </div>
      <OrdersChart />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: window.innerWidth < 992 ? "1fr" : "2fr 3fr",
          gap: 16,
          marginBottom: 24,
          alignItems: "stretch",
        }}
      >
        <RevenueCategoryChart />
        <TopProductsRevenueChart />
      </div>
    </div>
  );
};

export default Dashboard;
