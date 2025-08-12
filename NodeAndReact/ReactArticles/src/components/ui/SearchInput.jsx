import React from "react";
import classes from "./SearchInput.module.css";

export default function SearchInput({
  value, onChange, placeholder="חיפוש…", width=360, name="search"
}) {
  return (
    <label className={classes.box} style={{ width }}>
      <span className={classes.icon} aria-hidden>🔎</span>
      <input
        name={name}
        value={value}
        onChange={(e)=>onChange?.(e.target.value)}
        className={classes.input}
        placeholder={placeholder}
        type="text"
      />
    </label>
  );
}
