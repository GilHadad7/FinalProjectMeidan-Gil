import React, { useState, useEffect } from "react";
import Select from "react-select";
import BaseTable from "./ui/BaseTable";
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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/users?role=worker")
      .then((res) => res.json())
      .then((data) => setWorkers(data));
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
    if (res.ok) onDelete();
    else alert("שגיאה במחיקה");
  };

  const handleEditSave = async (idx) => {
    // בדיקה שכל ה־IDs שהוכנסו קיימים ברשימת העובדים
    const entered = editForm.assigned_workers
      ? editForm.assigned_workers.split(",").map(i => i.trim()).filter(i => i)
      : [];
    const invalid = entered.filter(id => !workers.some(w => w.user_id.toString() === id));
    if (invalid.length > 0) {
      return alert(`אין עובד כזה במערכת: ${invalid.join(", ")}`);
    }

    const id = buildings[idx].building_id;
    const updatedBuilding = { ...editForm, maintenance_type: "Full" };
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

  const filteredBuildings = buildings.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className={classes.searchWrapper}>
        <input
          type="text"
          placeholder="🔍 חפש לפי שם בניין..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={classes.searchInput}
        />
      </div>

      <BaseTable
        className={classes.table}
        headers={[
          "שם בניין",
          "כתובת",
          "דירות",
          "קומות",
          "ועד בית",
          "טלפון",
          "עובדים",
          "פעולות"
        ]}
      >
        {filteredBuildings.map((b, i) =>
          editIdx === i ? (
            <tr key={b.building_id}>
              <td>
                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className={classes.inputFull}
                />
              </td>
              <td className={classes.addressCell}>
                <input
                  name="full_address"
                  value={editForm.full_address}
                  onChange={handleEditChange}
                  className={classes.inputFull}
                />
              </td>
              <td>
                <input
                  name="apartments"
                  type="number"
                  value={editForm.apartments}
                  onChange={handleEditChange}
                  className={classes.inputFull}
                />
              </td>
              <td>
                <input
                  name="floors"
                  type="number"
                  value={editForm.floors}
                  onChange={handleEditChange}
                  className={classes.inputFull}
                />
              </td>
              <td>
                <input
                  name="committee"
                  value={editForm.committee}
                  onChange={handleEditChange}
                  className={classes.inputFull}
                />
              </td>
              <td>
                <input
                  name="phone"
                  value={editForm.phone}
                  maxLength={10}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      phone: e.target.value.replace(/\D/g, "")
                    })
                  }
                  className={classes.inputFull}
                />
              </td>
              <td className={classes.selectCell}>
                <Select
                  isMulti
                  options={workers.map((w) => ({
                    value: w.user_id.toString(),
                    label: w.name
                  }))}
                  value={
                    editForm.assigned_workers
                      ? editForm.assigned_workers.split(",").map((id) => {
                          const w = workers.find(
                            (w) => w.user_id.toString() === id.trim()
                          );
                          return { value: w.user_id.toString(), label: w.name };
                        })
                      : []
                  }
                  onChange={(opts) =>
                    setEditForm({
                      ...editForm,
                      assigned_workers: opts.map((o) => o.value).join(",")
                    })
                  }
                  placeholder="בחר עובדים..."
                  className={classes.selectFull}
                  classNamePrefix="react-select"
                />
              </td>
              <td>
                <div className={classes.actionGroup}>
                  <button
                    className={classes.actionBtn}
                    onClick={() => handleEditSave(i)}
                  >
                    💾
                  </button>
                  <button
                    className={classes.actionBtn}
                    onClick={handleEditCancel}
                  >
                    ❌
                  </button>
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
                      .map((id) =>
                        workers.find((w) => w.user_id.toString() === id.trim())
                          ?.name || `ID ${id}`
                      )
                      .join(", ")
                  : "-"}
              </td>
              <td>
                <div className={classes.actionGroup}>
                  <button
                    className={classes.actionBtn}
                    onClick={() => handleEdit(i, b)}
                  >
                    ✏️
                  </button>
                  <button
                    className={classes.actionBtn}
                    onClick={() => handleDelete(b.building_id)}
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          )
        )}
      </BaseTable>
    </>
  );
}
