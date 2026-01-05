// 📁 src/components/WorkerReportsTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import classes from "./WorkerReportsTable.module.css";

const ROLE_CODE_TO_HE = { super: "אב בית", cleaner: "מנקה", manager: "מנהל", tenant: "דייר" };
const HE_TO_CODE = Object.fromEntries(Object.entries(ROLE_CODE_TO_HE).map(([c, h]) => [h, c]));

// הערה: ממיר תפקיד (עברית/אנגלית) לקוד אחיד
const toCode = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (HE_TO_CODE[s]) return HE_TO_CODE[s];
  const lower = s.toLowerCase();
  return ROLE_CODE_TO_HE[lower] ? lower : s;
};

// הערה: ממיר קוד תפקיד לתצוגה בעברית
const toHeb = (v) => (v ? (ROLE_CODE_TO_HE[String(v).toLowerCase()] || String(v)) : "");

// הערה: ריפוד מספרים ל-2 ספרות
const pad2 = (n) => String(n).padStart(2, "0");

// הערה: פורמט תאריך ישראלי DD-MM-YYYY
const toDateKey = (d) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;

// הערה: המרה "YYYY-MM-DD" לתאריך לוקאלי (בלי בעיות UTC)
const parseYMDLocal = (ymd) => {
  try {
    if (!ymd) return null;
    const s = String(ymd).slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return new Date(y, mo - 1, d, 0, 0, 0, 0);
  } catch {
    return null;
  }
};

// הערה: תחילת היום (00:00) להשוואות
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

// הערה: ניראות סטטוס בעברית
const normStatusHe = (s) => {
  const t = String(s || "").toLowerCase();
  if (t === "closed" || t === "סגור") return "סגור";
  if (t === "open" || t === "פתוח") return "פתוח";
  return s || "";
};

// הערה: תווית פעולה לקריאה: אם נסגר => "סגור", אחרת "פתוח"
const callKindHe = (status) => {
  const st = String(status || "").toLowerCase();
  if (st === "closed" || st === "סגור") return "סגור";
  return "פתוח";
};

// הערה: תרגום תדירות לתצוגה אחידה בעברית
const freqHe = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return "";
  if (["daily", "day", "יומי"].includes(s)) return "יומי";
  if (["weekly", "week", "שבועי"].includes(s)) return "שבועי";
  if (["monthly", "month", "חודשי"].includes(s)) return "חודשי";
  if (["yearly", "annual", "שנתי"].includes(s)) return "שנתי";
  return String(v);
};

// הערה: בוחר תאריך להצגה במשימה (עדיפות: last_done_at ואז next_date)
const pickTaskDate = (t) => {
  if (t?.last_done_at) return toDateKey(new Date(t.last_done_at));
  if (t?.next_date) {
    const d = parseYMDLocal(t.next_date);
    if (d) return toDateKey(d);
  }
  return "—";
};

// הערה: בוחר טקסט להצגה במשימה (עדיפות: description ואז task_name)
const pickTaskTitle = (t) => {
  const desc = String(t?.description || t?.task_description || "").trim();
  const name = String(t?.task_name || t?.taskName || "").trim();
  return desc || name || "—";
};

// הערה: בדיקה האם משימה "עברה את הזמן" (next_date < today)
const isTaskOverdue = (t) => {
  const today0 = startOfToday();
  const d = parseYMDLocal(t?.next_date);
  if (!d) return false;
  return d.getTime() < today0.getTime();
};

