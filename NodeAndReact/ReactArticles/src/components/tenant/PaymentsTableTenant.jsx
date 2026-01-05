// 📁 C:\PATH\TO\YOUR\PROJECT\client\src\components\tenant\PaymentsTableTenant.jsx
// טבלת תשלומים לדייר עם אפשרות עריכה/מחיקה לשורות במצב "ממתין" בלבד

import React, { useMemo, useState } from "react";
import classes from "./PaymentsTableTenant.module.css";
import BaseTable from "../../components/ui/BaseTable";

export default function PaymentsTableTenant({ payments, onEdit, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    amount: "",
    payment_date: "",
    category: "",
    description: "",
  });

  // פונקציה שמחזירה מפתח תאריך YYYY-MM-DD בצורה בטוחה (גם אם מגיע ISO עם T)
  const dateKey = (val) => {
    try {
      const s = String(val || "");
      if (!s) return "";
      return s.includes("T") ? s.split("T")[0] : s.slice(0, 10);
    } catch (e) {
      console.error(e);
      return "";
    }
  };

  // פונקציה שמציגה תאריך בעברית בלי "קפיצות" של אזור זמן (UTC -> Local)
  const formatHeDate = (val) => {
    try {
      const s = dateKey(val); // YYYY-MM-DD
      if (!s) return "";
      const [y, m, d] = s.split("-").map(Number);
      const local = new Date(y, (m || 1) - 1, d || 1); // ✅ Local date (לא UTC)
      return local.toLocaleDateString("he-IL");
    } catch (e) {
      console.error(e);
      return "";
    }
  };

  // פונקציה שממיינת תשלומים מהחדש לישן (לפי YYYY-MM-DD כדי להימנע מבעיות timezone)
  const sortedPayments = useMemo(() => {
    try {
      const list = Array.isArray(payments) ? [...payments] : [];
      return list.sort((a, b) => {
        const da = dateKey(a.payment_date);
        const db = dateKey(b.payment_date);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        // מיון לקסיקוגרפי עובד מצוין לפורמט YYYY-MM-DD
        if (da === db) return (b.payment_id || 0) - (a.payment_id || 0);
        return db.localeCompare(da);
      });
    } catch (e) {
      console.error(e);
      return Array.isArray(payments) ? payments : [];
    }
  }, [payments]);

  // פונקציה שפותחת מצב עריכה לשורה שנבחרה
  const startEdit = (p) => {
    try {
      setEditingId(p.payment_id);
      setDraft({
        amount: p.amount ?? "",
        payment_date: dateKey(p.payment_date), // ✅ מונע שינוי יום אוטומטי
        category: p.category ?? "",
        description: p.description ?? "",
      });
    } catch (e) {
      console.error(e);
    }
  };

  // פונקציה שסוגרת מצב עריכה ומנקה טיוטה
  const cancelEdit = () => {
    try {
      setEditingId(null);
      setDraft({ amount: "", payment_date: "", category: "", description: "" });
    } catch (e) {
      console.error(e);
    }
  };

  // פונקציה שמעדכנת ערך בטיוטת העריכה
  const setDraftField = (field, value) => {
    try {
      setDraft((prev) => ({ ...prev, [field]: value }));
    } catch (e) {
      console.error(e);
    }
  };

  // פונקציה ששומרת את השינויים דרך onEdit מהאב
  const saveEdit = (p) => {
    try {
      if (!onEdit) return;

      const amountNum = Number(draft.amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        alert("סכום לא תקין");
        return;
      }
      if (!draft.payment_date) {
        alert("תאריך לא תקין");
        return;
      }
      if (!draft.category || String(draft.category).trim().length === 0) {
        alert("קטגוריה חובה");
        return;
      }

      const updatedPayment = {
        payment_id: p.payment_id,
        amount: amountNum,
        payment_date: dateKey(draft.payment_date), // ✅ תמיד YYYY-MM-DD
        category: String(draft.category).trim(),
        description: String(draft.description || "").trim(),
      };

      onEdit(updatedPayment);
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert("שגיאה בשמירה");
    }
  };

  // פונקציה שמוחקת תשלום דרך onDelete מהאב
  const removeRow = (paymentId) => {
    try {
      if (!onDelete) return;
      onDelete(paymentId);
    } catch (e) {
      console.error(e);
      alert("שגיאה במחיקה");
    }
  };

  return (
    <div className={classes.tableWrapper}>
      <BaseTable
        headers={[
          "שם דייר",
          "שם בניין",
          "סכום",
          "תאריך",
          "קטגוריה",
          "תיאור",
          "סטטוס",
          "פעולות",
        ]}
        plainContainer
        containerStyle={{ background: "transparent", boxShadow: "none", padding: 0 }}
      >
        {sortedPayments.length === 0 ? (
          <tr>
            <td colSpan="8" style={{ textAlign: "center" }}>
              לא נמצאו תשלומים
            </td>
          </tr>
        ) : (
          sortedPayments.map((p) => {
            const isPending = p.status === "ממתין";
            const isEditing = editingId === p.payment_id;

            return (
              <tr key={p.payment_id}>
                <td>{p.tenant_name}</td>
                <td>{p.building_name}</td>

                {/* סכום */}
                <td>
                  {isEditing ? (
                    <input
                      className={classes.editInput}
                      type="number"
                      min="0"
                      value={draft.amount}
                      onChange={(e) => setDraftField("amount", e.target.value)}
                    />
                  ) : (
                    `${Number(p.amount).toLocaleString()} ₪`
                  )}
                </td>

                {/* תאריך */}
                <td>
                  {isEditing ? (
                    <input
                      className={classes.editInput}
                      type="date"
                      value={draft.payment_date}
                      onChange={(e) => setDraftField("payment_date", e.target.value)}
                    />
                  ) : (
                    formatHeDate(p.payment_date) // ✅ בלי קפיצה יום אחורה/קדימה
                  )}
                </td>

                {/* קטגוריה */}
                <td>
                  {isEditing ? (
                    <input
                      className={classes.editInput}
                      value={draft.category}
                      onChange={(e) => setDraftField("category", e.target.value)}
                    />
                  ) : (
                    p.category
                  )}
                </td>

                {/* תיאור */}
                <td>
                  {isEditing ? (
                    <textarea
                      className={classes.editTextarea}
                      value={draft.description}
                      onChange={(e) => setDraftField("description", e.target.value)}
                      rows={2}
                    />
                  ) : (
                    p.description
                  )}
                </td>

                {/* סטטוס */}
                <td>
                  <span
                    className={
                      p.status === "שולם"
                        ? classes.statusPaid
                        : p.status === "חוב"
                        ? classes.statusDebt
                        : classes.statusPending
                    }
                  >
                    {p.status}
                  </span>
                </td>

                {/* פעולות */}
                <td>
                  {!isPending ? (
                    <span className={classes.lockedAction}>🔒</span>
                  ) : isEditing ? (
                    <div className={classes.actions}>
                      <button
                        type="button"
                        className={classes.saveBtn}
                        onClick={() => saveEdit(p)}
                        title="שמור"
                      >
                        💾
                      </button>
                      <button
                        type="button"
                        className={classes.cancelBtn}
                        onClick={cancelEdit}
                        title="בטל"
                      >
                        ✖
                      </button>
                    </div>
                  ) : (
                    <div className={classes.actions}>
                      <button
                        type="button"
                        className={classes.editBtn}
                        onClick={() => startEdit(p)}
                        title="ערוך"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className={classes.deleteBtn}
                        onClick={() => removeRow(p.payment_id)}
                        title="מחק"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </BaseTable>
    </div>
  );
}
