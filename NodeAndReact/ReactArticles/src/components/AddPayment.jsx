// src/components/AddPayment.jsx
import React, { useEffect, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { he } from "date-fns/locale";

import FormCard from "./ui/FormCard";
import form from "./ui/FormKit.module.css";

registerLocale("he", he);

export default function AddPayment({ onAdd }) {
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    building_id: "",
    tenant_id: "",
    payment_date: null,
    category: "",
    customCategory: "",
    description: "",
    amount: "",
    status: "שולם",
  });

  // טען בניינים – ממויין לפי שם בניין
  useEffect(() => {
    fetch("http://localhost:8801/api/buildings")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        list.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", "he", { numeric: true })
        );
        setBuildings(list);
      })
      .catch(console.error);
  }, []);

  // בכל שינוי בניין: הבאת דיירים של אותו בניין בלבד
  useEffect(() => {
    const bid = paymentForm.building_id;
    if (!bid) {
      setTenants([]);
      setPaymentForm((prev) => ({ ...prev, tenant_id: "" }));
      return;
    }

    setLoadingTenants(true);
    fetch(`http://localhost:8801/api/tenants?building_id=${bid}`)
      .then((res) => res.json())
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => setTenants([]))
      .finally(() => {
        setLoadingTenants(false);
        setPaymentForm((prev) => ({ ...prev, tenant_id: "" }));
      });
  }, [paymentForm.building_id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  }

  function formatDateToYMD(date) {
    if (!date) return "";
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().split("T")[0];
  }

  function cleanStatus(str) {
    return (str || "")
      .normalize("NFKD")
      .replace(/[\u200E\u200F\u202A-\u202E"“”]/g, "")
      .trim();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const {
      building_id,
      tenant_id,
      payment_date,
      category,
      customCategory,
      description,
      amount,
      status,
    } = paymentForm;

    if (!building_id) return alert("אנא בחר/י בניין");
    if (!tenant_id) return alert("אנא בחר/י דייר");
    if (!payment_date) return alert("אנא בחר/י תאריך");
    const finalCategory = category === "אחר" ? (customCategory || "").trim() : category;
    if (!finalCategory) return alert("אנא בחר/י קטגוריה");
    if (!amount || Number(amount) <= 0) return alert("אנא הזן/י סכום תקין");

    const payload = {
      building_id: Number(building_id),
      tenant_id: Number(tenant_id),
      payment_date: formatDateToYMD(payment_date),
      category: finalCategory,
      description: (description || "").trim(),
      amount: Number(amount),
      status: cleanStatus(status),
    };

    try {
      setSubmitting(true);
      const res = await fetch("http://localhost:8801/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert("שגיאה בהוספת תשלום");
        return;
      }

      setPaymentForm({
        building_id: "",
        tenant_id: "",
        payment_date: null,
        category: "",
        customCategory: "",
        description: "",
        amount: "",
        status: "שולם",
      });
      onAdd?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormCard>
      {/* בניין — מציג לפי שם (name), עם כתובת כגיבוי/רמיזה */}
      <select
        className={form.select}
        name="building_id"
        value={paymentForm.building_id}
        onChange={handleChange}
      >
        <option value="">בחר בניין</option>
        {buildings.map((b) => (
          <option key={b.building_id} value={b.building_id}>
            {b.name || b.full_address || `בניין #${b.building_id}`}
          </option>
        ))}
      </select>

      {/* דייר — רק דיירים של הבניין הנבחר */}
      <select
        className={form.select}
        name="tenant_id"
        value={paymentForm.tenant_id}
        onChange={handleChange}
        disabled={!paymentForm.building_id || loadingTenants}
        title={!paymentForm.building_id ? "בחר/י קודם בניין" : undefined}
      >
        <option value="">
          {loadingTenants ? "טוען דיירים…" : "בחר דייר"}
        </option>
        {tenants.map((t) => {
          const id = t.tenant_id ?? t.user_id ?? t.id;
          return (
            <option key={id} value={id}>
              {t.name || `דייר #${id}`}
            </option>
          );
        })}
      </select>

      {/* תאריך */}
      <div className={form.control}>
        <DatePicker
          selected={paymentForm.payment_date}
          onChange={(date) =>
            setPaymentForm((prev) => ({ ...prev, payment_date: date }))
          }
          dateFormat="dd/MM/yyyy"
          locale="he"
          className={form.input}
          placeholderText="dd/mm/yyyy"
          calendarStartDay={0}
        />
      </div>

      {/* קטגוריה */}
      <select
        className={form.select}
        name="category"
        value={paymentForm.category}
        onChange={handleChange}
      >
        <option value="">בחר קטגוריה</option>
        <option value="תחזוקת בניין">תחזוקת בניין</option>
        <option value="ניקיון">ניקיון</option>
        <option value="שירות מעלית">שירות מעלית</option>
        <option value="קנס איחור">קנס איחור</option>
        <option value="אבטחה">אבטחה</option>
        <option value="אחר">אחר</option>
      </select>

      {paymentForm.category === "אחר" && (
        <input
          className={form.input}
          name="customCategory"
          placeholder="הכנס קטגוריה אחרת"
          value={paymentForm.customCategory}
          onChange={handleChange}
          autoComplete="off"
        />
      )}

      {/* תיאור */}
      <input
        className={form.input}
        name="description"
        placeholder="תיאור"
        value={paymentForm.description}
        onChange={handleChange}
        autoComplete="off"
      />

      {/* סכום */}
      <input
        type="number"
        className={form.input}
        name="amount"
        placeholder="סכום"
        value={paymentForm.amount}
        onChange={handleChange}
        min="0"
        step="0.01"
        inputMode="decimal"
        required
      />

      {/* סטטוס */}
      <select
        className={form.select}
        name="status"
        value={paymentForm.status}
        onChange={handleChange}
      >
        <option value="שולם">שולם</option>
        <option value="ממתין">ממתין</option>
        <option value="חוב">חוב</option>
      </select>

      <button
        className={form.button}
        onClick={handleSubmit}
        type="button"
        disabled={submitting}
      >
        {submitting ? "שולח…" : "הוספת תשלום"}
      </button>
    </FormCard>
  );
}
