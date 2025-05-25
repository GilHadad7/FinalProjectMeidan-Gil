import React from "react";
import classes from "./WorkerReportsSummary.module.css";

export default function WorkerReportsSummary({ reports }) {
  const totalSalary = reports.reduce((sum, r) => sum + Number(r.salary), 0);

  return (
    <div className={classes.summaryContainer}>
      <div className={classes.card}>
        💰 סה"כ שכר: {totalSalary.toLocaleString("he-IL", {
          style: "currency",
          currency: "ILS",
          minimumFractionDigits: 2,
        })}
      </div>
      <div className={classes.card}>
        👷 עובדים בדוח: {reports.length}
      </div>
    </div>
  );
}
