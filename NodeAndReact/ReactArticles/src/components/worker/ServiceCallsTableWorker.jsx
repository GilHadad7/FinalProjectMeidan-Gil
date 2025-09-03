import React, { useMemo, useState, useEffect, useCallback } from "react";
import classes from "./ServiceCallsTableWorker.module.css";

/* ---------- תרגום סטטוס להצגה ---------- */
function translateStatus(status) {
  const t = String(status || "").trim().toLowerCase();
  if (t === "closed" || t === "סגור") return "סגור";
  if (t === "open" || t === "פתוח") return "פתוח";
  return status || "";
}

/* ---------- סטטוסים נתמכים (שרת באנגלית) ---------- */
const STATUS_LABELS_HEB = { Open: "פתוח", Closed: "סגור" };
const STATUS_OPTIONS = ["Open", "Closed"];
function toEngStatus(s) {
  const t = String(s || "").trim().toLowerCase();
  return t === "סגור" || t === "closed" ? "Closed" : "Open";
}

/* ---------- עזרי תצוגת תאריך ---------- */
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

/* ---------- מאתר בניין (fallback לפיתוח) ---------- */
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

/* ---------- בסיס API ---------- */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8801";

/* ---------- זיהוי משתמש + הרשאות מקומי ---------- */
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

