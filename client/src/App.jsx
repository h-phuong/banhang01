import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";

// ---ADMIN---
import AdminLayout from "./components/Admin/AdminLayout";
import Dashboard from "./pages/Admin/Dashboard";
import Users from "./pages/Admin/Users/Users";
import AdminCategory from "./pages/Admin/Category/AdminCategory";
import ProductsPage from "./pages/Admin/ProductsPage";
import InventoryPage from "./pages/Admin/InventoryPage";
import AdminBlog from "./pages/Admin/AdminBlog";
import AdminOrders from "./pages/Admin/Orders/AdminOrders";
import AdminVariants from "./pages/Admin/Variants/AdminVariants";
import AdminReviews from "./pages/Admin/Reviews/AdminReviews";
import AdminUploadImages from "./pages/Admin/Upload/AdminUploadImages";
import AdminPromotions from "./pages/Admin/Promotions/AdminPromotions";
import AdminProFile from "./pages/Admin/AdminProFile";
import AdminContacts from "./pages/Admin/AdminContacts";

// ---CLIENT---
import ClientLayout from "./components/Client/ClientLayout";
import Home from "./pages/Client/Home";
import Product from "./pages/Client/Product";
import Profile from "./pages/Client/Profile";
import SalePage from "./pages/Client/SalePage";
import NotificationsPage from "./pages/Client/Notifications";
import Category from "./pages/Client/Category";
import Blog from "./pages/Client/Blog";
import BlogDetail from "./pages/Client/BlogDetail";
import Contact from "./pages/Client/Contact";
import CartPage from "./pages/Client/CartPage";
import CheckoutPayment from "./pages/Client/CheckoutPayment";

// ---PAYMENT---
import PaymentPage, { PaymentResult } from "./pages/Client/PaymentPage";
import VNPayResult from "./pages/Client/VNPayResult";
import MoMoResult from "./pages/Client/MoMoResult";

// ---AUTH---
import Login from "./pages/Auth/Login";
import AdminLogin from "./pages/Auth/AdminLogin";
import Register from "./pages/Auth/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import VerifyOtp from "./pages/Auth/VerifyOtp";
import ResetPassword from "./pages/Auth/ResetPassword";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        <Routes>
          {/* --- ROUTE ADMIN --- */}
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="categories" element={<AdminCategory />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="blogs" element={<AdminBlog />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="variants" element={<AdminVariants />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="upload" element={<AdminUploadImages />} />
            <Route path="promotions" element={<AdminPromotions />} />
            <Route path="profile" element={<AdminProFile />} />
            <Route path="contacts" element={<AdminContacts />} />
          </Route>

          {/* --- ROUTE CLIENT --- */}
          <Route path="/" element={<ClientLayout />}>
            <Route index element={<Home />} />
            <Route path="product/:id" element={<Product />} />
            <Route path="profile" element={<Profile />} />
            <Route path="sale" element={<SalePage />} />
            <Route path="blog" element={<Blog />} />
            <Route path="bai-viet/:slug" element={<BlogDetail />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="category" element={<Category />} />
            <Route path="contact" element={<Contact />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPayment />} />
            <Route path="payment" element={<PaymentPage />} />
            <Route path="payment/success" element={<PaymentResult />} />
            <Route path="payment/failed" element={<PaymentResult />} />
          </Route>

          {/* --- PAYMENT RESULT NGOÀI LAYOUT --- */}
          <Route path="/payment/vnpay-result" element={<VNPayResult />} />
          <Route path="/payment/momo-result" element={<MoMoResult />} />

          {/* --- ROUTE AUTH --- */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
