import React, { useEffect, useMemo, useState } from "react";
import classes from "./ScheduleTableTenant.module.css";

const norm = (s) => String(s || "").trim().toLowerCase();

function detectBuildingCtx() {
  try {
    const u = JSON.parse(sessionStorage.getItem("user") || "{}");
    const id = u?.tenant?.building_id ?? u?.building_id ?? null;
    const name = u?.tenant?.building_name ?? u?.building_name ?? null;
    const address = u?.tenant?.building_address ?? u?.building_address ?? null;
    return { id: id != null ? Number(id) : null, name, address };
  } catch {
    return { id: null, name: null, address: null };
  }
}

function belongsToBuilding(item, ctx) {
  // 1) לפי מזהה
  const bid = item?.building_id ?? item?.buildingId ?? null;
  if (ctx.id != null && bid != null) return Number(bid) === Number(ctx.id);

  // 2) Fallback לפי שם/כתובת
  const tName = norm(item?.building_name || "");
  const tAddr = norm(item?.building_address || "");
  if (ctx.name && tName) return norm(ctx.name) === tName;
  if (ctx.address && tAddr) return norm(ctx.address) === tAddr;

  // בדף דייר – אם לא ניתן לשייך, לא מציגים
  return false;
}

function fmtDate(item) {
  // תומך גם ב-scheduled_datetime וגם ב-date/time
  const d = item?.scheduled_datetime
    ? new Date(item.scheduled_datetime)
    : item?.date
    ? new Date(`${item.date}T${item.time || "00:00:00"}`)
    : null;
  if (!d || Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("he-IL");
}

function fmtTime(item) {
  const d = item?.scheduled_datetime
    ? new Date(item.scheduled_datetime)
    : item?.date
    ? new Date(`${item.date}T${item.time || "00:00:00"}`)
    : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export default function ScheduleTableTenant() {
  const ctx = useMemo(() => detectBuildingCtx(), []);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const url = new URL("http://localhost:3000/api/schedule/combined");
        if (ctx.id != null) url.searchParams.set("building_id", String(ctx.id));

        const res = await fetch(url.toString(), {
          credentials: "include",
          signal: controller.signal,
        });

        const data = res.ok ? await res.json() : [];
        const filtered = (Array.isArray(data) ? data : []).filter((r) =>
          belongsToBuilding(r, ctx)
        );

        filtered.sort((a, b) => {
          const da = new Date(a.scheduled_datetime || `${a.date}T${a.time || "00:00:00"}`);
          const db = new Date(b.scheduled_datetime || `${b.date}T${b.time || "00:00:00"}`);
          return da - db;
        });

        setRows(filtered);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("load schedule failed:", e);
          setErr("שגיאה בטעינה");
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [ctx]);

  return (
    <div className={classes.ScheduleWrapper}>
      <h2 className={classes.Title}>לוח זמנים — הבניין שלי</h2>

      {err && <div style={{ color: "crimson", marginBottom: 8 }}>{err}</div>}

      <table className={classes.Table}>
        <thead>
          <tr>
            <th className={classes.Col1}>תאריך</th>
            <th className={classes.Col2}>בניין</th>
            <th className={classes.Col3}>סוג</th>
            <th className={classes.Col4}>תיאור</th>
            <th className={classes.Col5}>מקור</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className={classes.Empty}>טוען…</td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={5} className={classes.Empty}>אין פריטים להצגה</td>
            </tr>
          ) : (
            rows.map((item, idx) => (
              <tr
                key={`${item.origin_type}-${item.id ?? idx}-${item.scheduled_datetime ?? item.date ?? ""}`}
              >
                <td className={classes.Col1}>
                  {fmtDate(item)}
                  {fmtTime(item) ? <div className={classes.TimeSmall}>{fmtTime(item)}</div> : null}
                </td>
                <td className={classes.Col2}>
                  {item.building_address || item.building_name || "-"}
                </td>
                <td className={classes.Col3}>{item.type || "-"}</td>
                <td className={classes.Col4}>{item.description || "-"}</td>
                <td className={classes.Col5}>
                  {item.origin_type === "routine" ? "משימה קבועה" : "קריאת שירות"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
