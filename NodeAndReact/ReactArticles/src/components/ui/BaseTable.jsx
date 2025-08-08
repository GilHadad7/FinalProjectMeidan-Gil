import React from "react";
import classes from "./BaseTable.module.css";

export default function BaseTable({ headers = [], children, className = "" }) {
  return (
    <div className={classes.tableContainer}>
      {/* Default styles from BaseTable.module.css combined with optional custom class */}
      <table className={`${classes.table} ${className}`.trim()}>
        <thead>
          <tr>
            {headers.map((h, idx) => (
              <th key={idx}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
