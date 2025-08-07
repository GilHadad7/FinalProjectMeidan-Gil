import React, { useEffect, useState } from "react";
import classes from "./ScheduleTable.module.css";

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
      <h2 className={classes.Title}>
        לוח זמנים כולל (קריאות שירות + משימות)
      </h2>
      <table className={classes.Table}>
        <thead>
          <tr>
            <th className={classes.Col1}>תאריך</th>
            <th className={classes.Col2}>בניין</th>
            <th className={classes.Col3}>סוג</th>
            <th className={classes.Col4}>תיאור</th>
            <th className={classes.Col5}>סוג מקור</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((item) => (
            <tr key={`${item.origin_type}-${item.id}`}>
              <td className={classes.Col1}>{item.date}</td>
              <td className={classes.Col2}>{item.building_address}</td>
              <td className={classes.Col3}>{item.type}</td>
              <td className={classes.Col4}>{item.description}</td>
              <td className={classes.Col5}>
                {item.origin_type === "routine"
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
