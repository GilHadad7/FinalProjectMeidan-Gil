// src/pages/ReportsTenantPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import classes from "./ReportsTenantPage.module.css";

/* ---------- API base (ENV → fallback) ---------- */
const API =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8801";

/* ---------- Dev fallback ---------- */
const DEV_USER_ID = 1;

/* ---------- storage keys ---------- */
const STORAGE_KEY = "tenantCtx";

/* ---------- utils ---------- */
const pad2 = (n) => String(n).padStart(2, "0");
const nowYM = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};
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
const readSavedCtx = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveCtx = (ctx) => {
  try {
    if (ctx?.userId) localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {}
};

/* ---------- URL helpers ---------- */
function buildUrl(path, { userId, buildingId, params = {} }) {
  const url = new URL(path, API);
  url.searchParams.set("userId", String(userId));
  if (buildingId != null) url.searchParams.set("buildingId", String(buildingId));
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)));
  return url.toString();
}
async function apiJson(path, ctx, params = {}) {
  const url = buildUrl(path, { ...ctx, params });
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/* ---------- Discover tenant context (survives refresh) ---------- */
async function discoverTenantContext() {
  const saved = readSavedCtx();
  if (saved?.userId) return saved;

  for (const k of ["authUser", "user", "currentUser"]) {
    try {
      const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.id || u?.user_id) {
          const preliminary = {
            userId: Number(u.id ?? u.user_id),
            buildingId: u.building_id ?? u?.tenant?.building_id ?? null,
            name: u.name || "",
          };
          try {
            const qs = preliminary.userId ? `?userId=${preliminary.userId}` : "";
            const r = await fetch(`${API}/api/tenant/reports/health${qs}`, { credentials: "include" });
            if (r.ok) {
              const j = await r.json();
              const hydrated = {
                userId: Number(j?.user?.user_id ?? preliminary.userId ?? DEV_USER_ID),
                buildingId: j?.user?.building_id ?? preliminary.buildingId ?? null,
                name: j?.user?.name ?? preliminary.name ?? "",
              };
              saveCtx(hydrated);
              return hydrated;
            }
          } catch {}
          saveCtx(preliminary);
          return preliminary;
        }
      }
    } catch {}
  }

  try {
    const r = await fetch(`${API}/api/tenant/reports/health`, { credentials: "include" });
    if (r.ok) {
      const j = await r.json();
      const hydrated = {
        userId: Number(j?.user?.user_id ?? DEV_USER_ID),
        buildingId: j?.user?.building_id ?? null,
        name: j?.user?.name ?? "",
      };
      saveCtx(hydrated);
      return hydrated;
    }
  } catch {}

  const dev = { userId: DEV_USER_ID, buildingId: null, name: "" };
  saveCtx(dev);
  return dev;
}

export default function ReportsTenantPage() {
  const [ctx, setCtx] = useState({ userId: null, buildingId: null, name: "" });
  const [ctxReady, setCtxReady] = useState(false);

  // Month & toggles
  const [selectedMonth, setSelectedMonth] = useState(nowYM());
  const [showAllHistory, setShowAllHistory] = useState(false);

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

  /* --- load tenant context on mount --- */
  useEffect(() => {
    (async () => {
      const u = await discoverTenantContext();
      setCtx(u);
      setCtxReady(true);
    })();
  }, []);

  /* --- persist ctx whenever it changes (survive refresh) --- */
  useEffect(() => {
    if (ctx?.userId) saveCtx(ctx);
  }, [ctx]);

  // Destructure ctx to stable primitives (cleans ESLint deps)
  const { userId, buildingId } = ctx;

  /* --- fetchers (memoized) --- */
  const fetchPayments = useCallback(async () => {
    if (!ctxReady || !userId) return;
    setLoadingPay(true);
    try {
      const params = showAllHistory ? { all: "1" } : { all: "0", month: selectedMonth || nowYM() };
      const j = await apiJson(`/api/tenant/reports/payments-history`, { userId, buildingId }, params);
      setPayTotals(j.totals || { paid: 0, debt: 0 });
      setPayItems(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      console.error("payments-history failed:", e);
      setPayTotals({ paid: 0, debt: 0 });
      setPayItems([]);
    } finally {
      setLoadingPay(false);
    }
  }, [ctxReady, userId, buildingId, selectedMonth, showAllHistory]);

  const fetchActivity = useCallback(async () => {
    if (!ctxReady || !userId) return;
    setLoadingAct(true);
    try {
      const ym = selectedMonth || nowYM();
      let j = await apiJson(`/api/tenant/reports/activity`, { userId, buildingId }, { month: ym });

      if (!j?.routine_tasks?.items?.length) {
        try {
          const ov = await apiJson(`/api/worker/reports/overview`, { userId, buildingId }, { month: ym });
          const upcoming = Array.isArray(ov?.routine_tasks?.upcoming) ? ov.routine_tasks.upcoming : [];
          const routines = upcoming.map((t) => ({
            task_id: t.task_id,
            task_name: t.task_name || "משימה קבועה",
            when: t.when,
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
  }, [ctxReady, userId, buildingId, selectedMonth]);

  /* --- trigger fetches on relevant changes --- */
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <div className={classes.container}>
      <h2 className={classes.title}>דוחות (דייר)</h2>

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
      </div>

      {/* היסטוריית תשלומים */}
      <div className={classes.block}>
        <h3 className={classes.blockTitle}>היסטוריית תשלומי הבניין</h3>
        <div className={classes.muted}>
          {loadingPay ? (
            "טוען…"
          ) : showAllHistory ? (
            <>
              מוצגים כל התשלומים בבניין — סכום שולם: <b>{payTotals.paid.toFixed(2)} ₪</b> · חוב/ממתין:{" "}
              <b>{payTotals.debt.toFixed(2)} ₪</b>
            </>
          ) : (
            <>
              מוצגים תשלומי {formatIL(selectedMonth)} — סכום שולם:{" "}
              <b>{payTotals.paid.toFixed(2)} ₪</b> · חוב/ממתין:{" "}
              <b>{payTotals.debt.toFixed(2)} ₪</b>
            </>
          )}
        </div>
        {!loadingPay && payItems.length === 0 && (
          <div className={classes.empty}>אין תשלומים להצגה.</div>
        )}
        {!loadingPay && payItems.length > 0 && (
          <ul className={classes.list}>
            {payItems.slice(0, 15).map((p) => (
              <li key={p.payment_id}>
                {formatIL(p.payment_date)} · {p.category || "—"} · {p.description || "—"} ·{" "}
                {Number(p.amount || 0).toFixed(2)} ₪ · ({p.status || ""})
              </li>
            ))}
            {payItems.length > 15 && (
              <li className={classes.muted}>… ועוד {payItems.length - 15} רשומות</li>
            )}
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
                סה״כ: <b>{activity.service_calls.total}</b> | נסגרו:{" "}
                <b>{activity.service_calls.closed}</b>
              </>
            )}
          </div>
          {!loadingAct && activity.service_calls.items.length === 0 && (
            <div className={classes.empty}>אין קריאות שירות בחודש זה.</div>
          )}
          {!loadingAct && activity.service_calls.items.length > 0 && (
            <ul className={classes.list}>
              {activity.service_calls.items.slice(0, 15).map((c) => (
                <li key={c.call_id}>
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
                <li key={`${t.task_id}-${i}`}>
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
