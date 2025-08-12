import React, { useEffect, useState } from "react";
import classes from "./ExternalSuppliersPage.module.css";
import SupplierForm from "../components/SupplierForm";
import SuppliersTable from "../components/SuppliersTable";
import FiltersBar from "../components/ui/FiltersBar";
import SearchInput from "../components/ui/SearchInput";

export default function ExternalSuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [refreshFlag, setRefreshFlag] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3000/api/suppliers")
      .then((res) => res.json())
      .then((data) => setSuppliers(data))
      .catch((err) => console.error("Error loading suppliers:", err));
  }, [refreshFlag]);

  const triggerRefresh = () => setRefreshFlag((prev) => !prev);

  const handleAdd = async (newSupplier) => {
    const res = await fetch("http://localhost:3000/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSupplier),
    });
    if (res.ok) {
      const added = await res.json();
      setSuppliers((prev) => [...prev, added]);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("למחוק את הספק?")) return;
    const res = await fetch(`http://localhost:3000/api/suppliers/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleEditSave = async () => {
    if (!/^[0-9]{7,10}$/.test(editForm.phone)) {
      alert("מספר טלפון לא תקין – חייב להכיל בין 7 ל־10 ספרות בלבד");
      return;
    }
    const res = await fetch(`http://localhost:3000/api/suppliers/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setSuppliers((prev) => prev.map((s) => (s.id === editId ? updated : s)));
      setEditId(null);
    }
  };

  // סינון לפי החיפוש
  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return [s.name, s.field, s.phone, s.email].some((v) =>
      (v || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.leftPanel}>
        <SupplierForm onAdd={handleAdd} onSuccess={triggerRefresh} />
      </div>

      <div className={`${classes.rightPanel} ${classes.suppliersPage}`}>
        {/* 🔎 חיפוש מעל הטבלה – בדיוק כמו בניהול משתמשים */}
        <FiltersBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="חפש לפי שם, תחום, טלפון או מייל…"
            width={520}
          />
        </FiltersBar>

        <SuppliersTable
          suppliers={filtered}
          editId={editId}
          setEditId={setEditId}
          editForm={editForm}
          setEditForm={setEditForm}
          onDelete={handleDelete}
          onEditSave={handleEditSave}
          search={search}          // לסינון פנימי (אותו ערך)
        />
      </div>
    </div>
  );
}
