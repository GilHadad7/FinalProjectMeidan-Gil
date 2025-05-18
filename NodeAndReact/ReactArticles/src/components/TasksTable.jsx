import React, { useState } from "react";
import classes from "./TasksTable.module.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import he from "date-fns/locale/he";

registerLocale("he", he);

export default function TasksTable({ tasks, search, onRefresh }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({});

  const filtered = tasks.filter((task) => {
    const s = search.toLowerCase().trim();
    if (!s) return true;
    return [
      task.full_address,
      task.type,
      task.frequency,
      task.worker,
      task.day,
      task.time
    ]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(s));
  });

  const handleEditClick = (idx) => {
    const task = filtered[idx];
    const [hour = '', minute = ''] = (task.task_time || '').split(":");
    setEditIdx(idx);
    setEditForm({
      ...task,
      task_hour: hour,
      task_minute: minute,
      next_date: new Date(task.next_date)
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => {
    setEditIdx(null);
    setEditForm({});
  };

  const handleEditSave = async (taskId) => {
    try {
      const task_time = `${editForm.task_hour}:${editForm.task_minute}`;
      const nextDate = new Date(editForm.next_date);
      const formattedDate = nextDate.toISOString().split("T")[0];

      const res = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: editForm.building_id,
          task_name: editForm.task_name,
          frequency: editForm.frequency,
          type: editForm.type,
          next_date: formattedDate,
          task_time: task_time
        })
      });

      if (res.ok) {
        setEditIdx(null);
        onRefresh();
      } else {
        alert("שגיאה בעדכון משימה");
      }
    } catch (err) {
      console.error("Error saving task:", err);
      alert("שגיאה בעדכון משימה");
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("האם למחוק את המשימה?")) return;

    const res = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
      method: "DELETE"
    });

    if (res.ok) {
      onRefresh();
    } else {
      alert("שגיאה במחיקה");
    }
  };

  function calcNextDate(startDateStr, frequency) {
    try {
      const today = new Date();
      let date = new Date(startDateStr);
  
      if (isNaN(date.getTime())) return null;
  
      while (date < today) {
        if (frequency === "יומי") date.setDate(date.getDate() + 1);
        else if (frequency === "שבועי") date.setDate(date.getDate() + 7);
        else if (frequency === "חודשי") date.setMonth(date.getMonth() + 1);
        else break; // אם זה חד פעמי
      }
  
      return date;
    } catch (err) {
      return null;
    }
  }
  

  function getNextOccurrence(startDateStr, frequency) {
    const date = calcNextDate(startDateStr, frequency);
    return date ? date.toLocaleDateString("he-IL") : "תאריך לא תקין";
  }

  function getHebrewDay(startDateStr, frequency) {
    const date = calcNextDate(startDateStr, frequency);
    if (!date) return "לא ידוע";
    return date.toLocaleDateString("he-IL", { weekday: "long" });
  }

  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th>מס משימה</th>
          <th>כתובת בניין</th>
          <th>שם משימה</th>
          <th>תדירות</th>
          <th>סוג</th>
          <th>תאריך הבא</th>
          <th>יום</th>
          <th>שעה</th>
          <th>פעולות</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((task, i) => {
          const isEditing = editIdx === i;
          return (
            <tr key={task.id}>
              {isEditing ? (
  <>
    <td>{task.task_id}</td>
    <td>
      <input className={classes.input} name="building_id" value={editForm.building_id} onChange={handleEditChange} />
    </td>
    <td>
      <input className={classes.input} name="task_name" value={editForm.task_name} onChange={handleEditChange} />
    </td>
    <td>
      <input className={classes.input} name="frequency" value={editForm.frequency} onChange={handleEditChange} />
    </td>
    <td>
      <input className={classes.input} name="type" value={editForm.type} onChange={handleEditChange} />
    </td>
    <td>
      <DatePicker
        selected={editForm.next_date}
        onChange={(date) => setEditForm({ ...editForm, next_date: date })}
        dateFormat="dd/MM/yyyy"
        locale="he"
        className={classes.input}
        popperClassName="datePopper"
        calendarStartDay={0}
        placeholderText="בחר תאריך"
      />
    </td>
    <td>
      {/* יום מחושב בלבד */}
      {getHebrewDay(editForm.next_date, editForm.frequency)}
    </td>
    <td>
      <div className={classes.timeRow}>
        <select
          className={classes.selectTime}
          value={editForm.task_hour || ''}
          onChange={(e) => setEditForm({ ...editForm, task_hour: e.target.value })}
          required
        >
          <option value="">שעה</option>
          {[...Array(24).keys()].map(h => (
            <option key={h} value={h.toString().padStart(2, '0')}>
              {h.toString().padStart(2, '0')}
            </option>
          ))}
        </select>
        <span>:</span>
        <select
          className={classes.selectTime}
          value={editForm.task_minute || ''}
          onChange={(e) => setEditForm({ ...editForm, task_minute: e.target.value })}
          required
        >
          <option value="">דקות</option>
          {[0, 15, 30, 45].map(m => (
            <option key={m} value={m.toString().padStart(2, '0')}>
              {m.toString().padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>
    </td>
    <td className={classes.actions}>
      <button className={classes.btn} onClick={() => handleEditSave(task.task_id)}>💾</button>
      <button className={classes.btn} onClick={handleEditCancel}>❌</button>
    </td>
  </>

              ) : (
                <>
                  <td>{task.task_id}</td>
                  <td>{task.full_address}</td>
                  <td>{task.task_name}</td>
                  <td>{task.frequency}</td>
                  <td>{task.type}</td>
                  <td>{getNextOccurrence(task.next_date, task.frequency)}</td>
                  <td>{getHebrewDay(task.next_date, task.frequency)}</td>
                  <td>{task.task_time}</td>
                  <td className={classes.actionsCol}>
                    <button className={classes.btn} onClick={() => handleEditClick(i)}>✏️</button>
                    <button className={classes.btn} onClick={() => handleDelete(task.task_id)}>🗑️</button>
                  </td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
