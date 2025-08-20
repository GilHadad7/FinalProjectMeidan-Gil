// src/components/Layout/Layout.jsx
import React, { useMemo } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import Header from "../Header";
import classes from "./Layout.module.css";

export default function Layout() {
  const location = useLocation();
  const isTenant = location.pathname.startsWith("/tenant");

  // בונים את רשימת הפריטים לפי ההקשר (דייר/מנהל)
  const navItems = useMemo(() => {
    if (isTenant) {
      return [
        { to: "/tenant/service-calls", label: "Service calls" },
        { to: "/tenant/schedule",      label: "Schedule" },
        { to: "/tenant/payments",      label: "Payments" },
        { to: "/tenant/reports",       label: "Reports" },
      ];
    }
    // ברירת מחדל: תפריט מנהל מלא (כמו שהיה)
    return [
      { to: "/manager/service-calls",  label: "קריאות שירות" },
      { to: "/manager/schedule",       label: "לוח זמנים" },
      { to: "/manager/payments",       label: "תשלומים" },
      { to: "/manager/buildings",      label: "ניהול בניינים" },
      { to: "/manager/assignments",    label: "ניהול משימות" },
      { to: "/manager/UserManagement", label: "ניהול משתמשים" },
      { to: "/manager/suppliers",      label: "ספקים חיצוניים" },
      { to: "/manager/reports",        label: "דוחות" },
    ];
  }, [isTenant]);

  return (
    <div className={classes.container}>
      <Header />

      {/* סרגל הניווט העליון */}
      <div className={classes.headerWrapper}>
        <div className={classes.logoArea}>{/* לוגו אם צריך */}</div>
        <nav className={classes.navbar}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? classes.active : classes.link
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className={classes.content}>
        <Outlet />
      </main>
    </div>
  );
}
