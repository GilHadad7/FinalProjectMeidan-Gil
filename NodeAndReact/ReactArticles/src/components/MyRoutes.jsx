import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import Login from "./Login/Login";
import ProtectedRoute from "./ProtectedRoute/ProtectedRoute";
import AdminPage from "../pages/AdminPage";
import TenantPage from "../pages/TenantPage";
import WorkerPage from "../pages/WorkerPage";
import SettingsPage from "../pages/SettingsPage";
import classes from "./MyRoutes.module.css";
import ServiceCallsPage from "../pages/ServiceCallsPage";

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
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <AdminPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />

      {/* 🔐 דף עובד */}
      <Route
        path="/worker"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <WorkerPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />

      {/* 🔐 דף דייר */}
      <Route
        path="/tenant"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <TenantPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />

      {/* 🔐 דף הגדרות */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <SettingsPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />

      {/* 🔄 כל כתובת לא חוקית -> נחזיר ל-Login */}
      <Route path="*" element={<Login />} />

      {/* דף קריאות שירות לכולם  */}
      <Route
        path="/manager/service-calls"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <ServiceCallsPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/worker/service-calls"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <ServiceCallsPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tenant/service-calls"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <ServiceCallsPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default MyRoutes;
