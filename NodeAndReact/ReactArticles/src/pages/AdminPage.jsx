// src/pages/AdminPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import classes from "./AdminPage.module.css";

/* ================== קבועים ועזרים ================== */
const API_BASE = "http://localhost:3000";   // API כפי שהיה
const FILE_BASE = "http://localhost:8801";  // כאן יושבים קבצים /uploads וכד'

const pad2 = (n) => String(n).padStart(2, "0");
const toDateKey = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addDays = (d, days) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// Parse ISO / "YYYY-MM-DD HH:MM:SS" / timestamp → Date (לוקאלי)
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

/* ================== תמונה מן האירוע ================== */
// נירמול URL: מוחלט נשאר; Base64 נשאר; יחסי → FILE_BASE; מחליף backslashes
const normalizeUrl = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  try {
    // אם נשלח JSON כמו ["..."]
    const j = JSON.parse(s);
    if (Array.isArray(j) && j[0]) s = String(j[0]);
  } catch {}
  s = s.replace(/\\/g, "/"); // Windows paths

  if (s.startsWith("data:")) return s;            // Base64
  if (/^https?:\/\//i.test(s)) return s;          // URL מלא

  // אם אין slash אבל יש סיומת תמונה – נניח שזה שם קובץ תחת /uploads
  if (!s.includes("/") && /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(s)) {
    return `${FILE_BASE}/uploads/${s}`;
  }

  // נתיב יחסי/מוחלט לשרת הקבצים
  if (s.startsWith("/uploads") || s.startsWith("/images") || s.startsWith("/files")) {
    return `${FILE_BASE}${s}`;
  }
  if (/^(uploads|images|files)\//i.test(s)) {
    return `${FILE_BASE}/${s}`;
  }

  // ברירת מחדל: יחסית ל-FILE_BASE
  try { return new URL(s, FILE_BASE).href; } catch { return null; }
};

// חיפוש רקורסיבי על האובייקט לשדה תמונה
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
      "file_url","filePath","image_path","imagePath"
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

// מחזיר URL חלופי על אותו נתיב עם החלפת פורט 3000↔8801 (למקרה של טעות דומיין)
const swapPort = (url) => {
  try {
    const u = new URL(url);
    if (u.port === "3000") { u.port = "8801"; return u.href; }
    if (u.port === "8801") { u.port = "3000"; return u.href; }
  } catch {}
  return null;
};

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
  const [loadingUrgent, setLoadingUrgent] = useState(false);

  useEffect(() => {
    const today = new Date();
    const yesterday = addDays(today, -1);
    const tomorrow  = addDays(today, +1); // 'to' אקסקלוסיבי

    const from = toDateKey(yesterday);
    const to   = toDateKey(tomorrow);

    (async () => {
      try {
        setLoadingUrgent(true);
        const res = await fetch(`${API_BASE}/api/manager/agenda?from=${from}&to=${to}`);
        const data = (await res.json()) || [];

        const yMD = toDateKey(yesterday);
        const tMD = toDateKey(today);

        const filtered = data
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
        const res = await fetch(`${API_BASE}/api/manager/agenda?from=${from}&to=${to}`);
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
              <div className={classes.emptyText}>אין התראות לאתמול ולהיום</div>
            ) : (
              <ul className={classes.notifList}>
                {urgent.map((ev) => {
                  const primary = getImageUrl(ev);
                  const fallback = primary ? swapPort(primary) : null;

                  return (
                    <li
                      key={`${ev.type}-${ev.id}-${ev.start}`}
                      className={classes.notifItem}
                      style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 8, alignItems: "center" }}
                    >
                      {/* תמונה (אם קיימת) */}
                      {primary ? (
                        <img
                          src={primary}
                          alt=""
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            if (fallback && e.currentTarget.dataset.tried !== "1") {
                              e.currentTarget.dataset.tried = "1";
                              e.currentTarget.src = fallback;
                            } else {
                              e.currentTarget.style.display = "none";
                            }
                          }}
                          style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }}
                        />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: "#eee" }} />
                      )}

                      {/* תוכן ההתראה */}
                      <div>
                        <div className={classes.notifTitle}>
                          {formatLocalHM(ev.start)} · {ev.title}
                          {/* תווית היום/אתמול */}
                          {(() => {
                            const lbl = (() => {
                              const d = smartParseDate(ev.start);
                              if (!d) return "";
                              const today = new Date();
                              const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                              const diff = Math.round((new Date(toDateKey(d)) - base) / 86400000);
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
    </div>
  );
}
