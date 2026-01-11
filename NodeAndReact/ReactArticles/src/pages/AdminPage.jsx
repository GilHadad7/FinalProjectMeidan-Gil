// src/pages/AdminPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import classes from "./AdminPage.module.css";

/* ================== קבועים ועזרים ================== */
const API_BASE = "http://localhost:3000";
const FILE_BASE = "http://localhost:8801";

const pad2 = (n) => String(n).padStart(2, "0");
const toDateKey = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addDays      = (d, days) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const dayEnd   = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// Parse ISO / "YYYY-MM-DD HH:MM:SS" / timestamp → Date
const smartParseDate = (val) => {
  if (!val) return null;
  if (typeof val === "number") {
    const d = new Date(val);
    return isNaN(d) ? null : d;
  }
  let s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) s = s.replace(" ", "T");
  const d = new Date(s);
  if (!isNaN(d)) return d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  return null;
};

const formatLocalHM = (val) => {
  const d = smartParseDate(val);
  if (!d) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// אם התאריך נופל על שבת (JS: שבת=6) – דוחף לראשון
const shiftIfSaturday = (date) => {
  const d = new Date(date);
  if (d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
};

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
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  // המיפוי של heWeekdays תואם ל-getDay ישירות (0=א', 6=שבת)
  return `${heWeekdays[dt.getDay()]}׳ ${d} ${heMonths[m - 1]} ${y}`;
};

/* ================== תמונה מן האירוע ================== */
const normalizeUrl = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j) && j[0]) s = String(j[0]);
  } catch {}
  s = s.replace(/\\/g, "/");
  if (s.startsWith("data:")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.includes("/") && /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(s)) {
    return `${FILE_BASE}/uploads/${s}`;
  }
  if (s.startsWith("/uploads") || s.startsWith("/images") || s.startsWith("/files")) {
    return `${FILE_BASE}${s}`;
  }
  if (/^(uploads|images|files)\//i.test(s)) {
    return `${FILE_BASE}/${s}`;
  }
  try { return new URL(s, FILE_BASE).href; } catch { return null; }
};

