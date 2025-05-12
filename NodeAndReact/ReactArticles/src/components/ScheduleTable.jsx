import React, { useEffect, useState } from "react";
import classes from "./ScheduleTable.module.css"; // ניצור קובץ CSS בנפרד

export default function ScheduleTable() {
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/schedule/combined")
      .then((res) => res.json())
      .then((data) => setSchedule(data))
      .catch((err) => console.error("שגיאה בטעינת לוח זמנים:", err));
  }, []);

  return (
    <div className={classes.ScheduleWrapper}>
      <h2 className={classes.Title}>לוח זמנים כולל (קריאות שירות + משימות)</h2>
      <table className={classes.Table}>
        <thead>
          <tr>
            <th>תאריך</th>
            <th>בניין</th>
            <th>סוג</th>
            <th>תיאור</th>
            <th>סוג מקור</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((item) => (
            <tr key={`${item.origin_type}-${item.id}`}>
              <td>{item.date}</td>
              <td>{item.building_address}</td>
              <td>{item.type}</td>
              <td>{item.description}</td>
              <td>{item.origin_type === "routine" ? "משימה קבועה" : "קריאת שירות"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
