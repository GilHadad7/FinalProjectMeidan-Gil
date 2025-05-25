import React from "react";
import classes from "./MonthlySummaryTable.module.css";

export default function MonthlySummaryTable({ data }) {
  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th>חודש</th>
          <th>הכנסות</th>
          <th>הוצאות</th>
          <th>חובות פתוחים</th>
          <th>רווח תפעולי</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>{row.month}</td>
            <td>₪{row.income.toLocaleString()}</td>
            <td>₪{row.expenses.toLocaleString()}</td>
            <td>₪{row.debt.toLocaleString()}</td>
            <td>₪{row.profit.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
