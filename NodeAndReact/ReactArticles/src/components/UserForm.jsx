// src/components/UserForm.jsx
import React, { useState } from "react";
import FormCard from "./ui/FormCard";
import form from "./ui/FormKit.module.css";

export default function UserForm({ onAdd }) {
  const [showPassword, setShowPassword] = useState(false);

  const [userFormData, setUserFormData] = useState({
    name: "",
    id_number: "",
    role: "",
    phone: "",
    email: "",
    password: "",
  });

  const [validationError, setValidationError] = useState("");

  function handleInputChange(e) {
    const { name, value } = e.target;
    setUserFormData((prev) => ({ ...prev, [name]: value }));
  }

  // ID: digits only, up to 9
  function handleIdChange(e) {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value) && value.length <= 9) {
      setUserFormData((prev) => ({ ...prev, id_number: value }));
    }
  }

  // Phone: digits only, up to 10
  function handlePhoneChange(e) {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value) && value.length <= 10) {
      setUserFormData((prev) => ({ ...prev, phone: value }));
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setValidationError("");

    const payload = {
      ...userFormData,
      name: userFormData.name.trim(),
      id_number: userFormData.id_number.trim(),
      phone: userFormData.phone.trim(),
      email: userFormData.email.trim(),
      password: userFormData.password, // אל תטרים סיסמאות
    };

    const { name, id_number, role, phone, email, password } = payload;

    if (!name || !id_number || !role || !phone || !email || !password) {
      setValidationError("יש למלא את כל השדות");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setValidationError("כתובת מייל לא תקינה");
      return;
    }

    if (!/^[0-9]{7,10}$/.test(phone)) {
      setValidationError("מספר טלפון חייב להכיל 7 עד 10 ספרות בלבד");
      return;
    }

    if (!/^[0-9]{7,9}$/.test(id_number)) {
      setValidationError("תעודת זהות חייבת להכיל 7 עד 9 ספרות");
      return;
    }

    await onAdd(payload);

    setUserFormData({
      name: "",
      id_number: "",
      role: "",
      phone: "",
      email: "",
      password: "",
    });
  }

  return (
    <FormCard title="הוספת משתמש">
      <input
        type="text"
        className={form.input}
        name="name"
        placeholder="שם"
        value={userFormData.name}
        onChange={handleInputChange}
        autoComplete="name"
      />

      <input
        type="text"
        className={form.input}
        name="id_number"
        placeholder="תעודת זהות"
        value={userFormData.id_number}
        onChange={handleIdChange}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={9}
        autoComplete="off"
      />

      <select
        className={form.select}
        name="role"
        value={userFormData.role}
        onChange={handleInputChange}
      >
        <option value="">בחר תפקיד</option>
        <option value="manager">manager</option>
        <option value="worker">worker</option>
        <option value="tenant">tenant</option>
      </select>

      <input
        type="text"
        className={form.input}
        name="phone"
        placeholder="טלפון"
        value={userFormData.phone}
        onChange={handlePhoneChange}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        autoComplete="tel"
      />

      <input
        type="email"
        className={form.input}
        name="email"
        placeholder="מייל"
        value={userFormData.email}
        onChange={handleInputChange}
        autoComplete="email"
      />

      {/* סיסמה + כפתור עין (לא מכסה את כל השדה) */}
      <div className={form.passwordField}>
        <input
          className={form.input}
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="סיסמה"
          value={userFormData.password}
          onChange={handleInputChange}
          autoComplete="new-password"
        />
        <button
          type="button"
          className={form.passwordToggle}
          onClick={() => setShowPassword((p) => !p)}
          aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
          tabIndex={-1}
        >
          {showPassword ? "🙈" : "👁️"}
        </button>
      </div>

      {validationError && (
        <div
          style={{
            color: "#b3261e",
            background: "#fde7e9",
            border: "1px solid #f4b4bb",
            padding: "8px 12px",
            borderRadius: "12px",
            fontFamily: "Heebo, Segoe UI, sans-serif",
            fontSize: "0.95rem",
          }}
        >
          {validationError}
        </div>
      )}

      <button className={form.button} onClick={handleFormSubmit} type="button">
        הוסף משתמש חדש
      </button>
    </FormCard>
  );
}
