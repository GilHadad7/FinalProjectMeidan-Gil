import React, { useState, useEffect } from "react";
import Select from "react-select";
import FormCard from "./ui/FormCard";
import form from "./ui/FormKit.module.css";

export default function BuildingsForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    apartments: "",
    floors: "",
    committee: "",
    phone: "",
  });

  const [workers, setWorkers] = useState([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/users?role=worker")
      .then((res) => res.json())
      .then(setWorkers)
      .catch((err) => console.error("שגיאה בשליפת עובדים:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // שדות מספריים
    if (name === "apartments" || name === "floors") {
      return setFormData((p) => ({ ...p, [name]: value.replace(/\D/g, "") }));
    }
    if (name === "phone") {
      return setFormData((p) => ({ ...p, phone: value.replace(/\D/g, "") }));
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim() || !formData.address.trim()) {
      setError("שם בניין וכתובת הם שדות חובה");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      full_address: formData.address.trim(),
      maintenance_type: "Full",
      apartments: formData.apartments.trim(),
      floors: formData.floors.trim(),
      committee: formData.committee.trim(),
      phone: formData.phone.trim(),
      assigned_workers: selectedWorkerIds.join(","), // שמירת מזהים בפורמט פסיקים
    };

    const res = await fetch("http://localhost:3000/api/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("שגיאה בהוספת בניין");
      return;
    }

    // ניקוי
    setFormData({
      name: "",
      address: "",
      apartments: "",
      floors: "",
      committee: "",
      phone: "",
    });
    setSelectedWorkerIds([]);
    alert("בניין התווסף בהצלחה ✅");
    onSuccess?.();
  };

  // עיצוב react-select תואם לשדות (48px, RTL וכו')
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 48,
      height: 48,
      borderRadius: 20,
      background: "#e9dfd3",
      borderColor: state.isFocused ? "#c7b9a7" : "#d8cfc3",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(199,185,167,0.25)" : "none",
      direction: "rtl",
      textAlign: "right",
      paddingInline: 8,
      ":hover": { borderColor: state.isFocused ? "#c7b9a7" : "#d8cfc3" },
    }),
    valueContainer: (b) => ({ ...b, paddingInline: 8 }),
    placeholder: (b) => ({
      ...b,
      fontFamily: "Heebo, Segoe UI, sans-serif",
      fontWeight: 700,
      color: "#7a6c5d",
    }),
    input: (b) => ({ ...b, fontFamily: "Heebo, Segoe UI, sans-serif", direction: "rtl", textAlign: "right" }),
    menu: (b) => ({ ...b, zIndex: 5, direction: "rtl", textAlign: "right", fontFamily: "Heebo, Segoe UI, sans-serif" }),
    multiValue: (b) => ({ ...b, background: "#eadfce", borderRadius: 12 }),
    multiValueLabel: (b) => ({ ...b, fontFamily: "Heebo, Segoe UI, sans-serif", color: "#4a3a2a" }),
    multiValueRemove: (b) => ({ ...b, ":hover": { background: "#d8cfc3", color: "#2c241b" } }),
    option: (b, s) => ({
      ...b,
      direction: "rtl",
      textAlign: "right",
      background: s.isFocused ? "#efe6d9" : s.isSelected ? "#e2d6c3" : "#fff",
      color: "#4a3a2a",
      ":active": { background: "#e2d6c3" },
    }),
  };

  return (
    <FormCard title="הוסף בניין">
      <input
        type="text"
        className={form.input}
        name="name"
        placeholder="שם הבניין"
        value={formData.name}
        onChange={handleChange}
        autoComplete="off"
      />

      <input
        type="text"
        className={form.input}
        name="address"
        placeholder="כתובת"
        value={formData.address}
        onChange={handleChange}
        autoComplete="off"
      />

      <input
        type="text"
        className={form.input}
        name="apartments"
        placeholder="מס דירות"
        value={formData.apartments}
        onChange={handleChange}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={3}
      />

      <input
        type="text"
        className={form.input}
        name="floors"
        placeholder="מס קומות"
        value={formData.floors}
        onChange={handleChange}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
      />

      <input
        type="text"
        className={form.input}
        name="committee"
        placeholder="שם ועד בית"
        value={formData.committee}
        onChange={handleChange}
        autoComplete="off"
      />

      <input
        type="text"
        className={form.input}
        name="phone"
        placeholder="טלפון ועד בית"
        value={formData.phone}
        onChange={handleChange}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        autoComplete="tel"
      />

      {/* שייך עובדים */}
      <div className={form.control}>
        <label
          style={{
            font: '700 .95rem "Heebo","Segoe UI",sans-serif',
            color: "#6b5d4f",
            display: "block",
            margin: "6px 8px 6px",
          }}
        >
          שייך עובדים:
        </label>
        <Select
          isMulti
          isRtl
          closeMenuOnSelect={false}
          options={workers.map((w) => ({ value: w.user_id, label: w.name }))}
          value={workers
            .filter((w) => selectedWorkerIds.includes(w.user_id))
            .map((w) => ({ value: w.user_id, label: w.name }))}
          onChange={(opts) => setSelectedWorkerIds(opts.map((o) => o.value))}
          placeholder="בחר עובדים..."
          styles={selectStyles}
        />
      </div>

      {error && (
        <div
          style={{
            color: "#b3261e",
            background: "#fde7e9",
            border: "1px solid #f4b4bb",
            padding: "8px 12px",
            borderRadius: "12px",
            fontFamily: "Heebo, Segoe UI, sans-serif",
            fontSize: "0.95rem",
          }}
        >
          {error}
        </div>
      )}

      <button className={form.button} onClick={handleSubmit} type="button">
        הוסף בניין
      </button>
    </FormCard>
  );
}
