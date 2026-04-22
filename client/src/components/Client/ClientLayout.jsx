import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SmartChatbox from "./SmartChatbox";

const ClientLayout = () => {
  return (
    <>
      <Navbar />

      <main className="client-main">
        <Outlet />
      </main>

      <Footer />
      <SmartChatbox />
    </>
  );
};

export default ClientLayout;
