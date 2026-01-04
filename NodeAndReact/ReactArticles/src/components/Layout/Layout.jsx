// src/components/Layout/Layout.jsx
import React, { useMemo } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import Header from "../Header";
import classes from "./Layout.module.css";

export default function Layout() {
  const location = useLocation();
  const pathname = location.pathname;

  const isTenant = pathname.startsWith("/tenant");
  const isWorker = pathname.startsWith("/worker");

  // בונים את רשימת הפריטים לפי ההקשר (דייר / עובד / מנהל)
  const navItems = useMemo(() => {
    if (isTenant) {
      return [
        { to: "/tenant/service-calls", label: "קריאות שירות" },
        { to: "/tenant/schedule",      label: "לוח זמנים" },
        { to: "/tenant/payments",      label: "תשלומים" },
        { to: "/tenant/reports",       label: "דוחות" },
      ];
    }

    if (isWorker) {
      // ⬅️ עובד: רק שלושת הדפים שביקשת
      return [
        { to: "/worker/service-calls", label: "קריאות שירות" },
        { to: "/worker/schedule",      label: "לוח זמנים" },
        { to: "/worker/reports",       label: "דוחות" },
      ];
    }

    // ברירת מחדל (מנהל) – תפריט מלא
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
  }, [isTenant, isWorker]);

  return (
    <div className={classes.container}>
      <Header />

      {/* סרגל הניווט העליון */}
      <div className={classes.headerWrapper}>
        <div className={classes.logoArea} />
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
