// src/pages/WorkerPage.jsx
// הערה: דף הבית של העובד + בחירת בניין נשמרת ב-sessionStorage לכל הממשק

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import classes from "./AdminPage.module.css";

const API_BASE = "http://localhost:8801";
const FILE_BASE = "http://localhost:8801";

// הערה: מפתח קבוע לשמירת בחירת בניין של עובד
const WORKER_SELECTED_BUILDING_KEY = "worker_selected_building";

// הערה: ממלא מספר לשתי ספרות
const pad2 = (n) => String(n).padStart(2, "0");

// הערה: הופך Date ל-YYYY-MM-DD
const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// הערה: תאריך תחילת חודש
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

// הערה: תאריך סוף חודש
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

// הערה: מוסיף ימים לתאריך
const addDays = (d, days) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// הערה: תחילת יום
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

// הערה: סוף יום
const dayEnd = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// הערה: אם תאריך נופל על שבת — מזיזים לראשון
const bumpIfSaturday = (dateObj) => {
  const d = new Date(dateObj.getTime());
  if (d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
};


// הערה: ממיר תאריך בצורה חכמה גם אם מגיע כמחרוזת/מספר
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

// הערה: פורמט שעה HH:MM
const formatLocalHM = (val) => {
  const d = smartParseDate(val);
  return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : "";
};

const heMonths = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const heWeekdays = ["א","ב","ג","ד","ה","ו","ש"];

// הערה: פורמט תאריך עברי לשורת מודאל
const formatHeDate = (yyyyMmDd) => {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${heWeekdays[dt.getDay()]}׳ ${d} ${heMonths[m - 1]} ${y}`;
};

// הערה: תרגום סטטוס לאחיד בעברית
const statusHe = (s) => {
  const t = String(s || "").trim().toLowerCase();
  if (["closed", "סגור"].includes(t)) return "סגור";
  if (["open", "פתוח"].includes(t)) return "פתוח";
  if (["pending", "awaiting", "waiting", "ממתין"].includes(t)) return "ממתין";
  return s || "";
};

// הערה: מנרמל URL לתמונה כדי לעבוד מול uploads
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

  if (!s.includes("/") && /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(s)) return `${FILE_BASE}/uploads/${s}`;
  if (s.startsWith("/uploads") || s.startsWith("/images") || s.startsWith("/files")) return `${FILE_BASE}${s}`;
  if (/^(uploads|images|files)\//i.test(s)) return `${FILE_BASE}/${s}`;

  try { return new URL(s, FILE_BASE).href; } catch { return null; }
};

// הערה: מחפש תמונה בתוך אובייקט מורכב (קריאת שירות)
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
    const preferred = [
      "image_url","imageUrl","image","img","photo_url","photo","picture",
      "img_url","thumbnail_url","attachment_url","file_url","filePath",
      "image_path","imagePath","images","photos","attachments","files",
      "media","media_urls","gallery",
    ];
    for (const k of preferred) {
      if (k in obj) {
        const hit = findImageInObject(obj[k], depth + 1);
        if (hit) return hit;
      }
    }
    for (const k of Object.keys(obj)) {
      if (preferred.includes(k)) continue;
      const hit = findImageInObject(obj[k], depth + 1);
      if (hit) return hit;
    }
  }

  return null;
};

const getImageUrl = (ev) => normalizeUrl(findImageInObject(ev) || "");

// הערה: פולבאק להחלפת פורט אם תמונה לא נטענת
const swapPort = (url) => {
  try {
    const u = new URL(url);
    u.port = u.port === "3000" ? "8801" : "3000";
    return u.href;
  } catch {
    return null;
  }
};

// הערה: מזהה אם האירוע משימה קבועה
const isRoutine = (ev) => String(ev?.origin_type || "").toLowerCase() === "routine" || !!ev?.frequency;

// הערה: מחלץ id לקריאת שירות
const getServiceId = (obj) => obj?.id ?? obj?.call_id ?? obj?.service_id ?? obj?.ticket_id ?? obj?.request_id ?? null;

// הערה: מזהה אם האירוע הוא קריאת שירות
const isServiceEvent = (ev) => {
  const src = String(ev?.origin_type || ev?.source || ev?.event_source || "").toLowerCase();
  if (src.includes("service")) return true;
  if (isRoutine(ev)) return false;

  const t = String(ev?.type || ev?.task_type || ev?.category || ev?.issue_type || ev?.problem_type || "")
    .trim()
    .toLowerCase();
  if (t === "servicecall" || t === "service_call") return true;

  const set = new Set(["חשמל","נזילה","תקלה טכנית","אינסטלציה","נזק","תקלה אישית","תקלה"]);
  return set.has(String(ev?.type || "").trim());
};

// הערה: מבטיח start ב-ISO
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

// הערה: מרחיב משימות קבועות לטווח (כולל שבת->ראשון)
const expandRoutineInRange = (task, rangeStart, rangeEnd) => {
  const base = ensureStartISO(task);
  const start =
    smartParseDate(base.start) ||
    (task.date ? smartParseDate(`${task.date}T${task.time || "00:00:00"}`) : null);

  if (!start) return [];

  const out = [];
  let cur = new Date(start);

  while (cur < rangeStart) {
    if (task.frequency === "שבועי") cur.setDate(cur.getDate() + 7);
    else if (task.frequency === "חודשי") cur.setMonth(cur.getMonth() + 1);
    else if (task.frequency === "יומי") cur.setDate(cur.getDate() + 1);
    else break;
  }

  while (cur <= rangeEnd) {
    const shifted = bumpIfSaturday(cur);
    if (shifted >= rangeStart && shifted <= rangeEnd) {
      out.push({ ...task, origin_type: "routine", start: shifted.toISOString() });
    }

    if (task.frequency === "שבועי") cur.setDate(cur.getDate() + 7);
    else if (task.frequency === "חודשי") cur.setMonth(cur.getMonth() + 1);
    else if (task.frequency === "יומי") cur.setDate(cur.getDate() + 1);
    else break;
  }

  return out;
};

// הערה: מסנן/מרחיב אירועים לטווח
const expandEventsInRange = (events, rangeStart, rangeEnd) => {
  const out = [];
  for (const ev of Array.isArray(events) ? events : []) {
    if (isRoutine(ev)) out.push(...expandRoutineInRange(ev, rangeStart, rangeEnd));
    else {
      const norm = ensureStartISO(ev);
      const d = smartParseDate(norm.start);
      if (d && d >= rangeStart && d <= rangeEnd) out.push({ ...norm, start: d.toISOString() });
    }
  }
  return out;
};

// הערה: מביא אינדקס תמונות של קריאות שירות לפי בניין
async function fetchServiceCallsIndex(buildingId) {
  try {
    const r = await fetch(
      `${API_BASE}/api/service-calls/by-building?building_id=${encodeURIComponent(buildingId)}`,
      { credentials: "include" }
    );
    if (r.ok) return await r.json();
  } catch {}
  return [];
}

// הערה: מביא את המשתמש המחובר (id + building_id)
async function getWorkerContext() {
  try {
    const r = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (r.ok) {
      const u = await r.json();
      const buildingId = u?.building_id ?? u?.worker?.building_id ?? null;
      if (u?.id) {
        return {
          id: Number(u.id),
          building_id: buildingId != null ? Number(buildingId) : null,
          name: u.name || u.full_name || "",
        };
      }
    }
  } catch {}

  for (const k of ["authUser", "user", "currentUser"]) {
    try {
      const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (!raw) continue;
      const u = JSON.parse(raw);
      const buildingId = u?.building_id ?? u?.worker?.building_id ?? null;
      if (u?.id) {
        return {
          id: Number(u.id),
          building_id: buildingId != null ? Number(buildingId) : null,
          name: u.name || u.full_name || "",
        };
      }
    } catch {}
  }

  return {};
}

const anchorForCall = (id) => `sc-${id}`;
const anchorForTask = (id) => `rt-${id}`;

// הערה: קורא מה-sessionStorage את הבניין שנבחר
function readSelectedBuilding() {
  try {
    const raw = sessionStorage.getItem(WORKER_SELECTED_BUILDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// הערה: שומר ל-sessionStorage את הבניין שנבחר (id+name+address)
function saveSelectedBuilding(b) {
  try {
    if (!b || b.building_id == null) return;
    sessionStorage.setItem(
      WORKER_SELECTED_BUILDING_KEY,
      JSON.stringify({
        building_id: Number(b.building_id),
        name: b.name || "",
        address: b.address || "",
      })
    );
  } catch {}
}

// הערה: קומפוננטת דף עובד
export default function WorkerPage() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [worker, setWorker] = useState({ id: null, building_id: null });

  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(() => {
    const stored = readSelectedBuilding();
    return stored?.building_id ?? null;
  });

  // הערה: אתחול זהות + טעינת בניינים לעובד + קביעת בניין התחלתי
  useEffect(() => {
    (async () => {
      const u = await getWorkerContext();
      setUserName(u?.name || "");

      const workerId = u?.id ?? null;
      setWorker({ id: workerId, building_id: u?.building_id ?? null });

      if (!workerId) return;

      try {
        const res = await fetch(`${API_BASE}/api/buildings/by-worker/${workerId}`);
        const data = res.ok ? await res.json() : [];
        const list = Array.isArray(data) ? data : [];
        
        setBuildings(list);

        const stored = readSelectedBuilding();
        const storedId = stored?.building_id ?? null;
        const firstId = list?.[0]?.building_id ?? null;

        const initialId = storedId ?? firstId ?? (u?.building_id ?? null);

        if (initialId != null) {
          setSelectedBuildingId(Number(initialId));
          const initialObj =
            list.find((x) => Number(x.building_id) === Number(initialId)) ||
            { building_id: Number(initialId), name: stored?.name || "", address: stored?.address || "" };

          saveSelectedBuilding(initialObj);
          setWorker((prev) => ({ ...prev, building_id: Number(initialId) }));
        }
      } catch (e) {
        console.error("Failed to load worker buildings:", e);
      }
    })();
  }, []);

  // הערה: בכל שינוי בניין נבחר -> שומר ב-sessionStorage ומעדכן worker.building_id (בלי ניווט)
  useEffect(() => {
    try {
      if (selectedBuildingId == null) return;
      const obj = buildings.find((x) => Number(x.building_id) === Number(selectedBuildingId));
      if (obj) saveSelectedBuilding(obj);
      setWorker((prev) => ({ ...prev, building_id: Number(selectedBuildingId) }));
    } catch {}
  }, [selectedBuildingId, buildings]);

  // ===== התראות (אתמול+היום) =====
  const [urgent, setUrgent] = useState([]);
  const [svcImageById, setSvcImageById] = useState({});
  const [loadingUrgent, setLoadingUrgent] = useState(false);
  const [imgPreview, setImgPreview] = useState({ open: false, url: "", title: "" });

  useEffect(() => {
    if (!worker.building_id) return;

    const today = new Date();
    const yesterday = addDays(today, -1);
    const todayKey = toDateKey(today);
    const yestKey = toDateKey(yesterday);
    const ymKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;
    const bIdNum = Number(worker.building_id);

    const makeStartISO = (row) => {
      const d1 = row.scheduled_datetime
        ? smartParseDate(row.scheduled_datetime)
        : row.date
        ? smartParseDate(`${row.date}T${row.time || "00:00:00"}`)
        : null;
      return d1 ? d1.toISOString() : null;
    };

    (async () => {
      try {
        setLoadingUrgent(true);

        const fetchWorker = fetch(`${API_BASE}/api/schedule/worker?building_id=${worker.building_id}`, { credentials: "include" })
          .catch(() => ({ ok: false }));
        const fetchTenant = fetch(`${API_BASE}/api/schedule/tenant?building_id=${worker.building_id}`, { credentials: "include" })
          .catch(() => ({ ok: false }));

        const [schResMaybe, agendaRes, ovRes] = await Promise.all([
          fetchWorker.then(async (r) => (r && r.ok ? r : await fetchTenant)),
          fetch(`${API_BASE}/api/manager/agenda?from=${yestKey}&to=${todayKey}&building_id=${worker.building_id}`, { credentials: "include" })
            .catch(() => ({ ok: false })),
          fetch(`${API_BASE}/api/worker/reports/overview?month=${ymKey}&buildingId=${worker.building_id}`, { credentials: "include" })
            .catch(() => ({ ok: false })),
        ]);

        const scheduleRows = schResMaybe && schResMaybe.ok ? await schResMaybe.json() : [];
        const agendaRows = agendaRes && agendaRes.ok ? await agendaRes.json() : [];
        const overviewJson = ovRes && ovRes.ok ? await ovRes.json() : null;

        const baseRaw = (Array.isArray(scheduleRows) ? scheduleRows : []).map((r) => ({
          id: r.id,
          origin_type: r.origin_type,
          title: r.description || r.type || "משימה",
          type: r.type || r.category || "",
          date: r.date,
          time: r.time,
          frequency: r.frequency,
          scheduled_datetime: r.scheduled_datetime,
          building_id: Number(r.building_id ?? worker.building_id),
          building_name: r.building_name || r.building_address || "",
          assignee: r.worker || "",
          status: r.status || "",
          image_url: r.image_url || null,
        }));
        const base = baseRaw.filter((row) => Number(row.building_id) === bIdNum);

        const agendaNorm = (Array.isArray(agendaRows) ? agendaRows : []).map((r) => ({
          id: r.id ?? r.call_id ?? r.service_id ?? r.task_id ?? r.request_id ?? r.routine_id ?? null,
          origin_type: r.origin_type || r.source || r.event_source || "",
          title: r.title || r.description || r.type || "אירוע",
          type: r.type || r.category || "",
          scheduled_datetime: r.start || r.scheduled_datetime || null,
          date: r.date,
          time: r.time,
          frequency: r.frequency,
          building_id: r.building_id != null ? Number(r.building_id) : null,
          building_name: r.building_name || r.building_address || "",
          assignee: r.worker || r.assignee || "",
          status: r.status || "",
          image_url: r.image_url || null,
        }));
        const agenda = agendaNorm.filter((row) => Number(row.building_id) === bIdNum);

        const expandedSchedule = expandEventsInRange(base, dayStart(yesterday), dayEnd(today));
        const expandedAgenda = expandEventsInRange(agenda, dayStart(yesterday), dayEnd(today));

        let routineUrgent = [];
        if (overviewJson) {
          const upcoming = Array.isArray(overviewJson?.routine_tasks?.upcoming) ? overviewJson.routine_tasks.upcoming : [];
          routineUrgent = upcoming
            .map((t) => {
              const baseDate = t.when ? new Date(`${t.when}T${t.time || "00:00:00"}`) : null;
              if (!baseDate || isNaN(baseDate)) return null;
              const shifted = bumpIfSaturday(baseDate);
              const key = toDateKey(shifted);
              if (key !== todayKey && key !== yestKey) return null;
              return {
                id: t.task_id,
                origin_type: "routine",
                title: t.task_name || "משימה קבועה",
                type: "routine",
                start: shifted.toISOString(),
                date: toDateKey(shifted),
                time: t.time || "",
                frequency: t.frequency || "",
                building_id: bIdNum,
                building_name: "",
                assignee: "",
                status: "",
              };
            })
            .filter(Boolean);
        }

        const dayMatch = [];
        for (const b of [...base, ...agenda]) {
          const d =
            smartParseDate(b.scheduled_datetime) ||
            (b.date ? smartParseDate(`${b.date}T${b.time || "00:00:00"}`) : null);
          const key = d ? toDateKey(d) : b.date || "";
          if (key === todayKey || key === yestKey) {
            dayMatch.push({ ...b, start: makeStartISO(b) || (d ? d.toISOString() : undefined) });
          }
        }

        const seen = new Set();
        const unified = [...expandedSchedule, ...expandedAgenda, ...routineUrgent, ...dayMatch]
          .filter((ev) => {
            const k = `${ev.id || ""}|${String(ev.start || "").slice(0, 16)}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .sort((a, b) => (smartParseDate(a.start)?.getTime() ?? 0) - (smartParseDate(b.start)?.getTime() ?? 0));

        setUrgent(unified);

        const svcList = await fetchServiceCallsIndex(worker.building_id);
        const map = {};
        for (const row of Array.isArray(svcList) ? svcList : []) {
          const id = getServiceId(row);
          const raw = row?.image_url || row?.imageUrl || findImageInObject(row);
          if (id && raw) map[String(id)] = normalizeUrl(raw);
        }
        setSvcImageById(map);
      } catch (e) {
        console.error("worker urgent fetch failed:", e);
        setUrgent([]);
        setSvcImageById({});
      } finally {
        setLoadingUrgent(false);
      }
    })();
  }, [worker.building_id]);

  // ===== לוח חודשי =====
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [monthEvents, setMonthEvents] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  useEffect(() => {
    if (!worker.building_id) return;

    const first = startOfMonth(monthDate);
    const last = endOfMonth(monthDate);
    const ymKey = `${monthDate.getFullYear()}-${pad2(monthDate.getMonth() + 1)}`;
    const bIdNum = Number(worker.building_id);

    (async () => {
      try {
        setLoadingMonth(true);

        let rows = [];
        try {
          const r1 = await fetch(`${API_BASE}/api/schedule/worker?building_id=${worker.building_id}`, { credentials: "include" });
          if (r1.ok) rows = await r1.json();
          else {
            const r2 = await fetch(`${API_BASE}/api/schedule/tenant?building_id=${worker.building_id}`, { credentials: "include" });
            rows = r2.ok ? await r2.json() : [];
          }
        } catch {}

        const baseRaw = (Array.isArray(rows) ? rows : []).map((r) => ({
          id: r.id,
          origin_type: r.origin_type,
          title: r.description || r.type || "משימה",
          type: r.type || r.category || "",
          date: r.date,
          time: r.time,
          frequency: r.frequency,
          scheduled_datetime: r.scheduled_datetime,
          building_id: Number(r.building_id ?? worker.building_id),
          building_name: r.building_name || r.building_address || "",
          assignee: r.worker || "",
          status: r.status || "",
        }));
        const base = baseRaw.filter((row) => Number(row.building_id) === bIdNum);
        const expandedBase = expandEventsInRange(base, dayStart(first), dayEnd(last));

        let routineEvents = [];
        try {
          const ovRes = await fetch(`${API_BASE}/api/worker/reports/overview?month=${ymKey}&buildingId=${worker.building_id}`, { credentials: "include" });
          if (ovRes.ok) {
            const ov = await ovRes.json();
            const upcoming = Array.isArray(ov?.routine_tasks?.upcoming) ? ov.routine_tasks.upcoming : [];
            routineEvents = upcoming
              .map((t) => {
                const baseDate = t.when ? new Date(`${t.when}T${t.time || "00:00:00"}`) : null;
                if (!baseDate || isNaN(baseDate)) return null;
                const shifted = bumpIfSaturday(baseDate);
                return {
                  id: t.task_id,
                  origin_type: "routine",
                  title: t.task_name || "משימה קבועה",
                  type: "routine",
                  start: shifted.toISOString(),
                  date: toDateKey(shifted),
                  time: t.time || "",
                  frequency: null,
                  building_id: bIdNum,
                  building_name: "",
                  assignee: "",
                  status: "",
                };
              })
              .filter(Boolean);
          }
        } catch {}

        setMonthEvents([...expandedBase, ...routineEvents]);
      } catch (e) {
        console.error("worker month events fetch failed:", e);
        setMonthEvents([]);
      } finally {
        setLoadingMonth(false);
      }
    })();
  }, [monthDate, worker.building_id]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of monthEvents) {
      const k = String(ev.start || "").slice(0, 10);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    return map;
  }, [monthEvents]);

  const daysGrid = useMemo(() => {
    const first = startOfMonth(monthDate);
    const last = endOfMonth(monthDate);
    const out = [];
    const padBefore = first.getDay();
    for (let i = 0; i < padBefore; i++) out.push({ key: `pad-${i}`, empty: true });
    for (let d = 1; d <= last.getDate(); d++) {
      const cur = new Date(first.getFullYear(), first.getMonth(), d);
      out.push({ key: toDateKey(cur), date: cur });
    }
    while (out.length % 7 !== 0) out.push({ key: `pad-tail-${out.length}`, empty: true });
    return out;
  }, [monthDate]);

  const [openDay, setOpenDay] = useState(null);
  const dayEvents = useMemo(() => (openDay ? eventsByDay.get(openDay) || [] : []), [openDay, eventsByDay]);

  // הערה: ניווט לפי סוג אירוע
  const navigateFromEvent = (ev) => {
    const dateKey = String(ev.start || "").slice(0, 10);
    if (isServiceEvent(ev)) {
      const id = getServiceId(ev);
      navigate(id != null ? `/worker/service-calls#${anchorForCall(id)}` : `/worker/service-calls`);
    } else if (isRoutine(ev)) {
      const rid = ev.routine_id || ev.task_id || ev.id || "";
      navigate(rid ? `/worker/schedule?date=${dateKey}#${anchorForTask(rid)}` : `/worker/schedule?date=${dateKey}`);
    } else {
      navigate(`/worker/schedule?date=${dateKey}`);
    }
  };

  const currentBuildingLabel = useMemo(() => {
    const b = buildings.find((x) => Number(x.building_id) === Number(selectedBuildingId));
    if (!b) return "";
    const name = b?.name ? String(b.name) : "";
    const address = b?.address ? String(b.address) : "";
    return [name, address].filter(Boolean).join(" • ");
  }, [buildings, selectedBuildingId]);

  return (
    <div className={classes.container}>
      <h2>ברוך הבא {userName || "עובד"}</h2>

      {/* הערה: בחירת בניין (לא מנווט לשום עמוד, רק שומר בחירה) */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>בחר בניין:</div>
        <select
          value={selectedBuildingId ?? ""}
          onChange={(e) => {
            try {
              const nextId = e.target.value ? Number(e.target.value) : null;
              setSelectedBuildingId(nextId);
            } catch {}
          }}
          style={{ padding: 8, borderRadius: 8, minWidth: 260 }}
        >
          {buildings.length === 0 ? (
            <option value="">אין בניינים משויכים</option>
          ) : (
            buildings.map((b) => (
              <option key={b.building_id} value={b.building_id}>
                {b.name} • {b.address}
              </option>
            ))
          )}
        </select>

        {currentBuildingLabel ? (
          <div style={{ marginTop: 6, opacity: 0.8 }}>בניין נבחר: {currentBuildingLabel}</div>
        ) : null}
      </div>

      <div className={classes.mainContent}>
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
                  const key = `${ev.type || ev.title}-${ev.id}-${String(ev.start || "").slice(0, 16)}`;
                  const isService = isServiceEvent(ev);
                  const idForImg = getServiceId(ev);
                  const fromEvent = getImageUrl(ev);
                  const fromIndex = idForImg ? svcImageById[String(idForImg)] : null;

                  const primary = isService ? fromEvent || fromIndex || null : null;
                  const fallback = primary ? swapPort(primary) : null;
                  const gridCols = primary ? "48px 1fr" : "1fr";

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
                            e.stopPropagation();
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
                      <div>
                        <div className={classes.notifTitle}>{formatLocalHM(ev.start)} · {ev.title}</div>
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

        <section>
          <div className={classes.calTop}>
            <div className={classes.calNav}>
              <button className={classes.calNavBtn} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>◀︎</button>
              <div className={classes.monthLabel}>{`${heMonths[monthDate.getMonth()]} ${monthDate.getFullYear()}`}</div>
              <button className={classes.calNavBtn} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>▶︎</button>
            </div>
            <h3 className={classes.calTitle}>לוח חודשי קטן</h3>
          </div>

          <div className={classes.weekdayRow}>
            {["א","ב","ג","ד","ה","ו","ש"].map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className={classes.scheduleGridRTL}>
            {daysGrid.map((cell) =>
              cell.empty ? (
                <div key={cell.key} />
              ) : (
                <div key={cell.key} className={classes.dayCell} onClick={() => setOpenDay(cell.key)} title={cell.key}>
                  {cell.date.getDate()}
                  {(eventsByDay.get(cell.key)?.length || 0) > 0 && (
                    <span className={classes.dayBadge}>{eventsByDay.get(cell.key).length}</span>
                  )}
                </div>
              )
            )}
          </div>

          {loadingMonth && <div className={classes.loading}>טוען אירועי חודש…</div>}

          <div className={classes.fullBtnWrap}>
            <button className={classes.fullBtn} onClick={() => navigate("/worker/schedule")}>
              מעבר ללוח המלא
            </button>
          </div>
        </section>
      </div>

      {openDay && (
        <div className={classes.modalBackdrop} onClick={() => setOpenDay(null)}>
          <div className={classes.modal} onClick={(e) => e.stopPropagation()}>
            <div className={classes.modalHeader}>
              <h3 className={classes.modalTitle}>אירועי היום • {formatHeDate(openDay)}</h3>
              <button className={classes.modalClose} onClick={() => setOpenDay(null)} aria-label="סגור">×</button>
            </div>
            <div className={classes.modalBody}>
              {dayEvents.length === 0 ? (
                <div className={classes.emptyText}>אין אירועים ביום זה.</div>
              ) : (
                <ul className={classes.dayList}>
                  {dayEvents.map((ev) => (
                    <li
                      key={`${ev.type}-${ev.id}-${ev.start}`}
                      className={classes.dayItem}
                      onClick={() => navigateFromEvent(ev)}
                      style={{ cursor: "pointer" }}
                      title="פתיחת הפריט"
                    >
                      <div className={classes.notifTitle}>{formatLocalHM(ev.start)} · {ev.title}</div>
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

      {imgPreview.open && (
        <div className={classes.modalBackdrop} onClick={() => setImgPreview({ open: false, url: "", title: "" })}>
          <div className={classes.modal} style={{ maxWidth: "min(92vw, 900px)" }} onClick={(e) => e.stopPropagation()}>
            <div className={classes.modalHeader}>
              <h3 className={classes.modalTitle}>{imgPreview.title || "תמונה"}</h3>
              <button className={classes.modalClose} onClick={() => setImgPreview({ open: false, url: "", title: "" })} aria-label="סגור">×</button>
            </div>
            <div className={classes.modalBody} style={{ display: "flex", justifyContent: "center" }}>
              <img src={imgPreview.url} alt="" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
