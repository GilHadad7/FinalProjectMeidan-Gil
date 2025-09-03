import React, { useState, useEffect } from "react";
import Select from "react-select";
import BaseTable from "./ui/BaseTable";
import classes from "./BuildingsTable.module.css";

export default function BuildingsTable({ buildings, onDelete, searchTerm = "" }) {
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
      .then((res) => res.json())
      .then((data) => setWorkers(Array.isArray(data) ? data : []));
  }, []);

  /* ========= מיפוי משרה → תיאור ואימוג'י ========= */
  const POSITION_HE = {
    super: "אב בית",
    cleaner: "מנקה",
    electrician: "חשמלאי",
    plumber: "אינסטלטור",
    maintenance: "אחזקה",
    security: "אבטחה",
    gardener: "גנן",
    hvac: "טכנאי מיזוג",
    painter: "צבעי",
    other: "אחר",
  };

  const POSITION_EMOJI = {
    super: "🛠️",
    maintenance: "🧰",
    cleaner: "🧹",
    electrician: "⚡",
    plumber: "🔧",
    security: "🛡️",
    gardener: "🌿",
    hvac: "❄️",
    painter: "🎨",
    other: "👷",
  };

  const labelForWorker = (w) => {
    const pos = String(w?.position || "").toLowerCase();
    const emoji = POSITION_EMOJI[pos] || "";
    const he = POSITION_HE[pos];
    return `${emoji ? emoji + " " : ""}${w.name}${he ? " — " + he : ""}`;
  };

  /* ========= עזרי טלפון ========= */
  const onlyDigits10 = (v = "") => String(v).replace(/\D/g, "").slice(0, 10);
  const formatPhone = (raw = "") => {
    const d = onlyDigits10(raw);
    if (!d) return "";
    const mob3 = ["050", "052", "054", "055", "056", "057", "058", "059"];
    const land2 = ["04", "03", "02", "01", "07", "08", "09"];
    if (mob3.some((p) => d.startsWith(p))) {
      return d.length <= 3 ? d : `${d.slice(0, 3)}-${d.slice(3)}`;
    }
    if (land2.some((p) => d.startsWith(p))) {
      return d.length <= 2 ? d : `${d.slice(0, 2)}-${d.slice(2)}`;
    }
    return d.length <= 3 ? d : `${d.slice(0, 3)}-${d.slice(3)}`;
  };

  const handleEdit = (idx, building) => {
    setEditIdx(idx);
    setEditForm({ ...building, phone: onlyDigits10(building.phone) });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => setEditIdx(null);

  const handleDelete = async (buildingId) => {
    if (!window.confirm("האם למחוק בניין זה?")) return;
    const res = await fetch(`http://localhost:3000/api/buildings/${buildingId}`, {
      method: "DELETE"
    });
    if (res.ok) onDelete();
    else alert("שגיאה במחיקה");
  };

  const handleEditSave = async (idx) => {
    const phoneDigits = onlyDigits10(editForm.phone);
    if (phoneDigits.length !== 10) return;

    const entered = editForm.assigned_workers
      ? editForm.assigned_workers.split(",").map((i) => i.trim()).filter(Boolean)
      : [];
    const invalid = entered.filter((id) => !workers.some((w) => w.user_id.toString() === id));
    if (invalid.length > 0) return alert(`אין עובד כזה במערכת: ${invalid.join(", ")}`);

    const id = buildings[idx].building_id;
    const updatedBuilding = { ...editForm, phone: phoneDigits, maintenance_type: "Full" };

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
    (b.name || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  /* ========= אופציות ל־Select עם אימוג'י ========= */
  const workerOptions = workers.map((w) => ({
    value: w.user_id.toString(),
    label: labelForWorker(w),
  }));

  const selectedWorkersFromForm = () =>
    editForm.assigned_workers
      ? editForm.assigned_workers.split(",").map((id) => {
          const w = workers.find((x) => x.user_id.toString() === id.trim());
          return w
            ? { value: w.user_id.toString(), label: labelForWorker(w) }
            : { value: id.trim(), label: `ID ${id.trim()}` };
        })
      : [];

  /* ========= עוזר להצגה מרובת שורות בתצוגה רגילה ========= */
  const renderWorkersMultiline = (assignedCsv) => {
    if (!assignedCsv) return "-";
    const ids = assignedCsv.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return "-";
    return (
      <div className={classes.workersList}>
        {ids.map((id) => {
          const w = workers.find((x) => x.user_id.toString() === id);
          if (!w) return <div key={id}>ID {id}</div>;
          // נשתמש באותם אימוג׳י/טקסט כמו ב־select
          return (
            <div key={id} className={classes.workerLine}>
              {labelForWorker(w)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={classes.wrapper}>
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

              {/* טלפון – פורמט עם מקף + הודעת שגיאה אם פחות מ-10 ספרות */}
              <td>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <input
                    name="phone"
                    dir="ltr"
                    inputMode="numeric"
                    value={formatPhone(editForm.phone)}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, phone: onlyDigits10(e.target.value) }))
                    }
                    className={classes.inputFull}
                  />
                  {editForm.phone && editForm.phone.length > 0 && editForm.phone.length < 10 && (
                    <small style={{ color: "#de4b4b", fontSize: 10, lineHeight: 1.1, marginTop: 2 }}>
                      מס׳ טלפון חייב 10 ספרות
                    </small>
                  )}
                </div>
              </td>

              {/* === Select מרובה עובדים עם אימוג'י === */}
              <td className={classes.selectCell}>
                <Select
                  isMulti
                  options={workerOptions}
                  value={selectedWorkersFromForm()}
                  onChange={(opts) =>
                    setEditForm({
                      ...editForm,
                      assigned_workers: (opts || []).map((o) => o.value).join(",")
                    })
                  }
                  placeholder="בחר עובדים…"
                  className={classes.selectFull}
                  classNamePrefix="react-select"
                  styles={{
                    menu: (base) => ({ ...base, direction: "rtl" }),
                    input: (base) => ({ ...base, direction: "rtl" }),
                    singleValue: (base) => ({ ...base, direction: "rtl" }),
                    valueContainer: (base) => ({ ...base, direction: "rtl" }),
                  }}
                />
              </td>

              <td>
                <div className={classes.actionGroup}>
                  <button className={classes.actionBtn} onClick={() => handleEditSave(i)}>
                    💾
                  </button>
                  <button className={classes.actionBtn} onClick={handleEditCancel}>
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
              <td>{formatPhone(b.phone)}</td>

              {/* הצגה מרובת שורות עם אימוג׳י */}
              <td className={classes.workersCell}>
                {renderWorkersMultiline(b.assigned_workers)}
              </td>

              <td>
                <div className={classes.actionGroup}>
                  <button className={classes.actionBtn} onClick={() => handleEdit(i, b)}>
                    ✏️
                  </button>
                  <button className={classes.actionBtn} onClick={() => handleDelete(b.building_id)}>
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          )
        )}
      </BaseTable>
    </div>
  );
}
