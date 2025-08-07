import React, { useState, useEffect } from "react";
import styles from "./AddPayment.module.css";

export default function AddPayment({ onAdd }) {
  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [form, setForm] = useState({
    building_id: "",
    tenant_id: "",
    date: "",
    category: "",
    customCategory: "",
    desc: "",
    amount: "",
    status: "שולם",
  });

  useEffect(() => {
    fetch("http://localhost:8801/api/buildings")
      .then((res) => res.json())
      .then(setBuildings)
      .catch(console.error);

    fetch("http://localhost:8801/api/users?role=tenant")
      .then((res) => res.json())
      .then(setTenants)
      .catch(console.error);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const cleanStatus = (str) =>
    (str || "")
      .normalize("NFKD")
      .replace(/[\u200E\u200F\u202A-\u202E"“””]/g, "")
      .trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    const categoryValue =
      form.category === "אחר" ? form.customCategory.trim() : form.category;

    const payload = {
      building_id: Number(form.building_id),
      tenant_id: Number(form.tenant_id),
      payment_date: form.date,
      category: categoryValue,
      description: form.desc,
      amount: Number(form.amount),
      status: cleanStatus(form.status),
    };

    fetch("http://localhost:8801/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then(() => {
        onAdd();
        setForm({
          building_id: "",
          tenant_id: "",
          date: "",
          category: "",
          customCategory: "",
          desc: "",
          amount: "",
          status: "שולם",
        });
      })
      .catch(console.error);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      <h2 className={styles.title}>הוספת תשלום חדש</h2>

      {/* בחר בניין ראשון */}
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

      {/* אחר כך בחר דייר */}
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

      {/* תאריך */}
      <input
        type="date"
        name="date"
        value={form.date}
        onChange={handleChange}
        className={styles.input}
        required
      />

      {/* קטגוריה */}
      <select
        name="category"
        value={form.category}
        onChange={handleChange}
        className={`${styles.input} ${styles.dropdown}`}
        required
      >
        <option value="">בחר קטגוריה</option>
        <option value="תחזוקת בניין">תחזוקת בניין</option>
        <option value="ניקיון">ניקיון</option>
        <option value="שירות מעלית">שירות מעלית</option>
        <option value="קנס איחור">קנס איחור</option>
        <option value="אבטחה">אבטחה</option>
        <option value="אחר">אחר</option>
      </select>

      {/* קטגוריה חופשית אם נבחר "אחר" */}
      {form.category === "אחר" && (
        <input
          name="customCategory"
          value={form.customCategory}
          onChange={handleChange}
          placeholder="הכנס קטגוריה אחרת"
          className={styles.input}
          required
        />
      )}

      {/* תיאור */}
      <input
        name="desc"
        value={form.desc}
        onChange={handleChange}
        placeholder="תיאור"
        className={styles.input}
      />

      {/* סכום */}
      <input
        type="number"
        name="amount"
        value={form.amount}
        onChange={handleChange}
        placeholder="סכום"
        className={styles.input}
        required
      />

      {/* סטטוס */}
      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        className={styles.input}
        required
      >
        <option value="שולם">שולם</option>
        <option value="ממתין">ממתין</option>
        <option value="חוב">חוב</option>
      </select>

      <button type="submit" className={styles.submitBtn}>
        הוספת תשלום
      </button>
    </form>
  );
}