import React, { useState, useEffect } from "react";
import classes from "./SchedulePage.module.css";

export default function SchedulePage() {
  const [tasks, setTasks] = useState([]);

  // פילטר לפי מקור
  const [sourceFilter, setSourceFilter] = useState({
    routine: false,
    service: false,
  });

  // פילטר לפי סוגי משימות קבועות
  const [routineFilters, setRoutineFilters] = useState({
    ניקיון: false,
    תחזוקה: false,
    הדברה: false,
    ביקורות: false,
    "טיפול במעבדי מים": false,
  });

  // פילטר לפי סוגי קריאות שירות
  const [serviceFilters, setServiceFilters] = useState({
    חשמל: false,
    נזילה: false,
    "תקלה טכנית": false,
    "תקלה אישית": false,
    נזק: false,
    אחר: false,
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
      
        // ✅ מיון לפי scheduled_datetime מהשרת
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

  // ✅ סינון לפי פילטרים פעילים — רק אם נבחר משהו
  const filteredTasks = tasks.filter((task) => {
    const origin = task.origin_type;

    const isAnySourceActive = Object.values(sourceFilter).some((v) => v);
    const isAnyRoutineActive = Object.values(routineFilters).some((v) => v);
    const isAnyServiceActive = Object.values(serviceFilters).some((v) => v);

    // אם לא הופעל שום פילטר בכלל → להציג הכל
    if (!isAnySourceActive && !isAnyRoutineActive && !isAnyServiceActive) {
      return true;
    }

    // סינון לפי מקור (אם מסומן)
    if (isAnySourceActive && !sourceFilter[origin]) {
      return false;
    }

    // סינון לפי סוג (אם מקורו routine)
    if (origin === "routine" && isAnyRoutineActive) {
      return routineFilters[task.type] === true;
    }

    // סינון לפי סוג (אם מקורו service)
    if (origin === "service" && isAnyServiceActive) {
      return serviceFilters[task.type] === true;
    }

    return true;
  });
  function formatDate(rawDate) {
    if (!rawDate) return "-";
    const date = new Date(rawDate);
    return date.toLocaleDateString("he-IL"); // תאריך עברי
  }
  
  function formatTime(rawTime) {
    if (!rawTime) return "-";
    const [hours, minutes] = rawTime.split(":");
    return `${hours}:${minutes}`;
  }
  
  
  function generateRecurringTasks(task) {
    const occurrences = [];
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1); // שנה קדימה
  
    let current = new Date(task.date);
  
    while (current <= maxDate) {
      const dateString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    const scheduled_datetime = `${dateString}T${task.time || "00:00:00"}`;
    
      occurrences.push({
        ...task,
        date: new Date(current),
        scheduled_datetime, // ✅ הכנס את הזמן החדש
      });
  
      // זזים קדימה לפי תדירות
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
    return date.toLocaleDateString("he-IL", { weekday: "long" }); // לדוגמה: "שלישי"
  }
  
  
  
  return (
    <div className={classes.SchedulePage}>
      <h1 className={classes.Title}>לוח זמנים של מנהל</h1>

      {/* סינון לפי מקור */}
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
      </div>

      {/* סינון לפי סוגי משימות */}
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

      {/* סינון לפי סוגי קריאות שירות */}
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

      {/* טבלה */}
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
        task.origin_type === "service" && task.status?.trim() === "Closed"
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
<td>{formatTime(new Date(task.scheduled_datetime).toTimeString())}</td>

      <td>{task.building_address || task.building || "-"}</td>
      <td>{task.type || "-"}</td>
      <td>{task.description || "-"}</td>
      <td>{task.worker || "-"}</td>
      <td>{task.origin_type === "routine" ? "משימה קבועה" : "קריאת שירות"}</td>
    </tr>
  ))}
</tbody>

      </table>
    </div>
  );
}
