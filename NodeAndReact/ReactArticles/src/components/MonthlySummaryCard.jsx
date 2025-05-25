import React from "react";
import classes from "./MonthlySummaryCard.module.css";

export default function MonthlySummaryCard({ summary }) {
  const totalIncome = summary.reduce((sum, r) => sum + r.income, 0);
  const totalExpenses = summary.reduce((sum, r) => sum + r.expenses, 0);
  const totalProfit = summary.reduce((sum, r) => sum + r.profit, 0);

  return (
    <div className={classes.container}>
      <div className={classes.card}>💸 הכנסות: ₪{totalIncome.toLocaleString()}</div>
      <div className={classes.card}>💼 הוצאות: ₪{totalExpenses.toLocaleString()}</div>
      <div className={classes.card}>📈 רווח תפעולי: ₪{totalProfit.toLocaleString()}</div>
    </div>
  );
}
