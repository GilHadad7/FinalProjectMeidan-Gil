import React from "react";
import classes from "./ReportsTenantPage.module.css";

export default function ReportsTenantPage() {
  const open = (path) => window.open(path, "_blank");

  return (
    <div className={classes.container}>
      <h2 className={classes.title}>דוחות (דייר)</h2>

      <div className={classes.grid}>
        <div className={classes.card}>
          <h3 className={classes.cardTitle}>דוח חיובים חודשי</h3>
          <p className={classes.muted}>סיכום חיובים ותשלומים לחודש הנוכחי.</p>
          <button
            className={classes.btn}
            onClick={() => open("http://localhost:3000/api/tenant/reports/monthly-statement")}
          >
            הורד PDF
          </button>
        </div>

        <div className={classes.card}>
          <h3 className={classes.cardTitle}>קבלות תשלום</h3>
          <p className={classes.muted}>כל הקבלות שהופקו על שמך.</p>
          <button
            className={classes.btn}
            onClick={() => open("http://localhost:3000/api/tenant/reports/receipts")}
          >
            הורד ZIP
          </button>
        </div>

        <div className={classes.card}>
          <h3 className={classes.cardTitle}>היסטוריית קריאות שירות</h3>
          <p className={classes.muted}>פירוט הקריאות שבוצעו עבורך.</p>
          <button
            className={classes.btn}
            onClick={() => open("http://localhost:3000/api/tenant/reports/servicecalls")}
          >
            הורד CSV
          </button>
        </div>
      </div>

      <div className={classes.note}>
        * אם קישורי ההורדה אינם זמינים עדיין בשרת — לא יקרה כלום בלחיצה, פשוט נפתח דף ללא תוכן.
      </div>
    </div>
  );
}
