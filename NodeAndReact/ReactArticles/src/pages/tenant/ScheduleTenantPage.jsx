// src/pages/tenant/ScheduleTenantPage.jsx
import React, { useState, useEffect } from "react";
import classes from "./ScheduleTenantPage.module.css";
import BaseTable from "../../components/ui/BaseTable";

export default function ScheduleTenantPage() {
  const [tasks, setTasks] = useState([]);
  const [sourceFilter, setSourceFilter] = useState({ routine: false, service: false });

  const [routineFilters, setRoutineFilters] = useState({
    ניקיון: false,
    תחזוקה: false,
    הדברה: false,
    ביקורות: false,
    "טיפול במעבדי מים": false,
    אחר: false,
  });
  const [serviceFilters, setServiceFilters] = useState({
    חשמל: false,
    נזילה: false,
    "תקלה טכנית": false,
    אינסטלציה: false,
    נזק: false,
    אחר: false,
  });
  const [hidePast, setHidePast] = useState(true);
  const [dateFilters, setDateFilters] = useState({ fromDate: "", toDate: "" });

  // מי הדייר שמחובר (נשתמש ב־building_id לפולבאק בזמן פיתוח)
  const tenant = (() => {
    try { return JSON.parse(sessionStorage.getItem("user")) || null; } catch { return null; }
  })();
  const tenantBuildingId = tenant?.building_id ?? tenant?.buildingId ?? null;

  useEffect(() => {
    // כתובת ה־API של דיירים
    const base = "http://localhost:3000/api/schedule/tenant";
    const url =
      tenantBuildingId != null
        ? `${base}?building_id=${encodeURIComponent(tenantBuildingId)}`
        : base;

    fetch(url, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        let rows = Array.isArray(data) ? data : [];

        // יצירת מופעים עתידיים למשימות קבועות (אם יש frequency)
        const expanded = rows.flatMap((task) =>
          task.origin_type === "routine" && task.frequency
            ? generateRecurringTasks(task)
            : [task]
        );

        const sorted = expanded.sort(
          (a, b) => new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime)
        );
        setTasks(sorted);
      })
      .catch((err) => console.error("❌ שגיאה בטעינת לוח הדייר:", err));
  }, [tenantBuildingId]);

  const filteredTasks = tasks.filter((task) => {
    const scheduled = new Date(task.scheduled_datetime);

    if (hidePast) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDay = new Date(scheduled);
      taskDay.setHours(0, 0, 0, 0);
      if (taskDay < today) return false;
    }

    if (dateFilters.fromDate) {
      const from = new Date(dateFilters.fromDate);
      from.setHours(0, 0, 0, 0);
      if (scheduled < from) return false;
    }

    if (dateFilters.toDate) {
      const to = new Date(dateFilters.toDate);
      to.setHours(23, 59, 59, 999);
      if (scheduled > to) return false;
    }

    const isAnySource = Object.values(sourceFilter).some(Boolean);
    const isAnyRoutine = Object.values(routineFilters).some(Boolean);
    const isAnyService = Object.values(serviceFilters).some(Boolean);
    if (!isAnySource && !isAnyRoutine && !isAnyService) return true;
    if (isAnySource && !sourceFilter[task.origin_type]) return false;

    if (task.origin_type === "routine" && isAnyRoutine) {
      const explicit = Object.keys(routineFilters).filter((t) => t !== "אחר");
      if (explicit.includes(task.type)) {
        if (!routineFilters[task.type]) return false;
      } else {
        if (!routineFilters["אחר"]) return false;
      }
    }

    if (task.origin_type === "service" && isAnyService) {
      if (!serviceFilters[task.type]) return false;
    }

    return true;
  });

  function formatDate(d) {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleDateString("he-IL", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  }

  function formatTime(d) {
    if (!d) return "-";
    return new Date(d).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getWeekdayName(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("he-IL", { weekday: "long" });
  }

  function generateRecurringTasks(task) {
    const result = [];
    let current = new Date(task.date);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    while (current <= maxDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      result.push({
        ...task,
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
      <div className={classes.FiltersRow}>
        <div className={classes.Filters}>
          <label>
            <input
              type="checkbox"
              checked={sourceFilter.routine}
              onChange={() =>
                setSourceFilter((prev) => ({ ...prev, routine: !prev.routine }))
              }
            />
            משימות קבועות
          </label>
          <label>
            <input
              type="checkbox"
              checked={sourceFilter.service}
              onChange={() =>
                setSourceFilter((prev) => ({ ...prev, service: !prev.service }))
              }
            />
            קריאות שירות
          </label>
          <label>
            <input
              type="checkbox"
              checked={hidePast}
              onChange={() => setHidePast((prev) => !prev)}
            />
            הסתר שעבר זמנן
          </label>
        </div>

        <div className={classes.Filters}>
          <div className={classes.dateFilterWrapper}>
            <label>מתאריך</label>
            <input
              type="date"
              value={dateFilters.fromDate}
              onChange={(e) =>
                setDateFilters((prev) => ({ ...prev, fromDate: e.target.value }))
              }
            />
          </div>
          <div className={classes.dateFilterWrapper}>
            <label>עד תאריך</label>
            <input
              type="date"
              value={dateFilters.toDate}
              onChange={(e) =>
                setDateFilters((prev) => ({ ...prev, toDate: e.target.value }))
              }
            />
          </div>
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
                onChange={() =>
                  setRoutineFilters((prev) => ({ ...prev, [type]: !prev[type] }))
                }
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
                onChange={() =>
                  setServiceFilters((prev) => ({ ...prev, [type]: !prev[type] }))
                }
              />
              {type}
            </label>
          ))}
        </div>
      )}

      <BaseTable
        headers={[
          "יום בשבוע",
          "תאריך",
          "שעה",
          "בניין + כתובת",
          "סוג משימה",
          "תיאור",
          "אחראי",
          "מקור",
        ]}
      >
        {filteredTasks.map((task, idx) => (
          <tr
            key={idx}
            className={
              task.origin_type === "service" && (task.status || "").trim() === "Closed"
                ? classes.ClosedRow
                : ""
            }
          >
            <td>{getWeekdayName(task.scheduled_datetime)}</td>
            <td>
              {formatDate(task.scheduled_datetime)}
              {task.origin_type === "routine" && task.frequency ? ` (${task.frequency})` : ""}
            </td>
            <td>{formatTime(task.scheduled_datetime)}</td>
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
