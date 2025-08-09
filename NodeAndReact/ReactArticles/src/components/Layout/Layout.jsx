// src/components/Layout/Layout.jsx
import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import Header from "../Header";
import classes from "./Layout.module.css";

export default function Layout() {
  return (
    <div className={classes.container}>
      <Header />

      {/* מעכשיו הסרגל בתוך ה־header-wrapper */}
      <div className={classes.headerWrapper}>
        <div className={classes.logoArea}>
          {/* אפשר להשאיר פה לוגו אם Header לא כולל אותו */}
        </div>
        <nav className={classes.navbar}>
          <NavLink to="/manager/service-calls"   className={({isActive})=>isActive?classes.active:classes.link}>קריאות שירות</NavLink>
          <NavLink to="/manager/schedule"        className={({isActive})=>isActive?classes.active:classes.link}>לוח זמנים</NavLink>
          <NavLink to="/manager/payments"        className={({isActive})=>isActive?classes.active:classes.link}>תשלומים</NavLink>
          <NavLink to="/manager/buildings"       className={({isActive})=>isActive?classes.active:classes.link}>ניהול בניינים</NavLink>
          <NavLink to="/manager/assignments"     className={({isActive})=>isActive?classes.active:classes.link}>ניהול משימות</NavLink>
          <NavLink to="/manager/UserManagement"  className={({isActive})=>isActive?classes.active:classes.link}>ניהול משתמשים</NavLink>
          <NavLink to="/manager/suppliers"       className={({isActive})=>isActive?classes.active:classes.link}>ספקים חיצוניים</NavLink>
          <NavLink to="/manager/reports"         className={({isActive})=>isActive?classes.active:classes.link}>דוחות</NavLink>
        </nav>
      </div>

      <main className={classes.content}>
        <Outlet />
      </main>
    </div>
  );
}