const findImageInObject = (obj, depth = 0) => {
  if (!obj || depth > 3) return null;
  if (typeof obj === "string") {
    const s = obj.trim();
    if (
      s.startsWith("data:") ||
      /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(s) ||
      /\/uploads\/.+\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(s)
    ) return s;
    return null;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const hit = findImageInObject(v, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof obj === "object") {
    const preferredKeys = [
      "image_url","imageUrl","image","img","photo_url","photo",
      "picture","img_url","thumbnail_url","attachment_url",
      "file_url","filePath","image_path","imagePath",
      "images","photos","attachments","files","media","media_urls","gallery"
    ];
    for (const k of preferredKeys) {
      if (k in obj) {
        const hit = findImageInObject(obj[k], depth + 1);
        if (hit) return hit;
      }
    }
    for (const k of Object.keys(obj)) {
      if (preferredKeys.includes(k)) continue;
      const hit = findImageInObject(obj[k], depth + 1);
      if (hit) return hit;
    }
  }
  return null;
};
const getImageUrl = (ev) => normalizeUrl(findImageInObject(ev) || "");

const swapPort = (url) => {
  try {
    const u = new URL(url);
    if (u.port === "3000") { u.port = "8801"; return u.href; }
    if (u.port === "8801") { u.port = "3000"; return u.href; }
  } catch {}
  return null;
};

/* ================== רוטינות ושירות ================== */
const isRoutine = (ev) => {
  const t = String(ev?.origin_type || "").toLowerCase();
  return t === "routine" || !!ev?.frequency;
};
const getServiceId = (obj) =>
  obj?.id ?? obj?.call_id ?? obj?.service_id ?? obj?.ticket_id ?? obj?.request_id ?? null;

// מזהה "קריאת שירות" (כולל type: 'servicecall')
const isServiceEvent = (ev) => {
  const src = String(ev?.origin_type || ev?.source || ev?.event_source || "").toLowerCase();
  if (src.includes("service")) return true;
  if (isRoutine(ev)) return false;
  const t = String(
    ev?.type || ev?.task_type || ev?.category || ev?.issue_type || ev?.problem_type || ""
  ).trim().toLowerCase();
  if (t === "servicecall" || t === "service_call") return true;
  const serviceTypes = new Set(["חשמל","נזילה","תקלה טכנית","אינסטלציה","נזק","תקלה אישית","תקלה"]);
  return serviceTypes.has(String(ev?.type || "").trim());
};

const ensureStartISO = (ev) => {
  const s = smartParseDate(ev?.start);
  if (s) return { ...ev, start: s.toISOString() };
  if (ev?.date) {
    const iso = `${ev.date}T${ev.time || "00:00:00"}`;
    const d = smartParseDate(iso);
    if (d) return { ...ev, start: d.toISOString() };
  }
  const sd = smartParseDate(ev?.scheduled_datetime);
  if (sd) return { ...ev, start: sd.toISOString() };
  return ev;
};

const expandRoutineInRange = (task, rangeStart, rangeEnd) => {
  const base = ensureStartISO(task);
  const start = smartParseDate(base.start) ||
                (task.date ? smartParseDate(`${task.date}T${task.time || "00:00:00"}`) : null);
  if (!start) return [];
  const out = [];

  // להביא את נקודת ההתחלה לראשון אם נפלה על שבת
  let cur = shiftIfSaturday(new Date(start));

  // גלגול אחורה עד שנכנסים לטווח
  while (cur < rangeStart) {
    if (task.frequency === "שבועי") cur.setDate(cur.getDate() + 7);
    else if (task.frequency === "חודשי") cur.setMonth(cur.getMonth() + 1);
    else if (task.frequency === "יומי")  cur.setDate(cur.getDate() + 1);
    else break;
    cur = shiftIfSaturday(cur);
  }

  // יצירת ההופעות בטווח, תוך הזזה אם נופל על שבת
  while (cur <= rangeEnd) {
    const occ = shiftIfSaturday(cur);
    out.push({ ...task, origin_type: "routine", start: occ.toISOString() });

    if (task.frequency === "שבועי") cur.setDate(cur.getDate() + 7);
    else if (task.frequency === "חודשי") cur.setMonth(cur.getMonth() + 1);
    else if (task.frequency === "יומי")  cur.setDate(cur.getDate() + 1);
    else break;

    cur = shiftIfSaturday(cur);
  }
  return out;
};

const expandEventsInRange = (events, rangeStart, rangeEnd) => {
  const out = [];
  for (const ev of Array.isArray(events) ? events : []) {
    if (isRoutine(ev)) {
      out.push(...expandRoutineInRange(ev, rangeStart, rangeEnd));
    } else {
      const norm = ensureStartISO(ev);
      const d = smartParseDate(norm.start);
      if (!d) continue;
      const shifted = shiftIfSaturday(d); // סייפטי: גם אירוע רגיל ידחה אם בשבת
      if (shifted >= rangeStart && shifted <= rangeEnd) {
        out.push({ ...norm, start: shifted.toISOString() });
      }
    }
  }
  return out;
};

/* === רוטינות מ־/api/schedule לחודש === */
const getScheduleBaseDate = (row) => {
  if (row?.date) return row.date;
  if (row?.scheduled_datetime) return String(row.scheduled_datetime).slice(0, 10);
  return null;
};
const getScheduleBaseTime = (row) => {
  if (row?.time) return row.time;
  if (row?.scheduled_datetime) {
    const d = smartParseDate(row.scheduled_datetime);
    if (d) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
  }
  return "00:00:00";
};

const routinesFromScheduleInRange = (rows, rangeStart, rangeEnd) => {
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const origin = String(r?.origin_type || "").toLowerCase();
    const freq = r?.frequency;
    if (origin !== "routine" || !freq) continue;

    const baseDate = getScheduleBaseDate(r);
    if (!baseDate) continue;
    const timeStr = getScheduleBaseTime(r);

    const occs = expandRoutineInRange(
      { ...r, date: baseDate, time: timeStr, frequency: freq },
      rangeStart,
      rangeEnd
    ).map((ev) => ({
      ...ev,
      origin_type: "routine",
      title: r.title || r.description || "משימה קבועה",
      type: r.type || r.category || "משימה",
      building_name: r.building_name || r.building || r.building_address || "",
      assignee: r.worker || r.assignee || "",
      status: r.status || "",
    }));
    out.push(...occs);
  }
  return out;
};

/* === שליפת אינדקס קריאות שירות (לבניית מפה id→image_url) === */
async function fetchServiceCallsIndex() {
  const urls = [
    `${API_BASE}/api/manager/service-calls`,
    `${API_BASE}/api/service-calls`,
    `${API_BASE}/api/servicecalls`,
    `${API_BASE}/api/calls`,
    `${API_BASE}/api/tickets`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { credentials: "include" });
      if (r.ok) return await r.json();
    } catch {}
  }
  return [];
}

