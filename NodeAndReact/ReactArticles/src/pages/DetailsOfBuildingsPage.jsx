import React, { useState } from "react";
import styles from "./DetailsOfBuildingsPage.module.css";

const initialBuildings = [
  { name: "מגדלי נוף ים", address: "דרך הים 17, חיפה", apartments: 32, floors: 8, committee: "דפנה לוי", phone: "050-1234567" },
  { name: "שער העיר", address: "שדרות העצמאות 12, חיפה", apartments: 24, floors: 6, committee: "רוני כהן", phone: "052-9876543" },
  { name: "מגדלי הכרמל", address: "בן יהודה 44, חיפה", apartments: 18, floors: 5, committee: "אילנה בן טוב", phone: "053-5555555" },
  { name: "נופי הכרם", address: "רחוב גבעת הקפות 2, חיפה", apartments: 40, floors: 10, committee: "דוד ברוך", phone: "050-8888888" },
  { name: "מגדלי הקשת", address: "רחוב הקשת 7, קריית ים", apartments: 16, floors: 4, committee: "חני לוי", phone: "050-4444444" },
];

export default function DetailsOfBuildingsPage() {
  const [buildings, setBuildings] = useState(initialBuildings);
  const [form, setForm] = useState({ name: "", address: "", apartments: "", floors: "", committee: "", phone: "" });
  const [search, setSearch] = useState("");

  // --- עריכה ומחיקה ---
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", address: "", apartments: "", floors: "", committee: "", phone: "" });

  function handleEdit(idx, building) {
    setEditIdx(idx);
    setEditForm({ ...building });
  }
  function handleEditChange(e) {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  }
  function handleEditSave(idx) {
    setBuildings(buildings => buildings.map((b, i) => i === idx ? { ...editForm } : b));
    setEditIdx(null);
    setEditForm({ name: "", address: "", apartments: "", floors: "", committee: "", phone: "" });
  }
  function handleEditCancel() {
    setEditIdx(null);
    setEditForm({ name: "", address: "", apartments: "", floors: "", committee: "", phone: "" });
  }
  function handleDelete(idx) {
    if (window.confirm('האם למחוק בניין זה?')) {
      setBuildings(buildings => buildings.filter((_, i) => i !== idx));
      if (editIdx === idx) {
        setEditIdx(null);
        setEditForm({ name: "", address: "", apartments: "", floors: "", committee: "", phone: "" });
      }
    }
  }

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = e => {
    e.preventDefault();
    if (!form.name || !form.address) return;
    setBuildings([...buildings, { ...form }]);
    setForm({ name: "", address: "", apartments: "", floors: "", committee: "", phone: "" });
  };

  const filtered = buildings.filter(b => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return [b.name, b.address, b.committee, b.phone].some(f => f && f.toLowerCase().includes(s));
  });

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.formSection}>
        <h3 className={styles.formTitle}>הוספת בניין:</h3>
        <form onSubmit={handleAdd} className={styles.form}>
          <label>שם הבניין:<input name="name" value={form.name} onChange={handleChange} /></label>
          <label>כתובת:<input name="address" value={form.address} onChange={handleChange} /></label>
          <label>מס דירות:<input name="apartments" value={form.apartments} onChange={handleChange} type="number" /></label>
          <label>מס קומות:<input name="floors" value={form.floors} onChange={handleChange} type="number" /></label>
          <label>שם ועד בית:<input name="committee" value={form.committee} onChange={handleChange} /></label>
          <label>טלפון ועד בית:<input name="phone" value={form.phone} onChange={handleChange} /></label>
          <button className={styles.addButton} type="submit">הוסף בניין</button>
        </form>
      </div>
      <div className={styles.tableSection}>
        <div className={styles.headerRow}>
          <div className={styles.titleBox}>Details of buildings</div>
          <div className={styles.searchBox}>חיפוש:<input className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>שם בניין</th>
              <th>כתובת</th>
              <th>דירות</th>
              <th>קומות</th>
              <th>ועד בית</th>
              <th>טלפון ועד בית</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => (
              editIdx === i ? (
                <tr key={i}>
                  <td><input value={editForm.name} name="name" onChange={handleEditChange} /></td>
                  <td><input value={editForm.address} name="address" onChange={handleEditChange} /></td>
                  <td><input value={editForm.apartments} name="apartments" onChange={handleEditChange} type="number" /></td>
                  <td><input value={editForm.floors} name="floors" onChange={handleEditChange} type="number" /></td>
                  <td><input value={editForm.committee} name="committee" onChange={handleEditChange} /></td>
                  <td><input value={editForm.phone} name="phone" onChange={handleEditChange} /></td>
                  <td>
                    <button className={styles.editActionBtn} onClick={() => handleEditSave(i)} title="שמור">💾</button>
                    <button className={styles.editActionBtn} onClick={handleEditCancel} title="ביטול">❌</button>
                  </td>
                </tr>
              ) : (
                <tr key={i}>
                  <td>{b.name}</td>
                  <td>{b.address}</td>
                  <td>{b.apartments}</td>
                  <td>{b.floors}</td>
                  <td>{b.committee}</td>
                  <td>{b.phone}</td>
                  <td>
                    <span className={styles.actionIcon} title="ערוך" onClick={() => handleEdit(i, b)}>✏️</span>
                    <span className={styles.actionIcon} title="מחק" onClick={() => handleDelete(i)}>🗑️</span>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
