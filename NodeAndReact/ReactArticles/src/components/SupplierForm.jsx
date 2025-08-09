// src/components/SupplierForm.jsx
import React, { useState } from "react";
import FormCard from "./ui/FormCard";
import form from "./ui/FormKit.module.css";

export default function SupplierForm({ onAdd, onSuccess }) {
  const [data, setData] = useState({
    name: "",
    field: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState("");

  // Generic change handler
  function handleChange(e) {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  }

  // Phone: allow digits only, up to 10
  function handlePhoneChange(e) {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value) && value.length <= 10) {
      setData((prev) => ({ ...prev, phone: value }));
      setError("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Basic validations (same logic you had)
    if (!data.name || !data.field || !data.phone || !data.email) {
      setError("יש למלא את כל השדות");
      return;
    }
    if (!/^[0-9]{7,10}$/.test(data.phone)) {
      setError("מספר טלפון חייב להכיל בין 7 ל־10 ספרות בלבד");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      setError("כתובת אימייל לא תקינה");
      return;
    }

    await onAdd(data);
    onSuccess?.();
    alert("הספק נוסף בהצלחה ✅");
    setData({ name: "", field: "", phone: "", email: "" });
    setError("");
  }

  return (
    <FormCard title="הוסף ספק">
      <input
        className={form.input}
        name="name"
        placeholder="שם ספק"
        value={data.name}
        onChange={handleChange}
      />

      <input
        className={form.input}
        name="field"
        placeholder="תחום"
        value={data.field}
        onChange={handleChange}
      />

      <input
        className={form.input}
        name="phone"
        placeholder="טלפון"
        value={data.phone}
        onChange={handlePhoneChange}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
      />

      <input
        className={form.input}
        name="email"
        placeholder="מייל"
        value={data.email}
        onChange={handleChange}
        type="email"
      />

      {error && (
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
          {error}
        </div>
      )}

      <button className={form.button} onClick={handleSubmit} type="button">
        ➕ הוסף ספק
      </button>
    </FormCard>
  );
}
