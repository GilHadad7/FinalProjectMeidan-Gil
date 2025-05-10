import React from "react";
import { useNavigate } from "react-router-dom";
import classes from "./TenantPage.module.css";

const navItems = [
  { label: "Service calls", path: "/tenant/service-calls" },
  { label: "Schedule", path: "/tenant/schedule" },
  { label: "Payments", path: "/tenant/payments" },
  { label: "Reports", path: "/tenant/reports" },
];

export default function TenantPage() {
  const navigate = useNavigate();
  const colors = [
    "brown", "orange", "blue", "purple", "green", "gray", "skyblue", "gold"
  ];

  return (
    <div className={classes.container}>
      <h1 className={classes.title}>TENANT VIEW</h1>

      {/* Navigation Bar */}
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

      <h2 className={classes.subtitle}>Welcome, dear tenant 🏡</h2>

      {/* Content Area */}
      <div className={classes.mainContent}>
        {/* Notifications */}
        <div className={classes.notifications}>
          <h3 className={classes.sectionTitle}>
            INSTANT NOTIFICATION'S <span className={classes.smallText}>(התראות דחופות לדייר)</span>
          </h3>
          <div className={classes.notificationBox}>
            <div className={classes.notificationHeader}></div>
            <div className={classes.notificationContent}>
              <span>No new alerts</span>
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className={classes.schedule}>
          <h3 className={classes.sectionTitle}>
            SCHEDULE <span className={classes.smallText}>(לוח זמנים של הבניין)</span>
          </h3>
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
