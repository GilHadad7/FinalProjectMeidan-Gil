import React, { useState } from "react";
import classes from "./UserForm.module.css";


// להוסיף תז על טופס חייב
export default function UserForm({ onAdd }) {
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // איפוס
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email)) {
      setError("כתובת מייל לא תקינה");
      return;
    }
  
    if (!/^[0-9]{7,10}$/.test(form.phone)) {
      setError("מספר טלפון חייב להכיל 7 עד 10 ספרות בלבד");
      return;
    }
  
    if (!form.name || !form.role || !form.phone || !form.email || !form.password) {
      setError("יש למלא את כל השדות");
      return;
    }
  
    await onAdd(form);
    setForm({ name: "", role: "", phone: "", email: "", password: "" });
  };
  

  return (
    <>
      <h3 className={classes.addUserTitle}>הוסף משתמש:</h3>
      <form className={classes.addUserForm} onSubmit={handleSubmit}>
        <input className={classes.input} name="name" placeholder="שם" value={form.name} onChange={handleChange} />
        <select className={classes.input} name="role" value={form.role} onChange={handleChange}>
          <option value="">בחר תפקיד</option>
          <option value="manager">manager</option>
          <option value="worker">worker</option>
          <option value="tenant">tenant</option>
        </select>
        <input
          className={classes.input}
          name="phone"
          placeholder="טלפון"
          value={form.phone}
          onChange={(e) => {
            const value = e.target.value;
            if (/^[0-9]*$/.test(value) && value.length <= 10) {
              setForm({ ...form, phone: value });
            }
          }}
          inputMode="numeric"
        />

        {error && <div className={classes.error}>{error}</div>}
        <input className={classes.input} name="email" placeholder="מייל" value={form.email} onChange={handleChange} />
        <div className={classes.passwordWrapper}>
  <input
    className={classes.inputPassword}
    type={showPassword ? "text" : "password"}
    name="password"
    placeholder="סיסמה"
    value={form.password}
    onChange={handleChange}
    autoComplete="new-password"
  />
  <button
    type="button"
    className={classes.toggleBtn}
    tabIndex={-1}
    onClick={() => setShowPassword(prev => !prev)}
    aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
  >
    {showPassword ? "🙈" : "👁️"}
  </button>
</div>
        <button className={classes.addUserBtn}>הוסף</button>
      </form>
    </>
  );
}
