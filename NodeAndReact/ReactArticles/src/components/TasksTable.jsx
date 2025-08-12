import React, { useState } from "react";
import classes from "./TasksTable.module.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import he from "date-fns/locale/he";
import BaseTable from "./ui/BaseTable";

registerLocale("he", he);

// Parse date string into Date (supports ISO, YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY)
function parseDateString(str) {
  if (!str) return null;
  const isoTs = Date.parse(str);
  if (!isNaN(isoTs)) return new Date(isoTs);
  const parts = str.trim().split(/\D+/).map(Number);
  if (parts.length === 3) {
    let [a, b, c] = parts;
    let [y, m, d] = a > 31 ? [a, b, c] : [c, b, a];
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

// Format Date to 'YYYY-MM-DD' (local tz)
function formatDateLocal(date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - tzOffsetMs);
  return localDate.toISOString().split("T")[0];
}

// helpers for HH:MM
function timeToHM(str = "") {
  const [h = "", m = ""] = String(str).split(":");
  const hh = `${h}`.padStart(2, "0");
  const mm = `${m}`.padStart(2, "0");
  return `${hh}:${mm}`;
}
function hmToParts(hm = "") {
  const [h = "", m = ""] = String(hm).split(":");
  return { h, m };
}

export default function TasksTable({ tasks, search, onRefresh }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({});

  // ====== כותרות ורוחבי עמודות ======
  const headers = [
    "כתובת בניין",
    "תיאור משימה",
    "תדירות",
    "סוג",
    "תאריך הבא",
    "יום",
    "שעה",
    "פעולות",
  ];

  // שנה חופשי: px / % / fr
  const colWidths = ["15%", "18%", "8%", "10%", "8%", "10%", "8%", "8%"];
  // ===================================

  const norm = (v) => String(v ?? "").toLowerCase().trim();
  const filtered = tasks.filter((task) => {
    const q = norm(search);
    if (!q) return true;
    const tokens = q.split(/\s+/);
    const haystack = [task.full_address, task.type, task.frequency]
      .filter(Boolean)
      .map(norm)
      .join(" | ");
    return tokens.every((t) => haystack.includes(t));
  });

  const handleEditClick = (idx) => {
    const task = filtered[idx];
    const [hour = "", minute = ""] = (task.task_time || "").split(":");
    const parsed = parseDateString(task.next_date);
    const fallback = new Date(task.next_date);
    const localNextDate =
      parsed || (!isNaN(fallback.getTime()) ? fallback : new Date());

    setEditIdx(idx);
    setEditForm({
      ...task,
      task_hour: hour,
      task_minute: minute,
      next_date: localNextDate,
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
      const hhmm = timeToHM(`${editForm.task_hour || ""}:${editForm.task_minute || ""}`);
      const { h, m } = hmToParts(hhmm); // לניקוי ואחידות
      const task_time = `${h}:${m}`;
      const formattedDate = formatDateLocal(editForm.next_date);

      const res = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: editForm.building_id,
          task_name: editForm.task_name,
          frequency: editForm.frequency,
          type: editForm.type,
          next_date: formattedDate,
          task_time,
        }),
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
      method: "DELETE",
    });
    if (res.ok) onRefresh();
    else alert("שגיאה במחיקה");
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
        else break;
      }
      return date;
    } catch {
      return null;
    }
  }

  function getNextOccurrence(startDateStr, frequency) {
    const date = calcNextDate(startDateStr, frequency);
    return date ? date.toLocaleDateString("he-IL") : "תאריך לא תקין";
  }

  function getHebrewDay(startDateStr, frequency) {
    const date = calcNextDate(startDateStr, frequency);
    return date
      ? date.toLocaleDateString("he-IL", { weekday: "long" })
      : "לא ידוע";
  }

  return (
    <BaseTable
      headers={headers}
      containerClassName={classes.tableWrap}
      tableClassName={classes.table}
      colWidths={colWidths}
      stickyHeader
    >
      {filtered.map((task, i) => {
        const isEditing = editIdx === i;
        return (
          <tr key={task.task_id}>
            {isEditing ? (
              <>
                <td className={classes.addr}>{task.full_address}</td>
                <td>
                  <input
                    className={classes.input}
                    name="task_name"
                    value={editForm.task_name}
                    onChange={handleEditChange}
                  />
                </td>
                <td>
                  <select
                    className={classes.selectBtnFrequency}
                    name="frequency"
                    value={editForm.frequency}
                    onChange={handleEditChange}
                  >
                    <option value="">בחר תדירות</option>
                    <option value="יומי">יומי</option>
                    <option value="שבועי">שבועי</option>
                    <option value="חודשי">חודשי</option>
                  </select>
                </td>
                <td>
                  <input
                    className={classes.input}
                    name="type"
                    value={editForm.type}
                    onChange={handleEditChange}
                  />
                </td>
                <td>
                  <DatePicker
                    selected={editForm.next_date}
                    onChange={(date) =>
                      setEditForm({ ...editForm, next_date: date })
                    }
                    dateFormat="dd/MM/yyyy"
                    locale="he"
                    className={classes.input}
                    calendarStartDay={0}
                    placeholderText="בחר תאריך"
                  />
                </td>
                <td>{getHebrewDay(editForm.next_date, editForm.frequency)}</td>

                {/* שעה – כמו טקסט, עריכה ידנית */}
                <td>
                  <input
                    type="time"
                    className={classes.timeInput}
                    step="60"
                    value={timeToHM(`${editForm.task_hour || ""}:${editForm.task_minute || ""}`)}
                    onChange={(e) => {
                      const { h, m } = hmToParts(e.target.value);
                      setEditForm({ ...editForm, task_hour: h, task_minute: m });
                    }}
                  />
                </td>

                <td className={classes.actions}>
                  <button
                    className={classes.btn}
                    onClick={() => handleEditSave(task.task_id)}
                  >
                    💾
                  </button>
                  <button className={classes.btn} onClick={handleEditCancel}>
                    ❌
                  </button>
                </td>
              </>
            ) : (
              <>
                <td className={classes.addr}>{task.full_address}</td>
                <td>{task.task_name}</td>
                <td>{task.frequency}</td>
                <td>{task.type}</td>
                <td>{getNextOccurrence(task.next_date, task.frequency)}</td>
                <td>{getHebrewDay(task.next_date, task.frequency)}</td>
                <td>{task.task_time}</td>
                <td className={classes.actions}>
                  <button
                    className={classes.btn}
                    onClick={() => handleEditClick(i)}
                  >
                    ✏️
                  </button>
                  <button
                    className={classes.btn}
                    onClick={() => handleDelete(task.task_id)}
                  >
                    🗑️
                  </button>
                </td>
              </>
            )}
          </tr>
        );
      })}
    </BaseTable>
  );
}
