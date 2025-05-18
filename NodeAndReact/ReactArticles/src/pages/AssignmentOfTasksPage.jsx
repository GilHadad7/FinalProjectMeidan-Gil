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
      .then(res => res.json())
      .then(data => setTasks(data))
      .catch(err => console.error("Error loading tasks:", err));
  }, [refreshFlag]);

  const triggerRefresh = () => setRefreshFlag(prev => !prev);

  return (
    <div className={classes.assignmentPage}>
      <div className={classes.formSection}>
        <TaskForm onSuccess={triggerRefresh} />
      </div>
      <div className={classes.tableSection}>
        <div className={classes.headerRow}>
        <div className={classes.searchBox}>
        <label htmlFor="search" className={classes.searchLabel}>חיפוש</label>
        <input
        id="search"
        className={classes.searchInput}
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="חיפוש לפי כתובת ,סוג משימה...."
        />
        </div>
        <div className={classes.titleBox}>ניהול משימות קבועות</div>
        </div>
        <TasksTable tasks={tasks} search={search} onRefresh={triggerRefresh} />
      </div>
    </div>
  );
}
