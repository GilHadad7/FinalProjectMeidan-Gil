import React, { useEffect, useMemo, useState } from "react";
import classes from "./AssignmentOfTasksPage.module.css";
import TaskForm from "../components/TaskForm";
import TasksTable from "../components/TasksTable";
import FiltersBar from "../components/ui/FiltersBar";
import SearchInput from "../components/ui/SearchInput";

export default function AssignmentOfTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading tasks:", err));
  }, [refreshFlag]);

  const triggerRefresh = () => setRefreshFlag((prev) => !prev);

  // ---- helpers ----
  const norm = (v) =>
    String(v ?? "")
      .normalize("NFKD")
      .replace(/[\u200E\u200F\u202A-\u202E]/g, "") // סימני RTL נסתרים
      .toLowerCase()
      .trim();

  // 🔎 סינון בצד העמוד (חיפוש עובד גם לפי כתובת/שם בניין)
  const filtered = useMemo(() => {
    const q = norm(search);
    if (!q) return tasks;

    // חיתוך למילים => כל המילים חייבות להופיע (AND)
    const tokens = q.split(/\s+/).filter(Boolean);

    return tasks.filter((t) => {
      // נסה לכסות שמות שדה נפוצים אצלך עבור כתובת/שם בניין
      const buildingText = [
        t.building_address,
        t.full_address,
        t.building_full_address,
        t.address,
        t.street,
        t.city,
        t.building_name,
        t.name,
        t.building?.full_address,
        t.building?.name,
      ]
        .filter(Boolean)
        .join(" ");

      const allText = [
        buildingText,           // ← כתובת/שם בניין
        t.description,          // תיאור משימה
        t.frequency,            // תדירות
        t.type,                 // סוג
        t.weekday,              // יום
        t.time,                 // שעה
        t.next_date,            // תאריך הבא (כמו שבא מהשרת)
        String(t.id),
      ]
        .filter(Boolean)
        .join(" ");

      const hay = norm(allText);
      return tokens.every((tok) => hay.includes(tok));
    });
  }, [tasks, search]);

  return (
    <div className={classes.assignmentPage}>
      <div className={classes.formSection}>
        <TaskForm onSuccess={triggerRefresh} />
      </div>

      <div className={classes.tableSection}>
        <FiltersBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="חיפוש לפי כתובת, סוג משימה, תדירות…"
            width={560}
          />
        </FiltersBar>

        <TasksTable tasks={filtered} onRefresh={triggerRefresh} />
      </div>
    </div>
  );
}