/* ================== הקומפוננטה ================== */
export default function AdminPage() {
  const navigate = useNavigate();

  // ===== שם המנהל לכותרת =====
  const [userName, setUserName] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
        if (res.ok) {
          const u = await res.json();
          if (u?.name) { setUserName(u.name); return; }
        }
      } catch {}
      try {
        for (const k of ["authUser", "user", "currentUser"]) {
          const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.name) { setUserName(parsed.name); return; }
          }
        }
      } catch {}
    })();
  }, []);

  // ===== שמאל: התראות (אתמול+היום) =====
  const [urgent, setUrgent] = useState([]);
  const [svcImageById, setSvcImageById] = useState({}); // { [id]: imageUrl }
  const [loadingUrgent, setLoadingUrgent] = useState(false);

  // מודל לתצוגת תמונה
  const [imgPreview, setImgPreview] = useState({ open: false, url: "", title: "" });

  const makeKey = (ev) =>
    `${ev.type || ev.title || "item"}-${ev.id || ev.service_id || "noid"}-${String(ev.start || "").slice(0,16)}`;

  useEffect(() => {
    const today = new Date();
    const yesterday = addDays(today, -1);
    const tomorrow  = addDays(today, +1);

    const from = toDateKey(yesterday);
    const to   = toDateKey(tomorrow);

    (async () => {
      try {
        setLoadingUrgent(true);
        const [agendaRes, scheduleRes] = await Promise.all([
          fetch(`${API_BASE}/api/manager/agenda?from=${from}&to=${to}`),
          fetch(`${API_BASE}/api/schedule`)
        ]);

        const agenda   = agendaRes.ok   ? await agendaRes.json()   : [];
        const schedule = scheduleRes.ok ? await scheduleRes.json() : [];

        const expandedAgenda = expandEventsInRange(agenda, dayStart(yesterday), dayEnd(today));
        const routineOccs    = routinesFromScheduleInRange(schedule, dayStart(yesterday), dayEnd(today));

        const combined = [...expandedAgenda, ...routineOccs];

        const yMD = toDateKey(yesterday);
        const tMD = toDateKey(today);

        const filtered = combined
          .filter((ev) => {
            const k = String(ev.start || "").slice(0, 10);
            return k === yMD || k === tMD;
          })
          .sort((a, b) => {
            const ta = smartParseDate(a.start)?.getTime() ?? 0;
            const tb = smartParseDate(b.start)?.getTime() ?? 0;
            return ta - tb;
          });

        setUrgent(filtered);

        // אינדקס קריאות שירות → מפה id→image_url
        const svcList = await fetchServiceCallsIndex();
        const map = {};
        for (const row of Array.isArray(svcList) ? svcList : []) {
          const id = getServiceId(row);
          const raw =
            row?.image_url ||
            row?.imageUrl ||
            findImageInObject(row);
          if (id && raw) map[String(id)] = normalizeUrl(raw);
        }
        setSvcImageById(map);
      } catch (e) {
        console.error("urgent fetch failed:", e);
        setUrgent([]);
        setSvcImageById({});
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
        const [agendaRes, scheduleRes] = await Promise.all([
          fetch(`${API_BASE}/api/manager/agenda?from=${from}&to=${to}`),
          fetch(`${API_BASE}/api/schedule`)
        ]);

        const agenda   = agendaRes.ok   ? await agendaRes.json()   : [];
        const schedule = scheduleRes.ok ? await scheduleRes.json() : [];

        const expandedAgenda = expandEventsInRange(agenda, dayStart(first), dayEnd(last));
        const routineOccs    = routinesFromScheduleInRange(schedule, dayStart(first), dayEnd(last));

        setMonthEvents([...expandedAgenda, ...routineOccs]);
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

  // גריד הימים
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

  // ===== Modal אירועי יום =====
  const [openDay, setOpenDay] = useState(null);
  const dayEvents = useMemo(
    () => (openDay ? eventsByDay.get(openDay) || [] : []),
    [openDay, eventsByDay]
  );

  // יעד ניווט לשורה
  const navigateFromEvent = (ev) => {
    const dateKey = String(ev.start || "").slice(0,10);
    if (isServiceEvent(ev)) {
      const id = getServiceId(ev);
      navigate(`/manager/service-calls?highlight=${encodeURIComponent(id ?? "")}`);
    } else if (isRoutine(ev)) {
      const rid = ev.routine_id || ev.task_id || ev.id || "";
      navigate(`/manager/schedule?date=${dateKey}&highlight=${encodeURIComponent(rid)}`);
    } else {
      navigate(`/manager/schedule?date=${dateKey}`);
    }
  };

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
              <div className={classes.emptyText}>אין התראות לאתמול ולהיום</div>
            ) : (
              <ul className={classes.notifList}>
                {urgent.map((ev) => {
                  const key = makeKey(ev);

                  const isService = isServiceEvent(ev);
                  const idForImg  = getServiceId(ev);
                  const fromEvent = getImageUrl(ev);
                  const fromIndex = idForImg ? svcImageById[String(idForImg)] : null;

                  const primary   = isService ? (fromEvent || fromIndex || null) : null;
                  const fallback  = primary ? swapPort(primary) : null;
                  const gridCols  = primary ? "48px 1fr" : "1fr";

                  return (
                    <li
                      key={key}
                      className={classes.notifItem}
                      onClick={() => navigateFromEvent(ev)}
                      role="button"
                      title="פתיחת הפריט"
                      style={{ display: "grid", gridTemplateColumns: gridCols, gap: 8, alignItems: "center", cursor: "pointer" }}
                    >
                      {primary && (
                        <img
                          src={primary}
                          alt=""
                          referrerPolicy="no-referrer"
                          onClick={(e) => {
                            e.stopPropagation(); // לא לנווט את השורה
                            setImgPreview({ open: true, url: primary, title: ev.title || "" });
                          }}
                          onError={(e) => {
                            if (fallback && e.currentTarget.dataset.tried !== "1") {
                              e.currentTarget.dataset.tried = "1";
                              e.currentTarget.src = fallback;
                            } else {
                              e.currentTarget.style.display = "none";
                              const li = e.currentTarget.closest("li");
                              if (li) li.style.gridTemplateColumns = "1fr";
                            }
                          }}
                          style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, cursor: "zoom-in" }}
                        />
                      )}

                      {/* תוכן ההתראה */}
                      <div>
                        <div className={classes.notifTitle}>
                          {formatLocalHM(ev.start)} · {ev.title}
                          {(() => {
                            const lbl = (() => {
                                const d = smartParseDate(ev.start);
                                if (!d) return "";

                                const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
                                const today = new Date();
                                const diff = Math.round((startOfDay(d) - startOfDay(today)) / 86400000);

                                if (diff === 0) return "היום";
                                if (diff === -1) return "אתמול";
                                return "";
                              })();

                            return lbl ? (
                              <span style={{ marginInlineStart: 8, fontSize: 12, color: "#7a6c5d", background:"#efe7dc", padding:"2px 6px", borderRadius:6 }}>
                                {lbl}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className={classes.notifMeta}>
                          {ev.building_name}
                          {ev.assignee ? ` · אחראי: ${ev.assignee}` : ""}
                          {ev.status ? ` · סטטוס: ${statusHe(ev.status)}` : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ===== מיני-לוח ===== */}
        <section>
          <div className={classes.calTop}>
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
            <h3 className={classes.calTitle}>לוח חודשי קטן</h3>
          </div>

          <div className={classes.weekdayRow}>
            {["א","ב","ג","ד","ה","ו","ש"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

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
                        {formatLocalHM(ev.start)} · {ev.title}
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

      {/* ===== Modal: תצוגת תמונה (לחיצה על תמונה בהתראות) ===== */}
      {imgPreview.open && (
        <div className={classes.modalBackdrop} onClick={() => setImgPreview({ open:false, url:"", title:"" })}>
          <div className={classes.modal} style={{maxWidth: "min(92vw, 900px)"}} onClick={(e) => e.stopPropagation()}>
            <div className={classes.modalHeader}>
              <h3 className={classes.modalTitle}>{imgPreview.title || "תמונה"}</h3>
              <button className={classes.modalClose} onClick={() => setImgPreview({ open:false, url:"", title:"" })} aria-label="סגור">
                ×
              </button>
            </div>
            <div className={classes.modalBody} style={{display:"flex", justifyContent:"center"}}>
              <img src={imgPreview.url} alt="" style={{maxWidth:"100%", maxHeight:"70vh", borderRadius:8}} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
