import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import Login from "./Login/Login";
import ProtectedRoute from "./ProtectedRoute/ProtectedRoute";
import AdminPage from "../pages/AdminPage";
import TenantPage from "../pages/TenantPage";
import WorkerPage from "../pages/WorkerPage";

function MyRoutes() {
  return (
    <Routes>
      {/* 🔓 דף כניסה פתוח לכולם */}
      <Route path="/" element={<Login />} />
      {/* 🔐 דף מנהל */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute>
            <Header />
            <AdminPage />
            <Footer />
          </ProtectedRoute>
        }
      />
      {/* 🔐 דף עובד */}
      <Route
        path="/worker"
        element={
          <ProtectedRoute>
            <Header />
            <WorkerPage />
            <Footer />
          </ProtectedRoute>
        }
      />
      {/* 🔐 דף דייר */}
      <Route
        path="/tenant"
        element={
          <ProtectedRoute>
            <Header />
            <TenantPage />
            <Footer />
          </ProtectedRoute>
        }
      />

      {/* 🔐 כל שאר הדפים - רק לאחר התחברות
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <Footer />
            </>
          </ProtectedRoute>
        }
      /> */}
    </Routes>
  );
}

export default MyRoutes;
