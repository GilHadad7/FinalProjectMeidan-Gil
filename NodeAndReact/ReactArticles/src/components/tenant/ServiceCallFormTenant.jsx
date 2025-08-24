// src/components/tenant/ServiceCallFormTenant.jsx
import React, { useEffect, useMemo, useState } from "react";
import FormCard from "../ui/FormCard";
import form from "../ui/FormKit.module.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8801";

function buildingLabel(b) {
  return b?.full_address || b?.name || `בניין #${b?.building_id ?? ""}`;
}

export default function ServiceCallFormTenant({ onSuccess }) {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // המשתמש המחובר
  const user = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("user") || "{}"); }
    catch { return {}; }
  }, []);
  const myBuildingId = user?.building_id ? String(user.building_id) : "";

  // טען בניין/ים וקבע בחירה אוטומטית
  useEffect(() => {
    (async () => {
      try {
        // אם לדייר יש בניין צמוד – נבחר בו ונטען את פרטיו להצגה
        if (myBuildingId) {
          setBuildingId(myBuildingId);

          // ננסה להביא בניין ספציפי; אם אין ראוט כזה – נביא את כולם ונמצא את המתאים
          let one = null;
          try {
            const r1 = await fetch(`${API_BASE}/api/buildings/${myBuildingId}`);
            if (r1.ok) one = await r1.json();
          } catch (_) {}

          if (!one) {
            const r2 = await fetch(`${API_BASE}/api/buildings`);
            const all = await r2.json();
            one = (Array.isArray(all) ? all : []).find(
              (b) => String(b.building_id) === myBuildingId
            );
          }

          if (one) setBuildings([one]);
          else setBuildings([]); // fallback
        } else {
          // אין בניין קבוע לדייר – נטען רשימה מלאה
          const res = await fetch(`${API_BASE}/api/buildings`);
          const data = await res.json();
          setBuildings(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch buildings:", err);
        setBuildings([]);
      }
    })();
  }, [myBuildingId]);

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
    fd.append("created_by", user?.name || "");

    if (imageFile) fd.append("image", imageFile);

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/service-calls`, {
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

      // reset (לא לשנות בניין אם זה בניין קבוע לדייר)
      if (!myBuildingId) setBuildingId("");
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
      {/* בניין: נבחר אוטומטית ו"ננעל" אם שויך לדייר */}
      <select
        className={form.select}
        value={buildingId}
        onChange={(e) => setBuildingId(e.target.value)}
        disabled={!!myBuildingId || buildings.length === 1}
      >
        {!buildingId && <option value="">בחר בניין…</option>}
        {buildings.map((b) => (
          <option key={b.building_id} value={b.building_id}>
            {buildingLabel(b)}
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
