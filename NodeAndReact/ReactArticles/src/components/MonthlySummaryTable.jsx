import React from "react";
import classes from "./MonthlySummaryTable.module.css";

export default function MonthlySummaryTable({ data }) {
  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th>כותרת</th>
        </tr>
      </thead>
      <tbody>
        {Array.isArray(data) && data.length > 0 ? (
          data.map((row, idx) => (
            <tr key={idx}>
              <td>{JSON.stringify(row)}</td>
            </tr>
          ))
        ) : (
          <tr><td>אין נתונים</td></tr>
        )}
      </tbody>
    </table>
  );
}
