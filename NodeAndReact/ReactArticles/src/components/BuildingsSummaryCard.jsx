import React from "react";
import classes from "./BuildingsSummaryCard.module.css";

export default function BuildingsSummaryCard({ buildings }) {
  const totalPayments = buildings.reduce(
    (sum, r) => sum + Number(r.total_paid || 0), 0
  );
  const totalOpenDebts = buildings.reduce(
    (sum, r) => sum + Number(r.balance_due || 0), 0
  );
  const totalMaintenance = buildings.reduce(
    (sum, r) => sum + Number(r.maintenance ?? 0), 0
  );
  
  const buildingsCount = buildings.length;

  return (
    <div className={classes.container}>
      <div className={classes.card}>🏢 מספר בניינים: {buildingsCount}</div>
      <div className={classes.card}>
        💵 סה"כ תשלומים: {totalPayments.toLocaleString("he-IL", {
          style: "currency",
          currency: "ILS",
        })}
      </div>
      <div className={classes.card}>
        📉 חובות פתוחים: {totalOpenDebts.toLocaleString("he-IL", {
          style: "currency",
          currency: "ILS",
        })}
      </div>
      <div className={classes.card}>
        🛠️ סה"כ הוצאות תחזוקה: {totalMaintenance.toLocaleString("he-IL", {
          style: "currency",
          currency: "ILS",
        })}
      </div>
    </div>
  );
}
