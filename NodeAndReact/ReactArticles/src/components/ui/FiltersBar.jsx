import React from "react";
import classes from "./FiltersBar.module.css";

export default function FiltersBar({ children, className = "" }) {
  return (
    <div className={`${classes.wrap} ${className}`}>
      <div className={classes.row}>{children}</div>
    </div>
  );
}
