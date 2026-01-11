// 📁 C:\PATH\TO\YOUR\PROJECT\client\src\pages\ReportsWorkerPage.jsx
// הערה: דף דוחות לעובד לפי בניין נבחר – עובד בדיוק כמו ReportsTenantPage (אותו מבנה נתונים)

import React, { useEffect, useState, useCallback } from "react";
import classes from "../worker/ReportsWorkerPage.module.css";

/* ---------- API base (ENV → fallback) ---------- */
// הערה: בסיס כתובת השרת
const API =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8801";

/* ---------- storage keys ---------- */
// הערה: שמירת קונטקסט עובד
const STORAGE_KEY = "workerReportsCtx";
// הערה: בניין נבחר עובד (כבר אצלך בפרויקט)
const WORKER_SELECTED_BUILDING_KEY = "worker_selected_building";

/* ---------- utils ---------- */
// הערה: ממלא מספר לשתי ספרות
const pad2 = (n) => String(n).padStart(2, "0");
// הערה: מחזיר חודש נוכחי YYYY-MM
const nowYM = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};
// הערה: פורמט תאריך/חודש לתצוגה בעברית
function formatIL(input) {
  if (!input) return "—";
  if (typeof input === "string" && /^\d{4}-\d{2}$/.test(input)) {
    const [y, m] = input.split("-").map(Number);
    return `${m}.${y}`;
  }
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
}

