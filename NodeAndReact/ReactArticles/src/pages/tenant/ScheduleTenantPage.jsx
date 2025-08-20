import React, { useEffect, useMemo, useState } from "react";
import classes from "./ScheduleTenantPage.module.css";

// עזרי תאריך
const pad2 = (n) => String(n).padStart(2, "0");
const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const HE_WEEKDAYS = ["א","ב","ג","ד","ה","ו","ש"];

export default function ScheduleTenantPage() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDay, setOpenDay] = useState(null); // "YYYY-MM-DD"

  // שליפת אירועי החודש לדייר
  useEffect(() => {
    const first = startOfMonth(monthDate);
    const last = endOfMonth(monthDate);
    const from = toDateKey(first);
    const to = toDateKey(last);

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        // נסה קודם אנדפוינט לדייר (אם יש אצלך בשרת)
        let res = await fetch(`http://localhost:3000/api/tenant/agenda?from=${from}&to=${to}`, { credentials: "include" });

        // נפילה רכה: אם אין, ננסה את של המנהל, לא יפיל את הדף.
        if (!res.ok) {
          res = await fetch(`http://localhost:3000/api/manager/agenda?from=${from}&to=${to}`, { credentials: "include" });
        }
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [monthDate]);

  // קיבוץ אירועים לפי יום
  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events || []) {
      const k = String(ev.start || "").slice(0, 10); // "YYYY-MM-DD"
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    return map;
  }, [events]);

  // רשת ימים
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

  const monthLabel = `${HE_MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <h2 className={classes.title}>לוח זמנים (דייר)</h2>
        <div className={classes.nav}>
          <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>◀︎</button>
          <div className={classes.monthLabel}>{monthLabel}</div>
          <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>▶︎</button>
        </div>
      </div>

      <div className={classes.weekHeader}>
        {HE_WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className={classes.grid}>
        {daysGrid.map((cell) =>
          cell.empty ? (
            <div key={cell.key} />
          ) : (
            <div
              key={cell.key}
              className={classes.dayCell}
              title={cell.key}
              onClick={() => setOpenDay(cell.key)}
            >
              {cell.date.getDate()}
              {(eventsByDay.get(cell.key)?.length || 0) > 0 && (
                <span className={classes.badge}>{eventsByDay.get(cell.key).length}</span>
              )}
            </div>
          )
        )}
      </div>

      {loading && <div className={classes.loading}>טוען אירועים…</div>}

      {/* Modal של אירועי היום */}
      {openDay && (
        <div className={classes.modalBackdrop} onClick={() => setOpenDay(null)}>
          <div className={classes.modal} onClick={(e) => e.stopPropagation()}>
            <div className={classes.modalHeader}>
              <h3 className={classes.modalTitle}>אירועי היום — {openDay}</h3>
              <button className={classes.modalClose} onClick={() => setOpenDay(null)}>×</button>
            </div>
            <div className={classes.modalBody}>
              {(eventsByDay.get(openDay) || []).length === 0 ? (
                <div className={classes.muted}>אין אירועים ביום זה.</div>
              ) : (
                <ul className={classes.dayList}>
                  {eventsByDay.get(openDay).map((ev, idx) => (
                    <li key={`${openDay}-${idx}`} className={classes.dayItem}>
                      <div className={classes.itemTitle}>
                        {String(ev.start).slice(11, 16)} · {ev.title || "אירוע"}
                      </div>
                      <div className={classes.itemMeta}>
                        {ev.building_name ? `בניין: ${ev.building_name}` : ""}
                        {ev.status ? ` · סטטוס: ${ev.status}` : ""}
                        {ev.assignee ? ` · אחראי: ${ev.assignee}` : ""}
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
