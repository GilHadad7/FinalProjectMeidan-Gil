import React from "react";
import classes from "./FormWithTableLayout.module.css";

export default function FormWithTableLayout({ title, formComponent, tableComponent }) {
  return (
    <div className={classes.layoutWrapper}>
      {/* Form section (Right) */}
      <div className={classes.formArea}>
        <h1>{title}</h1>
        {formComponent}
      </div>

      {/* Table section (Left) */}
      <div className={classes.tableArea}>
        {tableComponent}
      </div>
    </div>
  );
}
