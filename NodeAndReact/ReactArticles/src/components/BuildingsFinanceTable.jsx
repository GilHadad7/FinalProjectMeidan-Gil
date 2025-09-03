import React, { useState } from "react";
import { Link } from "react-router-dom";
import classes from "./BuildingsFinanceTable.module.css";

const API_BASE = "http://localhost:8801";
const fmtMoney = (v) =>
  "₪" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });

// תאריך ישראלי יום/חודש/שנה
const toILDate = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    return `${d}/${mo}/${y}`;
  }
  const d = new Date(s.includes(" ") ? s.replace(" ", "T") : s);
  if (isNaN(d)) return s;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

// כותרת חודש-שנה כ-MM-YYYY (חודש ואז שנה)
const monthToMMYYYY = (ym) => {
  if (!ym) return "";
  const s = String(ym).slice(0, 7); // YYYY-MM
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  return m ? `${m[2]}-${m[1]}` : s;
};

export default function BuildingsFinanceTable({ data }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openDetails(row) {
    try {
      setDetailsOpen(true);
      setLoading(true);
      setError("");
      setDetails(null);

      const buildingId = row.building_id;
      const month = (row.month || new Date().toISOString().slice(0, 7)).slice(0, 7);

      const url = `${API_BASE}/api/reports/building/${buildingId}/details?month=${encodeURIComponent(
        month
      )}`;

      const r = await fetch(url);
      const text = await r.text(); // קודם טקסט, כדי שנוכל להציג שגיאה גם אם זה HTML
      if (!r.ok) {
        throw new Error(`HTTP ${r.status} – ${text.slice(0, 200)}`);
      }
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Unexpected non-JSON response: ${text.slice(0, 200)}`);
      }
      setDetails(json);
    } catch (e) {
      setError(e.message || "Failed to load details");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>בניין</th>
            <th>כתובת</th>
            <th>סה"כ תשלומים</th>
            <th>חובות פתוחים</th>
            <th>הוצאות תחזוקה</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>
                <div className={classes.buildingCell}>
                  <Link
                    className={classes.buildingLink}
                    to={`/manager/buildings?name=${encodeURIComponent(row.building_name)}`}
                    title={`הצג רק את "${row.building_name}"`}
                  >
                    {row.building_name}
                  </Link>

                  <button
                    onClick={() => openDetails(row)}
                    title="פירוט לבניין"
                    className={classes.detailsBtn}
                  >
                    פירוט
                  </button>
                </div>
              </td>
              <td>{row.address}</td>
              <td>{fmtMoney(row.total_paid)}</td>
              <td>{fmtMoney(row.balance_due)}</td>
              <td>{fmtMoney(row.maintenance)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {detailsOpen && (
        <div
          onClick={() => setDetailsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1000px, 95vw)",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
              padding: 16,
              direction: "rtl",
              position: "relative",
              overflow: "visible",
            }}
          >
            <button
              onClick={() => setDetailsOpen(false)}
              aria-label="סגור"
              style={{
                position: "absolute",
                top: -28,
                left: 18,
                width: 20,
                height: 44,
                border: "none",
                background: "transparent",
                color: "#000",
                fontSize: 42,
                lineHeight: 1,
                cursor: "pointer",
                textShadow: "0 1px 0 #fff",
              }}
              title="סגור"
            >
              ×
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>
                פירוט לבניין • {details?.building?.name || ""} •{" "}
                {monthToMMYYYY(details?.month || "")}
              </h3>
            </div>

            {loading && <div style={{ padding: 20 }}>טוען פירוט…</div>}
            {!loading && error && (
              <div style={{ padding: 20, color: "#a33" }}>שגיאה: {error}</div>
            )}

            {!loading && details && !error && (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <Badge>סה״כ תשלומים: {fmtMoney(details?.totals?.paid)}</Badge>
                  <Badge>סה״כ חובות פתוחים: {fmtMoney(details?.totals?.debts)}</Badge>
                  <Badge>סה״כ תחזוקה: {fmtMoney(details?.totals?.maintenance)}</Badge>
                </div>

                <div style={{ maxHeight: "75vh", overflow: "auto" }}>
                  <Tabs
                    paid={details?.paid || []}
                    debts={details?.debts || []}
                    maintCalls={details?.maintenance?.fromServiceCalls || []}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Badge({ children }) {
  return (
    <div style={{ background: "#f4efe8", padding: "8px 12px", borderRadius: 10 }}>
      {children}
    </div>
  );
}

function Tabs({ paid, debts, maintCalls }) {
  const [tab, setTab] = useState("paid");

  const TabBtn = ({ id, children }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #cdbba0",
        background: tab === id ? "#e9e2d7" : "#fff",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <TabBtn id="paid">תשלומים ששולמו</TabBtn>
        <TabBtn id="maint">תחזוקה</TabBtn>
        <TabBtn id="debts">חובות פתוחים</TabBtn>
      </div>

      {tab === "paid" && <TablePaid rows={paid} />}
      {tab === "maint" && <TableMaintCalls rows={maintCalls} />}
      {tab === "debts" && <TableDebts rows={debts} />}
    </>
  );
}

function Tbl({ children, headers = [] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      {headers.length > 0 && (
        <thead>
          <tr style={{ background: "#f4efe8" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: "right", padding: "6px 8px" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>{children}</tbody>
    </table>
  );
}

function TablePaid({ rows }) {
  if (!rows?.length) return <div style={{ padding: 8 }}>אין תשלומים ששולמו.</div>;
  return (
    <Tbl headers={["תאריך", "דייר", "קטגוריה", "תיאור", "סכום"]}>
      {rows.map((r) => (
        <tr key={r.payment_id}>
          <td><span dir="ltr">{toILDate(r.payment_date)}</span></td>
          <td>{r.tenant_name || "-"}</td>
          <td>{r.category || "-"}</td>
          <td>{r.description || "-"}</td>
          <td>{fmtMoney(r.amount)}</td>
        </tr>
      ))}
    </Tbl>
  );
}

function TableDebts({ rows }) {
  if (!rows?.length) return <div style={{ padding: 8 }}>אין חובות/ממתינים.</div>;
  return (
    <Tbl headers={["תאריך", "דייר", "סטטוס", "קטגוריה", "תיאור", "סכום"]}>
      {rows.map((r) => (
        <tr key={r.payment_id}>
          <td><span dir="ltr">{toILDate(r.payment_date)}</span></td>
          <td>{r.tenant_name || "-"}</td>
          <td>{r.status}</td>
          <td>{r.category || "-"}</td>
          <td>{r.description || "-"}</td>
          <td>{fmtMoney(r.amount)}</td>
        </tr>
      ))}
    </Tbl>
  );
}

function TableMaintCalls({ rows }) {
  if (!rows?.length) return <div style={{ padding: 8 }}>אין קריאות שירות סגורות בחודש זה.</div>;
  return (
    <Tbl headers={["תאריך", "סוג שירות", "תיאור", "עלות"]}>
      {rows.map((r) => (
        <tr key={r.call_id}>
          <td><span dir="ltr">{toILDate(r.date)}</span></td>
          <td>{r.type || "-"}</td>
          <td>{r.description || "-"}</td>
          <td>{fmtMoney(r.amount)}</td>
        </tr>
      ))}
    </Tbl>
  );
}
