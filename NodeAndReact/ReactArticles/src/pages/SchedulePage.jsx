
import React, { useState, useEffect } from "react";
import classes from "./SchedulePage.module.css";

export default function SchedulePage() {
  const [tasks, setTasks] = useState([]);

  const [sourceFilter, setSourceFilter] = useState({
    routine: false,
    service: false,
  });

  const [routineFilters, setRoutineFilters] = useState({
    ניקיון: false,
    תחזוקה: false,
    הדברה: false,
    ביקורות: false,
    "טיפול במעבדי מים": false,
  });

  const [serviceFilters, setServiceFilters] = useState({
    חשמל: false,
    נזילה: false,
    "תקלה טכנית": false,
    אינסטלציה: false,
    נזק: false,
    אחר: false,
  });

  const [hidePast, setHidePast] = useState(true); // מופעל כברירת מחדל
  const [dateFilters, setDateFilters] = useState({
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    fetch("http://localhost:3000/api/schedule")
      .then((res) => res.json())
      .then((data) => {
        const expanded = data.flatMap((task) => {
          if (task.origin_type === "routine" && task.frequency) {
            return generateRecurringTasks(task);
          }
          return [task];
        });

        const sorted = expanded.sort(
          (a, b) =>
            new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime)
        );

        setTasks(sorted);
      })
      .catch((err) => console.error("❌ שגיאה בטעינה:", err));
  }, []);

  const handleSourceFilterChange = (source) => {
    setSourceFilter((prev) => ({
      ...prev,
      [source]: !prev[source],
    }));
  };

  const handleRoutineFilterChange = (type) => {
    setRoutineFilters((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleServiceFilterChange = (type) => {
    setServiceFilters((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const filteredTasks = tasks.filter((task) => {
    const origin = task.origin_type;
    const isAnySourceActive = Object.values(sourceFilter).some((v) => v);
    const isAnyRoutineActive = Object.values(routineFilters).some((v) => v);
    const isAnyServiceActive = Object.values(serviceFilters).some((v) => v);
    const now = new Date();
    const taskDate = new Date(task.scheduled_datetime);

    if (hidePast && taskDate < now) return false;
    if (dateFilters.fromDate && taskDate < new Date(dateFilters.fromDate)) return false;
    if (dateFilters.toDate) {
      const toDate = new Date(dateFilters.toDate);
      toDate.setDate(toDate.getDate() + 1); // כולל התאריך עצמו
      if (taskDate >= toDate) return false;
    }
    

    if (!isAnySourceActive && !isAnyRoutineActive && !isAnyServiceActive) return true;
    if (isAnySourceActive && !sourceFilter[origin]) return false;
    if (origin === "routine" && isAnyRoutineActive)
      return routineFilters[task.type] === true;
    if (origin === "service" && isAnyServiceActive)
      return serviceFilters[task.type] === true;

    return true;
  });

  function formatDate(rawDate) {
    if (!rawDate) return "-";
    const date = new Date(rawDate);
    return date.toLocaleDateString("he-IL");
  }

  function formatTime(rawTime) {
    if (!rawTime) return "-";
    const [hours, minutes] = rawTime.split(":");
    return `${hours}:${minutes}`;
  }

  function generateRecurringTasks(task) {
    const occurrences = [];
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    let current = new Date(task.date);

    while (current <= maxDate) {
      const dateString = `${current.getFullYear()}-${String(
        current.getMonth() + 1
      ).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const scheduled_datetime = `${dateString}T${task.time || "00:00:00"}`;

      occurrences.push({
        ...task,
        date: new Date(current),
        scheduled_datetime,
      });

      if (task.frequency === "שבועי") {
        current.setDate(current.getDate() + 7);
      } else if (task.frequency === "חודשי") {
        current.setMonth(current.getMonth() + 1);
      } else if (task.frequency === "יומי") {
        current.setDate(current.getDate() + 1);
      } else {
        break;
      }
    }

    return occurrences;
  }

  function getWeekdayName(dateInput) {
    if (!dateInput) return "-";
    const date = new Date(dateInput);
    return date.toLocaleDateString("he-IL", { weekday: "long" });
  }

  return (
    <div className={classes.SchedulePage}>
      <h1 className={classes.Title}>לוח זמנים של מנהל</h1>

      <div className={classes.Filters}>
        <strong>בחר מקור להצגה:</strong>
        <label>
          <input
            type="checkbox"
            checked={sourceFilter.routine}
            onChange={() => handleSourceFilterChange("routine")}
          />
          משימות קבועות
        </label>
        <label>
          <input
            type="checkbox"
            checked={sourceFilter.service}
            onChange={() => handleSourceFilterChange("service")}
          />
          קריאות שירות
        </label>
        <label>
          <input
            type="checkbox"
            checked={hidePast}
            onChange={() => setHidePast(!hidePast)}
          />
          הסתר משימות/קריאות שעבר זמנן
        </label>
      </div>

      <div className={classes.Filters}>
        <div className={classes.dateFilterWrapper}>
          <label>מתאריך</label>
          <input
            type="date"
            value={dateFilters.fromDate}
            onChange={(e) =>
              setDateFilters({ ...dateFilters, fromDate: e.target.value })
            }
          />
        </div>
        <div className={classes.dateFilterWrapper}>
          <label>עד תאריך</label>
          <input
            type="date"
            value={dateFilters.toDate}
            onChange={(e) =>
              setDateFilters({ ...dateFilters, toDate: e.target.value })
            }
          />
        </div>
      </div>

      {sourceFilter.routine && (
        <div className={classes.Filters}>
          <strong>סוגי משימות קבועות:</strong>
          {Object.keys(routineFilters).map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={routineFilters[type]}
                onChange={() => handleRoutineFilterChange(type)}
              />
              {type}
            </label>
          ))}
        </div>
      )}

      {sourceFilter.service && (
        <div className={classes.Filters}>
          <strong>סוגי קריאות שירות:</strong>
          {Object.keys(serviceFilters).map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={serviceFilters[type]}
                onChange={() => handleServiceFilterChange(type)}
              />
              {type}
            </label>
          ))}
        </div>
      )}

      <table className={classes.Table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>יום בשבוע</th>
            <th>תאריך</th>
            <th>שעה</th>
            <th>בניין + כתובת</th>
            <th>סוג משימה</th>
            <th>תיאור</th>
            <th>אחראי</th>
            <th>מקור</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.map((task, idx) => (
            <tr
              key={idx}
              className={
                task.origin_type === "service" &&
                task.status?.trim() === "Closed"
                  ? classes.ClosedRow
                  : ""
              }
            >
              <td>#{task.id}</td>
              <td>{getWeekdayName(task.scheduled_datetime)}</td>
              <td>
                {formatDate(task.scheduled_datetime)}
                {task.origin_type === "routine" && task.frequency
                  ? ` (${task.frequency})`
                  : ""}
              </td>
              <td>
                {formatTime(new Date(task.scheduled_datetime).toTimeString())}
              </td>
              <td>{task.building_address || task.building || "-"}</td>
              <td>{task.type || "-"}</td>
              <td>{task.description || "-"}</td>
              <td>{task.worker || "-"}</td>
              <td>
                {task.origin_type === "routine"
                  ? "משימה קבועה"
                  : "קריאת שירות"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
