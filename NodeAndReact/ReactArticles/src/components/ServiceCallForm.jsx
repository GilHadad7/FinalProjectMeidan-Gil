// src/components/ServiceCallForm.jsx
import React, { useEffect, useState } from "react";
import FormCard from "./ui/FormCard";
import form from "./ui/FormKit.module.css";

export default function ServiceCallForm({ onSuccess }) {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const user = JSON.parse(sessionStorage.getItem("user"));
  const createdBy = user?.name || "";

  useEffect(() => {
    fetch("http://localhost:3000/api/buildings")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setBuildings(data))
      .catch((err) => console.error("Failed to fetch buildings:", err));
  }, []);

  function handleImageChange(e) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!buildingId) return alert("בחר/י בניין");
    if (!title) return alert("בחר/י סוג תקלה");
    if (!description.trim()) return alert("כתוב/כתבי תיאור תקלה");

    const fd = new FormData();
    fd.append("building_id", buildingId);
    fd.append("description", description.trim());
    fd.append("location_in_building", (location || "").trim());
    fd.append("service_type", title);
    fd.append("status", "Open");
    fd.append("read_index", "0");
    fd.append("created_by", createdBy);
    if (imageFile) fd.append("image", imageFile);

    try {
      setSubmitting(true);
      const res = await fetch("http://localhost:3000/api/service-calls", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Server response error:", data);
        alert(data?.message || "שגיאה בשליחה");
        return;
      }

      alert("הקריאה נשלחה בהצלחה ✅");
      onSuccess?.();
      // reset
      setBuildingId("");
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
      {/* בניין */}
      <select
        className={form.select}
        value={buildingId}
        onChange={(e) => setBuildingId(e.target.value)}
      >
        <option value="">בחר בניין…</option>
        {buildings.map((b) => (
          <option key={b.building_id} value={b.building_id}>
            {b.full_address || b.name}
          </option>
        ))}
      </select>

      {/* סוג תקלה */}
      <select
        className={form.select}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      >
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

      {/* מיקום בבניין */}
      <input
        className={form.input}
        type="text"
        placeholder="מיקום תקלה"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        autoComplete="off"
      />

      {/* העלאת תמונה – אזור גדול ואסתטי */}
      <input
        id="servicecall-file"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className={form.srOnlyInput}   /* קלט חבוי נגיש */
      />
      <label htmlFor="servicecall-file" className={form.uploadBox}>
        <span className={form.uploadIcon}>📷</span>
        <div className={form.uploadText}>
          <div className={form.uploadTitle}>העלאת תמונה</div>
          <div className={form.uploadHint}>
            גרור/י לכאן או לחצ/י לבחירה מתוך המחשב
          </div>
          {imageFile && (
            <div className={form.uploadFilename}>{imageFile.name}</div>
          )}
        </div>
        <span className={form.fakeButton}>העלאת תמונה</span>
      </label>

      {/* תצוגה מקדימה */}
      {imagePreview && (
        <img src={imagePreview} alt="preview" className={form.uploadThumb} />
      )}

      <button
        className={form.button}
        onClick={handleSubmit}
        type="button"
        disabled={submitting}
      >
        {submitting ? "שולח…" : "שלח קריאה"}
      </button>
    </FormCard>
  );
}
