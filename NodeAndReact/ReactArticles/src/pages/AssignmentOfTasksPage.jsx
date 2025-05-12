import React, { useState } from "react";
import styles from "./AssignmentOfTasksPage.module.css";

const initialTasks = [
  { day: "ראשון", time: "10:00–13:00", building: "בן גוריון 14, חיפה", type: "ניקוי כללי", frequency: "שבועית", worker: "דני לוי", actions: "", notes: "" },
  { day: "רביעי", time: "10:00–13:00", building: "דור 14, חיפה", type: "ניקוי לובי", frequency: "שבועית", worker: "דני לוי", actions: "", notes: "" },
  { day: "חמישי", time: "10:00–13:00", building: "דור 14, חיפה", type: "ניקוי מראות", frequency: "שבועית", worker: "דני לוי", actions: "", notes: "" },
  { day: "יום 1", time: "09:00–11:00", building: "מגדלי נוף ים", type: "שטיפת פרטי חלון", frequency: "חודשית", worker: "יוסי כהן", actions: "", notes: "" },
  { day: "שלישי", time: "14:00–16:00", building: "מגדלי הכרמל", type: "בדיקת דלתות חיים", frequency: "רבעונית", worker: "עופר נעים", actions: "", notes: "" },
  { day: "חמישי", time: "08:00–10:00", building: "שער העיר", type: "שטיפת חניון", frequency: "חודשית", worker: "רונית כהן", actions: "", notes: "" },
  { day: "15 לחודש", time: "12:00–14:00", building: "נופי הכרם", type: "בדיקת גלאי עשן", frequency: "חודשית", worker: "יוסי כהן", actions: "", notes: "" }
];

export default function AssignmentOfTasksPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [form, setForm] = useState({ name: "", address: "", type: "", frequency: "", worker: "", day: "", time: "" });
  const [search, setSearch] = useState("");
  const [taskBeingEdited, setTaskBeingEdited] = useState(null); // index
  const [editForm, setEditForm] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    setTasks([...tasks, { ...form, actions: "", notes: "" }]);
    setForm({ name: "", address: "", type: "", frequency: "", worker: "", day: "", time: "" });
  };

  // עריכת משימה
  const handleEditClick = (idx, task) => {
    setTaskBeingEdited(idx);
    setEditForm({
      day: task.day || "",
      time: task.time || "",
      building: task.building || "",
      name: task.name || "",
      address: task.address || "",
      type: task.type || "",
      frequency: task.frequency || "",
      worker: task.worker || ""
    });
  };
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  const handleEditSave = (idx) => {
    setTasks(tasks =>
      tasks.map((t, i) =>
        i === idx
          ? {
              ...t,
              ...editForm,
              building: editForm.building || (editForm.name ? editForm.name + (editForm.address ? ", " + editForm.address : "") : "")
            }
          : t
      )
    );
    setTaskBeingEdited(null);
    setEditForm({});
  };
  const handleEditCancel = () => {
    setTaskBeingEdited(null);
    setEditForm({});
  };

  // מחיקת משימה
  const handleDelete = (idx) => {
    if (window.confirm("האם למחוק משימה זו?")) {
      setTasks(tasks => tasks.filter((_, i) => i !== idx));
      if (taskBeingEdited === idx) {
        setTaskBeingEdited(null);
        setEditForm({});
      }
    }
  };

  // סינון משימות לפי החיפוש
  const filteredTasks = tasks.filter((task) => {
    const searchStr = search.trim().toLowerCase();
    if (!searchStr) return true;
    return [
      task.name,
      task.address,
      task.building,
      task.type,
      task.frequency,
      task.worker,
      task.day,
      task.time
    ]
      .filter(Boolean)
      .some(field => field.toLowerCase().includes(searchStr));
  });

  return (
    <div className={styles.assignmentPage} dir="rtl">
      <div className={styles.formSection}>
        <h3 className={styles.formTitle}>הוספת משימה :</h3>
        <form onSubmit={handleAddTask} className={styles.form}>
          <label>שם הבניין:<input name="name" value={form.name} onChange={handleChange} /></label>
          <label>כתובת:<input name="address" value={form.address} onChange={handleChange} /></label>
          <label>סוג משימה:<input name="type" value={form.type} onChange={handleChange} /></label>
          <label>תדירות:<input name="frequency" value={form.frequency} onChange={handleChange} /></label>
          <label>עובד אחראי על משימה:<input name="worker" value={form.worker} onChange={handleChange} /></label>
          <label>יום:<input name="day" value={form.day} onChange={handleChange} /></label>
          <label>שעה:<input name="time" value={form.time} onChange={handleChange} /></label>
          <button className={styles.addButton} type="submit">הוסף משימה</button>
        </form>
      </div>
      <div className={styles.tableSection}>
        <div className={styles.headerRow}>
          <div className={styles.titleBox}>Assignment of tasks</div>
          <div className={styles.searchBox}>
            חיפוש:
            <input
              className={styles.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חפש לפי שם, כתובת, עובד, סוג..."
            />
          </div>
        </div>
        <table className={styles.tasksTable}>
          <thead>
            <tr>
              <th>יום</th>
              <th>שעה</th>
              <th>בניין</th>
              <th>כתובת</th>
              <th>סוג משימה</th>
              <th>תדירות</th>
              <th>עובד קבוע</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task, idx) => {
  // צריך למצוא את האינדקס של המשימה המקורית במערך tasks
  const originalIdx = tasks.findIndex(t => t === task);
  const isEditing = taskBeingEdited === originalIdx;
  return (
    <tr key={originalIdx}>
      {isEditing ? (
        <>
          <td><input name="day" value={editForm.day} onChange={handleEditChange} className={styles.editInput} /></td>
          <td><input name="time" value={editForm.time} onChange={handleEditChange} className={styles.editInput} /></td>
          <td><input name="building" value={editForm.building} onChange={handleEditChange} placeholder="בניין" className={styles.editInput} /></td>
          <td><input name="address" value={editForm.address} onChange={handleEditChange} placeholder="כתובת" className={styles.editInput} /></td>
          <td><input name="type" value={editForm.type} onChange={handleEditChange} className={styles.editInput} /></td>
          <td><input name="frequency" value={editForm.frequency} onChange={handleEditChange} className={styles.editInput} /></td>
          <td><input name="worker" value={editForm.worker} onChange={handleEditChange} className={styles.editInput} /></td>
          <td className={styles.actionsCol}>
            <button onClick={() => handleEditSave(originalIdx)} title="שמור" className={styles.editActionBtn}>💾</button>
            <button onClick={handleEditCancel} title="ביטול" className={styles.editActionBtn}>❌</button>
          </td>
        </>
      ) : (
        <>
          <td>{task.day}</td>
          <td>{task.time}</td>
          <td>{task.building || (task.name ? task.name : "")}</td>
          <td>{task.address || ""}</td>
          <td>{task.type}</td>
          <td>{task.frequency}</td>
          <td>{task.worker}</td>
          <td className={styles.actionsCol}>
            <span
              className={styles.iconEdit}
              title="ערוך"
              style={{cursor:'pointer'}}
              onClick={() => handleEditClick(originalIdx, task)}
            >✏️</span>
            <span
              className={styles.iconDelete}
              title="מחק"
              style={{cursor:'pointer', marginRight: 8}}
              onClick={() => handleDelete(originalIdx)}
            >🗑️</span>
          </td>
        </>
      )}
    </tr>
  );
})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
