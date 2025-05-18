import React, { useState } from "react";
import classes from "./BuildingsForm.module.css"; // תוכל להוסיף קובץ סטייל נפרד אם תרצה

export default function BuildingsForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    apartments: "",
    floors: "",
    committee: "",
    phone: ""
  });

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
      phone: form.phone
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
        alert("בניין התווסף בהצלחה ✅"); // ✅ זו השורה החדשה
        onSuccess(); // טריגר לרענון
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
        <input className={classes.input} name="apartments" placeholder="מס דירות" value={form.apartments} onChange={handleChange}  />
        <input className={classes.input} name="floors" placeholder="מס קומות" value={form.floors} onChange={handleChange} />
        <input className={classes.input} name="committee" placeholder="שם ועד בית" value={form.committee} onChange={handleChange} />
        <input className={classes.input} name="phone" placeholder="טלפון ועד בית" value={form.phone} onChange={(e) => {
                                                                                    const onlyNums = e.target.value.replace(/\D/g, ""); // מסנן כל מה שהוא לא ספרה
                                                                                    setForm({ ...form, phone: onlyNums });
                                                                                    }}
                                                                                    maxLength={10} />
        <button className={classes.button} type="submit">הוסף בניין</button>
      </form>
    </div>
  );
}
