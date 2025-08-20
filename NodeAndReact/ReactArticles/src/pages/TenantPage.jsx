// src/pages/TenantPage.jsx
import React, { useEffect, useState } from "react";
import classes from "./TenantPage.module.css";

export default function TenantPage() {
  // שם הדייר (לא חובה)
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // נסה להביא פרטי משתמש מהשרת (אם קיימת סשן)
        const res = await fetch("http://localhost:3000/api/auth/me", {
          credentials: "include",
        });
        if (res.ok) {
          const u = await res.json();
          if (u?.name) {
            setTenantName(u.name);
            return;
          }
        }
      } catch (_) {
        // מתעלמים ושולפים מה־storage
      }

      // Fallback: מתוך storage אם נשמר שם אחרי לוגין
      try {
        const keys = ["authUser", "user", "currentUser"];
        for (const k of keys) {
          const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.name) {
              setTenantName(parsed.name);
              return;
            }
          }
        }
      } catch (_) {}
    })();
  }, []);

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
      <h1 className={classes.title}>TENANT VIEW</h1>

      {/* ברוך הבא לדייר */}
      <h2 className={classes.subtitle}>
        Welcome{tenantName ? `, ${tenantName}` : ", dear tenant"} 🏡
      </h2>

      {/* אזור התוכן */}
      <div className={classes.mainContent}>
        {/* התראות */}
        <div className={classes.notifications}>
          <h3 className={classes.sectionTitle}>
            INSTANT NOTIFICATION'S{" "}
            <span className={classes.smallText}>(התראות דחופות לדייר)</span>
          </h3>
          <div className={classes.notificationBox}>
            <div className={classes.notificationHeader}></div>
            <div className={classes.notificationContent}>
              <span>No new alerts</span>
            </div>
          </div>
        </div>

        {/* “לוח זמנים” דמה */}
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
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
