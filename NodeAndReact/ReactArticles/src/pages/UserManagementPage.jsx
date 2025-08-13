import React, { useEffect, useMemo, useState } from "react";
import classes from "./UserManagementPage.module.css";
import UserForm from "../components/UserForm";
import UsersTable from "../components/UsersTable";
import FiltersBar from "../components/ui/FiltersBar";
import SearchInput from "../components/ui/SearchInput";

// עוזרים קטנים להמרת תפקידים EN <-> HE (בלי קובץ חיצוני)
const roleHe = (en) =>
  en === "worker" ? "עובד" :
  en === "manager" ? "מנהל" :
  en === "tenant" ? "דייר" : en;

const roleEn = (he) =>
  he === "עובד" ? "worker" :
  he === "מנהל" ? "manager" :
  he === "דייר" ? "tenant" : he;

// נרמול טקסט (מסיר תווי RTL נסתרים ומוריד לאותיות קטנות)
const norm = (v) =>
  String(v ?? "")
    .normalize("NFKD")
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    .toLowerCase()
    .trim();

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);         // ⬅️ רשימת בניינים
  const [buildingFilter, setBuildingFilter] = useState(""); // ⬅️ פילטר לפי בניין
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // טען משתמשים
  useEffect(() => {
    fetch("http://localhost:3000/api/users")
      .then(res => res.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error loading users:", err));
  }, []);

  // טען בניינים (לסלקט + שיוך בעריכה)
  useEffect(() => {
    fetch("http://localhost:3000/api/buildings")
      .then(r => r.json())
      .then(data => setBuildings(Array.isArray(data) ? data : []))
      .catch(() => setBuildings([]));
  }, []);

  // הוספה
  const handleAdd = async (newUser) => {
    const res = await fetch("http://localhost:3000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      // נטען מחדש כדי לקבל גם building_name/Full_address מה-JOIN
      const refreshed = await fetch("http://localhost:3000/api/users").then(r => r.json());
      setUsers(Array.isArray(refreshed) ? refreshed : []);
    }
  };

  // מחיקה
  const handleDelete = async (id) => {
    if (!window.confirm("למחוק את המשתמש?")) return;
    const res = await fetch(`http://localhost:3000/api/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers(prev => prev.filter(u => u.user_id !== id));
  };

  // שמירה
  const handleEditSave = async (id) => {
    // ולידציה לטלפון
    if (!/^[0-9]{7,10}$/.test(editForm.phone)) {
      alert("מספר טלפון לא תקין. יש להזין 7 עד 10 ספרות בלבד.");
      return;
    }
    // ולידציה למייל
    if (!editForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      alert("כתובת מייל לא תקינה.");
      return;
    }

    const res = await fetch(`http://localhost:3000/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    if (res.ok) {
      const updatedUsers = await fetch("http://localhost:3000/api/users").then(r => r.json());
      setEditId(null);
      setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
    } else {
      alert("שגיאה בעדכון המשתמש");
    }
  };

  // 🔎 סינון עם תמיכה בתפקיד בעברית/אנגלית + סינון לפי בניין + חיפוש לפי שם/כתובת בניין
  const filtered = useMemo(() => {
    let list = Array.isArray(users) ? users : [];

    // סינון לפי בניין
    if (buildingFilter === "__none") {
      list = list.filter((u) => !u.building_id);
    } else if (buildingFilter) {
      const bid = Number(buildingFilter);
      list = list.filter((u) => Number(u.building_id) === bid);
    }

    // טקסט חיפוש
    const q = norm(search);
    if (!q) return list;

    // אם חיפשו בעברית תפקיד – נמפה לאנגלית כדי לתפוס role
    const qRoleEn = norm(roleEn(search));
    const tokens = [...new Set([q, qRoleEn].filter(Boolean))]
      .join(" ")
      .split(/\s+/)
      .filter(Boolean);

    return list.filter((u) => {
      const hay = norm(
        [
          u.name,
          u.email,
          u.phone,
          u.id_number,
          u.role,                 // באנגלית
          roleHe(u.role),         // בעברית
          u.building_name,        // ⬅️ שם בניין
          u.building_full_address // ⬅️ כתובת בניין
        ]
          .filter(Boolean)
          .join(" ")
      );
      return tokens.every((t) => hay.includes(t));
    });
  }, [users, search, buildingFilter]);

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.leftPanel}>
        <UserForm onAdd={handleAdd} />
      </div>

      <div className={classes.rightPanel}>
      <FiltersBar>
  <SearchInput
    value={search}
    onChange={setSearch}
    placeholder="חפש לפי שם, ת.ז., תפקיד, טלפון, מייל או שם בניין…"
    width={520}
  />

  {/* סלקט מעוצב כ'פיל' */}
  <div className={classes.searchSelectWrap}>
    <select
      className={classes.searchSelect}
      value={buildingFilter}
      onChange={(e) => setBuildingFilter(e.target.value)}
      aria-label="סינון לפי בניין"
    >
      <option value="">כל הבניינים</option>
      <option value="__none">ללא בניין</option>
      {buildings
        .slice()
        .sort((a, b) => (a?.name || "").localeCompare(b?.name || "", "he", { numeric: true }))
        .map((b) => (
          <option key={b.building_id} value={b.building_id}>
            {b.name || b.full_address || `בניין #${b.building_id}`}
          </option>
        ))}
    </select>
  </div>
</FiltersBar>



        <UsersTable
          users={filtered}
          buildings={buildings}     // ⬅️ כדי שה־select בעמודה "שם בניין" יעבוד בעריכה
          editId={editId}
          setEditId={setEditId}
          editForm={editForm}
          setEditForm={setEditForm}
          onDelete={handleDelete}
          onEditSave={handleEditSave}
        />
      </div>
    </div>
  );
}
