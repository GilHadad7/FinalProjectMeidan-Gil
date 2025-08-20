// src/pages/AdminPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import classes from "./AdminPage.module.css";

// ===== עזרי תאריך =====
const pad2 = (n) => String(n).padStart(2, "0");
const toDateKey = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

// ===== תרגום סטטוסים לעברית =====
const statusHe = (s) => {
  const t = String(s || "").trim().toLowerCase();
  if (["closed", "סגור"].includes(t)) return "סגור";
  if (["open", "פתוח"].includes(t)) return "פתוח";
  if (["pending", "awaiting", "waiting", "ממתין"].includes(t)) return "ממתין";
  return s || "";
};

// ===== פורמטים =====
const heMonths = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
];
const heWeekdays = ["א","ב","ג","ד","ה","ו","ש"];
const formatHeDate = (yyyyMmDd) => {
  const [y,m,d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m-1, d);
  return `${heWeekdays[(dt.getDay()+6)%7]}׳ ${d} ${heMonths[m-1]} ${y}`;
};

export default function AdminPage() {
  const navigate = useNavigate();

  // ===== שם המנהל המחובר לכותרת =====
  const [userName, setUserName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:3000/api/auth/me", {
          credentials: "include",
        });
        if (res.ok) {
          const u = await res.json();
          if (u?.name) {
            setUserName(u.name);
            return;
          }
        }
      } catch (_) {}

      try {
        const keys = ["authUser", "user", "currentUser"];
        for (const k of keys) {
          const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.name) {
              setUserName(parsed.name);
              return;
            }
          }
        }
      } catch (_) {}
    })();
  }, []);

  // ===== שמאל: התראות (היום+מחר) =====
  const [urgent, setUrgent] = useState([]);
  const [loadingUrgent, setLoadingUrgent] = useState(false);

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const from = toDateKey(today);
    const to   = toDateKey(tomorrow);

    (async () => {
      try {
        setLoadingUrgent(true);
        const res = await fetch(`http://localhost:3000/api/manager/agenda?from=${from}&to=${to}`);
        const data = (await res.json()) || [];
        setUrgent(data);
      } catch (e) {
        console.error("urgent fetch failed:", e);
        setUrgent([]);
      } finally {
        setLoadingUrgent(false);
      }
    })();
  }, []);

  // ===== ימין: מיני-לוח חודש =====
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [monthEvents, setMonthEvents] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  useEffect(() => {
    const first = startOfMonth(monthDate);
    const last  = endOfMonth(monthDate);
    const from  = toDateKey(first);
    const to    = toDateKey(last);

    (async () => {
      try {
        setLoadingMonth(true);
        const res = await fetch(`http://localhost:3000/api/manager/agenda?from=${from}&to=${to}`);
        const data = (await res.json()) || [];
        setMonthEvents(data);
      } catch (e) {
        console.error("month events fetch failed:", e);
        setMonthEvents([]);
      } finally {
        setLoadingMonth(false);
      }
    })();
  }, [monthDate]);

  // קיבוץ אירועים לפי יום
  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of monthEvents) {
      const k = String(ev.start || "").slice(0, 10);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    return map;
  }, [monthEvents]);

  // בניית רשת הימים (RTL: א' בימין, ש' בשמאל)
  const daysGrid = useMemo(() => {
    const first = startOfMonth(monthDate);
    const last  = endOfMonth(monthDate);
    const out = [];

    const padBefore = first.getDay(); // Sunday=0
    for (let i = 0; i < padBefore; i++) out.push({ key: `pad-${i}`, empty: true });

    for (let d = 1; d <= last.getDate(); d++) {
      const cur = new Date(first.getFullYear(), first.getMonth(), d);
      out.push({ key: toDateKey(cur), date: cur });
    }
    while (out.length % 7 !== 0) out.push({ key: `pad-tail-${out.length}`, empty: true });

    return out;
  }, [monthDate]);

  const monthLabel = useMemo(
    () => `${heMonths[monthDate.getMonth()]} ${monthDate.getFullYear()}`,
    [monthDate]
  );

  // ===== מודל אירועי יום =====
  const [openDay, setOpenDay] = useState(null); // "YYYY-MM-DD"
  const dayEvents = useMemo(
    () => (openDay ? eventsByDay.get(openDay) || [] : []),
    [openDay, eventsByDay]
  );

  return (
    <div className={classes.container}>
      <h2>ברוך הבא {userName || "XXXXXXXXXXXXXX"}</h2>

      <div className={classes.mainContent}>
        {/* ===== התראות דחופות ===== */}
        <section>
          <h3>התראות דחופות</h3>

          <div className={classes.notificationBox}>
            {loadingUrgent ? (
              <div className={classes.loading}>טוען…</div>
            ) : urgent.length === 0 ? (
              <div className={classes.emptyText}>אין התראות להיום ולמחר</div>
            ) : (
              <ul className={classes.notifList}>
                {urgent.map((ev) => (
                  <li key={ev.id} className={classes.notifItem}>
                    <div className={classes.notifTitle}>
                      {String(ev.start).slice(11,16)} · {ev.title}
                    </div>
                    <div className={classes.notifMeta}>
                      {ev.building_name}
                      {ev.assignee ? ` · אחראי: ${ev.assignee}` : ""}
                      {ev.status ? ` · סטטוס: ${statusHe(ev.status)}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ===== מיני-לוח ===== */}
        <section>
          <div className={classes.calTop}>
            {/* ← הניווט + התאריך עברו לימין */}
            <div className={classes.calNav}>
              <button
                className={classes.calNavBtn}
                onClick={() =>
                  setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                }
              >
                ◀︎
              </button>
              <div className={classes.monthLabel}>{monthLabel}</div>
              <button
                className={classes.calNavBtn}
                onClick={() =>
                  setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                }
              >
                ▶︎
              </button>
            </div>

            {/* → הכותרת הוזזה לשמאל */}
            <h3 className={classes.calTitle}>לוח חודשי קטן</h3>
          </div>

          {/* ראשי ימים */}
          <div className={classes.weekdayRow}>
            {["א","ב","ג","ד","ה","ו","ש"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* גריד ימים */}
          <div className={classes.scheduleGridRTL}>
            {daysGrid.map((cell) =>
              cell.empty ? (
                <div key={cell.key} />
              ) : (
                <div
                  key={cell.key}
                  className={classes.dayCell}
                  onClick={() => setOpenDay(cell.key)}
                  title={cell.key}
                >
                  {cell.date.getDate()}
                  {(eventsByDay.get(cell.key)?.length || 0) > 0 && (
                    <span className={classes.dayBadge}>
                      {eventsByDay.get(cell.key).length}
                    </span>
                  )}
                </div>
              )
            )}
          </div>

          {loadingMonth && <div className={classes.loading}>טוען אירועי חודש…</div>}

          <div className={classes.fullBtnWrap}>
            <button className={classes.fullBtn} onClick={() => navigate("/manager/schedule")}>
              מעבר ללוח המלא
            </button>
          </div>
        </section>
      </div>

      {/* ===== Modal: אירועי היום ===== */}
      {openDay && (
        <div className={classes.modalBackdrop} onClick={() => setOpenDay(null)}>
          <div className={classes.modal} onClick={(e) => e.stopPropagation()}>
            <div className={classes.modalHeader}>
              <h3 className={classes.modalTitle}>אירועי היום • {formatHeDate(openDay)}</h3>
              <button className={classes.modalClose} onClick={() => setOpenDay(null)} aria-label="סגור">
                ×
              </button>
            </div>

            <div className={classes.modalBody}>
              {dayEvents.length === 0 ? (
                <div className={classes.emptyText}>אין אירועים ביום זה.</div>
              ) : (
                <ul className={classes.dayList}>
                  {dayEvents.map((ev) => (
                    <li key={`${ev.type}-${ev.id}-${ev.start}`} className={classes.dayItem}>
                      <div className={classes.notifTitle}>
                        {String(ev.start).slice(11,16)} · {ev.title}
                      </div>
                      <div className={classes.notifMeta}>
                        {ev.building_name}
                        {ev.assignee ? ` · אחראי: ${ev.assignee}` : ""}
                        {ev.status ? ` · סטטוס: ${statusHe(ev.status)}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
