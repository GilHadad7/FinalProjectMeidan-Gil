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
      .then((data) => setTasks(data))
      .catch((err) => console.error("Error loading tasks:", err));
  }, [refreshFlag]);

  const triggerRefresh = () => setRefreshFlag((prev) => !prev);

  // 🔎 סינון בצד העמוד (הטבלה מקבלת רק את מה שמסונן)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;

    // ננסה לכסות את העמודות הנפוצות שלך:
    return tasks.filter((t) =>
      [
        t.building_address,   // כתובת בניין
        t.description,        // תיאור משימה
        t.frequency,          // תדירות (שבועי/חודשי/...)
        t.type,               // סוג משימה (ניקיון/חשמל/...)
        t.next_date,          // תאריך הבא
        t.weekday,            // יום
        t.time,               // שעה
        String(t.id),         // מספר משימה
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [tasks, search]);

  return (
    <div className={classes.assignmentPage}>
      <div className={classes.formSection}>
        <TaskForm onSuccess={triggerRefresh} />
      </div>

      <div className={classes.tableSection}>
        {/* 🔎 שורת חיפוש אחידה כמו בשאר הדפים */}
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
