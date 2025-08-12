// src/components/BuildingsFinanceTable.jsx
import React from "react";
import { Link } from "react-router-dom";
import classes from "./BuildingsFinanceTable.module.css";

export default function BuildingsFinanceTable({ data }) {
  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th>בניין</th>
          <th>כתובת</th>
          <th>סה"כ תשלומים</th>
          <th>חובות פתוחים</th>
          <th>הוצאות תחזוקה</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>
              <Link
                className={classes.buildingLink}
                to={`/manager/buildings?name=${encodeURIComponent(row.building_name)}`}
                title={`הצג רק את "${row.building_name}"`}
              >
                {row.building_name}
              </Link>
            </td>
            <td>{row.address}</td>
            <td>₪{row.total_paid?.toLocaleString?.() ?? "—"}</td>
            <td>₪{row.balance_due?.toLocaleString?.() ?? "—"}</td>
            <td>₪{row.maintenance?.toLocaleString?.() ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
