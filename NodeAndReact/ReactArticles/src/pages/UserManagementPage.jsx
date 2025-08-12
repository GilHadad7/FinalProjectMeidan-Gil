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

const norm = (v) => (v ?? "").toString().trim().toLowerCase();

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetch("http://localhost:3000/api/users")
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error("Error loading users:", err));
  }, []);

  const handleAdd = async (newUser) => {
    const res = await fetch("http://localhost:3000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      const added = await res.json();
      setUsers(prev => [...prev, added]);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("למחוק את המשתמש?")) return;
    const res = await fetch(`http://localhost:3000/api/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers(prev => prev.filter(u => u.user_id !== id));
  };

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
      setUsers(updatedUsers);
    } else {
      alert("שגיאה בעדכון המשתמש");
    }
  };

  // 🔎 סינון כולל תמיכה בחיפוש בעברית/אנגלית לתפקיד (עובד/מנהל/דייר ↔ worker/manager/tenant)
  const filtered = useMemo(() => {
    const q = norm(search);
    if (!q) return users;

    // אם חיפשו בעברית, נמפה גם לאנגלית כדי לתפוס ערך role מקורי
    const qRoleEn = norm(roleEn(search));
    const queries = new Set([q, qRoleEn].filter(Boolean));

    return users.filter((u) => {
      const haystack = [
        u.name,
        u.email,
        u.phone,
        u.id_number,
        u.role,          // באנגלית
        roleHe(u.role),  // בעברית
      ].map(norm);

      for (const query of queries) {
        if (haystack.some((h) => h.includes(query))) return true;
      }
      return false;
    });
  }, [users, search]);

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.leftPanel}>
        <UserForm onAdd={handleAdd} />
      </div>

      <div className={classes.rightPanel}>
        {/* ✅ תיבת חיפוש בעיצוב האחיד */}
        <FiltersBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="חפש לפי שם, ת.ז., תפקיד, טלפון או מייל…"
            width={520}
          />
        </FiltersBar>

        <UsersTable
          users={filtered}
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
