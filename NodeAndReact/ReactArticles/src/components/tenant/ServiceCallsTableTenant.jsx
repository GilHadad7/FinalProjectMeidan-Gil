// src/components/tenant/ServiceCallsTableTenant.jsx
import React, { useMemo, useState } from "react";
import classes from "./ServiceCallsTableTenant.module.css";

// תרגום סטטוסים לתצוגה
function translateStatus(status) {
  const t = String(status || "").trim().toLowerCase();
  if (t === "closed" || t === "סגור") return "סגור";
  if (t === "open" || t === "פתוח") return "פתוח";
  if (t === "in progress" || t === "בטיפול") return "בטיפול";
  if (t === "pending" || t === "ממתין" || t === "awaiting" || t === "waiting") return "ממתין";
  return status || "";
}

function fmtDateTime(d) {
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString("he-IL")}‏ ${dt.toLocaleTimeString("he-IL")}`;
  } catch {
    return "—";
  }
}

/**
 * props:
 * - rows: Array<{ call_id, created_at, created_by_name?, created_by?, building_address?, building_name?, building_id?, service_type?, status?, updated_by_name?, description?, location_in_building?, cost?, image_url? }>
 * - loading?: boolean
 * - emptyText?: string
 * - allowEdit?: boolean (ברירת מחדל false)
 * - onDelete?: (call_id) => void  (לא חובה; ישמש אם allowEdit=true)
 * - onSave?: (call_id, payload|FormData) => Promise<void>  (לא חובה; אם תרצה בעתיד)
 */
export default function ServiceCallsTableTenant({
  rows = [],
  loading = false,
  emptyText = "אין קריאות",
  allowEdit = false,
  onDelete,
  onSave,
}) {
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  // מצבי עריכה (בשימוש רק אם allowEdit=true)
  const [editingId, setEditingId] = useState(null);
  const [edited, setEdited] = useState({
    status: "",
    description: "",
    service_type: "",
    location_in_building: "",
    cost: "",
    image: null,
    preview: null,
  });

  const startEdit = (call) => {
    setEditingId(call.call_id);
    setEdited({
      status: call.status || "",
      description: call.description || "",
      service_type: call.service_type || "",
      location_in_building: call.location_in_building || "",
      cost: call.cost != null ? String(call.cost) : "",
      image: null,
      preview: call.image_url || null,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdited({
      status: "",
      description: "",
      service_type: "",
      location_in_building: "",
      cost: "",
      image: null,
      preview: null,
    });
  };

  const saveEdit = async (call_id) => {
    if (!onSave) return cancelEdit();
    const formData = new FormData();
    formData.append("status", edited.status);
    formData.append("description", edited.description);
    formData.append("service_type", edited.service_type);
    formData.append("location_in_building", edited.location_in_building);
    if (edited.cost !== "") formData.append("cost", edited.cost);
    if (edited.image) formData.append("image", edited.image);
    await onSave(call_id, formData);
    cancelEdit();
  };

  return (
    <div className={classes.wrapper}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>תאריך</th>
            <th>משתמש שפתח</th>
            <th>כתובת בניין</th>
            <th>סוג תקלה</th>
            <th>סטטוס</th>
            <th>בוצע על ידי</th>
            <th>תיאור</th>
            <th>מיקום</th>
            <th>עלות (₪)</th>
            <th>תמונה</th>
            {allowEdit && <th>פעולות</th>}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={allowEdit ? 11 : 10} className={classes.empty}>
                טוען…
              </td>
            </tr>
          ) : safeRows.length === 0 ? (
            <tr>
              <td colSpan={allowEdit ? 11 : 10} className={classes.empty}>
                {emptyText}
              </td>
            </tr>
          ) : (
            safeRows.map((call, idx) =>
              editingId === call.call_id && allowEdit ? (
                <tr key={call?.call_id ?? idx} className={classes.editRow}>
                  <td>{fmtDateTime(call?.created_at)}</td>
                  <td>{call?.created_by_name || call?.created_by || "—"}</td>
                  <td>{call?.building_address || call?.building_name || call?.building_id || "—"}</td>
                  <td>
                    <select
                      value={edited.service_type}
                      onChange={(e) => setEdited((p) => ({ ...p, service_type: e.target.value }))}
                      className={classes.editInput}
                    >
                      <option value="">בחר</option>
                      <option value="חשמל">חשמל</option>
                      <option value="נזילה">נזילה</option>
                      <option value="תקלה טכנית">תקלה טכנית</option>
                      <option value="אינסטלציה">אינסטלציה</option>
                      <option value="נזק">נזק</option>
                      <option value="אחר">אחר</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={edited.status}
                      onChange={(e) => setEdited((p) => ({ ...p, status: e.target.value }))}
                      className={classes.editInput}
                    >
                      <option value="Open">פתוח</option>
                      <option value="Closed">סגור</option>
                    </select>
                  </td>
                  <td>{call?.updated_by_name || "—"}</td>
                  <td>
                    <textarea
                      rows={3}
                      value={edited.description}
                      onChange={(e) => setEdited((p) => ({ ...p, description: e.target.value }))}
                      className={classes.editInput}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edited.location_in_building}
                      onChange={(e) =>
                        setEdited((p) => ({ ...p, location_in_building: e.target.value }))
                      }
                      className={classes.editInput}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      value={edited.cost}
                      onChange={(e) => setEdited((p) => ({ ...p, cost: e.target.value }))}
                      className={classes.editInput}
                      placeholder="0"
                    />
                  </td>
                  <td>
                    {edited.preview && (
                      <img
                        src={edited.preview}
                        alt="תמונה"
                        className={classes.previewImg}
                        onClick={() => window.open(edited.preview, "_blank")}
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className={classes.editInput}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setEdited((p) => ({ ...p, image: file }));
                        if (file) {
                          const r = new FileReader();
                          r.onloadend = () => setEdited((p) => ({ ...p, preview: r.result }));
                          r.readAsDataURL(file);
                        }
                      }}
                    />
                  </td>
                  <td className={classes.actionsEditModeCell}>
                    <button className={`${classes.actionBtnEditMode} ${classes.saveBtn}`} onClick={() => saveEdit(call.call_id)} title="שמור">💾</button>
                    <button className={`${classes.actionBtnEditMode} ${classes.cancelBtn}`} onClick={cancelEdit} title="ביטול">❌</button>
                  </td>
                </tr>
              ) : (
                <tr key={call?.call_id ?? idx}>
                  <td>{fmtDateTime(call?.created_at)}</td>
                  <td>{call?.created_by_name || call?.created_by || "—"}</td>
                  <td>{call?.building_address || call?.building_name || call?.building_id || "—"}</td>
                  <td>{call?.service_type || "—"}</td>
                  <td>
                    <span className={call?.status === "Closed" ? classes.closedText : ""}>
                      {translateStatus(call?.status)}
                    </span>
                  </td>
                  <td>{call?.updated_by_name || "—"}</td>
                  <td>{call?.description || "—"}</td>
                  <td>{call?.location_in_building || "—"}</td>
                  <td>
                    {!isNaN(parseFloat(call?.cost)) ? Number(call.cost).toFixed(2) : "—"}
                  </td>
                  <td>
                    {call?.image_url && (
                      <img
                        src={call.image_url}
                        alt="תמונה"
                        className={classes.previewImg}
                        onClick={() => window.open(call.image_url, "_blank")}
                      />
                    )}
                  </td>
                  {allowEdit && (
                    <td className={classes.actionsCell}>
                      <div className={classes.actionsGroup}>
                        <button className={classes.actionBtn} onClick={() => startEdit(call)} title="ערוך">✏️</button>
                        <button
                          className={classes.actionBtn}
                          onClick={() => onDelete && onDelete(call.call_id)}
                          title="מחק"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            ))
          }
        </tbody>
      </table>
    </div>
  );
}
