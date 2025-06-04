import React, { useState, useEffect } from "react";
import styles from "./AddPayment.module.css";

export default function AddPayment({ onAdd }) {
  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [form, setForm] = useState({
    tenant_id: "",
    building_id: "",
    date: "",
    category: "",
    desc: "",
    amount: "",
    status: "שולם", // ברירת מחדל
  });

  useEffect(() => {
    // tenants
    fetch("http://localhost:8801/api/users?role=tenant")
      .then((r) => r.json())
      .then(setTenants)
      .catch(console.error);

    // buildings
    fetch("http://localhost:8801/api/buildings")
      .then((r) => r.json())
      .then(setBuildings)
      .catch(console.error);
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function cleanStatus(str) {
    return (str || "")
      .normalize("NFKD")
      .replace(/[\u200E\u200F\u202A-\u202E״"“”]/g, "") // תווים נסתרים וגרשיים
      .trim();
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      tenant_id: Number(form.tenant_id),
      building_id: Number(form.building_id),
      payment_date: form.date,
      category: form.category,
      description: form.desc,
      amount: Number(form.amount),
      status: cleanStatus(form.status), // מנקה לפני שליחה
    };

    console.log("🟢 נשלח לשרת (סטטוס):", payload.status);

    fetch("http://localhost:8801/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then(() => {
        onAdd();
        setForm({
          tenant_id: "",
          building_id: "",
          date: "",
          category: "",
          desc: "",
          amount: "",
          status: "שולם",
        });
      })
      .catch(console.error);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      <div className={styles.title}>הוספת תשלום חדש</div>

      <select
        name="tenant_id"
        value={form.tenant_id}
        onChange={handleChange}
        className={`${styles.input} ${styles.dropdown}`}
        required
      >
        <option value="">בחר דייר</option>
        {tenants.map((t) => (
          <option key={t.user_id} value={t.user_id}>
            {t.name}
          </option>
        ))}
      </select>

      <select
        name="building_id"
        value={form.building_id}
        onChange={handleChange}
        className={`${styles.input} ${styles.dropdown}`}
        required
      >
        <option value="">בחר בניין</option>
        {buildings.map((b) => (
          <option key={b.building_id} value={b.building_id}>
            {b.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        name="date"
        value={form.date}
        onChange={handleChange}
        className={styles.input}
        required
      />

      <input
        name="category"
        placeholder="קטגוריה"
        value={form.category}
        onChange={handleChange}
        className={styles.input}
      />

      <input
        name="desc"
        placeholder="תיאור"
        value={form.desc}
        onChange={handleChange}
        className={styles.input}
      />

      <input
        type="number"
        name="amount"
        placeholder="סכום"
        value={form.amount}
        onChange={handleChange}
        className={styles.input}
        required
      />

      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        className={styles.input}
        required
      >
        <option value="">בחר סטטוס</option>
        <option value="שולם">שולם</option>
        <option value="ממתין">ממתין</option>
        <option value="חוב">חוב</option>
      </select>

      <button type="submit" className={styles.submitBtn}>
        הוסף תשלום
      </button>
    </form>
  );
}