export default function ServiceCallsTableWorker({
  rows = [],
  loading = false,
  emptyText = "אין קריאות",
  allowEdit = true,
  onDelete,
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

  // עובד/מנהל/אדמין יכולים לערוך; דייר – רק אם היוצר
  const userRole = String(currentUser?.role || currentUser?.position || "").trim().toLowerCase();
  const canEdit = useCallback(
    (call) => (["worker", "manager", "admin"].includes(userRole) ? true : isOwner(call)),
    [userRole, isOwner]
  );

  /* ---------- רענון נתונים מהראוט של עובד ---------- */
  const refresh = useCallback(async () => {
    if (rowsProvided) return;
    const buildingId = getBuildingId();
    if (!buildingId) {
      setSelfRows([]);
      return;
    }
    setSelfLoading(true);
    try {
      const url = `${API_BASE}/api/worker/service-calls/by-building?building_id=${encodeURIComponent(
        buildingId
      )}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      setSelfRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("שגיאה בטעינת קריאות שירות:", e);
      setSelfRows([]);
    } finally {
      setSelfLoading(false);
    }
  }, [rowsProvided]);

  useEffect(() => {
    if (!rowsProvided) refresh();
  }, [rowsProvided, refresh]);

  /* ---------- מיון: פתוחים קודם, סגורים מהחדש לישן ---------- */
  const sortedRows = useMemo(() => {
    const now = Date.now();
    const isClosed = (s) => {
      const t = String(s || "").toLowerCase();
      return t === "closed" || t === "סגור";
    };
    const open = [];
    const closed = [];
    for (const c of displayRows) (isClosed(c?.status) ? closed : open).push(c);

    open.sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      const da = Math.abs(ta - now);
      const db = Math.abs(tb - now);
      if (da !== db) return da - db;
      return tb - ta;
    });
    closed.sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta;
    });
    return [...open, ...closed];
  }, [displayRows]);

  /* ---------- מצב עריכה ---------- */
  const [editingId, setEditingId] = useState(null);
  const [edited, setEdited] = useState({
    description: "",
    service_type: "",
    location_in_building: "",
    image: null,
    preview: null,
    status: "Open",
    original_status: "Open",
  });
  const [saving, setSaving] = useState(false);

  const startEdit = (call) => {
    if (!allowEdit || !canEdit(call)) return;
    const s = toEngStatus(call?.status);
    setEditingId(call.call_id);
    setEdited({
      description: call.description || "",
      service_type: call.service_type || "",
      location_in_building: call.location_in_building || "",
      image: null,
      preview: call.image_url || null,
      status: s,
      original_status: s,
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
      status: "Open",
      original_status: "Open",
    });
  };

  /* ---------- שמירה דו-שלבית ----------
     1) PUT לשדות (סוג/תיאור/מיקום/תמונה)
     2) אם הסטטוס השתנה – PATCH סטטוס (עם building_id) שיכתוב closed_by
  -------------------------------------- */
  const saveEdit = async (call_id) => {
    const fd = new FormData();
    fd.append("service_type", edited.service_type);
    fd.append("description", edited.description);
    fd.append("location_in_building", edited.location_in_building);
    fd.append("status", edited.status); // לא נסמוך עליו בשביל closed_by
    if (edited.image) fd.append("image", edited.image);

    const statusChanged = edited.status !== edited.original_status;
    const buildingId = getBuildingId();

    try {
      setSaving(true);

      // 1) PUT – עדכון פריטי הקריאה
      const putRes = await fetch(`${API_BASE}/api/service-calls/${call_id}`, {
        method: "PUT",
        body: fd,
        credentials: "include",
      });
      if (!putRes.ok) {
        const t = await putRes.text().catch(() => "");
        console.error("PUT failed:", putRes.status, t);
        alert("שמירה נכשלה");
        return;
      }

      // 2) PATCH – עדכון סטטוס + closed_by (מחייב building_id בצד שרת)
      if (statusChanged) {
        const base = `${API_BASE}/api/worker/service-calls/${call_id}/status`;
        const patchUrl = buildingId ? `${base}?building_id=${encodeURIComponent(buildingId)}` : base;

        const patchRes = await fetch(patchUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            status: edited.status,
            closed_by: edited.status === "Closed" ? currentUser?.name || null : null,
          }),
        });
        if (!patchRes.ok) {
          const t = await patchRes.text().catch(() => "");
          console.error("PATCH status failed:", patchRes.status, t);
          alert("עדכון סטטוס נכשל");
          return;
        }
      }

      if (rowsProvided) onAfterSave?.();
      else await refresh();
      cancelEdit();
    } catch (e) {
      console.error("שמירת קריאה נכשלה:", e);
      alert("שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- מחיקה ---------- */
  const handleDelete = useCallback(
    async (call_id, call) => {
      if (!isOwner(call)) return;
      try {
        const res = await fetch(`${API_BASE}/api/service-calls/${call_id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.error("DELETE failed:", res.status, t);
          alert("מחיקה נכשלה");
          return;
        }
        if (rowsProvided) onAfterDelete?.();
        else await refresh();
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
          {isLoading && (
            <tr>
              <td colSpan={COLSPAN} className={classes.empty}>טוען…</td>
            </tr>
          )}

          {!isLoading && sortedRows.length === 0 && (
            <tr>
              <td colSpan={COLSPAN} className={classes.empty}>{emptyText}</td>
            </tr>
          )}

          {!isLoading &&
            sortedRows.length > 0 &&
            sortedRows.map((call, idx) =>
              editingId === call.call_id && allowEdit && canEdit(call) ? (
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

                  {/* עריכה: סטטוס */}
                  <td>
                    <select
                      value={edited.status}
                      onChange={(e) => setEdited((p) => ({ ...p, status: e.target.value }))}
                      className={classes.editInput}
                      title="בחר סטטוס"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {STATUS_LABELS_HEB[opt]}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* בוצע ע״י – בזמן עריכה מציגים את העובד אם נבחר 'סגור' */}
                  <td>
                    {edited.status === "Closed"
                      ? (currentUser?.name || "—")
                      : (call?.updated_by_name || call?.closed_by || "—")}
                  </td>

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
                      onChange={(e) => setEdited((p) => ({ ...p, location_in_building: e.target.value }))}
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
                  <td>{call?.updated_by_name || call?.closed_by || "—"}</td>
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
                      {allowEdit && canEdit(call) && (
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
            )}
        </tbody>
      </table>
    </div>
  );
}
