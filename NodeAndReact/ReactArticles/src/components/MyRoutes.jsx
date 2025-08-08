import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute/ProtectedRoute";
import Layout from "./Layout/Layout";
import Login from "./Login/Login";

// Pages
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
        <Route path="service-calls" element={<ServiceCallsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="reports" element={<ReportsPage />} />
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
        <Route path="service-calls" element={<ServiceCallsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback to Login */}
      <Route path="*" element={<Login />} />
    </Routes>
  );
}

export default MyRoutes;
