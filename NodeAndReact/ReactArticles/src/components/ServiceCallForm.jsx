import React, { useState, useEffect } from "react";
import classes from "./ServiceCallForm.module.css";

export default function ServiceCallForm({ onSuccess }) {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const user = JSON.parse(sessionStorage.getItem("user"));
  const createdBy = user?.name;

  useEffect(() => {
    fetch("http://localhost:3000/api/buildings")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBuildings(data);
      })
      .catch((err) => console.error("Failed to fetch buildings:", err));
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("building_id", buildingId);
    formData.append("description", description);
    formData.append("location_in_building", location || "");
    formData.append("service_type", title);
    formData.append("status", "Open");
    formData.append("read_index", "0");
    formData.append("created_by", createdBy);
    if (imageFile) formData.append("image", imageFile);

    try {
      const res = await fetch("http://localhost:3000/api/service-calls", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        alert("הקריאה נשלחה בהצלחה!");
        onSuccess();
        setBuildingId("");
        setTitle("");
        setDescription("");
        setLocation("");
        setImageFile(null);
        setImagePreview(null);
      } else {
        console.error("Server response error:", data);
        alert(data.message || "שגיאה בשליחה");
      }
    } catch (err) {
      console.error("שגיאה בשליחה:", err);
      alert("שגיאה בשרת");
    }
  };

  return (
    <div className={classes.formContainer}>
      <h3 className={classes.title}>פתיחת קריאת שירות</h3>
      <form className={classes.form} onSubmit={handleSubmit}>
        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          required
          className={classes.input}
        >
          <option value="">בחר בניין...</option>
          {buildings.map((b) => (
            <option key={b.building_id} value={b.building_id}>
              {b.full_address}
            </option>
          ))}
        </select>

        <select
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={classes.input}
        >
          <option value="">בחר סוג תקלה...</option>
          <option value="חשמל">חשמל</option>
          <option value="נזילה">נזילה</option>
          <option value="תקלה טכנית">תקלה טכנית</option>
          <option value="אינסטלציה">אינסטלציה</option>
          <option value="נזק">נזק</option>
          <option value="אחר">אחר</option>
        </select>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תיאור"
          required
          className={classes.input}
        />

        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="מיקום"
          className={classes.input}
        />

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className={classes.input}
        />

        {imagePreview && (
          <img src={imagePreview} alt="preview" className={classes.previewImage} />
        )}

        <button className={classes.button} type="submit">שלח קריאה</button>
      </form>
    </div>
  );
}
