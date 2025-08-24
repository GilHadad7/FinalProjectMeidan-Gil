import React, { useEffect, useMemo, useState, useCallback } from "react";
import classes from "./ServiceCallsTenantPage.module.css";
import ServiceCallsTableTenant from "../../components/tenant/ServiceCallsTableTenant";
import ServiceCallFormTenant from "../../components/tenant/ServiceCallFormTenant";

// בסיס ה-API (Vite -> VITE_API_BASE, CRA -> REACT_APP_API_BASE, אחרת localhost:8801)
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8801";

// חילוץ ה-building_id: קודם מה-session, אם חסר אז מה-URL (?building_id=5)
function detectBuildingId() {
  try {
    const u = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (u?.building_id) return Number(u.building_id);
    if (u?.tenant?.building_id) return Number(u.tenant.building_id);
  } catch {}
  const qs = new URLSearchParams(window.location.search);
  const q = qs.get("building_id") || qs.get("buildingId");
  return q ? Number(q) : null;
}

// מיפוי סטטוסים לצורת עברית, כדי שהחיפוש ימצא גם "פתוח/סגור/בטיפול/ממתין"
function heStatus(status) {
  const t = String(status || "").trim().toLowerCase();
  if (t === "closed") return "סגור";
  if (t === "open") return "פתוח";
  if (t === "in progress") return "בטיפול";
  if (t === "pending" || t === "awaiting" || t === "waiting") return "ממתין";
  return status || "";
}

export default function ServiceCallsTenantPage() {
  const buildingId = useMemo(() => detectBuildingId(), []);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 🔎 חיפוש יחיד
  const [search, setSearch] = useState("");

  // שליפת קריאות שירות עבור הבניין של הדייר
  const loadRows = useCallback(async () => {
    if (!buildingId) {
      setRows([]);
      setErr("לא נמצא בניין משויך למשתמש.");
      return;
    }
    try {
      setLoading(true);
      setErr("");
      const url = `${API_BASE}/api/service-calls/by-building?building_id=${encodeURIComponent(
        buildingId
      )}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET ${url} -> ${res.status} ${res.statusText} — ${text.slice(0, 120)}`);
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("tenant service-calls fetch failed:", e);
      setRows([]);
      setErr("שגיאה בטעינת הקריאות. נסה לרענן.");
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // נתונים אחרי חיפוש: משווים גם מול service_type, גם מול status באנגלית וגם מול התרגום העברי שלו
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
      <h2 className={classes.title}>קריאות שירות — דייר</h2>

      <div className={classes.grid}>
        {/* אזור הטבלה */}
        <section className={classes.tableCard}>
          <h3 className={classes.tableTitle}>הקריאות שלי</h3>

          {/* 🔎 תיבת חיפוש אחת, בצד ימין מעל הטבלה */}
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

          <ServiceCallsTableTenant
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
          <ServiceCallFormTenant onSuccess={loadRows} />
        </section>
      </div>
    </div>
  );
}
