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

// סדר לוגי לתפקידים: מנהל (0) → עובד (1) → דייר (2) → אחר (3)
const roleWeight = (r) => {
  const x = String(r || "").toLowerCase();
  if (x === "manager") return 0;
  if (x === "worker")  return 1;
  if (x === "tenant")  return 2;
  return 3;
};

// אופציונלי: סדר עדין בתוך עובדים (למשל 'super' לפני אחרים). לא חובה.
const positionWeight = (p) => {
  const key = String(p || "").toLowerCase();
  if (key === "super")   return 0;  // אב בית תחילה
  if (key === "cleaner") return 1;  // מנקה
  return 9;                         // כל השאר
};

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
      // נטען מחדש כדי לקבל גם עמודות ה־JOIN
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

  // 🔎 סינון + ✅ מיון: מנהלים → עובדים → דיירים (בתוך הקבוצות לפי שם)
  const filtered = useMemo(() => {
    // תמיד לעבוד על העתק כדי לא למיין את state בטעות
    let list = Array.isArray(users) ? users.slice() : [];

    // סינון לפי בניין
    if (buildingFilter === "__none") {
      list = list.filter((u) => !u.building_id);
    } else if (buildingFilter) {
      const bid = Number(buildingFilter);
      list = list.filter((u) => Number(u.building_id) === bid);
    }

    // טקסט חיפוש
    const q = norm(search);
    if (q) {
      const qRoleEn = norm(roleEn(search));
      const tokens = [...new Set([q, qRoleEn].filter(Boolean))]
        .join(" ")
        .split(/\s+/)
        .filter(Boolean);

      list = list.filter((u) => {
        const hay = norm(
          [
            u.name,
            u.email,
            u.phone,
            u.id_number,
            u.role,                 // באנגלית
            roleHe(u.role),         // בעברית
            u.building_name,        // שם בניין
            u.building_full_address // כתובת בניין
          ]
            .filter(Boolean)
            .join(" ")
        );
        return tokens.every((t) => hay.includes(t));
      });
    }

    // ✅ מיון: מנהל → עובד → דייר; בתוך עובדים ניתן לתת עדיפות לאב בית/מנקה,
    // ואז ל-by name (עברית)
    list.sort((a, b) => {
      const rd = roleWeight(a.role) - roleWeight(b.role);
      if (rd !== 0) return rd;

      // שניהם עובדים? אפשר לתת סדר עדין לפי position
      if (String(a.role).toLowerCase() === "worker" && String(b.role).toLowerCase() === "worker") {
        const pd = positionWeight(a.position) - positionWeight(b.position);
        if (pd !== 0) return pd;
      }

      // ברירת מחדל: לפי שם
      return (a.name || "").localeCompare(b.name || "", "he", { numeric: true, sensitivity: "base" });
    });

    return list;
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
          buildings={buildings}
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
