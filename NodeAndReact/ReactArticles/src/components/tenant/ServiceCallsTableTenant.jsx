import React, { useMemo, useState, useEffect, useCallback } from "react";
import classes from "./ServiceCallsTableTenant.module.css";

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
    const dateStr = dt.toLocaleDateString("he-IL");
    const timeStr = dt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    return (
      <span className={classes.dateWrap}>
        <span className={classes.dateLine}>{dateStr}</span>
        <br />
        <span className={classes.timeLine}>{timeStr}</span>
      </span>
    );
  } catch {
    return "—";
  }
}

function getBuildingId() {
  try {
    const s = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (s?.building_id) return Number(s.building_id);
    if (s?.tenant?.building_id) return Number(s.tenant.building_id);
  } catch {}
  const qs = new URLSearchParams(window.location.search);
  const q = qs.get("building_id") || qs.get("buildingId");
  return q ? Number(q) : null;
}

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8801";

const norm = (s) => String(s || "").trim().toLowerCase();
function useCurrentUser() {
  return useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
}
function useIsOwner(currentUser) {
  return useCallback(
    (call) => {
      const uName = norm(currentUser?.name);
      const uEmail = norm(currentUser?.email);
      const byName = norm(call?.created_by_name || call?.created_by);
      const byEmail = norm(call?.created_by_email || "");
      if (uName && byName && uName === byName) return true;
      if (uEmail && byEmail && uEmail === byEmail) return true;
      return false;
    },
    [currentUser]
  );
}

