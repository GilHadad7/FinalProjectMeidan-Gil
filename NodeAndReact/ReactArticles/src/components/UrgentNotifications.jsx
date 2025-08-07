// 🔔 UrgentNotifications.jsx
import React, { useEffect, useState } from "react";
import styles from "./UrgentNotifications.module.css";

export default function UrgentNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // בקשת קריאות שירות פתוחות + משימות של היום
        const [callsRes, tasksRes] = await Promise.all([
          fetch("http://localhost:8801/api/servicecalls"),
          fetch("http://localhost:8801/api/tasks/today"),
        ]);

        const callsData = await callsRes.json();
        const tasksData = await tasksRes.json();

        const now = new Date();

        // קריאות שירות פתוחות בלבד
        const openCalls = callsData.filter((call) => call.status === "Open");

        // משימות עם תאריך ביצוע להיום
        const todayTasks = tasksData.filter((task) => {
          const taskDate = new Date(task.next_date);
          return !isNaN(taskDate) && taskDate.toDateString() === now.toDateString();
        });

        // מיפוי משימות
        const taskNotifications = todayTasks.map((task) => ({
          type: "task",
          title: task.task_name,
          building: task.building_name,
          date: task.next_date,
        }));

        // מיפוי קריאות שירות
        const callNotifications = openCalls.map((call) => ({
          type: "call",
          title: call.description,
          building: call.building_name,
          location: call.location_in_building,
          date: call.created_at,
        }));

        // חיבור הכל למערך אחד
        setNotifications([...taskNotifications, ...callNotifications]);
      } catch (err) {
        console.error("❌ Failed to fetch notifications:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        INSTANT NOTIFICATION'S <span>(התראות דחופות)</span>
      </div>
      <div className={styles.body}>
        {notifications.length === 0 ? (
          <p className={styles.empty}>אין התראות כרגע 🎉</p>
        ) : (
          <ul className={styles.list}>
            {notifications.map((n, i) => (
              <li key={i} className={styles.card}>
                <strong>
                  {n.type === "call" ? "🔧 קריאה פתוחה: " : "📅 משימה להיום: "}
                  {n.title}
                </strong>
                <p>
                  {n.building}
                  {n.location ? ` – ${n.location}` : ""}
                </p>
                <span className={styles.date}>
                  {new Date(n.date).toLocaleDateString("he-IL")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
