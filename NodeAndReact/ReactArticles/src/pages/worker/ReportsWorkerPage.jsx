// src/pages/ReportsWorkerPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import classes from "../tenant/ReportsTenantPage.module.css";

/* ========= Config ========= */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE) ||
  "http://localhost:8801";

// פולבאק רק אם באמת אין לנו הקשר (פיתוח בלבד)
const DEV_BUILDING_ID = null;

/* ========= Utils ========= */
const pad2 = (n) => String(n).padStart(2, "0");
const nowYM = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};
const formatIL = (input) => {
  if (!input) return "—";
  if (typeof input === "string" && /^\d{4}-\d{2}$/.test(input)) {
    const [y, m] = input.split("-").map(Number);
    return `${m}.${y}`;
  }
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
};
const inMonth = (iso, ym) => {
  if (!iso) return false;
  const s = String(iso);
  return s.startsWith(ym + "-");
};

/* ========= Fetch helpers ========= */
async function getJSON(url) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function tryJSON(url) {
  try {
    return await getJSON(url);
  } catch {
    return null;
  }
}

/* ========= Component ========= */
export default function ReportsWorkerPage() {
  // הקשר משתמש/בניין
  const [ctx, setCtx] = useState({ id: null, name: "", building_id: null });
  const [ctxReady, setCtxReady] = useState(false);

  // חודש נבחר
  const [ym, setYm] = useState(nowYM());

  // KPIs + נתונים
  const [kpis, setKpis] = useState({
    open: 0,
    in_progress: 0,
    closed_this_month: 0,
    overdue: 0, // נשאיר בע.state תאורטית, לא בשימוש בתצוגה
  });

  const [calls, setCalls] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [payments, setPayments] = useState({ totals: { paid: 0, debt: 0 }, items: [] });

  const [loading, setLoading] = useState(true);

  // נשלוף buildingId / workerId מה-URL אם סופקו (עדיפות ראשונה)
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlBuildingId = urlParams?.get("buildingId") ? Number(urlParams.get("buildingId")) : null;
  const urlWorkerId = urlParams?.get("workerId") ? Number(urlParams.get("workerId")) : null;

  // --- זיהוי משתמש/בניין פעם אחת ---
  useEffect(() => {
    (async () => {
      let u = null;
      const me = await tryJSON(`${API_BASE}/api/me`);
      if (me?.id) {
        u = { id: me.id, name: me.name || "", building_id: me.building_id ?? null };
      } else {
        try {
          const fromStorage =
            JSON.parse(sessionStorage.getItem("user") || "{}") ||
            JSON.parse(localStorage.getItem("user") || "{}");
          u = { id: fromStorage?.id ?? null, name: fromStorage?.name || "", building_id: fromStorage?.building_id ?? null };
        } catch {
          u = { id: null, name: "", building_id: null };
        }
      }
      // אם יש buildingId ב-URL – הוא גובר
      if (urlBuildingId) u.building_id = urlBuildingId;
      if (urlWorkerId) u.id = urlWorkerId;

      setCtx(u);
      setCtxReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- שליפת Overview רק כשיש לנו הקשר מוכן ---
  useEffect(() => {
    if (!ctxReady) return;

    // עדיפויות: URL -> ctx -> DEV (אם ממש אין)
    const buildingId = urlBuildingId || ctx.building_id || DEV_BUILDING_ID;
    if (!buildingId) {
      setLoading(true);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ month: ym, buildingId: String(buildingId) }).toString();
        const overview = await tryJSON(`${API_BASE}/api/worker/reports/overview?${qs}`);
        if (overview?.kpis) {
          setKpis({
            open: overview.kpis.open || 0,
            in_progress: overview.kpis.in_progress || 0,
            closed_this_month: overview.kpis.closed_this_month || 0,
            overdue: overview.kpis.overdue || 0,
          });
          setCalls(overview.service_calls?.items || []);
          setRoutines(overview.routine_tasks?.upcoming || []);
          setPayments({
            totals: overview.payments?.totals || { paid: 0, debt: 0 },
            items: overview.payments?.items || [],
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxReady, ctx.building_id, ym, urlBuildingId]);

  const callsInMonth = useMemo(
    () => calls.filter((c) => inMonth(c.created_at || c.createdAt || c.opened_at, ym)),
    [calls, ym]
  );

  // מספר תשלומים בחודש הנבחר (מסנן לפי תאריך למקרה והשרת יחזיר יותר מחודש)
  const paymentsCount = useMemo(
    () => (Array.isArray(payments.items) ? payments.items.filter((p) => inMonth(p.payment_date, ym)).length : 0),
    [payments.items, ym]
  );

  const openDownload = (path, extra = {}) => {
    const buildingId = urlBuildingId || ctx.building_id;
    const workerId = urlWorkerId || ctx.id || undefined;
    const params = new URLSearchParams({
      ...extra,
      ...(buildingId ? { buildingId } : {}),
      ...(workerId ? { workerId } : {}),
    });
    const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}${params.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <div className={classes.container}>
      <h2 className={classes.title}>דוחות (עובד)</h2>

      {/* סרגל עליון */}
      <div className={classes.gridTop}>
        <div className={classes.card}>
          <h3 className={classes.cardTitle}>חודש הדוח</h3>
          <p className={classes.muted}>הנתונים מוצגים לפי החודש שתבחר.</p>
          <input
            type="month"
            className={classes.monthInput}
            value={ym}
            onChange={(e) => setYm(e.target.value)}
          />
        </div>

        <div className={classes.card}>
          <h3 className={classes.cardTitle}>מדדים מהירים</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
            <Kpi label="פתוחות" value={kpis.open} />
            <Kpi label="נסגרו" value={kpis.closed_this_month} />
            <Kpi label="משימות קבועות" value={routines.length} />
            <Kpi label="תשלומים החודש" value={paymentsCount} />
          </div>
        </div>

        <div className={classes.card}>
          <h3 className={classes.cardTitle}>הורדות</h3>
          <p className={classes.muted}>דוח פעילויות עובד לפי החודש הנבחר.</p>
          <button
            className={classes.btn}
            onClick={() => openDownload(`/api/worker/reports/pdf/activity`, { month: ym })}
          >
            הורד דוח פעילויות (PDF)
          </button>
          <button
            className={classes.btn}
            onClick={() => openDownload(`/api/worker/reports/csv/activity`, { month: ym })}
          >
            הורד פעילויות (CSV)
          </button>
        </div>
      </div>

      {/* קריאות בבניין – החודש */}
      <div className={classes.block}>
        <h3 className={classes.blockTitle}>{formatIL(ym)} — קריאות שירות בבניין</h3>
        {loading ? (
          <div className={classes.muted}>טוען…</div>
        ) : callsInMonth.length === 0 ? (
          <div className={classes.empty}>אין קריאות שירות בחודש זה.</div>
        ) : (
          <ul className={classes.list}>
            {callsInMonth.slice(0, 12).map((c, i) => {
              const created = c.created_at || c.createdAt || c.opened_at;
              return (
                <li key={c.call_id || c.id || i}>
                  {formatIL(created)} · {c.service_type || c.type || "—"} ·{" "}
                  {c.location_in_building || "—"} {c.status ? `· (${c.status})` : ""}
                </li>
              );
            })}
            {callsInMonth.length > 12 && (
              <li className={classes.muted}>… ועוד {callsInMonth.length - 12} קריאות</li>
            )}
          </ul>
        )}
      </div>

      {/* משימות קבועות */}
      <div className={classes.block}>
        <h3 className={classes.blockTitle}>משימות קבועות — {formatIL(ym)}</h3>
        {loading ? (
          <div className={classes.muted}>טוען…</div>
        ) : routines.length === 0 ? (
          <div className={classes.empty}>אין משימות קבועות החודש.</div>
        ) : (
          <ul className={classes.list}>
            {routines.slice(0, 15).map((t, i) => (
              <li key={t.task_id || i}>
                {formatIL(t.when || t.date)} · {t.task_name || t.name || "—"}{" "}
                {t.time ? `· ${t.time}` : ""} {t.frequency ? `· (${t.frequency})` : ""}
              </li>
            ))}
            {routines.length > 15 && (
              <li className={classes.muted}>… ועוד {routines.length - 15} משימות</li>
            )}
          </ul>
        )}
      </div>

      {/* תשלומים */}
      <div className={classes.block}>
        <h3 className={classes.blockTitle}>תשלומי בניין (תקציר)</h3>
        <div className={classes.muted}>
          סכום שולם: <b>{payments.totals.paid.toFixed(2)} ₪</b> · חוב/ממתין:{" "}
          <b>{payments.totals.debt.toFixed(2)} ₪</b>
        </div>
        {payments.items.length === 0 ? (
          <div className={classes.empty}>אין תשלומים להצגה.</div>
        ) : (
          <ul className={classes.list}>
            {payments.items.slice(0, 8).map((p) => (
              <li key={p.payment_id}>
                {formatIL(p.payment_date)} · {p.category || "—"} · {p.description || "—"} ·{" "}
                {Number(p.amount || 0).toFixed(2)} ₪ {p.status ? `· (${p.status})` : ""}
              </li>
            ))}
            {payments.items.length > 8 && (
              <li className={classes.muted}>… ועוד {payments.items.length - 8} רשומות</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ========= Tiny KPI card ========= */
function Kpi({ label, value }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e9e2d5",
        borderRadius: 10,
        padding: 12,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#7a6c5d", marginTop: 4 }}>{label}</div>
    </div>
  );
}
