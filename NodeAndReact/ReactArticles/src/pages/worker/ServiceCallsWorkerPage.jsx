import React, { useEffect, useMemo, useState, useCallback } from "react";
import classes from "./ServiceCallsWorkerPage.module.css";
import ServiceCallFormWorker from "../../components/worker/ServiceCallFormWorker";
import ServiceCallsTableWorker from "../../components/worker/ServiceCallsTableWorker";

// בסיס API
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8801";

/* ---------- מזהה בניין (fallback בלי סשן) ---------- */
function detectBuildingId() {
  try {
    const u =
      JSON.parse(sessionStorage.getItem("user") || "{}") ||
      JSON.parse(localStorage.getItem("user") || "{}");
    if (u?.building_id) return Number(u.building_id);
    if (u?.worker?.building_id) return Number(u.worker.building_id);
  } catch {}
  const qs = new URLSearchParams(window.location.search);
  const q = qs.get("building_id") || qs.get("buildingId");
  return q ? Number(q) : null;
}

// תרגום סטטוסים לעברית (חיפוש בצד לקוח)
function heStatus(status) {
  const t = String(status || "").trim().toLowerCase();
  if (t === "closed") return "סגור";
  if (t === "open") return "פתוח";
  if (t === "in progress") return "בטיפול";
  if (t === "pending" || t === "awaiting" || t === "waiting") return "ממתין";
  return status || "";
}

export default function ServiceCallsWorkerPage() {
  const buildingId = useMemo(() => detectBuildingId(), []);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 🔎 חיפוש (קליינט)
  const [search, setSearch] = useState("");

  // שליפת קריאות שירות לפי הבניין (ראוט של עובד!)
  const loadRows = useCallback(async () => {
    if (!buildingId) {
      setRows([]);
      setErr("לא נמצא בניין משויך למשתמש.");
      return;
    }
    try {
      setLoading(true);
      setErr("");

      const url = `${API_BASE}/api/worker/service-calls/by-building?building_id=${encodeURIComponent(
        buildingId
      )}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET ${url} -> ${res.status} ${res.statusText} — ${text.slice(0, 120)}`);
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("worker service-calls fetch failed:", e);
      setRows([]);
      setErr("שגיאה בטעינת הקריאות. נסה לרענן.");
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // חיפוש בצד הלקוח
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const typeStr = String(r?.service_type || "").toLowerCase();
      const statusStr = String(r?.status || "").toLowerCase();
      const statusHe = heStatus(r?.status).toLowerCase();
      return typeStr.includes(q) || statusStr.includes(q) || statusHe.includes(q);
    });
  }, [rows, search]);

  return (
    <div className={classes.wrap}>
      <h2 className={classes.title}>קריאות שירות — עובד</h2>

      <div className={classes.grid}>
        {/* טבלה */}
        <section className={classes.tableCard}>
          <h3 className={classes.tableTitle}>קריאות בבניין</h3>

          {/* 🔎 חיפוש */}
          <div className={classes.searchBar}>
            <input
              className={classes.searchInput}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔎 חפש לפי סוג תקלה או סטטוס"
            />
          </div>

          {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

          <ServiceCallsTableWorker
            rows={filteredRows}
            loading={loading}
            emptyText="אין קריאות פעילות"
            allowEdit={true}
            onAfterSave={loadRows}
            onAfterDelete={loadRows}
          />
        </section>

        {/* טופס פתיחת קריאה */}
        <section className={classes.formCard}>
          <ServiceCallFormWorker onSuccess={loadRows} />
        </section>
      </div>
    </div>
  );
}
