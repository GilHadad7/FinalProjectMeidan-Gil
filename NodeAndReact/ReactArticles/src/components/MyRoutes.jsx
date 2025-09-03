// src/components/MyRoutes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute/ProtectedRoute";
import Layout from "./Layout/Layout";
import Login from "./Login/Login";

// Pages (manager/worker/shared)
import AdminPage from "../pages/AdminPage";
import WorkerPage from "../pages/WorkerPage";
import TenantPage from "../pages/TenantPage";
import SettingsPage from "../pages/SettingsPage";
import ServiceCallsPage from "../pages/ServiceCallsPage";
import SchedulePage from "../pages/SchedulePage";
import ReportsPage from "../pages/ReportsPage";
import ExternalSuppliersPage from "../pages/ExternalSuppliersPage";
import AssignmentOfTasksPage from "../pages/AssignmentOfTasksPage";
import UserManagementPage from "../pages/UserManagementPage";
import DetailsOfBuildingsPage from "../pages/DetailsOfBuildingsPage";
import PaymentsPage from "../pages/PaymentsPage";

// Tenant-only pages (new)
import ServiceCallsTenantPage from "../pages/tenant/ServiceCallsTenantPage";
import ScheduleTenantPage from "../pages/tenant/ScheduleTenantPage";
import PaymentsTenantPage from "../pages/tenant/PaymentsTenantPage";
import ReportsTenantPage from "../pages/tenant/ReportsTenantPage";

// Worker-only pages
import ServiceCallsWorkerPage from "../pages/worker/ServiceCallsWorkerPage";
import ScheduleWorkerPage      from "../pages/worker/ScheduleWorkerPage";
import ReportsWorkerPage       from "../pages/worker/ReportsWorkerPage";

function MyRoutes() {
  return (
    <Routes>
      {/* Public Login */}
      <Route path="/" element={<Login />} />

      {/* Manager Section */}
      <Route
        path="/manager/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminPage />} />
        <Route path="service-calls" element={<ServiceCallsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="buildings" element={<DetailsOfBuildingsPage />} />
        <Route path="assignments" element={<AssignmentOfTasksPage />} />
        <Route path="UserManagement" element={<UserManagementPage />} />
        <Route path="suppliers" element={<ExternalSuppliersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Worker Section */}
      <Route
        path="/worker/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<WorkerPage />} />
        <Route path="service-calls" element={<ServiceCallsWorkerPage />} />
        <Route path="schedule" element={<ScheduleWorkerPage />} />
        <Route path="reports" element={<ReportsWorkerPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Tenant Section */}
      <Route
        path="/tenant/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TenantPage />} />
        {/* דייר: עמודים ייעודיים */}
        <Route path="service-calls" element={<ServiceCallsTenantPage />} />
        <Route path="schedule" element={<ScheduleTenantPage />} />
        <Route path="payments" element={<PaymentsTenantPage />} />
        <Route path="reports" element={<ReportsTenantPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback to Login */}
      <Route path="*" element={<Login />} />
    </Routes>
  );
}

export default MyRoutes;
