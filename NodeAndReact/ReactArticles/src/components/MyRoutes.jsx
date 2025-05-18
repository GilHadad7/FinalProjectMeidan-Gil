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
      {/* 🔐 דף הגדרות למנהל */}
      <Route
        path="/manager/settings"
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
      {/* 🔐 דף הגדרות לעובד */}
      <Route
        path="/worker/settings"
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
      {/* 🔐 דף הגדרות לדייר */}
      <Route
        path="/tenant/settings"
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

      {/* דף לוח זמנים למנהל */}
      <Route
        path="/manager/schedule"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <SchedulePage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } 
      />
       {/* דף לוח זמנים לעובד */}
       <Route
        path="/worker/schedule"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <SchedulePage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />
      {/* דף לוח זמנים לדייר */}
      <Route
        path="/tenant/schedule"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <SchedulePage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />

      
      {/* 🔐 דף הגדרות */}
      {/* 🔐 דף הגדרות למנהל */}
      <Route
        path="/manager/settings"
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
      {/* 🔐 דף הגדרות לעובד */}
      <Route
        path="/worker/settings"
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
      {/* 🔐 דף הגדרות לדייר */}
      <Route
        path="/tenant/settings"
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
      {/* 🔐 דף הגדרות כללי (אופציונלי)
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
      /> */}


      {/*  דף דוחות למנהל  */}
      <Route
        path="/manager/reports"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <ReportsPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />
      {/* דף דוחות לעובד  */}
      <Route
        path="/worker/reports"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <ReportsPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />
      {/*  דף דוחות לדייר  */}
      <Route
        path="/tenant/reports"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <ReportsPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />
      {/*  דף ספקים למנהל  */}
      <Route
        path="/manager/suppliers"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <ExternalSuppliersPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />
  {/* 🔐 דף מנהל לניהול משתמשים*/}
  <Route
        path="/manager/assignments"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <AssignmentOfTasksPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />

      {/* 🔐 דף ניהול משתמשים */}
      <Route
        path="/manager/UserManagement"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <UserManagementPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />
         {/* 🔐 דף ניהול בניינים */}
          <Route
        path="/manager/buildings"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <DetailsOfBuildingsPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />  
          {/* 🔐  דף תשלום לדייר*/}
        <Route
        path="/tenant/payments"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <PaymentsPage />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />
        {/* 🔐  דף תשלום למנהל*/} 
      <Route
        path="/manager/payments"
        element={
          <ProtectedRoute>
            <div className={classes.PageContainer}>
              <Header />
              <main className={classes.PageContent}>
                <PaymentsPage />
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
