import React, { useState } from "react";
import classes from "./BuildingsTable.module.css"; // תוכל ליצור קובץ עיצוב נפרד

export default function BuildingsTable({ buildings, onDelete }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    full_address: "",
    apartments: "",
    floors: "",
    committee: "",
    phone: ""
  });

  const handleEdit = (idx, building) => {
    setEditIdx(idx);
    setEditForm({ ...building });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };



  const handleEditCancel = () => {
    setEditIdx(null);
  };

  const handleDelete = async (buildingId) => {
    if (!window.confirm("האם למחוק בניין זה?")) return;
    const res = await fetch(`http://localhost:3000/api/buildings/${buildingId}`, {
      method: "DELETE"
    });

    if (res.ok) {
      onDelete(); // רענון
    } else {
      alert("שגיאה במחיקה");
    }
  };
  const handleEditSave = async (idx) => {
    const id = buildings[idx].building_id;
  
    const updatedBuilding = {
      ...editForm,
      maintenance_type: "Full" // תוכל לשנות בהתאם
    };
  
    const res = await fetch(`http://localhost:3000/api/buildings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedBuilding)
    });
  
    if (res.ok) {
      setEditIdx(null);
      onDelete(); // רענון
    } else {
      alert("שגיאה בעדכון");
    }
  };
  

  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th>שם בניין</th>
          <th>כתובת</th>
          <th>דירות</th>
          <th>קומות</th>
          <th>ועד בית</th>
          <th>טלפון</th>
          <th>פעולות</th>
        </tr>
      </thead>
      <tbody>
        {buildings.map((b, i) => (
          editIdx === i ? (
            <tr key={b.building_id}>
              <td><input value={editForm.name} name="name" onChange={handleEditChange} /></td>
              <td><input value={editForm.full_address} name="full_address" onChange={handleEditChange} /></td>
              <td><input value={editForm.apartments} name="apartments" onChange={handleEditChange} type="number" /></td>
              <td><input value={editForm.floors} name="floors" onChange={handleEditChange} type="number" /></td>
              <td><input value={editForm.committee} name="committee" onChange={handleEditChange} /></td>
              <td><input value={editForm.phone} name="phone"  onChange={(e) => {
    const onlyNums = e.target.value.replace(/\D/g, "");
    setEditForm({ ...editForm, phone: onlyNums });
  }}
  maxLength={10} /></td>
              <td>
                <button onClick={() => handleEditSave(i)}>💾</button>
                <button onClick={handleEditCancel}>❌</button>
              </td>
            </tr>
          ) : (
            <tr key={b.building_id}>
              <td>{b.name}</td>
              <td>{b.full_address}</td>
              <td>{b.apartments}</td>
              <td>{b.floors}</td>
              <td>{b.committee}</td>
              <td>{b.phone}</td>
              <td>
              <div className={classes.actionGroup}>
                <button className={classes.actionBtn} onClick={() => handleEdit(i, b)}>✏️</button>
                <button className={classes.actionBtn} onClick={() => handleDelete(b.building_id)}>🗑️</button>
              </div>
            </td>   
            </tr>
          )
        ))}
      </tbody>
    </table>
  );
}
