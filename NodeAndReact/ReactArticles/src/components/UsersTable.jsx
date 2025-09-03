import React from "react";
import classes from "./UsersTable.module.css";
import BaseTable from "./ui/BaseTable";

// רוחבי עמודות
const DEFAULT_COL_WIDTHS = ["13%","11%","10%","20%","13%","22%","12%"];

// תרגום תפקיד
const roleHe = (en) => {
  switch (en) {
    case "manager": return "מנהל";
    case "worker":  return "עובד";
    case "tenant":  return "דייר";
    default:        return en || "";
  }
};

// תרגום משרות (position)
const POSITION_HE = {
  super: "אב בית",
  cleaner: "מנקה",
  electrician: "חשמלאי",
  plumber: "אינסטלטור",
  maintenance: "אחזקה",
  security: "אבטחה",
  gardener: "גנן",
  hvac: "טכנאי מיזוג",
  painter: "צבעי",
  other: "אחר",
};
const POSITIONS_LIST = [
  "super","cleaner","electrician","plumber","maintenance",
  "security","gardener","hvac","painter","other"
];

const heRoleOrPosition = (u) => {
  if (String(u?.role).toLowerCase() === "worker") {
    const k = String(u?.position || "").toLowerCase();
    return POSITION_HE[k] || "עובד";
  }
  return roleHe(u?.role);
};

// טלפון ישראלי
const TWO_DIGIT_AREA = new Set(["02","03","04","08","09"]);
const detectPrefixLen = (digits) => {
  if (!digits || digits[0] !== "0" || digits.length < 2) return 3;
  const two = digits.slice(0, 2);
  if (TWO_DIGIT_AREA.has(two)) return 2;
  if (digits[1] === "5" || digits[1] === "7") return 3;
  return 3;
};
const formatILPhone10 = (raw) => {
  const only = (raw || "").replace(/\D/g, "");
  if (!only) return "";
  const clipped = only.slice(0, 10);
  const pl = detectPrefixLen(clipped);
  return clipped.length <= pl ? clipped : `${clipped.slice(0, pl)}-${clipped.slice(pl)}`;
};

export default function UsersTable({
  users,
  editId,
  setEditId,
  editForm,
  setEditForm,
  onDelete,
  onEditSave,
  buildings = [],
  colWidths = DEFAULT_COL_WIDTHS,
}) {
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const buildingLabel = (b) => b.name || b.full_address || `בניין #${b.building_id}`;
  const sortedBuildings = [...buildings].sort((a, b) =>
    (a?.name || "").localeCompare(b?.name || "", "he", { numeric: true })
  );

  return (
    <BaseTable
      headers={["שם","תעודת זהות","תפקיד","שם בניין","טלפון","מייל","פעולות"]}
      className={classes.usersTable}
      colWidths={colWidths}
    >
      {users.map((user) => {
        const isEditing = editId === user.user_id;
        const idOk = (editForm?.id_number || "").length === 9;
        const phoneOk = (editForm?.phone || "").length === 10;
        const roleNow = (editForm?.role || user.role) || "";
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

            {/* ת"ז */}
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
                />
                {!idOk && <div className={classes.errorText}>תעודת זהות חייבת להכיל 9 ספרות</div>}
              </div>
            </td>

            {/* תפקיד + משרה לעובד */}
            <td>
              <div style={{ display:"grid", gap: 6 }}>
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

                {roleNow === "worker" && (
                  <select
                    className={classes.input}
                    name="position"
                    value={editForm.position ?? (user.position || "")}
                    onChange={handleEditChange}
                  >
                    <option value="">בחר משרה…</option>
                    {POSITIONS_LIST.map((p) => (
                      <option key={p} value={p}>{POSITION_HE[p]}</option>
                    ))}
                  </select>
                )}
              </div>
            </td>

            {/* שם בניין */}
            <td>
              {roleNow === "tenant" ? (
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
                    required
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
                <div className={classes.errorText}>דייר חייב להיות משויך לבניין</div>
              )}
            </td>

            {/* טלפון */}
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
                />
                {!phoneOk && (
                  <div className={classes.errorText} dir="rtl">
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

            {/* כאן מציגים משרה לעובד */}
            <td>{heRoleOrPosition(user)}</td>

            {/* דייר → בניין; עובד → רשימת בניינים שהוקצו לו */}
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
