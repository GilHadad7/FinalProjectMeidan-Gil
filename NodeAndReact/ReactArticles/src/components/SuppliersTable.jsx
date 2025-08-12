import React, { useState } from "react";
import classes from "./SuppliersTable.module.css";
import BaseTable from "../components/ui/BaseTable"; // השארתי כפי שהיה אצלך

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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEditEmailError(emailRegex.test(value) ? "" : "כתובת אימייל לא תקינה");
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
        className={classes.suppliersTable} // סטייל ממוקד לטבלה הזו
      >
        {shown.map((s) =>
          editId === s.id ? (
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
                <input
                  className={classes.input}
                  name="phone"
                  value={editForm.phone || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^[0-9]*$/.test(value) && value.length <= 10) {
                      setEditForm({ ...editForm, phone: value });
                    }
                  }}
                  inputMode="numeric"
                />
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
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(editForm.email || "")) {
                        setEditEmailError("כתובת אימייל לא תקינה");
                        return;
                      }
                      setEditEmailError("");
                      onEditSave();
                    }}
                  >
                    💾
                  </button>
                  <button onClick={() => setEditId(null)}>❌</button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={s.id}>
              <td className={classes.colName}>{s.name}</td>
              <td className={classes.colField}>{s.field}</td>
              <td className={classes.colPhone}>{s.phone}</td>
              <td className={classes.colEmail}>
                <a href={`mailto:${s.email}`}>{s.email}</a>
              </td>
              <td className={classes.colActions}>
                <div className={classes.actions}>
                  <button
                    onClick={() => {
                      setEditId(s.id);
                      setEditForm(s);
                    }}
                  >
                    ✏️
                  </button>
                  <button onClick={() => onDelete(s.id)}>🗑️</button>
                </div>
              </td>
            </tr>
          )
        )}
      </BaseTable>
    </div>
  );
}
