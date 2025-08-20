import React, { useEffect, useMemo, useState } from "react";
import classes from "./PaymentsTenantPage.module.css";


const formatNIS = (v) => `₪ ${Number(v || 0).toLocaleString("he-IL")}`;

export default function PaymentsTenantPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => {
    let paid = 0, debt = 0;
    for (const r of rows || []) {
      paid += Number(r.amount_paid || 0);
      debt += Number(r.open_debt || 0);
    }
    return { paid, debt };
  }, [rows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        // נסה קודם אנדפוינט ייעודי לדייר
        let res = await fetch("http://localhost:3000/api/tenant/payments?limit=50", { credentials: "include" });

        // נפילה רכה (fallback): אם אין, ננסה משהו כללי שלא יפיל את הדף
        if (!res.ok) res = await fetch("http://localhost:3000/api/payments?scope=tenant&limit=50", { credentials: "include" });

        const data = res.ok ? await res.json() : [];
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={classes.container}>
      <h2 className={classes.title}>תשלומים (דייר)</h2>

      <div className={classes.summary}>
        <div>סה״כ שולם: <strong>{formatNIS(totals.paid)}</strong></div>
        <div>חוב פתוח: <strong>{formatNIS(totals.debt)}</strong></div>
      </div>

      {loading ? (
        <div className={classes.loading}>טוען תשלומים…</div>
      ) : rows.length === 0 ? (
        <div className={classes.empty}>אין תשלומים להצגה.</div>
      ) : (
        <div className={classes.tableWrap}>
          <table className={classes.table}>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>סכום</th>
                <th>אמצעי</th>
                <th>סטטוס</th>
                <th>הערות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{(r.date || r.created_at || "").toString().slice(0, 10)}</td>
                  <td>{formatNIS(r.amount_paid || r.amount)}</td>
                  <td>{r.method || r.payment_method || "-"}</td>
                  <td>{r.status || "-"}</td>
                  <td>{r.note || r.description || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
