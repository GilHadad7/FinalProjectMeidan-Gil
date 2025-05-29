import React, { useState, useEffect } from "react";
import classes from "./BuildingsForm.module.css";
import Select from "react-select";

export default function BuildingsForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    apartments: "",
    floors: "",
    committee: "",
    phone: ""
  });

  const [workers, setWorkers] = useState([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/users?role=worker")
      .then(res => res.json())
      .then(data => setWorkers(data))
      .catch(err => console.error("שגיאה בשליפת עובדים:", err));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.address) return;

    const newBuilding = {
      name: form.name,
      full_address: form.address,
      maintenance_type: "Full",
      apartments: form.apartments,
      floors: form.floors,
      committee: form.committee,
      phone: form.phone,
      assigned_workers: selectedWorkerIds.join(",") // ⬅️ שומר מזהים בפורמט פסיקים
    };

    const res = await fetch("http://localhost:3000/api/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBuilding)
    });

    if (res.ok) {
      setForm({
        name: "",
        address: "",
        apartments: "",
        floors: "",
        committee: "",
        phone: ""
      });
      setSelectedWorkerIds([]); // ניקוי הבחירה
      alert("בניין התווסף בהצלחה ✅");
      onSuccess(); // רענון
    } else {
      alert("שגיאה בהוספת בניין");
    }
  };

  return (
    <div className={classes.formContainer}>
      <h3 className={classes.title}>הוסף בניין:</h3>
      <form className={classes.form} onSubmit={handleSubmit}>
        <input className={classes.input} name="name" placeholder="שם הבניין" value={form.name} onChange={handleChange} />
        <input className={classes.input} name="address" placeholder="כתובת" value={form.address} onChange={handleChange} />
        <input className={classes.input} name="apartments" placeholder="מס דירות" value={form.apartments} onChange={handleChange} />
        <input className={classes.input} name="floors" placeholder="מס קומות" value={form.floors} onChange={handleChange} />
        <input className={classes.input} name="committee" placeholder="שם ועד בית" value={form.committee} onChange={handleChange} />
        <input
          className={classes.input}
          name="phone"
          placeholder="טלפון ועד בית"
          value={form.phone}
          onChange={(e) => {
            const onlyNums = e.target.value.replace(/\D/g, "");
            setForm({ ...form, phone: onlyNums });
          }}
          maxLength={10}
        />
              <div className={classes.inputGroup}>
              <label className={classes.labelWorker}>שייך עובדים:</label>
                <Select
                isMulti
                options={workers.map((worker) => ({
              value: worker.user_id,
              label: worker.name
            }))}
            className={classes.reactSelect}
            value={workers
              .filter((worker) => selectedWorkerIds.includes(worker.user_id))
              .map((w) => ({ value: w.user_id, label: w.name }))}
            onChange={(selectedOptions) => {
              setSelectedWorkerIds(selectedOptions.map((opt) => opt.value));
            }}
            placeholder="בחר עובדים..."
          />
        </div>


        <button className={classes.button} type="submit">הוסף בניין</button>
      </form>
    </div>
  );
}
