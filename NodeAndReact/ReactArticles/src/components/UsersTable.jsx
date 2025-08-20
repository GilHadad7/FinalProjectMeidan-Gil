import React from "react";
import classes from "./UsersTable.module.css";
import BaseTable from "./ui/BaseTable";

// ----- רוחבי עמודות ברירת מחדל (אותו סדר כמו headers) -----
const DEFAULT_COL_WIDTHS = [
  "13%", // שם
  "11%", // תעודת זהות
  "10%", // תפקיד
  "20%", // שם בניין
  "13%", // טלפון
  "22%", // מייל
  "12%",  // פעולות
];

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
  buildings = [], // { building_id, name, full_address }

  // 👇 חדש: מאפשר להעביר רוחבים מבחוץ; אם לא הועבר – משתמשים בברירת מחדל
  colWidths = DEFAULT_COL_WIDTHS,
}) {
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const buildingLabel = (b) => b.name || b.full_address || `בניין #${b.building_id}`;

  // מיון בניינים לפי שם להצגה נעימה ב-select
  const sortedBuildings = [...buildings].sort((a, b) =>
    (a?.name || "").localeCompare(b?.name || "", "he", { numeric: true })
  );

  return (
    <BaseTable
      headers={[
        "שם",
        "תעודת זהות",
        "תפקיד",
        "שם בניין",
        "טלפון",
        "מייל",
        "פעולות",
      ]}
      className={classes.usersTable}
      colWidths={colWidths}   // 👈 זה כל מה שנדרש כדי לשלוט ברוחבים
    >
      {users.map((user) => {
        const isEditing = editId === user.user_id;

        const idOk = (editForm?.id_number || "").length === 9;
        const phoneOk = (editForm?.phone || "").length === 10;

        // מה התפקיד כרגע בטופס (אם שינו את ה-select של התפקיד בזמן עריכה)
        const roleNow = (editForm?.role || user.role) || "";

        // דייר חייב בניין; עובד/מנהל לא
        const buildingRequired = roleNow === "tenant";
        const buildingOk = !buildingRequired || Boolean(editForm?.building_id);

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
                value={roleNow}
                onChange={handleEditChange}
              >
                <option value="manager">מנהל</option>
                <option value="worker">עובד</option>
                <option value="tenant">דייר</option>
              </select>
            </td>

            {/* שם בניין */}
            <td>
              {roleNow === "tenant" ? (
                // לדיירים – select רגיל
                (sortedBuildings.length > 0 ? (
                  <select
                    className={classes.input}
                    name="building_id"
                    value={editForm.building_id ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        building_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    required={true}
                  >
                    <option value="">בחר בניין…</option>
                    {sortedBuildings.map((b) => (
                      <option key={b.building_id} value={b.building_id}>
                        {buildingLabel(b)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={classes.input}
                    type="number"
                    name="building_id"
                    placeholder="חובה לדייר"
                    value={editForm.building_id ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        building_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    required
                  />
                ))
              ) : (
                <div className={classes.readonlyCell}>
                  {user.worker_buildings_names ||
                   user.worker_buildings_full_addresses ||
                   "—"}
                </div>
              )}
              {buildingRequired && !buildingOk && (
                <div className={classes.errorText} role="alert" aria-live="polite">
                  דייר חייב להיות משויך לבניין
                </div>
              )}
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
                    setEditForm({ ...editForm, phone: digits });
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
                  disabled={!idOk || !phoneOk || !buildingOk}
                  title={
                    !idOk || !phoneOk || !buildingOk
                      ? "ת״ז 9 ספרות, טלפון 10 ספרות, ודייר חייב בניין"
                      : "שמור"
                  }
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

            {/* תצוגה: דייר → בניין ישיר; עובד → רשימת בניינים מה-assigned_workers */}
            <td>
              {user.role === "worker"
                ? (user.worker_buildings_names || user.worker_buildings_full_addresses || "—")
                : (user.building_name || user.building_full_address || "—")}
            </td>

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
