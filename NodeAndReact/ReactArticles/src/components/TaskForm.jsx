// src/components/TaskForm.jsx
import React, { useEffect, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { he } from "date-fns/locale";

// UI kit אחיד
import FormCard from "./ui/FormCard";
import form from "./ui/FormKit.module.css";

registerLocale("he", he);

export default function TaskForm({ onSuccess }) {
  const [buildings, setBuildings] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [taskFormData, setTaskFormData] = useState({
    building_id: "",
    task_name: "",
    frequency: "",
    next_date: null,
    task_hour: "",
    task_minute: "",
    type: "",
    custom_type: "",
  });

  useEffect(() => {
    fetch("http://localhost:3000/api/buildings")
      .then((res) => res.json())
      .then(setBuildings)
      .catch((err) => console.error("Error loading buildings:", err));
  }, []);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setTaskFormData((prev) => ({ ...prev, [name]: value }));
  }

  const task_time =
    taskFormData.task_hour && taskFormData.task_minute
      ? `${taskFormData.task_hour}:${taskFormData.task_minute}`
      : "";

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const finalType =
      taskFormData.type === "אחר"
        ? taskFormData.custom_type.trim()
        : taskFormData.type;

    // ולידציות בסיס
    if (!taskFormData.building_id) return alert("אנא בחר/י בניין");
    if (!finalType) return alert("אנא בחר/י או הזן/י סוג משימה");
    if (!taskFormData.task_name.trim()) return alert("אנא הזן/י תיאור משימה");
    if (!taskFormData.frequency) return alert("אנא בחר/י תדירות");
    if (!taskFormData.next_date) return alert("אנא בחר/י תאריך");
    if (!taskFormData.task_hour || !taskFormData.task_minute)
      return alert("אנא בחר/י שעה ודקות");

    const payload = {
      building_id: taskFormData.building_id,
      task_name: taskFormData.task_name.trim(),
      frequency: taskFormData.frequency,
      next_date: formatDateToYMD(taskFormData.next_date),
      task_time,
      type: finalType,
    };

    try {
      setSubmitting(true);
      const res = await fetch("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert("שגיאה בהוספה");
        return;
      }

      alert("משימה נוספה בהצלחה ✅");
      setTaskFormData({
        building_id: "",
        task_name: "",
        frequency: "",
        next_date: null,
        task_hour: "",
        task_minute: "",
        type: "",
        custom_type: "",
      });
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  }

  function formatDateToYMD(date) {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().split("T")[0];
  }

  return (
    <FormCard title="הוספת משימה">
      {/* בניין */}
      <select
        className={form.select}
        name="building_id"
        value={taskFormData.building_id}
        onChange={handleInputChange}
      >
        <option value="">בחר בניין</option>
        {buildings.map((b) => (
          <option key={b.building_id} value={b.building_id}>
            {b.full_address || b.name}
          </option>
        ))}
      </select>

      {/* סוג משימה */}
      <select
        className={form.select}
        name="type"
        value={taskFormData.type}
        onChange={(e) => {
          handleInputChange(e);
          if (e.target.value !== "אחר") {
            setTaskFormData((p) => ({ ...p, custom_type: "" }));
          }
        }}
      >
        <option value="">בחר סוג משימה</option>
        <option value="ניקיון">ניקיון</option>
        <option value="תחזוקה">תחזוקה</option>
        <option value="הדברה">הדברה</option>
        <option value="ביקורות">ביקורות</option>
        <option value="טיפול במעבדי מים">טיפול במעבדי מים</option>
        <option value="חשמלאי">חשמלאי</option>
        <option value="אחר">אחר…</option>
      </select>

      {/* שדה חופשי כשנבחר "אחר" */}
      {taskFormData.type === "אחר" && (
        <input
          type="text"
          className={form.input}
          name="custom_type"
          placeholder="הזן סוג משימה"
          value={taskFormData.custom_type}
          onChange={handleInputChange}
          autoComplete="off"
        />
      )}

      {/* תיאור משימה */}
      <input
        type="text"
        className={form.input}
        name="task_name"
        placeholder="תיאור משימה"
        value={taskFormData.task_name}
        onChange={handleInputChange}
        autoComplete="off"
      />

      {/* תדירות */}
      <select
        className={form.select}
        name="frequency"
        value={taskFormData.frequency}
        onChange={handleInputChange}
      >
        <option value="">בחר תדירות</option>
        <option value="יומי">יומי</option>
        <option value="שבועי">שבועי</option>
        <option value="חודשי">חודשי</option>
      </select>

      {/* תאריך */}
      <div className={form.control}>
        <DatePicker
          selected={taskFormData.next_date}
          onChange={(date) => setTaskFormData((prev) => ({ ...prev, next_date: date }))}
          dateFormat="dd/MM/yyyy"
          locale="he"
          className={form.input}
          placeholderText="בחר תאריך"
          calendarStartDay={0}
        />
      </div>

      {/* שעה (דקות מימין, שעה משמאל) */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <select
          className={form.select}
          name="task_minute"
          value={taskFormData.task_minute}
          onChange={handleInputChange}
        >
          <option value="">דקות</option>
          {[0, 15, 30, 45].map((m) => (
            <option key={m} value={String(m).padStart(2, "0")}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
        <span>:</span>
        <select
          className={form.select}
          name="task_hour"
          value={taskFormData.task_hour}
          onChange={handleInputChange}
        >
          <option value="">שעה</option>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={String(h).padStart(2, "0")}>
              {String(h).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>

      {/* כפתור שליחה */}
      <button
        className={form.button}
        onClick={handleFormSubmit}
        type="button"
        disabled={submitting}
      >
        {submitting ? "שולח…" : "הוסף משימה"}
      </button>
    </FormCard>
  );
}
