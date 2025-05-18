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
    task_time: "",
    type: ""
  });

  const [buildings, setBuildings] = useState([]);

  // Load buildings list
  useEffect(() => {
    fetch("http://localhost:3000/api/buildings")
      .then(res => res.json())
      .then(data => setBuildings(data))
      .catch(err => console.error("Error loading buildings:", err));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const timeCombined = `${form.task_hour}:${form.task_minute}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.next_date) {
      alert("בחר תאריך");
      return;
    }

    const payload = {
      ...form,
      task_time: timeCombined,
      next_date: formatDateToYMD(form.next_date)
    
    };

    const res = await fetch("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("משימה נוספה בהצלחה ✅");
      setForm({ building_id: "", task_name: "", frequency: "", next_date: null, task_time: "", type: "" });
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

        <input
          className={classes.input}
          name="task_name"
          placeholder="שם משימה"
          value={form.task_name}
          onChange={handleChange}
          required
        />

            <input
          className={classes.input}
          name="type"
          placeholder="סוג משימה"
          value={form.type}
          onChange={handleChange}
        />

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

        <DatePicker
        selected={form.next_date}
        onChange={(date) => setForm({ ...form, next_date: date })}
        dateFormat="dd/MM/yyyy"
        locale="he"
        className={classes.selectBtn}           // זה משפיע רק על התיבה
        popperClassName={classes.datePopper}    // זה ישפיע על הפופאפ שנפתח!
        placeholderText="בחר תאריך"
        calendarStartDay={0}
        />



{/* שעון */}
<div className={classes.timeRow}>
  <select
    className={classes.selectTime}
    value={form.task_hour}
    onChange={(e) => setForm({ ...form, task_hour: e.target.value })}
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
    value={form.task_minute}
    onChange={(e) => setForm({ ...form, task_minute: e.target.value })}
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




        <button type="submit" className={classes.button}>
          הוסף משימה
        </button>
      </form>
    </>
  );
}
