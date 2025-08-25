import React, { useEffect, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { he } from "date-fns/locale";

import FormCard from "../ui/FormCard";
import form from "../ui/FormKit.module.css";

registerLocale("he", he);

export default function AddPaymentTenant({ onAdd }) {
  // 🔐 המשתמש המחובר (גיבוי לשם/שדות שונים)
  const user = (() => { try { return JSON.parse(sessionStorage.getItem("user")) || null; } catch { return null; } })();
  const loggedTenantId   = user?.user_id ?? user?.id ?? null;
  const loggedTenantName = user?.name ?? "";
  const tenantBuildingId = user?.building_id ?? user?.buildingId ?? null;

  const [buildings, setBuildings] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    payment_date: null,
    category: "",
    customCategory: "",
    description: "",
    amount: "",
    status: "שולם",
  });

  // טען רשימת בניינים רק כדי להציג את שם הבניין (הטופס נעול לבניין של הדייר)
  useEffect(() => {
    fetch("http://localhost:8801/api/buildings")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const filtered = tenantBuildingId != null
          ? list.filter(b => String(b.building_id) === String(tenantBuildingId))
          : list;
        filtered.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", "he", { numeric: true })
        );
        setBuildings(filtered);
      })
      .catch(console.error);
  }, [tenantBuildingId]);

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

    // ולידציות בסיסיות
    if (tenantBuildingId == null || loggedTenantId == null) {
      alert("לא זוהו פרטי הדייר/הבניין. התחבר/י מחדש.");
      return;
    }
    const { payment_date, category, customCategory, description, amount, status } = paymentForm;
    if (!payment_date) return alert("אנא בחר/י תאריך");
    const finalCategory = category === "אחר" ? (customCategory || "").trim() : category;
    if (!finalCategory) return alert("אנא בחר/י קטגוריה");
    if (!amount || Number(amount) <= 0) return alert("אנא הזן/י סכום תקין");

    const payload = {
      // 🔒 ננעלים לדייר/בניין מהסשן – בלי בחירה ידנית
      building_id: Number(tenantBuildingId),
      tenant_id: Number(loggedTenantId),
      payment_date: formatDateToYMD(payment_date),
      category: finalCategory,
      description: (description || "").trim(),
      amount: Number(amount),
      status: cleanStatus(status),
    };

    try {
      setSubmitting(true);
      const res = await fetch("http://localhost:8801/api/tenant/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",                 // חשוב! לשליחת ה-cookie של הסשן
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // שגיאה ידידותית: נדפיס מה השרת באמת אמר
        let msg = "שגיאה בהוספת תשלום";
        try {
          const data = await res.json();
          if (data?.error || data?.message) msg = data.error || data.message;
        } catch (_) {}
        alert(msg);
        return;
      }

      // איפוס הטופס
      setPaymentForm({
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

  // מציגים בניין ודייר כמידע נעול (ללא בחירה)
  const buildingLabel =
    buildings[0]?.name || buildings[0]?.full_address || (tenantBuildingId ? `בניין #${tenantBuildingId}` : "");

  return (
    <FormCard>
      {/* בניין (נעול) */}
      <input
        className={form.input}
        value={buildingLabel}
        readOnly
        title="הבניין נקבע לפי הדייר שמחובר"
      />

      {/* דייר (נעול) */}
      <input
        className={form.input}
        value={loggedTenantName || `דייר #${loggedTenantId ?? ""}`}
        readOnly
        title="הדייר נקבע לפי המשתמש שמחובר"
      />

      {/* תאריך */}
      <div className={form.control}>
        <DatePicker
          selected={paymentForm.payment_date}
          onChange={(date) => setPaymentForm((prev) => ({ ...prev, payment_date: date }))}
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
