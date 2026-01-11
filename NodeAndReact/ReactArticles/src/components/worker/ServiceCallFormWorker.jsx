// 📁 C:\PATH\TO\YOUR\PROJECT\client\src\components\worker\ServiceCallFormWorker.jsx
// הערה: טופס פתיחת קריאת שירות לעובד – הבניין מגיע מהדף למעלה (מציג כתובת בלבד)

import React, { useMemo, useState } from "react";
import FormCard from "../ui/FormCard";
import form from "../ui/FormKit.module.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8801";

export default function ServiceCallFormWorker({ buildingId, buildingAddress, onSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // המשתמש המחובר
  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // הערה: בחירת תמונה + תצוגה מקדימה
  function handleImageChange(e) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  // הערה: שליחת קריאת שירות לשרת
  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!buildingId) return alert("בחר בניין למעלה");
    if (!title) return alert("בחר סוג תקלה");
    if (!description.trim()) return alert("כתוב תיאור תקלה");

    const fd = new FormData();
    fd.append("building_id", String(buildingId));
    fd.append("description", description.trim());
    fd.append("location_in_building", (location || "").trim());
    fd.append("service_type", title);
    fd.append("status", "Open");
    fd.append("read_index", "0");
    fd.append("created_by", user?.name || "");

    if (imageFile) fd.append("image", imageFile);

    try {
      setSubmitting(true);

      const res = await fetch(`${API_BASE}/api/service-calls`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Server response error:", data);
        alert(data?.message || "שגיאה בשליחה");
        return;
      }

      alert("הקריאה נשלחה בהצלחה ✅");
      onSuccess?.();

      // reset
      setTitle("");
      setDescription("");
      setLocation("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error("שגיאה בשליחה:", err);
      alert("שגיאה בשרת");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormCard title="פתיחת קריאת שירות">
      {/* כתובת בלבד */}
      {buildingAddress ? (
        <div style={{ marginBottom: 10, fontWeight: 700, opacity: 0.9 }}>
          {buildingAddress}
        </div>
      ) : null}

      {/* סוג תקלה */}
      <select className={form.select} value={title} onChange={(e) => setTitle(e.target.value)}>
        <option value="">בחר סוג תקלה…</option>
        <option value="חשמל">חשמל</option>
        <option value="נזילה">נזילה</option>
        <option value="תקלה טכנית">תקלה טכנית</option>
        <option value="אינסטלציה">אינסטלציה</option>
        <option value="נזק">נזק</option>
        <option value="אחר">אחר</option>
      </select>

      {/* תיאור */}
      <textarea
        className={form.textarea}
        placeholder="תיאור"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* מיקום */}
      <input
        className={form.input}
        type="text"
        placeholder="מיקום תקלה"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        autoComplete="off"
      />

      {/* העלאת תמונה */}
      <input
        id="servicecall-file"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className={form.srOnlyInput}
      />
      <label htmlFor="servicecall-file" className={form.uploadBox}>
        <span className={form.uploadIcon}>📷</span>
        <div className={form.uploadText}>
          <div className={form.uploadTitle}>העלאת תמונה</div>
          <div className={form.uploadHint}>גרור/י לכאן או לחצ/י לבחירה מהמחשב</div>
          {imageFile && <div className={form.uploadFilename}>{imageFile.name}</div>}
        </div>
        <span className={form.fakeButton}>העלאת תמונה</span>
      </label>

      {imagePreview && <img src={imagePreview} alt="preview" className={form.uploadThumb} />}

      <button className={form.button} onClick={handleSubmit} type="button" disabled={submitting}>
        {submitting ? "שולח…" : "שלח קריאה"}
      </button>
    </FormCard>
  );
}