/* ---------- storage helpers ---------- */
// הערה: קורא קונטקסט עובד מה-storage
const readSavedCtx = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
// הערה: שומר קונטקסט עובד ב-storage
const saveCtx = (ctx) => {
  try {
    if (ctx?.userId) localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {}
};
// הערה: קורא בניין נבחר מה-sessionStorage
function readSelectedBuilding() {
  try {
    const raw = sessionStorage.getItem(WORKER_SELECTED_BUILDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
// הערה: שומר בניין נבחר ב-sessionStorage
function saveSelectedBuilding(b) {
  try {
    if (!b || b.building_id == null) return;
    sessionStorage.setItem(
      WORKER_SELECTED_BUILDING_KEY,
      JSON.stringify({
        building_id: Number(b.building_id),
        name: b.name || "",
        address: b.address || b.full_address || b.building_address || "",
      })
    );
  } catch {}
}

/* ---------- URL helpers ---------- */
// הערה: בונה URL עם query כמו בדוח דייר
function buildUrl(path, { userId, buildingId, params = {} }) {
  const url = new URL(path, API);
  url.searchParams.set("userId", String(userId));
  if (buildingId != null) url.searchParams.set("buildingId", String(buildingId));
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)));
  return url.toString();
}

// הערה: מבצע fetch ל-JSON עם fallback בין worker ל-tenant (כדי שזה יעבוד בלי לנחש ראוטים)
async function apiJsonWithFallback(workerPath, tenantPath, ctx, params = {}) {
  // 1) ננסה קודם worker
  try {
    const url1 = buildUrl(workerPath, { ...ctx, params });
    const r1 = await fetch(url1, { credentials: "include" });
    if (r1.ok) return r1.json();
    // אם זה 404/400/500 ננסה fallback
  } catch {}

  // 2) fallback: tenant (כי ראינו שזה עובד אצלך)
  const url2 = buildUrl(tenantPath, { ...ctx, params });
  const r2 = await fetch(url2, { credentials: "include" });
  if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
  return r2.json();
}

/* ---------- Discover worker context (survives refresh) ---------- */
// הערה: מגלה את העובד (userId + name) כמו בשאר הדפים
async function discoverWorkerContext() {
  const saved = readSavedCtx();
  if (saved?.userId) return saved;

  // 1) auth/me הכי בטוח
  try {
    const r = await fetch(`${API}/api/auth/me`, { credentials: "include" });
    if (r.ok) {
      const u = await r.json();
      const hydrated = {
        userId: Number(u?.id ?? u?.worker?.id ?? null),
        name: u?.name ?? "",
      };
      if (hydrated.userId) {
        saveCtx(hydrated);
        return hydrated;
      }
    }
  } catch {}

  // 2) fallback: storage
  for (const k of ["authUser", "user", "currentUser"]) {
    try {
      const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (raw) {
        const u = JSON.parse(raw);
        const hydrated = {
          userId: Number(u?.id ?? u?.worker?.id ?? u?.user_id ?? null),
          name: u?.name ?? "",
        };
        if (hydrated.userId) {
          saveCtx(hydrated);
          return hydrated;
        }
      }
    } catch {}
  }

  return { userId: null, name: "" };
}

export default function ReportsWorkerPage() {
  const [ctx, setCtx] = useState({ userId: null, name: "" });
  const [ctxReady, setCtxReady] = useState(false);

  // Month & toggles
  const [selectedMonth, setSelectedMonth] = useState(nowYM());
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Buildings
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(() => {
    const stored = readSelectedBuilding();
    return stored?.building_id ?? null;
  });

  // Payments state
  const [payTotals, setPayTotals] = useState({ paid: 0, debt: 0 });
  const [payItems, setPayItems] = useState([]);
  const [loadingPay, setLoadingPay] = useState(false);

  // Activity state
  const [activity, setActivity] = useState({
    service_calls: { total: 0, closed: 0, items: [] },
    routine_tasks: { total: 0, items: [] },
  });
  const [loadingAct, setLoadingAct] = useState(false);

  /* --- load worker context on mount --- */
  useEffect(() => {
    (async () => {
      const u = await discoverWorkerContext();
      setCtx(u);
      setCtxReady(true);
    })();
  }, []);

  /* --- persist ctx whenever it changes --- */
  useEffect(() => {
    if (ctx?.userId) saveCtx(ctx);
  }, [ctx]);

  const { userId } = ctx;

  /* --- load buildings for this worker --- */
  useEffect(() => {
    (async () => {
      try {
        if (!ctxReady || !userId) return;

        const res = await fetch(`${API}/api/buildings/by-worker/${encodeURIComponent(userId)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          setBuildings([]);
          setSelectedBuildingId(null);
          return;
        }

        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        setBuildings(list);

        const stored = readSelectedBuilding();
        const storedId = stored?.building_id ?? null;
        const firstId = list?.[0]?.building_id ?? null;
        const initialId = storedId ?? firstId ?? null;

        if (initialId != null) {
          setSelectedBuildingId(Number(initialId));
          const obj =
            list.find((x) => Number(x.building_id) === Number(initialId)) || {
              building_id: Number(initialId),
              address: stored?.address || "",
              name: stored?.name || "",
            };
          saveSelectedBuilding(obj);
        } else {
          setSelectedBuildingId(null);
        }
      } catch {
        setBuildings([]);
        setSelectedBuildingId(null);
      }
    })();
  }, [ctxReady, userId]);

  /* --- keep building selection saved --- */
  useEffect(() => {
    try {
      if (selectedBuildingId == null) return;
      const obj = buildings.find((x) => Number(x.building_id) === Number(selectedBuildingId));
      if (obj) saveSelectedBuilding(obj);
    } catch {}
  }, [selectedBuildingId, buildings]);

  /* --- fetch payments (exact like tenant) --- */
  const fetchPayments = useCallback(async () => {
    if (!ctxReady || !userId || !selectedBuildingId) return;
    setLoadingPay(true);
    try {
      const params = showAllHistory ? { all: "1" } : { all: "0", month: selectedMonth || nowYM() };

      const j = await apiJsonWithFallback(
        "/api/worker/reports/payments-history",
        "/api/tenant/reports/payments-history",
        { userId, buildingId: selectedBuildingId },
        params
      );

      setPayTotals(j?.totals || { paid: 0, debt: 0 });
      setPayItems(Array.isArray(j?.items) ? j.items : []);
    } catch (e) {
      console.error("payments-history failed:", e);
      setPayTotals({ paid: 0, debt: 0 });
      setPayItems([]);
    } finally {
      setLoadingPay(false);
    }
  }, [ctxReady, userId, selectedBuildingId, selectedMonth, showAllHistory]);

  /* --- fetch activity (exact like tenant) --- */
  const fetchActivity = useCallback(async () => {
    if (!ctxReady || !userId || !selectedBuildingId) return;
    setLoadingAct(true);

    try {
      const ym = selectedMonth || nowYM();

      let j = await apiJsonWithFallback(
        "/api/worker/reports/activity",
        "/api/tenant/reports/activity",
        { userId, buildingId: selectedBuildingId },
        { month: ym }
      );

      // הערה: אם אין משימות קבועות - fallback ל-overview (בדיוק כמו בדוח דייר שלך)
      if (!j?.routine_tasks?.items?.length) {
        try {
          const ov = await apiJsonWithFallback(
            "/api/worker/reports/overview",
            "/api/worker/reports/overview",
            { userId, buildingId: selectedBuildingId },
            { month: ym }
          );

          const upcoming = Array.isArray(ov?.routine_tasks?.upcoming) ? ov.routine_tasks.upcoming : [];
          const routines = upcoming.map((t) => ({
            task_id: t.task_id ?? t.id,
            task_name: t.task_name || t.name || "משימה קבועה",
            when: t.when || t.date || t.scheduled_datetime,
            time: t.time,
            frequency: t.frequency || "",
          }));

          j = {
            service_calls: j?.service_calls || { total: 0, closed: 0, items: [] },
            routine_tasks: { total: routines.length, items: routines },
          };
        } catch {}
      }

      setActivity({
        service_calls: j?.service_calls || { total: 0, closed: 0, items: [] },
        routine_tasks: j?.routine_tasks || { total: 0, items: [] },
      });
    } catch (e) {
      console.error("activity failed:", e);
      setActivity({
        service_calls: { total: 0, closed: 0, items: [] },
        routine_tasks: { total: 0, items: [] },
      });
    } finally {
      setLoadingAct(false);
    }
  }, [ctxReady, userId, selectedBuildingId, selectedMonth]);

  /* --- trigger fetches on relevant changes --- */
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const selectedAddress =
    buildings.find((b) => Number(b.building_id) === Number(selectedBuildingId))?.address ||
    buildings.find((b) => Number(b.building_id) === Number(selectedBuildingId))?.full_address ||
    buildings.find((b) => Number(b.building_id) === Number(selectedBuildingId))?.building_address ||
    "";

  return (
    <div className={classes.container}>
      <h2 className={classes.title}>דוחות {ctx?.name ? ` — ${ctx.name}` : ""}</h2>

      <div className={classes.gridTop}>
        <div className={classes.card}>
          <h3 className={classes.cardTitle}>תשלומי בניין</h3>
          <p className={classes.muted}>אפשר להציג את כל ההיסטוריה או רק את החודש הנבחר.</p>
          <label className={classes.checkRow}>
            <input
              type="checkbox"
              checked={showAllHistory}
              onChange={(e) => setShowAllHistory(e.target.checked)}
            />
            הצג את כל ההיסטוריה
          </label>
        </div>

        <div className={classes.card}>
          <h3 className={classes.cardTitle}>בחירת חודש לפעילות</h3>
          <p className={classes.muted}>משימות קבועות וקריאות שירות יוצגו לפי החודש שתבחר.</p>
          <input
            type="month"
            className={classes.monthInput}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <div className={classes.card}>
          <h3 className={classes.cardTitle}>בחירת בניין</h3>
          <p className={classes.muted}>בחר כתובת כדי לראות דוח.</p>
          <select
            value={selectedBuildingId ?? ""}
            onChange={(e) => {
              try {
                const nextId = e.target.value ? Number(e.target.value) : null;
                setSelectedBuildingId(nextId);
              } catch {}
            }}
            className={classes.monthInput}
            style={{ cursor: "pointer" }}
          >
            {buildings.length === 0 ? (
              <option value="">אין בניינים משוייכים לעובד</option>
            ) : (
              buildings.map((b) => (
                <option key={b.building_id} value={b.building_id}>
                  {b.address || b.full_address || b.building_address || b.name || `בניין #${b.building_id}`}
                </option>
              ))
            )}
          </select>

          {selectedAddress ? (
            <div className={classes.muted} style={{ marginTop: 8 }}>
              {selectedAddress}
            </div>
          ) : null}
        </div>
      </div>

      {/* היסטוריית תשלומים */}
      <div className={classes.block}>
        <h3 className={classes.blockTitle}>היסטוריית תשלומי הבניין</h3>
        <div className={classes.muted}>
          {loadingPay ? (
            "טוען…"
          ) : showAllHistory ? (
            <>
              מוצגים כל התשלומים בבניין — סכום שולם: <b>{Number(payTotals.paid || 0).toFixed(2)} ₪</b> · חוב/ממתין:{" "}
              <b>{Number(payTotals.debt || 0).toFixed(2)} ₪</b>
            </>
          ) : (
            <>
              מוצגים תשלומי {formatIL(selectedMonth)} — סכום שולם:{" "}
              <b>{Number(payTotals.paid || 0).toFixed(2)} ₪</b> · חוב/ממתין:{" "}
              <b>{Number(payTotals.debt || 0).toFixed(2)} ₪</b>
            </>
          )}
        </div>

        {!loadingPay && payItems.length === 0 && <div className={classes.empty}>אין תשלומים להצגה.</div>}

        {!loadingPay && payItems.length > 0 && (
          <ul className={classes.list}>
            {payItems.slice(0, 15).map((p, idx) => (
              <li key={p.payment_id || `${p.payment_date}-${idx}`}>
                {formatIL(p.payment_date)} · {p.category || "—"} · {p.description || "—"} ·{" "}
                {Number(p.amount || 0).toFixed(2)} ₪ · ({p.status || ""})
              </li>
            ))}
            {payItems.length > 15 && <li className={classes.muted}>… ועוד {payItems.length - 15} רשומות</li>}
          </ul>
        )}
      </div>

      {/* פעילות חודשית */}
      <div className={classes.block}>
        <h3 className={classes.blockTitle}>{formatIL(selectedMonth)} — פעילות חודשית בבניין</h3>

        <div className={classes.subBlock}>
          <div className={classes.subTitle}>🛠️ קריאות שירות</div>
          <div className={classes.muted}>
            {loadingAct ? (
              "טוען…"
            ) : (
              <>
                סה״כ: <b>{activity.service_calls.total}</b> | נסגרו: <b>{activity.service_calls.closed}</b>
              </>
            )}
          </div>

          {!loadingAct && activity.service_calls.items.length === 0 && (
            <div className={classes.empty}>אין קריאות שירות בחודש זה.</div>
          )}

          {!loadingAct && activity.service_calls.items.length > 0 && (
            <ul className={classes.list}>
              {activity.service_calls.items.slice(0, 15).map((c, idx) => (
                <li key={c.call_id || `${c.created_at}-${idx}`}>
                  {formatIL(c.created_at)} · {c.service_type || "—"} · {c.description || "—"}{" "}
                  {c.status ? `· (${c.status})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={classes.subBlock}>
          <div className={classes.subTitle}>🧹 משימות קבועות בחודש</div>

          {loadingAct && <div className={classes.muted}>טוען…</div>}

          {!loadingAct && activity.routine_tasks.items.length === 0 && (
            <div className={classes.empty}>אין משימות קבועות בחודש זה.</div>
          )}

          {!loadingAct && activity.routine_tasks.items.length > 0 && (
            <ul className={classes.list}>
              {activity.routine_tasks.items.slice(0, 15).map((t, i) => (
                <li key={`${t.task_id || "rt"}-${i}`}>
                  {formatIL(t.when)} · {t.task_name} {t.time ? `· ${t.time}` : ""}{" "}
                  {t.frequency ? `· (${t.frequency})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
