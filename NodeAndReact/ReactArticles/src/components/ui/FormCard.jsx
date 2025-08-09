import React from "react";
import classes from "./FormKit.module.css";

export default function FormCard({ title, children, className = "" }) {
  return (
    <section className={`${classes.formCard} ${className}`}>
      {title && <h3 className={classes.title}>{title}</h3>}
      <div className={classes.grid}>{children}</div>
    </section>
  );
}
