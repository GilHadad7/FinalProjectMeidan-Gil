import React, { useState } from "react";
import classes from "./SuppliersTable.module.css";
import BaseTable from "../components/ui/BaseTable";

/** helpers */
const onlyDigits10 = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 10);
const formatPhone = (digits) => {
  const d = onlyDigits10(digits);
  // קווי
  if (d.startsWith("04") && d.length > 2) return d.slice(0, 2) + "-" + d.slice(2);
  // סלולרי 05x
  if (/^05\d/.test(d) && d.length > 3) return d.slice(0, 3) + "-" + d.slice(3);
  return d;
};
const isEmailValid = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim());

export default function SuppliersTable({
  suppliers,
  editId,
  setEditId,
  editForm,
  setEditForm,
  onDelete,
  onEditSave,
  // מגיע מהעמוד (לסינון בלבד)
  search = "",
}) {
  const [editEmailError, setEditEmailError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });

    if (name === "email") {
      setEditEmailError(isEmailValid(value) ? "" : "כתובת אימייל לא תקינה");
    }
  };

  // סינון לפי הטקסט שמגיע מהעמוד
  const q = (search || "").toLowerCase();
  const shown = suppliers.filter((s) =>
    [s.name, s.field, s.phone, s.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q)
  );

  return (
    <div className={classes.tableWrapper}>
      <BaseTable
        headers={["שם ספק", "תחום", "טלפון", "מייל", "פעולות"]}
        className={classes.suppliersTable}
      >
        {shown.map((s) => {
          const isRowEditing = editId === s.id;

          if (!isRowEditing) {
            return (
              <tr key={s.id}>
                <td className={classes.colName}>{s.name}</td>
                <td className={classes.colField}>{s.field}</td>
                <td className={classes.colPhone}>{formatPhone(s.phone)}</td>
                <td className={classes.colEmail}>
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </td>
                <td className={classes.colActions}>
                  <div className={classes.actions}>
                    <button
                      onClick={() => {
                        setEditId(s.id);
                        // דואגים שהטלפון לתוך ה־form ייכנס כספרות בלבד
                        setEditForm({ ...s, phone: onlyDigits10(s.phone) });
                      }}
                    >
                      ✏️
                    </button>
                    <button onClick={() => onDelete(s.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            );
          }

          // מצב עריכה
          const phoneDigits = onlyDigits10(editForm.phone);
          const phoneValid = phoneDigits.length === 10;
          const emailValid = isEmailValid(editForm.email);
          const canSave = phoneValid && emailValid;

          return (
            <tr key={s.id}>
              <td className={classes.colName}>
                <input
                  className={classes.input}
                  name="name"
                  value={editForm.name || ""}
                  onChange={handleChange}
                />
              </td>

              <td className={classes.colField}>
                <input
                  className={classes.input}
                  name="field"
                  value={editForm.field || ""}
                  onChange={handleChange}
                />
              </td>

              <td className={classes.colPhone}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <input
                    className={classes.input}
                    name="phone"
                    dir="ltr"
                    inputMode="numeric"
                    value={formatPhone(editForm.phone || "")}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        phone: onlyDigits10(e.target.value),
                      })
                    }
                    placeholder="050-1234567 / 04-1234567"
                  />
                  {/* הודעת שגיאה קטנה – בלי פופ־אפ */}
                  {phoneDigits.length > 0 && !phoneValid && (
                    <small className={classes.error}>מס׳ טלפון חייב 10 ספרות</small>
                  )}
                </div>
              </td>

              <td className={classes.colEmail}>
                <input
                  className={classes.input}
                  name="email"
                  value={editForm.email || ""}
                  onChange={handleChange}
                />
                {editEmailError && (
                  <div className={classes.error}>{editEmailError}</div>
                )}
              </td>

              <td className={classes.colActions}>
                <div className={classes.actions}>
                  <button
                    onClick={() => {
                      // בלי פופ־אפ: אם לא תקין פשוט לא לשמור
                      if (!canSave) return;
                      setEditEmailError("");
                      onEditSave();
                    }}
                    disabled={!canSave}
                    title={
                      !canSave
                        ? !emailValid
                          ? "כתובת אימייל לא תקינה"
                          : "מס׳ טלפון חייב 10 ספרות"
                        : "שמור"
                    }
                    style={!canSave ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                  >
                    💾
                  </button>
                  <button onClick={() => setEditId(null)}>❌</button>
                </div>
              </td>
            </tr>
          );
        })}
      </BaseTable>
    </div>
  );
}
