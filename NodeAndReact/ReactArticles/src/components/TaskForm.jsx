import React, { useEffect, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { he } from "date-fns/locale";
import classes from "./TaskForm.module.css";

registerLocale("he", he);

export default function TaskForm({ onSuccess }) {
  const [form, setForm] = useState({
    building_id: "",
    task_name: "",
    frequency: "",
    next_date: null,
    task_hour: "",
    task_minute: "",
    type: "",
    custom_type: ""
  });

  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/buildings")
      .then(res => res.json())
      .then(data => setBuildings(data))
      .catch(err => console.error("Error loading buildings:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const timeCombined = `${form.task_hour}:${form.task_minute}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalType = form.type === "אחר"
      ? form.custom_type.trim()
      : form.type;

    if (!form.next_date) {
      alert("אנא בחר/י תאריך");
      return;
    }
    if (!finalType) {
      alert("אנא בחר/י או הזן/י סוג משימה");
      return;
    }

    const payload = {
      building_id: form.building_id,
      task_name: form.task_name,
      frequency: form.frequency,
      next_date: formatDateToYMD(form.next_date),
      task_time: timeCombined,
      type: finalType
    };

    const res = await fetch("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("משימה נוספה בהצלחה ✅");
      setForm({
        building_id: "",
        task_name: "",
        frequency: "",
        next_date: null,
        task_hour: "",
        task_minute: "",
        type: "",
        custom_type: ""
      });
      onSuccess();
    } else {
      alert("שגיאה בהוספה");
    }
  };

  function formatDateToYMD(date) {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().split("T")[0];
  }

  return (
    <>
      <h3 className={classes.title}>הוספת משימה</h3>
      <form className={classes.form} onSubmit={handleSubmit}>
        {/* בניין */}
        <select
          className={classes.selectBtn}
          name="building_id"
          value={form.building_id}
          onChange={handleChange}
          required
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
          className={classes.selectBtn}
          name="type"
          value={form.type}
          onChange={(e) => {
            handleChange(e);
            if (e.target.value !== "אחר") {
              setForm(prev => ({ ...prev, custom_type: "" }));
            }
          }}
          required
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

        {/* שדה חופשי אם נבחר "אחר" */}
        {form.type === "אחר" && (
          <input
            className={classes.input}
            name="custom_type"
            placeholder="הזן סוג משימה"
            value={form.custom_type}
            onChange={handleChange}
            required
          />
        )}

        {/* תיאור משימה */}
        <input
          className={classes.input}
          name="task_name"
          placeholder="תיאור משימה"
          value={form.task_name}
          onChange={handleChange}
          required
        />

        {/* תדירות */}
        <select
          className={classes.selectBtnFrequency}
          name="frequency"
          value={form.frequency}
          onChange={handleChange}
          required
        >
          <option value="">בחר תדירות</option>
          <option value="יומי">יומי</option>
          <option value="שבועי">שבועי</option>
          <option value="חודשי">חודשי</option>
        </select>

        {/* תאריך */}
        <DatePicker
          selected={form.next_date}
          onChange={(date) => setForm(prev => ({ ...prev, next_date: date }))}
          dateFormat="dd/MM/yyyy"
          locale="he"
          className={classes.selectBtn}
          popperClassName={classes.datePopper}
          placeholderText="בחר תאריך"
          calendarStartDay={0}
        />

        {/* שעון: הדקות ימינה, השעה משמאל */}
        <div className={classes.timeRow}>
          {/* קודם הדקות (ימין) */}
          <select
            className={classes.selectTime}
            name="task_minute"
            value={form.task_minute}
            onChange={handleChange}
            required
          >
            <option value="">דקות</option>
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m.toString().padStart(2, "0")}>
                {m.toString().padStart(2, "0")}
              </option>
            ))}
          </select>
          <span>:</span>
          {/* אחר כך השעה (משמאל) */}
          <select
            className={classes.selectTime}
            name="task_hour"
            value={form.task_hour}
            onChange={handleChange}
            required
          >
            <option value="">שעה</option>
            {[...Array(24).keys()].map((h) => (
              <option key={h} value={h.toString().padStart(2, "0")}>
                {h.toString().padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>

        {/* כפתור שליחה */}
        <button type="submit" className={classes.button}>
          הוסף משימה
        </button>
      </form>
    </>
  );
}
