import React, { useState, useEffect } from "react";
import Select from "react-select";
import classes from "./BuildingsTable.module.css";

export default function BuildingsTable({ buildings, onDelete }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    full_address: "",
    apartments: "",
    floors: "",
    committee: "",
    phone: "",
    assigned_workers: ""
  });

  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/users?role=worker")
      .then(res => res.json())
      .then(data => setWorkers(data));
  }, []);

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
      onDelete();
    } else {
      alert("שגיאה במחיקה");
    }
  };

  const handleEditSave = async (idx) => {
    const id = buildings[idx].building_id;

    const updatedBuilding = {
      ...editForm,
      maintenance_type: "Full"
    };

    const res = await fetch(`http://localhost:3000/api/buildings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedBuilding)
    });

    if (res.ok) {
      setEditIdx(null);
      onDelete();
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
          <th>עובדים</th>
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
              <td><input value={editForm.phone} name="phone" onChange={(e) => {
                const onlyNums = e.target.value.replace(/\D/g, "");
                setEditForm({ ...editForm, phone: onlyNums });
              }} maxLength={10} /></td>
              <td>
                <Select
              isMulti
              options={workers.map((w) => ({
                value: w.user_id.toString(),
                label: w.name
              }))}
              value={
                editForm.assigned_workers
                  ? editForm.assigned_workers.split(",").map((id) => {
                      const w = workers.find((w) => w.user_id.toString() === id.trim());
                      return {
                        value: w?.user_id.toString(),
                        label: w?.name || `ID ${id}`
                      };
                    })
                  : []
              }
              onChange={(selectedOptions) => {
                const values = selectedOptions.map((opt) => opt.value);
                setEditForm({ ...editForm, assigned_workers: values.join(",") });
              }}
              placeholder="בחר עובדים..."
            />

              </td>
              <td>
                <div className={classes.actionGroup}>
                  <button className={classes.actionBtn} onClick={() => handleEditSave(i)}>💾</button>
                  <button className={classes.actionBtn} onClick={handleEditCancel}>❌</button>
                </div>
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
                {b.assigned_workers
                  ? b.assigned_workers
                      .split(",")
                      .map(id => {
                        const w = workers.find(w => w.user_id.toString() === id.trim());
                        return w ? w.name : `ID ${id}`;
                      })
                      .join(", ")
                  : "-"}
              </td>
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
