import React, { useState } from "react";
import classes from "./UserForm.module.css";

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
    if (!form.name || !form.role || !form.phone || !form.email || !form.password) {
      setError("Please fill in all fields");
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
          onChange={handleChange}
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
