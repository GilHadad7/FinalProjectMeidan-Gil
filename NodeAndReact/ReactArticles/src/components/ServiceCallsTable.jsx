// src/components/ServiceCallsTable.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import classes from "./ServiceCallsTable.module.css";

export default function ServiceCallsTable({
  refreshFlag,
  setRefreshFlag,
  filters,
  role,
  highlightId, // מזהה לשורה להדגשה (מועבר מהדף)
}) {
  const [calls, setCalls] = useState([]);
  const [editingCallId, setEditingCallId] = useState(null);
  const [editedStatus, setEditedStatus] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedType, setEditedType] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedCost, setEditedCost] = useState("");
  const [editedImage, setEditedImage] = useState(null);
  const [previewUrls, setPreviewUrls] = useState({});

  // נשתמש ב־ref כדי להריץ הדגשה פעם אחת לכל highlightId
  const highlightedOnceRef = useRef(null);

  function uniqueById(arr) {
    const map = new Map();
    for (const item of (Array.isArray(arr) ? arr : [])) {
      const key = item.call_id;
      const curTS = new Date(item.updated_at || item.created_at || 0).getTime();
      if (!map.has(key)) map.set(key, { item, ts: curTS });
      else if (curTS > map.get(key).ts) map.set(key, { item, ts: curTS });
    }
    return Array.from(map.values()).map((v) => v.item);
  }

  function translateStatus(status) {
    switch (status) {
      case "Open": return "פתוח";
      case "In Progress": return "בטיפול";
      case "Closed": return "סגור";
      default: return status;
    }
  }

  // ----- עזר: קריאת תאריך מהשדה created_at בפורמטים נפוצים -----
  function getRowDate(row) {
    const v = row?.created_at;
    if (!v) return new Date(0);
    const s = String(v).trim();
    // תומך גם ב-"YYYY-MM-DD HH:MM:SS"
    return new Date(s.includes(" ") ? s.replace(" ", "T") : s);
  }

  useEffect(() => {
    const ac = new AbortController();
    fetch("http://localhost:3000/api/service-calls", { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        const deduped = uniqueById(data).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setCalls(deduped);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Error fetching service calls:", err);
      });
    return () => ac.abort();
  }, [refreshFlag]);

  const filteredCalls = useMemo(() => {
    const q = (filters.building || "").toString().trim().toLowerCase();
    const statusFilter = filters.status;
    const typeFilter   = filters.service_type;

    return calls.filter((call) => {
      if (q) {
        const haystacks = [
          call.building_address,
          call.service_type,
          call.created_by_name,
          call.created_by,
          call.description,
          call.location_in_building,
        ].filter(Boolean).map((s) => s.toString().toLowerCase());
        if (!haystacks.some((h) => h.includes(q))) return false;
      }
      if (statusFilter && call.status !== statusFilter) return false;
      if (typeFilter && call.service_type !== typeFilter) return false;
      return true;
    });
  }, [calls, filters]);

  // ----- מיון: פתוחים קודם (קרוב להיום למעלה = חדש->ישן), אחר כך סגורים (חדש->ישן) -----
  const sortedCalls = useMemo(() => {
    const list = [...filteredCalls];
    list.sort((a, b) => {
      const aClosed = a.status === "Closed" || a.status === "סגור";
      const bClosed = b.status === "Closed" || b.status === "סגור";
      if (aClosed !== bClosed) {
        // פתוחים (false) לפני סגורים (true)
        return aClosed - bClosed;
      }
      const da = getRowDate(a);
      const db = getRowDate(b);
      // גם בפתוחים וגם בסגורים: חדש -> ישן
      return db - da;
    });
    return list;
  }, [filteredCalls]);

  // === הדגשה/גלילה לשורה: אפור בהיר (#f3f4f6), נמשכת 10 שניות, פעם אחת בלבד לכל highlightId ===
  useEffect(() => {
    if (!highlightId) return;
    // אל תרוץ שוב אם כבר הדגשנו את אותו מזהה
    if (highlightedOnceRef.current === highlightId) return;

    const esc = (s) =>
      (window.CSS && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/"/g, '\\"');

    let tries = 0;
    const tick = () => {
      const row = document.querySelector(`[data-row-id="${esc(highlightId)}"]`);
      if (row) {
        highlightedOnceRef.current = highlightId; // סומן כבוצע
        row.scrollIntoView({ behavior: "smooth", block: "center" });

        const targets = [row, ...Array.from(row.querySelectorAll("td"))];
        const prev = targets.map((el) => ({
          el,
          bg: el.style.background,
          bgc: el.style.backgroundColor,
          bgi: el.style.backgroundImage,
          box: el.style.boxShadow,
          tr: el.style.transition,
        }));

        for (const t of targets) {
          t.style.setProperty("transition", "background-color 0.25s ease");
          t.style.setProperty("background-color", "#f3f4f6", "important"); // אפור בהיר
          t.style.setProperty("background-image", "none", "important");
          t.style.setProperty("box-shadow", "none", "important");
        }

        setTimeout(() => {
          for (const p of prev) {
            if (p.bg) p.el.style.background = p.bg; else p.el.style.removeProperty("background");
            if (p.bgc) p.el.style.backgroundColor = p.bgc; else p.el.style.removeProperty("background-color");
            if (p.bgi) p.el.style.backgroundImage = p.bgi; else p.el.style.removeProperty("background-image");
            if (p.box) p.el.style.boxShadow = p.box; else p.el.style.removeProperty("box-shadow");
            if (p.tr) p.el.style.transition = p.tr; else p.el.style.removeProperty("transition");
          }
        }, 10000); // 10 שניות

        return;
      }
      if (tries++ < 25) setTimeout(tick, 150);
    };

    tick();
  }, [highlightId, filteredCalls.length]);

  const handleDelete = async (callId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את הקריאה?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/service-calls/${callId}`, { method: "DELETE" });
      if (res.ok) setCalls((prev) => prev.filter((c) => c.call_id !== callId));
    } catch (err) {
      console.error(err);
      alert("שגיאה במחיקה");
    }
  };

  const handleEdit = (call) => {
    setEditingCallId(call.call_id);
    setEditedStatus(call.status === "In Progress" ? "Open" : (call.status || ""));
    setEditedDescription(call.description || "");
    setEditedType(call.service_type || "");
    setEditedLocation(call.location_in_building || "");
    setEditedCost(call.cost != null ? String(call.cost) : "");
    setEditedImage(null);
    setPreviewUrls((prev) => ({ ...prev, [call.call_id]: call.image_url || null }));
  };

  const handleSave = async (callId) => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const formData = new FormData();
    formData.append("status", editedStatus);
    formData.append("description", editedDescription);
    formData.append("service_type", editedType);
    formData.append("location_in_building", editedLocation);
    if (editedCost !== "") formData.append("cost", editedCost);
    if (editedStatus === "Closed" && user?.name) formData.append("closed_by", user.name);
    else formData.append("closed_by", "");
    if (editedImage) formData.append("image", editedImage);

    try {
      const res = await fetch(`http://localhost:3000/api/service-calls/${callId}`, {
        method: "PUT",
        body: formData,
      });
      if (res.ok) {
        setEditingCallId(null);
        setRefreshFlag((prev) => !prev);
      } else {
        alert("שגיאה בעדכון הקריאה");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאה בשרת");
    }
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
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {sortedCalls.map((call) =>
            editingCallId === call.call_id ? (
              <tr key={call.call_id} data-row-id={String(call.call_id)} className={classes.editRow}>
                <td>{new Date(call.created_at).toLocaleDateString("he-IL")}<br />{new Date(call.created_at).toLocaleTimeString("he-IL")}</td>
                <td>{call.created_by_name || call.created_by || "—"}</td>
                <td>{call.building_address}</td>
                <td>
                  <select value={editedType} onChange={(e) => setEditedType(e.target.value)} className={classes.editInput}>
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
                  <select value={editedStatus} onChange={(e) => setEditedStatus(e.target.value)} className={classes.editInput}>
                    <option value="Open">פתוח</option>
                    <option value="Closed">סגור</option>
                  </select>
                </td>
                <td>{call.updated_by_name || "—"}</td>
                <td>
                  <textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className={classes.editInput} rows={3} />
                </td>
                <td>
                  <input type="text" value={editedLocation} onChange={(e) => setEditedLocation(e.target.value)} className={classes.editInput} />
                </td>
                <td>
                  <input type="number" step="1" placeholder="0" value={editedCost} onChange={(e) => setEditedCost(e.target.value)} className={classes.editInput} />
                </td>
                <td>
                  {previewUrls[call.call_id] && (
                    <img
                      src={previewUrls[call.call_id]}
                      alt="תמונה"
                      className={classes.previewImg}
                      onClick={() => window.open(previewUrls[call.call_id], "_blank")}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className={classes.editInput}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setEditedImage(file || null);
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPreviewUrls((prev) => ({ ...prev, [call.call_id]: reader.result }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </td>
                <td className={classes.actionsEditModeCell}>
                  <button
                    className={`${classes.actionBtnEditMode} ${classes.saveBtn}`}
                    onClick={() => handleSave(call.call_id)}
                    title="שמור"
                  >
                    💾
                  </button>
                  <button
                    className={`${classes.actionBtnEditMode} ${classes.cancelBtn}`}
                    onClick={() => setEditingCallId(null)}
                    title="ביטול"
                  >
                    ❌
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={call.call_id} data-row-id={String(call.call_id)}>
                <td>{new Date(call.created_at).toLocaleDateString("he-IL")}<br />{new Date(call.created_at).toLocaleTimeString("he-IL")}</td>
                <td>{call.created_by_name || call.created_by || "—"}</td>
                <td>{call.building_address}</td>
                <td>{call.service_type}</td>
                <td>
                  <span className={call.status === "Closed" ? classes.closedText : ""}>
                    {translateStatus(call.status)}
                  </span>
                </td>
                <td>{call.updated_by_name || "—"}</td>
                <td>{call.description || "—"}</td>
                <td>{call.location_in_building || "—"}</td>
                <td>{!isNaN(parseFloat(call.cost)) ? parseFloat(call.cost).toFixed(2) : "—"}</td>
                <td>
                  {call.image_url && (
                    <img
                      src={call.image_url}
                      alt="תמונה"
                      className={classes.previewImg}
                      onClick={() => window.open(call.image_url, "_blank")}
                    />
                  )}
                </td>
                <td className={classes.actionsCell}>
                  <div className={classes.actionsGroup}>
                    <button
                      className={classes.actionBtn}
                      onClick={() => handleEdit(call)}
                      title="ערוך"
                    >
                      ✏️
                    </button>
                    <button
                      className={classes.actionBtn}
                      onClick={() => handleDelete(call.call_id)}
                      title="מחק"
                    >
                      🗑️
                    </button>
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
