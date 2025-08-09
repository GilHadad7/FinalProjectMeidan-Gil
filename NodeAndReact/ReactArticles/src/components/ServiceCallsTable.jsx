import React, { useEffect, useState } from "react";
import classes from "./ServiceCallsTable.module.css";

export default function ServiceCallsTable({ refreshFlag, setRefreshFlag, filters }) {
  const [calls, setCalls] = useState([]);
  const [editingCallId, setEditingCallId] = useState(null);
  const [editedStatus, setEditedStatus] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedType, setEditedType] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedCost, setEditedCost] = useState("");
  const [editedImage, setEditedImage] = useState(null);
  const [previewUrls, setPreviewUrls] = useState({});

  useEffect(() => {
    fetch("http://localhost:3000/api/service-calls")
      .then((res) => res.json())
      .then((data) => setCalls(data))
      .catch((err) => console.error("Error fetching service calls:", err));
  }, [refreshFlag]);

  const translateStatus = (status) => {
    switch (status) {
      case "Open": return "פתוח";
      case "In Progress": return "בטיפול";
      case "Closed": return "סגור";
      default: return status;
    }
  };

  const filteredCalls = calls.filter((call) => {
    if (filters.building && !call.building_address?.toLowerCase().includes(filters.building.toLowerCase())) return false;
    if (filters.status && call.status !== filters.status) return false;
    if (filters.service_type && call.service_type !== filters.service_type) return false;
    return true;
  });

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
    setEditedStatus(call.status || "");
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
    if (editedStatus === "Closed" && user?.name) {
      formData.append("closed_by", user.name);
    } else {
      formData.append("closed_by", "");
    }
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
      <h2 className={classes.title}>הקריאות שלי</h2>
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
          {filteredCalls.map((call) =>
            editingCallId === call.call_id ? (
              <tr key={call.call_id} className={classes.editRow}>
                <td>{new Date(call.created_at).toLocaleDateString("he-IL")}<br />{new Date(call.created_at).toLocaleTimeString("he-IL")}</td>
                <td>{call.created_by_name || "—"}</td>
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
                    <option value="In Progress">בטיפול</option>
                    <option value="Closed">סגור</option>
                  </select>
                </td>
                <td>{call.updated_by_name || "—"}</td>
                <td><textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className={classes.editInput} rows={3} /></td>
                <td><input type="text" value={editedLocation} onChange={(e) => setEditedLocation(e.target.value)} className={classes.editInput} /></td>
                <td><input type="number" step="1" placeholder="0" value={editedCost} onChange={(e) => setEditedCost(e.target.value)} className={classes.editInput} /></td>
                <td>
                  {previewUrls[call.call_id] && (
                    <img src={previewUrls[call.call_id]} alt="תמונה" className={classes.previewImg} onClick={() => window.open(previewUrls[call.call_id], "_blank")} />
                  )}
                  <input type="file" accept="image/*" className={classes.editInput}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setEditedImage(file);
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPreviewUrls((prev) => ({
                            ...prev,
                            [call.call_id]: reader.result,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
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
              <tr key={call.call_id}>
                <td>{new Date(call.created_at).toLocaleDateString("he-IL")}<br />{new Date(call.created_at).toLocaleTimeString("he-IL")}</td>
                <td>{call.created_by_name || "—"}</td>
                <td>{call.building_address}</td>
                <td>{call.service_type}</td>
                <td><span className={call.status === "Closed" ? classes.closedText : ""}>{translateStatus(call.status)}</span></td>
                <td>{call.updated_by_name || "—"}</td>
                <td>{call.description || "—"}</td>
                <td>{call.location_in_building || "—"}</td>
                <td>{!isNaN(parseFloat(call.cost)) ? parseFloat(call.cost).toFixed(2) : "—"}</td>
                <td>{call.image_url && (<img src={call.image_url} alt="תמונה" className={classes.previewImg} onClick={() => window.open(call.image_url, "_blank")} />)}</td>
                <td className={classes.actionsCell}>
  <div className={classes.actionsGroup}>
    <button className={classes.actionBtn} onClick={() => handleEdit(call)} title="ערוך">✏️</button>
    <button className={classes.actionBtn} onClick={() => handleDelete(call.call_id)} title="מחק">🗑️</button>
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