export default function ServiceCallsTableTenant({
  rows = [],
  loading = false,
  emptyText = "אין קריאות",
  allowEdit = true,
  onDelete,
  // ריענון מבחוץ כאשר rows מגיעים בפרופס
  onAfterSave,
  onAfterDelete,
}) {
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  const rowsProvided = safeRows.length > 0;
  const [selfRows, setSelfRows] = useState([]);
  const [selfLoading, setSelfLoading] = useState(false);

  const isLoading = rowsProvided ? loading : selfLoading;
  const displayRows = rowsProvided ? safeRows : selfRows;

  const currentUser = useCurrentUser();
  const isOwner = useIsOwner(currentUser);

  const refresh = useCallback(async () => {
    if (rowsProvided) return; // כשמגיע rows מבחוץ, רענון יתבצע דרך onAfterSave/onAfterDelete בדף ההורה
    const buildingId = getBuildingId();
    if (!buildingId) {
      setSelfRows([]);
      return;
    }
    setSelfLoading(true);
    try {
      const url = `${API_BASE}/api/service-calls/by-building?building_id=${encodeURIComponent(
        buildingId
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      setSelfRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("שגיאה בטעינת קריאות שירות לדייר:", e);
      setSelfRows([]);
    } finally {
      setSelfLoading(false);
    }
  }, [rowsProvided]);

  useEffect(() => {
    if (!rowsProvided) refresh();
  }, [rowsProvided, refresh]);

  // מצב עריכה — רק השדות שציינת
  const [editingId, setEditingId] = useState(null);
  const [edited, setEdited] = useState({
    description: "",
    service_type: "",
    location_in_building: "",
    image: null,
    preview: null,
  });
  const [saving, setSaving] = useState(false);

  const startEdit = (call) => {
    if (!allowEdit || !isOwner(call)) return;
    setEditingId(call.call_id);
    setEdited({
      description: call.description || "",
      service_type: call.service_type || "",
      location_in_building: call.location_in_building || "",
      image: null,
      preview: call.image_url || null,
    });
  };

  const cancelEdit = () => {
    if (saving) return;
    setEditingId(null);
    setEdited({
      description: "",
      service_type: "",
      location_in_building: "",
      image: null,
      preview: null,
    });
  };

  // שומר רק: service_type, description, location_in_building, image
  const saveEdit = async (call_id) => {
    const fd = new FormData();
    fd.append("service_type", edited.service_type);
    fd.append("description", edited.description);
    fd.append("location_in_building", edited.location_in_building);
    if (edited.image) fd.append("image", edited.image);

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/service-calls/${call_id}`, {
        method: "PUT",
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("PUT failed:", res.status, t);
        alert("שמירה נכשלה");
        return;
      }

      if (rowsProvided) {
        onAfterSave?.();
      } else {
        await refresh();
      }
      cancelEdit();
    } catch (e) {
      console.error("שמירת קריאה נכשלה:", e);
      alert("שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (call_id, call) => {
      if (!isOwner(call)) return;
      try {
        const res = await fetch(`${API_BASE}/api/service-calls/${call_id}`, { method: "DELETE" });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.error("DELETE failed:", res.status, t);
          alert("מחיקה נכשלה");
          return;
        }
        if (rowsProvided) {
          onAfterDelete?.();
        } else {
          await refresh();
        }
      } catch (e) {
        console.error("מחיקת קריאה נכשלה:", e);
        alert("מחיקה נכשלה");
      }
    },
    [refresh, isOwner, rowsProvided, onAfterDelete]
  );

  const COLSPAN = 10;

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
            <th>תמונה</th>
            <th>פעולות</th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={COLSPAN} className={classes.empty}>טוען…</td>
            </tr>
          ) : displayRows.length === 0 ? (
            <tr>
              <td colSpan={COLSPAN} className={classes.empty}>{emptyText}</td>
            </tr>
          ) : (
            displayRows.map((call, idx) =>
              editingId === call.call_id && allowEdit && isOwner(call) ? (
                <tr key={call?.call_id ?? idx} className={classes.editRow}>
                  {/* לקריאה בלבד */}
                  <td>{fmtDateTime(call?.created_at)}</td>
                  <td>{call?.created_by_name || call?.created_by || "—"}</td>
                  <td>{call?.building_address || call?.building_name || call?.building_id || "—"}</td>

                  {/* עריכה: סוג תקלה */}
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

                  {/* סטטוס – לקריאה בלבד */}
                  <td>
                    <span className={call?.status === "Closed" ? classes.closedText : ""}>
                      {translateStatus(call?.status)}
                    </span>
                  </td>

                  {/* בוצע ע״י – לקריאה בלבד */}
                  <td>{call?.updated_by_name || "—"}</td>

                  {/* עריכה: תיאור */}
                  <td>
                    <textarea
                      rows={3}
                      value={edited.description}
                      onChange={(e) => setEdited((p) => ({ ...p, description: e.target.value }))}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className={classes.editInput}
                    />
                  </td>

                  {/* עריכה: מיקום */}
                  <td>
                    <input
                      type="text"
                      value={edited.location_in_building}
                      onChange={(e) =>
                        setEdited((p) => ({ ...p, location_in_building: e.target.value }))
                      }
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className={classes.editInput}
                    />
                  </td>

                  {/* עריכה: תמונה */}
                  <td className={classes.imageCell}>
                    {edited.preview && (
                      <div
                        className={classes.thumbBox}
                        onClick={() => window.open(edited.preview, "_blank")}
                        title="פתח תמונה"
                      >
                        <img src={edited.preview} alt="תמונה" className={classes.thumbImg} />
                      </div>
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

                  {/* פעולות */}
                  <td className={classes.actionsEditModeCell}>
                    <button
                      className={`${classes.actionBtnEditMode} ${classes.saveBtn}`}
                      onClick={() => saveEdit(call.call_id)}
                      title="שמור"
                      disabled={saving}
                    >
                      💾
                    </button>
                    <button
                      className={`${classes.actionBtnEditMode} ${classes.cancelBtn}`}
                      onClick={cancelEdit}
                      title="ביטול"
                      disabled={saving}
                    >
                      ❌
                    </button>
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
                  <td className={classes.imageCell}>
                    {call?.image_url && (
                      <div
                        className={classes.thumbBox}
                        onClick={() => window.open(call.image_url, "_blank")}
                        title="פתח תמונה"
                      >
                        <img src={call.image_url} alt="תמונה" className={classes.thumbImg} />
                      </div>
                    )}
                  </td>
                  <td className={classes.actionsCell}>
                    <div className={classes.actionsGroup}>
                      {allowEdit && isOwner(call) && (
                        <>
                          <button
                            className={classes.actionBtn}
                            onClick={() => startEdit(call)}
                            title="ערוך"
                          >
                            ✏️
                          </button>
                          <button
                            className={classes.actionBtn}
                            onClick={() => handleDelete(call.call_id, call)}
                            title="מחק"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            ))
          }
        </tbody>
      </table>
    </div>
  );
}
