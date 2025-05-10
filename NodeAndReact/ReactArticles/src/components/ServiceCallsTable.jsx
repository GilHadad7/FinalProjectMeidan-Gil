import React, { useEffect, useState } from "react";
import classes from "./ServiceCallsTable.module.css";

export default function ServiceCallsTable({ refreshFlag, setRefreshFlag }) {
  const [calls, setCalls] = useState([]);
  const [editingCallId, setEditingCallId] = useState(null);
  const [editedStatus, setEditedStatus] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedType, setEditedType] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedImage, setEditedImage] = useState(null);
  const [previewUrls, setPreviewUrls] = useState({});

  useEffect(() => {
    fetch("http://localhost:3000/api/service-calls")
      .then((res) => res.json())
      .then((data) => setCalls(data))
      .catch((err) => console.error("Error fetching service calls:", err));
  }, [refreshFlag]);

  const handleDelete = async (callId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את הקריאה?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/service-calls/${callId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("הקריאה נמחקה");
        setCalls(calls.filter((c) => c.call_id !== callId));
      } else {
        alert("שגיאה במחיקה");
      }
    } catch (err) {
      console.error("שגיאה במחיקה:", err);
      alert("שגיאה בשרת");
    }
  };

  const handleEdit = (call) => {
    setEditingCallId(call.call_id);
    setEditedStatus(call.status || "");
    setEditedDescription(call.description || "");
    setEditedType(call.service_type || "");
    setEditedLocation(call.location_in_building || "");
    setEditedImage(null);
    setPreviewUrls((prev) => ({ ...prev, [call.call_id]: call.image_url || null }));
  };

  const handleSave = async (callId) => {
    const formData = new FormData();
    formData.append("status", editedStatus);
    formData.append("description", editedDescription);
    formData.append("service_type", editedType);
    formData.append("location_in_building", editedLocation);
    if (editedImage) formData.append("image", editedImage);

    try {
      const res = await fetch(`http://localhost:3000/api/service-calls/${callId}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        alert("הקריאה עודכנה בהצלחה");
        setEditingCallId(null);
        setRefreshFlag((prev) => !prev);
      } else {
        alert("שגיאה בעדכון הקריאה");
      }
    } catch (err) {
      console.error("שגיאה בעדכון:", err);
      alert("שגיאה בשרת");
    }
  };

  return (
    <div style={{ direction: "rtl", marginTop: "2rem" }}>
      <h2>הקריאות שלי</h2>
      <table border="1" style={{ width: "100%", textAlign: "center" }}>
        <thead>
          <tr>
            <th>מספר קריאה</th>
            <th>תאריך פתיחה</th>
            <th>משתמש שפתח קריאה</th>
            <th>ID בניין</th>
            <th>כתובת בניין</th>
            <th>סוג תקלה</th>
            <th >סטטוס</th>
            <th>תיאור</th>
            <th>מיקום</th>
            <th>תמונה</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            editingCallId === call.call_id ? (
              <tr key={call.call_id} className={classes.editRowModern}>
                <td colSpan={11} style={{ padding: 0 }}>
                  <div className={classes.editContainer}>
                    <div className={classes.editHeader}>עריכת קריאה #{call.call_id}</div>
                    <div className={classes.editGrid}>
                      <div className={classes.editField}><label>תאריך פתיחה:</label><div>{call.created_at?.slice(0, 10)}</div></div>
                      <div className={classes.editField}><label>משתמש:</label><div>{call.created_by_name || "—"}</div></div>
                      <div className={classes.editField}><label>ID בניין:</label><div>{call.building_id}</div></div>
                      <div className={classes.editField}><label>כתובת:</label><div>{call.building_address}</div></div>
                      <div className={classes.editField}><label>סוג תקלה:</label>
                        <select className={classes.editInputUnderline} value={editedType} onChange={(e) => setEditedType(e.target.value)}>
                          <option value="">בחר</option>
                          <option value="נזילה">נזילה</option>
                          <option value="חשמל">חשמל</option>
                          <option value="אינסטלציה">אינסטלציה</option>
                          <option value="מעלית">מעלית</option>
                          <option value="אחר">אחר</option>
                        </select>
                      </div>
                      <div className={classes.editField}><label>סטטוס:</label>
                        <select className={classes.editInputUnderline} value={editedStatus} onChange={(e) => setEditedStatus(e.target.value)}>
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                      <div className={classes.editField} style={{ gridColumn: '1 / span 2' }}>
                        <label>תיאור:</label>
                        <textarea className={classes.editInputUnderline} value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} rows="2" />
                      </div>
                      <div className={classes.editField}><label>מיקום:</label>
                        <input className={classes.editInputUnderline} type="text" value={editedLocation} onChange={(e) => setEditedLocation(e.target.value)} />
                      </div>
                      <div className={classes.editField}><label>תמונה:</label>
                        {previewUrls[call.call_id] && (
                          <img src={previewUrls[call.call_id]} alt="תמונה" className={classes.previewImg} onClick={() => window.open(previewUrls[call.call_id], "_blank")} />
                        )}
                        <input type="file" className={classes.editFileInput} accept="image/*" onChange={(e) => {
                          const file = e.target.files[0];
                          setEditedImage(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPreviewUrls((prev) => ({ ...prev, [call.call_id]: reader.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </div>
                    </div>
                    <div className={classes.editActionsRow}>
                      <button className={`${classes.editBtn} ${classes.save}`} onClick={() => handleSave(call.call_id)}>שמור</button>
                      <button className={`${classes.editBtn} ${classes.cancel}`} onClick={() => setEditingCallId(null)}>ביטול</button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={call.call_id}>
                <td>#{call.call_id}</td>
                <td>{call.created_at?.slice(0, 10)}</td>
                <td>{call.created_by_name || "—"}</td>
                <td>{call.building_id}</td>
                <td>{call.building_address}</td>
                <td>{call.service_type}</td>
                <td>{call.status}</td>
                <td>{call.description || "—"}</td>
                <td>{call.location_in_building || "—"}</td>
                <td>
                  {call.image_url && (
                    <img src={call.image_url} alt="תמונה" className={classes.previewImg} onClick={() => window.open(call.image_url, "_blank")} />
                  )}
                </td>
                <td>
                  <button className={classes.editBtn} onClick={() => handleEdit(call)}>✏️</button>
                  <button className={`${classes.editBtn} ${classes.cancel}`} onClick={() => handleDelete(call.call_id)}>🗑️</button>
                </td>
              </tr>
            )
          ))}

        </tbody>
      </table>
    </div>
  );
}
