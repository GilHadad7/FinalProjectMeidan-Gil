import React from "react";
import { useNavigate } from "react-router-dom";
import classes from "./AdminPage.module.css";

export default function AdminPage() {
  const navigate = useNavigate();

  const navItems = [
    { label: "Service calls", path: "/manager/service-calls" },
    { label: "Schedule", path: "/manager/schedule" },
    { label: "Payments", path: "/manager/payments" },
    { label: "Details of buildings", path: "/manager/buildings" },
    { label: "Assignment of tasks", path: "/manager/assignments" },
    { label: "User management", path: "/manager/UserManagement" },
    { label: "External suppliers", path: "/manager/suppliers" },
    { label: "Reports", path: "/manager/reports" },
  ];

  const colors = [
    "brown",
    "orange",
    "blue",
    "purple",
    "green",
    "gray",
    "skyblue",
    "gold",
  ];

  return (
    <div className={classes.container}>
      <h1>MANAGER VIEW</h1>

      <div className={classes.navBar}>
        {navItems.map((item) => (
          <button
            key={item.label}
            className={classes.navButton}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <h2>WELCOME TO “XXXXXXXXXXXXXX” BUILDING</h2>

      <div className={classes.mainContent}>
        <div className={classes.notifications}>
          <h3>INSTANT NOTIFICATION'S (התראות דחופות)</h3>
          <div className={classes.notificationBox}>
            <div className={classes.notificationHeader}></div>
          </div>
        </div>

        <div className={classes.schedule}>
          <h3>SCHEDULE (לוח זמנים של חברת XXXX)</h3>
          <div className={classes.scheduleGrid}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className={classes.scheduleDay}
                style={{ backgroundColor: colors[i % colors.length] }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
