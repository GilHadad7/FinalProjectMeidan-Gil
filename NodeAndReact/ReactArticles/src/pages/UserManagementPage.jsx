import React, { useEffect, useState } from "react";
import classes from "./UserManagementPage.module.css";
import UserForm from "../components/UserForm";
import UsersTable from "../components/UsersTable";

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
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
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      const added = await res.json();
      setUsers([...users, added]);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("למחוק את המשתמש?")) return;
    const res = await fetch(`http://localhost:3000/api/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers(users.filter(u => u.user_id !== id));
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
      body: JSON.stringify(editForm)
    });

    if (res.ok) {
      const updated = await res.json();
      setUsers(users.map(u => (u.user_id === id ? updated : u)));
      setEditId(null);
    } else {
      alert("שגיאה בעדכון המשתמש");
    }
  };

  const filtered = users.filter(u => {
    const searchLower = search.toLowerCase();
    return (
      (filterRole === "all" || u.role === filterRole) &&
      [u.name, u.email, u.phone].some(f =>
        (f || "").toLowerCase().includes(searchLower)
      )
    );
  });

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.leftPanel}>
        <UserForm onAdd={handleAdd} />
      </div>
      <div className={classes.rightPanel}>
        <div className={classes.headerRow}>
          <p>ניהול משתמשים</p>
          <input
            className={classes.searchInput}
            placeholder="חיפוש..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className={classes.filterSelect}
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="all">all</option>
            <option value="manager">manager</option>
            <option value="worker">worker</option>
            <option value="tenant">tenant</option>
          </select>
        </div>
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
