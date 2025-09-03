// src/components/WorkerReportsTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import classes from "./WorkerReportsTable.module.css";

const ROLE_CODE_TO_HE = { super: "אב בית", cleaner: "מנקה", manager: "מנהל", tenant: "דייר" };
const HE_TO_CODE = Object.fromEntries(Object.entries(ROLE_CODE_TO_HE).map(([c,h])=>[h,c]));
const toCode = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (HE_TO_CODE[s]) return HE_TO_CODE[s];
  const lower = s.toLowerCase();
  return ROLE_CODE_TO_HE[lower] ? lower : s;
};
const toHeb = (v) => (v ? (ROLE_CODE_TO_HE[String(v).toLowerCase()] || String(v)) : "");
const pad2 = (n) => String(n).padStart(2, "0");
const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

// 🆕 עזר לניראות סטטוס בעברית
const normStatusHe = (s) => {
  const t = String(s||"").toLowerCase();
  if (t === "closed" || t === "סגור") return "סגור";
  if (t === "open"   || t === "פתוח") return "פתוח";
  return s || "";
};

export default function WorkerReportsTable({
  filterMonth = "",          // YYYY-MM
  filterRole = "",           // "כל התפקידים" | "אב בית"/"מנקה" | "super"/"cleaner"
  onCountChange,
}) {
  const [users, setUsers] = useState([]);
  const [rowsCleaner, setRowsCleaner] = useState([]);
  const [rowsSuper, setRowsSuper] = useState([]);
  const [openRow, setOpenRow] = useState(null);

  // 🆕 cache עבור רשימות קריאות לעובדים
  const [callsByWorker, setCallsByWorker] = useState({});     // name -> array
  const [loadingCallsFor, setLoadingCallsFor] = useState(""); // name בזמן טעינה

  const roleCode = useMemo(() => {
    const c = toCode(filterRole);
    return (c && c !== "all" && c !== "כולם") ? c : "";
  }, [filterRole]);

  const monthStr = useMemo(() => {
    if (/^\d{4}-\d{2}$/.test(filterMonth)) return filterMonth;
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
  }, [filterMonth]);

  useEffect(() => {
    fetch("http://localhost:3000/api/users")
      .then(r => r.json())
      .then(arr => Array.isArray(arr) ? setUsers(arr) : setUsers([]))
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

  const rows = useMemo(() => {
    const include = (pos) => {
      const c = toCode(pos);
      return roleCode ? c === roleCode : (c === "cleaner" || c === "super");
    };

    const init = new Map(
      users.filter(u => include(u.position)).map(u => [u.name, {
        name: u.name,
        roleCode: toCode(u.position),
        tasksAssigned: 0,
        tasksDone: 0,
        callsHandled: 0,
        callsClosed: 0,
        lastActivity: 0,
        taskDetails: [],
        callDetails: [], // לפירוט מיידי (אצל אב בית יש לנו כבר מכל שורה)
      }])
    );

    const seenCleanerCountFor = new Set();

    // מנקות – משימות + ספירת קריאות (פירוט מלא ייטען on-demand)
    for (const r of rowsCleaner) {
  const key = r.worker_name;
  if (!key) continue;

  if (!init.has(key)) {
    init.set(key, {
      name: key, roleCode: "cleaner",
      tasksAssigned: 0, tasksDone: 0, callsHandled: 0, callsClosed: 0,
      lastActivity: 0, taskDetails: [], callDetails: [],
    });
  }
  const acc = init.get(key);
  acc.roleCode = "cleaner";

  // משימות
  acc.tasksAssigned += 1;
  acc.tasksDone     += Number(r.done_in_month || 0);

  // 🆕 העדכון האחרון = המקסימום בין ביצוע משימה / פתיחת קריאה / טיפול/סגירה
  const lastDone = r.last_done_at ? new Date(r.last_done_at).getTime() : 0;
  const lastOpen = r.last_call_open_at ? new Date(r.last_call_open_at).getTime() : 0;
  const lastHand = r.last_call_handle_at ? new Date(r.last_call_handle_at).getTime() : 0;
  acc.lastActivity = Math.max(acc.lastActivity, lastDone, lastOpen, lastHand);

  acc.taskDetails.push({
    date: r.last_done_at ? toDateKey(new Date(r.last_done_at)) : "—",
    title: r.task_name,
    building: r.building_name,
    status: r.done_in_month > 0 ? "בוצע החודש" : "לא בוצע החודש",
    extra: r.frequency || ""
  });

  // סכומים (ללא פירוט) – הפירוט ייטען כשלוחצים "פתח"
  if (!seenCleanerCountFor.has(key)) {
    const opened = Number(r.calls_opened || 0);
    const closedFromOpened = Number(r.calls_opened_closed || 0);
    acc.callsHandled += opened;
    acc.callsClosed  += closedFromOpened;
    seenCleanerCountFor.add(key);
  }
}


    // אבות בית – כל שורה היא קריאה ולכן יש כבר פירוט מלא
    for (const r of rowsSuper) {
      if (!r.call_id) continue;
      const key = r.worker_name;
      if (!key) continue;

      if (!init.has(key)) {
        init.set(key, {
          name: key, roleCode: "super",
          tasksAssigned: 0, tasksDone: 0, callsHandled: 0, callsClosed: 0,
          lastActivity: 0, taskDetails: [], callDetails: [],
        });
      }
      const acc = init.get(key);
      acc.roleCode = acc.roleCode || "super";

      acc.callsHandled += 1;
      const st = String(r.status || "").toLowerCase();
      if (st === "closed" || st === "סגור") acc.callsClosed += 1;

      const when = r.created_at ? new Date(r.created_at).getTime() : 0;
      if (when > acc.lastActivity) acc.lastActivity = when;

      acc.callDetails.push({
        date: r.created_at ? toDateKey(new Date(r.created_at)) : "—",
        kind: (st === "closed" || st === "סגור") ? "טיפל (סגר)" : "טיפל",
        type: r.service_type || "",
        address: r.building_name || "",
        status: r.status || ""
      });
    }

    return Array.from(init.values()).sort(
      (a,b) => b.lastActivity - a.lastActivity || a.name.localeCompare(b.name, "he")
    );
  }, [users, rowsCleaner, rowsSuper, roleCode]);

  // עדכון כמות עובדים בכרטיס למעלה
  useEffect(() => {
    onCountChange?.(rows.length);
  }, [rows, onCountChange]);

  // 🆕 טעינת רשימת קריאות לעובד כשפותחים את השורה (למנקות: קריאות שנפתחו)
  const ensureCallsLoaded = async (workerName, role) => {
    if (!workerName) return;
    if (callsByWorker[workerName]) return; // כבר נטען

    try {
      setLoadingCallsFor(workerName);
      const by = role === "cleaner" ? "open" : "handled";
      const res = await fetch(
        `http://localhost:3000/api/reports/worker/calls?month=${encodeURIComponent(monthStr)}&name=${encodeURIComponent(workerName)}&by=${by}`
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
          <th>עובד</th><th>תפקיד</th><th>משימות</th><th>קריאות שירות</th><th>עודכן לאחרונה</th><th>פרטים</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const extraCalls = callsByWorker[r.name] || [];
          // ממפים את הקריאות מהשרת לפורמט תצוגה עקבי
          const extraAsDetails = extraCalls.map((c) => ({
            date: c.created_at ? toDateKey(new Date(c.created_at)) : "—",
            kind: r.roleCode === "cleaner" ? "פתח" : "טיפל",
            type: c.service_type || "",
            address: c.building_address || "",
            status: normStatusHe(c.status || "")
          }));

          // לאחד פירוט קיים (אצל אב בית) עם מה שנטען
          const callDetailsFull =
            r.roleCode === "cleaner"
              ? extraAsDetails // למנקות מציגים את מה שנטען בפועל
              : [...r.callDetails, ...extraAsDetails];

          return (
            <React.Fragment key={r.name}>
              <tr>
                <td>{r.name}</td>
                <td>{toHeb(r.roleCode)}</td>
                <td>שובצו: <b>{r.tasksAssigned}</b> | הושלמו: <b>{r.tasksDone}</b></td>
                <td>טיפל: <b>{r.callsHandled}</b> | סגר: <b>{r.callsClosed}</b></td>
                <td>{r.lastActivity ? toDateKey(new Date(r.lastActivity)) : "—"}</td>
                <td>
                  <button
                    className={classes.paidBtn}
                    onClick={async () => {
                      const next = openRow === r.name ? null : r.name;
                      setOpenRow(next);
                      if (next) await ensureCallsLoaded(r.name, r.roleCode);
                    }}
                  >
                    {openRow === r.name ? "סגור" : "פתח"}
                  </button>
                </td>
              </tr>

              {openRow === r.name && (
                <tr>
                  <td colSpan={6} style={{ background:"#fbf9f5", direction:"rtl" }}>
                    <div style={{ display:"grid", gap:12 }}>
                      <div>
                        <h4 style={{ margin:"8px 0" }}>🧰 משימות</h4>
                        {r.taskDetails.length === 0 ? (
                          <div style={{ color:"#9b8d7c" }}>אין משימות בדוח.</div>
                        ) : (
                          <ul style={{ margin:0, paddingInlineStart:18 }}>
                            {r.taskDetails.map((t,i)=>(
                              <li key={i}>
                                {t.date} · {t.title || "—"} · {t.building || ""}
                                {t.extra ? ` · ${t.extra}` : ""} {t.status ? ` · (${t.status})` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <h4 style={{ margin:"8px 0" }}>🛠️ קריאות שירות</h4>
                        {loadingCallsFor === r.name ? (
                          <div style={{ color:"#9b8d7c" }}>טוען קריאות…</div>
                        ) : callDetailsFull.length === 0 ? (
                          <div style={{ color:"#9b8d7c" }}>אין קריאות שירות בדוח.</div>
                        ) : (
                          <ul style={{ margin:0, paddingInlineStart:18 }}>
                            {callDetailsFull.map((c,i)=>(
                              <li key={i}>
                                {c.date} · {c.kind} · {c.type || "—"}
                                {c.address ? ` · ${c.address}` : ""} {c.status ? ` · (${c.status})` : ""}
                              </li>
                            ))}
                          </ul>
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
            <td colSpan={6} style={{ padding:16, textAlign:"center", color:"#7a6c5d" }}>
              אין עובדים תואמים לתפקיד/חודש שנבחרו.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
