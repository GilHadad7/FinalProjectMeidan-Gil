import React, { useState } from "react";
import classes from "./SupplierForm.module.css";

export default function SupplierForm({ onAdd, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    field: "",
    phone: "",
    email: ""
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!form.name || !form.field || !form.phone || !form.email) {
      setError("יש למלא את כל השדות");
      return;
    }
  
    if (!/^[0-9]{7,10}$/.test(form.phone)) {
      setError("מספר טלפון חייב להכיל בין 7 ל־10 ספרות בלבד");
      return;
    }
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("כתובת אימייל לא תקינה");
      return;
    }
  
    await onAdd(form);
    onSuccess();
    alert("הספק נוסף בהצלחה ✅");
    setForm({ name: "", field: "", phone: "", email: "" });
    setError("");
  };
  
  
  

  return (
    <>
      <h3 className={classes.formTitle}>הוסף ספק:</h3>
      <form className={classes.form} onSubmit={handleSubmit}>
        <input
          className={classes.input}
          name="name"
          placeholder="שם ספק"
          value={form.name}
          onChange={handleChange}
        />
        <input
          className={classes.input}
          name="field"
          placeholder="תחום"
          value={form.field}
          onChange={handleChange}
        />
        <input
          className={classes.input}
          name="phone"
          placeholder="טלפון"
          value={form.phone}
          onChange={(e) => {
        const value = e.target.value;
    if (/^[0-9]*$/.test(value) && value.length <= 10) {
      setForm({ ...form, phone: value });
      setError(""); // מנקה שגיאה תוך כדי
    }
  }}
          inputMode="numeric"
/>

        <input
          className={classes.input}
          name="email"
          placeholder="מייל"
          value={form.email}
          onChange={handleChange}
        />
        {error && <div className={classes.error}>{error}</div>}
        <button className={classes.addBtn} type="submit">➕ הוסף ספק</button>
      </form>
    </>
  );
}
