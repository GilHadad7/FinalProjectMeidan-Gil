// 📁 C:\PATH\TO\YOUR\PROJECT\client\src\pages\worker\ServiceCallsWorkerPage.jsx
// הערה: דף קריאות שירות לעובד עם בחירת בניין + טעינת קריאות לפי הבניין שנבחר

import React, { useEffect, useMemo, useState, useCallback } from "react";
import classes from "./ServiceCallsWorkerPage.module.css";
import ServiceCallFormWorker from "../../components/worker/ServiceCallFormWorker";
import ServiceCallsTableWorker from "../../components/worker/ServiceCallsTableWorker";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8801";

const WORKER_SELECTED_BUILDING_KEY = "worker_selected_building";

// הערה: קורא את הבניין שנבחר מה-sessionStorage
function readSelectedBuilding() {
  try {
    const raw = sessionStorage.getItem(WORKER_SELECTED_BUILDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// הערה: שומר את הבניין שנבחר ל-sessionStorage
function saveSelectedBuilding(b) {
  try {
    if (!b || b.building_id == null) return;
    sessionStorage.setItem(
      WORKER_SELECTED_BUILDING_KEY,
      JSON.stringify({
        building_id: Number(b.building_id),
        name: b.name || "",
        address: b.address || b.full_address || "",
      })
    );
  } catch {}
}

// הערה: מביא את המשתמש המחובר (כדי לדעת workerId)
async function getWorkerContext() {
  try {
    const r = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (r.ok) {
      const u = await r.json();
      const workerId = u?.id ?? u?.worker?.id ?? null;
      return { id: workerId != null ? Number(workerId) : null, name: u?.name || "" };
    }
  } catch {}

  // הערה: fallback
  for (const k of ["authUser", "user", "currentUser"]) {
    try {
      const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (!raw) continue;
      const u = JSON.parse(raw);
      const workerId = u?.id ?? u?.worker?.id ?? null;
      return { id: workerId != null ? Number(workerId) : null, name: u?.name || "" };
    } catch {}
  }

  return { id: null, name: "" };
}

// הערה: תרגום סטטוס לעברית עבור חיפוש
function heStatus(status) {
  const t = String(status || "").trim().toLowerCase();
  if (t === "closed") return "סגור";
  if (t === "open") return "פתוח";
  if (t === "in progress") return "בטיפול";
  if (t === "pending" || t === "awaiting" || t === "waiting") return "ממתין";
  return status || "";
}

export default function ServiceCallsWorkerPage() {
  const [worker, setWorker] = useState({ id: null, name: "" });

  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(() => {
    const stored = readSelectedBuilding();
    return stored?.building_id ?? "";
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");

  // הערה: טעינת worker + בניינים משויכים
  useEffect(() => {
    (async () => {
      try {
        const u = await getWorkerContext();
        setWorker({ id: u?.id ?? null, name: u?.name || "" });

        if (!u?.id) {
          setBuildings([]);
          setSelectedBuildingId("");
          return;
        }

        const res = await fetch(`${API_BASE}/api/buildings/by-worker/${encodeURIComponent(u.id)}`, {
          credentials: "include",
        });

        const data = res.ok ? await res.json() : [];
        const list = Array.isArray(data) ? data : [];
        setBuildings(list);

        const stored = readSelectedBuilding();
        const storedId = stored?.building_id ?? null;
        const firstId = list?.[0]?.building_id ?? null;

        const initialId = storedId ?? firstId ?? null;

        if (initialId != null) {
          setSelectedBuildingId(Number(initialId));
          const obj =
            list.find((x) => Number(x.building_id) === Number(initialId)) ||
            { building_id: Number(initialId), name: stored?.name || "", address: stored?.address || "" };
          saveSelectedBuilding(obj);
        } else {
          setSelectedBuildingId("");
        }
      } catch (e) {
        console.error("Failed to load worker/buildings:", e);
        setBuildings([]);
        setSelectedBuildingId("");
      }
    })();
  }, []);

  // הערה: בכל שינוי בניין -> שמירה ב-sessionStorage
  useEffect(() => {
    try {
      if (!selectedBuildingId) return;
      const obj = buildings.find((x) => Number(x.building_id) === Number(selectedBuildingId));
      if (obj) saveSelectedBuilding(obj);
    } catch {}
  }, [selectedBuildingId, buildings]);

  // ✅ הערה: טעינת קריאות שירות לפי הבניין שנבחר (הכי חשוב)
  const loadRows = useCallback(async () => {
    if (!selectedBuildingId) {
      setRows([]);
      setErr("בחר בניין כדי להציג קריאות שירות.");
      return;
    }

    try {
      setLoading(true);
      setErr("");

      const url = `${API_BASE}/api/service-calls/by-building?building_id=${encodeURIComponent(
        selectedBuildingId
      )}`;

      const res = await fetch(url, { credentials: "include" });

      // הערה: אין קריאות בבניין
      if (res.status === 404) {
        setRows([]);
        setErr("");
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Service calls load error:", res.status, text);
        setRows([]);
        setErr("שגיאה בטעינה. נסה לרענן.");
        return;
      }

      const data = await res.json().catch(() => []);
      // הערה: תמיכה גם אם השרת מחזיר עטיפה { rows: [...] } או { data: [...] }
      const list =
        Array.isArray(data) ? data :
        Array.isArray(data?.rows) ? data.rows :
        Array.isArray(data?.data) ? data.data :
        [];

      setRows(list);
    } catch (e) {
      console.error("service-calls fetch failed:", e);
      setRows([]);
      setErr("שגיאה בטעינת הקריאות. נסה לרענן.");
    } finally {
      setLoading(false);
    }
  }, [selectedBuildingId]);

  // ✅ חובה: כל פעם שמשנים בניין -> לטעון קריאות
  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // הערה: חיפוש בצד הלקוח
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

  // הערה: כתובת לבניין הנבחר לטופס
  const selectedBuildingAddress = useMemo(() => {
    try {
      const b = buildings.find((x) => Number(x.building_id) === Number(selectedBuildingId));
      return b?.address || b?.full_address || "";
    } catch {
      return "";
    }
  }, [buildings, selectedBuildingId]);

  return (
    <div className={classes.wrap}>
      <h2 className={classes.title}>קריאות שירות —{worker?.name ? ` ${worker.name}` : ""}</h2>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, textAlign: "center" }}>בחר בניין</div>
        <select
          value={selectedBuildingId ?? ""}
          onChange={(e) => {
            try {
              const nextId = e.target.value ? Number(e.target.value) : "";
              setSelectedBuildingId(nextId);
              setSearch(""); // הערה: מנקה חיפוש כשמחליפים בניין
            } catch {}
          }}
          style={{
  padding: 8,
  borderRadius: 8,
  minWidth: 280,
  display: "block",
  margin: "0 auto",
}}
        >
          {buildings.length === 0 ? (
            <option value="">אין בניינים משויכים</option>
          ) : (
            buildings.map((b) => (
              <option key={b.building_id} value={b.building_id}>
                {b.name} • {(b.address || b.full_address || "")}
              </option>
            ))
          )}
        </select>
      </div>

      <div className={classes.grid}>
        <section className={classes.tableCard}>
          <h3 className={classes.tableTitle}>קריאות שירות בבניין</h3>

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

        <section className={classes.formCard}>
          <ServiceCallFormWorker
            buildingId={selectedBuildingId}
            buildingAddress={selectedBuildingAddress}
            onSuccess={loadRows}
          />
        </section>
      </div>
    </div>
  );
}
