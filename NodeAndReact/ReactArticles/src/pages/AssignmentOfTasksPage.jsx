import React, { useEffect, useState } from "react";
import classes from "./AssignmentOfTasksPage.module.css";
import TaskForm from "../components/TaskForm";
import TasksTable from "../components/TasksTable";

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

  return (
    <div className={classes.assignmentPage}>
      <div className={classes.formSection}>
        <TaskForm onSuccess={triggerRefresh} />
      </div>

      <div className={classes.tableSection}>
        {/* חיפוש בצד ימין במקום הכותרת */}
        <div className={classes.headerRow}>
          <div className={classes.searchBoxRight}>
            <label htmlFor="search" className={classes.searchLabel}>
            </label>
            <input
              id="search"
              className={classes.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 חיפוש לפי כתובת, סוג משימה…"
              dir="rtl"
            />
          </div>
        </div>

        <TasksTable tasks={tasks} search={search} onRefresh={triggerRefresh} />
      </div>
    </div>
  );
}