// הערה: קומפוננטת טבלת דוחות עובדים
export default function WorkerReportsTable({ filterMonth = "", filterRole = "", onCountChange }) {
  const [users, setUsers] = useState([]);
  const [rowsCleaner, setRowsCleaner] = useState([]);
  const [rowsSuper, setRowsSuper] = useState([]);
  const [openRow, setOpenRow] = useState(null);

  // cache עבור רשימות קריאות לעובדים
  const [callsByWorker, setCallsByWorker] = useState({});
  const [loadingCallsFor, setLoadingCallsFor] = useState("");

  // cache עבור משימות לעובדים (גם מנקה וגם אב בית)
  const [tasksByWorker, setTasksByWorker] = useState({});
  const [loadingTasksFor, setLoadingTasksFor] = useState("");

  const roleCode = useMemo(() => {
    const c = toCode(filterRole);
    return c && c !== "all" && c !== "כולם" ? c : "";
  }, [filterRole]);

  const monthStr = useMemo(() => {
    if (/^\d{4}-\d{2}$/.test(filterMonth)) return filterMonth;
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  }, [filterMonth]);

  useEffect(() => {
    fetch("http://localhost:3000/api/users")
      .then((r) => r.json())
      .then((arr) => (Array.isArray(arr) ? setUsers(arr) : setUsers([])))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    const fetchRole = async (role) => {
      const url = `http://localhost:3000/api/reports/workers-by-role?role=${role}&month=${monthStr}`;
      try {
        const r = await fetch(url);
        const j = await r.json();
        return Array.isArray(j.rows) ? j.rows : [];
      } catch {
        return [];
      }
    };

    if (!roleCode) {
      Promise.all([fetchRole("cleaner"), fetchRole("super")]).then(([cl, sp]) => {
        setRowsCleaner(cl || []);
        setRowsSuper(sp || []);
      });
    } else if (roleCode === "cleaner") {
      fetchRole("cleaner").then(setRowsCleaner);
      setRowsSuper([]);
    } else {
      fetchRole("super").then(setRowsSuper);
      setRowsCleaner([]);
    }
  }, [roleCode, monthStr]);

  // הערה: טעינת משימות (כולל description + frequency) עבור עובד
  const ensureTasksLoaded = async (workerName) => {
    if (!workerName) return;
    if (tasksByWorker[workerName]) return;

    try {
      setLoadingTasksFor(workerName);
      const res = await fetch(
        `http://localhost:3000/api/reports/worker/tasks?month=${encodeURIComponent(
          monthStr
        )}&name=${encodeURIComponent(workerName)}`
      );
      const arr = res.ok ? await res.json() : [];
      setTasksByWorker((prev) => ({ ...prev, [workerName]: Array.isArray(arr) ? arr : [] }));
    } catch {
      setTasksByWorker((prev) => ({ ...prev, [workerName]: [] }));
    } finally {
      setLoadingTasksFor("");
    }
  };

  // ✅ חדש: ברגע שיש רשימת עובדים בדוח – נטען משימות לכל העובדים (כדי ש"הושלמו" יתמלא בטבלה הראשית)
  useEffect(() => {
    const names = users
      .filter((u) => {
        const c = toCode(u.position);
        return roleCode ? c === roleCode : c === "cleaner" || c === "super";
      })
      .map((u) => u.name)
      .filter(Boolean);

    if (names.length === 0) return;

    // טוענים רק למי שלא נטען עדיין
    const toLoad = names.filter((n) => !tasksByWorker[n]);
    if (toLoad.length === 0) return;

    (async () => {
      for (const n of toLoad) {
        // טעינה סדרתית כדי לא להפציץ את השרת
        // אם תרצה מקבילי – אפשר Promise.all עם limit
        await ensureTasksLoaded(n);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, roleCode, monthStr]);

  const rows = useMemo(() => {
    const include = (pos) => {
      const c = toCode(pos);
      return roleCode ? c === roleCode : c === "cleaner" || c === "super";
    };

    const init = new Map(
      users
        .filter((u) => include(u.position))
        .map((u) => [
          u.name,
          {
            name: u.name,
            roleCode: toCode(u.position),
            tasksAssigned: 0,
            tasksDone: 0,
            callsHandled: 0,
            callsClosed: 0,
            lastActivity: 0,
            callDetails: [],
          },
        ])
    );

    const seenCleanerCountFor = new Set();
    const seenSuperTasksFor = new Set();

    // מנקות – סיכומים בסיסיים (עד שנחליף בהשלמה לפי זמן)
    for (const r of rowsCleaner) {
      const key = r.worker_name;
      if (!key) continue;

      if (!init.has(key)) {
        init.set(key, {
          name: key,
          roleCode: "cleaner",
          tasksAssigned: 0,
          tasksDone: 0,
          callsHandled: 0,
          callsClosed: 0,
          lastActivity: 0,
          callDetails: [],
        });
      }
      const acc = init.get(key);
      acc.roleCode = "cleaner";

      // שובצו = מספר משימות קבועות
      acc.tasksAssigned += 1;

      // fallback עד שהמשימות נטענו (נחליף למטה לפי tasksByWorker)
      acc.tasksDone += Number(r.done_in_month || 0);

      const lastDone = r.last_done_at ? new Date(r.last_done_at).getTime() : 0;
      acc.lastActivity = Math.max(acc.lastActivity, lastDone);

      if (!seenCleanerCountFor.has(key)) {
        const opened = Number(r.calls_opened || 0);
        const closedFromOpened = Number(r.calls_opened_closed || 0);
        acc.callsHandled += opened;
        acc.callsClosed += closedFromOpened;
        seenCleanerCountFor.add(key);
      }
    }

    // אבות בית – סיכומים + פירוט קריאות
    for (const r of rowsSuper) {
      const key = r.worker_name;
      if (!key) continue;

      if (!init.has(key)) {
        init.set(key, {
          name: key,
          roleCode: "super",
          tasksAssigned: 0,
          tasksDone: 0,
          callsHandled: 0,
          callsClosed: 0,
          lastActivity: 0,
          callDetails: [],
        });
      }

      const acc = init.get(key);
      acc.roleCode = "super";

      const bId = Number(r.building_id);
      const bName = String(r.building_name || "").trim().toLowerCase();
      const buildingKey = `${key}|${Number.isFinite(bId) && bId > 0 ? bId : `name:${bName}`}`;

      if (!seenSuperTasksFor.has(buildingKey)) {
        const assigned = Number(r.tasks_assigned || 0);
        const done = Number(r.tasks_done || 0);

        acc.tasksAssigned += assigned;
        acc.tasksDone += done;

        seenSuperTasksFor.add(buildingKey);
      }

      const lastTaskTs = r.last_task_done_at ? new Date(r.last_task_done_at).getTime() : 0;
      if (lastTaskTs > acc.lastActivity) acc.lastActivity = lastTaskTs;

      if (r.call_id) {
        acc.callsHandled += 1;
        const st = String(r.status || "").toLowerCase();
        if (st === "closed" || st === "סגור") acc.callsClosed += 1;

        const when = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (when > acc.lastActivity) acc.lastActivity = when;

        acc.callDetails.push({
          date: r.created_at ? toDateKey(new Date(r.created_at)) : "—",
          kind: callKindHe(r.status),
          type: r.service_type || "",
          address: r.building_name || "",
          status: normStatusHe(r.status || ""),
        });
      }
    }

    // ✅ חדש: אם נטענו משימות לעובד – "הושלמו" לפי next_date שעבר
    for (const [name, acc] of init.entries()) {
      const tasks = tasksByWorker[name];
      if (!Array.isArray(tasks) || tasks.length === 0) continue;

      // שובצו = מספר משימות בפועל
      acc.tasksAssigned = tasks.length;

      // הושלמו = משימות שעבר התאריך שלהן
      acc.tasksDone = tasks.filter(isTaskOverdue).length;

      // עודכן לאחרונה (אופציונלי): תאריך פעילות אחרון = מקסימום last_done_at / next_date
      const lastTs = tasks.reduce((mx, t) => {
        const a = t?.last_done_at ? new Date(t.last_done_at).getTime() : 0;
        const b = parseYMDLocal(t?.next_date)?.getTime?.() || 0;
        return Math.max(mx, a, b);
      }, 0);
      if (lastTs > acc.lastActivity) acc.lastActivity = lastTs;
    }

    return Array.from(init.values()).sort((a, b) => {
      const roleOrder = { super: 0, cleaner: 1 };
      const ra = roleOrder[a.roleCode] ?? 99;
      const rb = roleOrder[b.roleCode] ?? 99;
      if (ra !== rb) return ra - rb;
      return b.lastActivity - a.lastActivity || a.name.localeCompare(b.name, "he");
    });
  }, [users, rowsCleaner, rowsSuper, roleCode, tasksByWorker]);

  useEffect(() => {
    onCountChange?.(rows.length);
  }, [rows, onCountChange]);

  // הערה: טעינת רשימת קריאות לעובד כשפותחים שורה
  const ensureCallsLoaded = async (workerName, role) => {
    if (!workerName) return;
    if (callsByWorker[workerName]) return;

    try {
      setLoadingCallsFor(workerName);
      const by = role === "cleaner" ? "open" : "handled";
      const res = await fetch(
        `http://localhost:3000/api/reports/worker/calls?month=${encodeURIComponent(
          monthStr
        )}&name=${encodeURIComponent(workerName)}&by=${by}`
      );
      const arr = res.ok ? await res.json() : [];
      setCallsByWorker((prev) => ({ ...prev, [workerName]: Array.isArray(arr) ? arr : [] }));
    } catch {
      setCallsByWorker((prev) => ({ ...prev, [workerName]: [] }));
    } finally {
      setLoadingCallsFor("");
    }
  };

  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th>עובד</th>
          <th>תפקיד</th>
          <th>משימות</th>
          <th>קריאות שירות</th>
          <th>עודכן לאחרונה</th>
          <th>פרטים</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((r) => {
          const extraCalls = callsByWorker[r.name] || [];
          const extraAsDetails = extraCalls.map((c) => ({
            date: c.created_at ? toDateKey(new Date(c.created_at)) : "—",
            kind: callKindHe(c.status),
            type: c.service_type || "",
            address: c.building_address || "",
            status: normStatusHe(c.status || ""),
          }));

          const callDetailsFull =
            r.roleCode === "cleaner" ? extraAsDetails : [...r.callDetails, ...extraAsDetails];

          const workerTasks = tasksByWorker[r.name] || [];

          return (
            <React.Fragment key={r.name}>
              <tr>
                <td>{r.name}</td>
                <td>{toHeb(r.roleCode)}</td>

                <td>
                  שובצו: <b>{r.tasksAssigned}</b> | הושלמו: <b>{r.tasksDone}</b>
                </td>

                <td>
                  נפתח: <b>{r.callsHandled}</b> | נסגר: <b>{r.callsClosed}</b>
                </td>

                <td>{r.lastActivity ? toDateKey(new Date(r.lastActivity)) : "—"}</td>

                <td>
                  <button
                    className={classes.paidBtn}
                    onClick={async () => {
                      const next = openRow === r.name ? null : r.name;
                      setOpenRow(next);
                      if (next) {
                        await ensureCallsLoaded(r.name, r.roleCode);
                        await ensureTasksLoaded(r.name);
                      }
                    }}
                  >
                    {openRow === r.name ? "סגור" : "פתח"}
                  </button>
                </td>
              </tr>

              {openRow === r.name && (
                <tr>
                  <td colSpan={6} style={{ background: "#fbf9f5", direction: "rtl" }}>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div>
                        <h4 style={{ margin: "8px 0" }}>🧰 משימות</h4>

                        {loadingTasksFor === r.name ? (
                          <div style={{ color: "#9b8d7c" }}>טוען משימות…</div>
                        ) : workerTasks.length === 0 ? (
                          <div style={{ color: "#9b8d7c" }}>אין משימות בדוח.</div>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            {workerTasks.map((t) => {
                              const date = pickTaskDate(t);
                              const title = pickTaskTitle(t);
                              const building = t.building_name || "";
                              const freq = freqHe(t.frequency);

                              return (
                                <div key={t.task_id}>
                                  {date} · {title}
                                  {building ? ` · ${building}` : ""}
                                  {freq ? ` · ${freq}` : ""}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 style={{ margin: "8px 0" }}>🛠️ קריאות שירות</h4>

                        {loadingCallsFor === r.name ? (
                          <div style={{ color: "#9b8d7c" }}>טוען קריאות…</div>
                        ) : callDetailsFull.length === 0 ? (
                          <div style={{ color: "#9b8d7c" }}>אין קריאות שירות בדוח.</div>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            {callDetailsFull.map((c, i) => (
                              <div key={i}>
                                {c.date} · {c.kind} · {c.type || "—"}
                                {c.address ? ` · ${c.address}` : ""}{" "}
                                {c.status ? ` · (${c.status})` : ""}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}

        {rows.length === 0 && (
          <tr>
            <td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#7a6c5d" }}>
              אין עובדים תואמים לתפקיד/חודש שנבחרו.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
