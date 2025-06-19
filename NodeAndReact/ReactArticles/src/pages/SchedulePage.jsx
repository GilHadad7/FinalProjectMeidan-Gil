import React, { useState, useEffect } from "react";
import classes from "./SchedulePage.module.css";
import BaseTable from "../components/ui/BaseTable";

export default function SchedulePage() {
  const [tasks, setTasks] = useState([]);

  const [sourceFilter, setSourceFilter] = useState({ routine: false, service: false });
  const [routineFilters, setRoutineFilters] = useState({
    ניקיון: false, תחזוקה: false, הדברה: false, ביקורות: false, "טיפול במעבדי מים": false,
  });
  const [serviceFilters, setServiceFilters] = useState({
    חשמל: false, נזילה: false, "תקלה טכנית": false, אינסטלציה: false, נזק: false, אחר: false,
  });
  const [hidePast, setHidePast] = useState(true);
  const [dateFilters, setDateFilters] = useState({ fromDate: "", toDate: "" });

  useEffect(() => {
    fetch("http://localhost:3000/api/schedule")
      .then((res) => res.json())
      .then((data) => {
        const expanded = data.flatMap((task) =>
          task.origin_type === "routine" && task.frequency ? generateRecurringTasks(task) : [task]
        );
        const sorted = expanded.sort((a, b) =>
          new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime)
        );
        setTasks(sorted);
      })
      .catch((err) => console.error("❌ שגיאה בטעינה:", err));
  }, []);

  const handleSourceFilterChange = (source) =>
    setSourceFilter((prev) => ({ ...prev, [source]: !prev[source] }));
  const handleRoutineFilterChange = (type) =>
    setRoutineFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  const handleServiceFilterChange = (type) =>
    setServiceFilters((prev) => ({ ...prev, [type]: !prev[type] }));

  const filteredTasks = tasks.filter((task) => {
    const origin = task.origin_type;
    const taskDate = new Date(task.scheduled_datetime);
    const isAnySource = Object.values(sourceFilter).some(Boolean);
    const isAnyRoutine = Object.values(routineFilters).some(Boolean);
    const isAnyService = Object.values(serviceFilters).some(Boolean);

    if (hidePast && new Date(taskDate.setHours(0, 0, 0, 0)) < new Date().setHours(0, 0, 0, 0)) return false;
    if (dateFilters.fromDate && taskDate < new Date(dateFilters.fromDate)) return false;
    if (dateFilters.toDate && taskDate >= new Date(new Date(dateFilters.toDate).setDate(new Date(dateFilters.toDate).getDate() + 1))) return false;
    if (!isAnySource && !isAnyRoutine && !isAnyService) return true;
    if (isAnySource && !sourceFilter[origin]) return false;
    if (origin === "routine" && isAnyRoutine && !routineFilters[task.type]) return false;
    if (origin === "service" && isAnyService && !serviceFilters[task.type]) return false;
    return true;
  });

  function formatDate(d) {
    return d ? new Date(d).toLocaleDateString("he-IL") : "-";
  }
  function formatTime(t) {
    const [h, m] = t?.split(":") || [];
    return h && m ? `${h}:${m}` : "-";
  }
  function getWeekdayName(d) {
    return d ? new Date(d).toLocaleDateString("he-IL", { weekday: "long" }) : "-";
  }
  function generateRecurringTasks(task) {
    const result = [];
    let current = new Date(task.date);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    while (current <= maxDate) {
      const dateStr = current.toISOString().split("T")[0];
      result.push({
        ...task,
        date: new Date(current),
        scheduled_datetime: `${dateStr}T${task.time || "00:00:00"}`,
      });

      if (task.frequency === "שבועי") current.setDate(current.getDate() + 7);
      else if (task.frequency === "חודשי") current.setMonth(current.getMonth() + 1);
      else if (task.frequency === "יומי") current.setDate(current.getDate() + 1);
      else break;
    }
    return result;
  }

  return (
    <div className={classes.SchedulePage}>
      <h1 className={classes.Title}>לוח זמנים של מנהל</h1>

      <div className={classes.Filters}>
        <strong>בחר מקור להצגה:</strong>
        <label><input type="checkbox" checked={sourceFilter.routine} onChange={() => handleSourceFilterChange("routine")} /> משימות קבועות</label>
        <label><input type="checkbox" checked={sourceFilter.service} onChange={() => handleSourceFilterChange("service")} /> קריאות שירות</label>
        <label><input type="checkbox" checked={hidePast} onChange={() => setHidePast(!hidePast)} /> הסתר משימות/קריאות שעבר זמנן</label>
      </div>

      <div className={classes.Filters}>
        <div className={classes.dateFilterWrapper}>
          <label>מתאריך</label>
          <input type="date" value={dateFilters.fromDate} onChange={(e) => setDateFilters({ ...dateFilters, fromDate: e.target.value })} />
        </div>
        <div className={classes.dateFilterWrapper}>
          <label>עד תאריך</label>
          <input type="date" value={dateFilters.toDate} onChange={(e) => setDateFilters({ ...dateFilters, toDate: e.target.value })} />
        </div>
      </div>

      {sourceFilter.routine && (
        <div className={classes.Filters}>
          <strong>סוגי משימות קבועות:</strong>
          {Object.keys(routineFilters).map((type) => (
            <label key={type}>
              <input type="checkbox" checked={routineFilters[type]} onChange={() => handleRoutineFilterChange(type)} /> {type}
            </label>
          ))}
        </div>
      )}

      {sourceFilter.service && (
        <div className={classes.Filters}>
          <strong>סוגי קריאות שירות:</strong>
          {Object.keys(serviceFilters).map((type) => (
            <label key={type}>
              <input type="checkbox" checked={serviceFilters[type]} onChange={() => handleServiceFilterChange(type)} /> {type}
            </label>
          ))}
        </div>
      )}

      <BaseTable
        headers={["ID", "יום בשבוע", "תאריך", "שעה", "בניין + כתובת", "סוג משימה", "תיאור", "אחראי", "מקור"]}
      >
        {filteredTasks.map((task, idx) => (
          <tr key={idx} className={task.origin_type === "service" && task.status?.trim() === "Closed" ? classes.ClosedRow : ""}>
            <td>#{task.id}</td>
            <td>{getWeekdayName(task.scheduled_datetime)}</td>
            <td>
              {formatDate(task.scheduled_datetime)}
              {task.origin_type === "routine" && task.frequency ? ` (${task.frequency})` : ""}
            </td>
            <td>{formatTime(new Date(task.scheduled_datetime).toTimeString())}</td>
            <td>{task.building_address || task.building || "-"}</td>
            <td>{task.type || "-"}</td>
            <td>{task.description || "-"}</td>
            <td>{task.worker || "-"}</td>
            <td>{task.origin_type === "routine" ? "משימה קבועה" : "קריאת שירות"}</td>
          </tr>
        ))}
      </BaseTable>
    </div>
  );
}
