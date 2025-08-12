import React from "react";
import classes from "./UsersTable.module.css";
import BaseTable from "./ui/BaseTable";

// --- תפקיד בעברית
const roleHe = (en) => {
  switch (en) {
    case "manager": return "מנהל";
    case "worker":  return "עובד";
    case "tenant":  return "דייר";
    default:        return en || "";
  }
};

// --- זיהוי קידומת ופורמט ישראלי עם מקף
const TWO_DIGIT_AREA = new Set(["02", "03", "04", "08", "09"]); // קווי

const detectPrefixLen = (digits) => {
  if (!digits || digits[0] !== "0" || digits.length < 2) return 3;
  const two = digits.slice(0, 2);
  if (TWO_DIGIT_AREA.has(two)) return 2;           // 02/03/04/08/09
  if (digits[1] === "5" || digits[1] === "7") return 3; // 05x, 07x
  return 3;
};

const formatILPhone10 = (raw) => {
  const only = (raw || "").replace(/\D/g, "");
  if (!only) return "";
  const clipped = only.slice(0, 10);
  const pl = detectPrefixLen(clipped);
  return clipped.length <= pl
    ? clipped
    : `${clipped.slice(0, pl)}-${clipped.slice(pl)}`;
};

export default function UsersTable({
  users,
  editId,
  setEditId,
  editForm,
  setEditForm,
  onDelete,
  onEditSave,
}) {
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  return (
    <BaseTable
      headers={["שם", "תעודת זהות", "תפקיד", "טלפון", "מייל", "פעולות"]}
      className={classes.usersTable}
    >
      {users.map((user) => {
        const isEditing = editId === user.user_id;
        const idOk = (editForm?.id_number || "").length === 9;
        const phoneOk = (editForm?.phone || "").length === 10;

        return isEditing ? (
          <tr key={user.user_id}>
            {/* שם */}
            <td>
              <input
                className={classes.input}
                name="name"
                value={editForm.name || ""}
                onChange={handleEditChange}
              />
            </td>

            {/* ת"ז – בדיוק 9 ספרות + הודעת שגיאה */}
            <td>
              <div className={classes.field}>
                <input
                  className={classes.input}
                  name="id_number"
                  value={editForm.id_number || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*$/.test(v) && v.length <= 9) {
                      setEditForm({ ...editForm, id_number: v });
                    }
                  }}
                  type="text"
                  inputMode="numeric"
                  minLength={9}
                  maxLength={9}
                  required
                  aria-invalid={!idOk}
                  title="יש להזין תעודת זהות בעלת 9 ספרות"
                />
                {!idOk && (
                  <div className={classes.errorText} role="alert" aria-live="polite">
                    תעודת זהות חייבת להכיל 9 ספרות
                  </div>
                )}
              </div>
            </td>

            {/* תפקיד */}
            <td>
              <select
                className={classes.input}
                name="role"
                value={editForm.role || ""}
                onChange={handleEditChange}
              >
                <option value="manager">מנהל</option>
                <option value="worker">עובד</option>
                <option value="tenant">דייר</option>
              </select>
            </td>

            {/* טלפון – בדיוק 10 ספרות + הודעת שגיאה */}
            <td dir="ltr" style={{ textAlign: "center" }}>
              <div className={classes.field}>
                <input
                  className={classes.input}
                  name="phone"
                  value={formatILPhone10(editForm.phone || "")}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setEditForm({ ...editForm, phone: digits }); // שומר ספרות בלבד
                  }}
                  type="text"
                  inputMode="numeric"
                  required
                  aria-invalid={!phoneOk}
                  title="יש להזין מספר טלפון בעל 10 ספרות (ללא '-')"
                />
                {!phoneOk && (
                  <div className={classes.errorText} role="alert" aria-live="polite" dir="rtl">
                    מספר טלפון חייב להכיל 10 ספרות
                  </div>
                )}
              </div>
            </td>

            {/* מייל */}
            <td className={classes.emailCell}>
              <input
                className={classes.input}
                name="email"
                value={editForm.email || ""}
                onChange={handleEditChange}
              />
            </td>

            {/* פעולות */}
            <td>
              <div className={classes.actions}>
                <button
                  onClick={() => onEditSave(user.user_id)}
                  disabled={!idOk || !phoneOk}
                  title={!idOk || !phoneOk ? "ת״ז חייבת 9 ספרות וטלפון 10 ספרות" : "שמור"}
                >
                  💾
                </button>
                <button onClick={() => setEditId(null)}>❌</button>
              </div>
            </td>
          </tr>
        ) : (
          <tr key={user.user_id}>
            <td>{user.name}</td>
            <td>{user.id_number}</td>
            <td>{roleHe(user.role)}</td>
            <td dir="ltr" style={{ textAlign: "center" }}>
              {formatILPhone10(user.phone)}
            </td>
            <td className={classes.emailCell}>
              <a href={`mailto:${user.email}`}>{user.email}</a>
            </td>
            <td>
              <div className={classes.actions}>
                <button
                  onClick={() => {
                    setEditId(user.user_id);
                    setEditForm({ ...user });
                  }}
                >
                  ✏️
                </button>
                <button onClick={() => onDelete(user.user_id)}>🗑️</button>
              </div>
            </td>
          </tr>
        );
      })}
    </BaseTable>
  );
}
