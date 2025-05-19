import React from "react";
import classes from "./BuildingsFinanceTable.module.css";

export default function BuildingsFinanceTable({ data }) {
  return (
    <div className={classes.tableWrapper}>
      <table className={classes.reportsTable}>
        <thead>
          <tr>
            <th>מספר בניין</th>
            <th>שם</th>
            <th>כתובת</th>
            <th>שולם עד כה</th>
            <th>יתרה לתשלום</th>
            <th>תחזוקה</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(data) && data.length > 0 ? (
            data.map((row, idx) => (
              <tr key={row.building_id || idx}>
                <td>{row.building_id}</td>
                <td>{row.name}</td>
                <td>{row.address}</td>
                <td>{row.total_paid}</td>
                <td>{row.balance_due}</td>
                <td>{row.maintenance}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={6}>אין נתונים</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
