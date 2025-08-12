// src/components/WorkerReportsSummary.jsx
import React, { useMemo, useState, useEffect } from "react";
import classes from "./WorkerReportsSummary.module.css";

/** בודק אם תאריך שייך לחודש מסוים (filterMonth בפורמט YYYY-MM) */
const isInMonth = (val, filterMonth) => {
  if (!filterMonth) return true;
  const [fy, fm] = filterMonth.split("-").map(Number);
  let y, m;

  if (typeof val === "string") {
    const m1 = val.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
    if (m1) { y = +m1[1]; m = +m1[2]; }
    else {
      const d = new Date(val);
      if (!isNaN(d)) { y = d.getFullYear(); m = d.getMonth() + 1; }
    }
  } else if (val instanceof Date) {
    y = val.getFullYear(); m = val.getMonth() + 1;
  }
  return y === fy && m === fm;
};

/** נרמול תפקידים לערכים בעברית קבועים: "מנהל" | "מנקה" | "אב בית" */
const normalizeRoleHe = (position) => {
  const p = (position || "").toString().trim().toLowerCase();

  // מנהל
  if (/(manager|מנהל)/.test(p)) return "מנהל";

  // מנקה
  if (/(clean|מנק)/.test(p)) return "מנקה";

  // אב בית / סופר / אחזקה / שרת
  if (/(super|אב.?בית|שרת|אחזקה|אחזק|מנהל.?בניין)/.test(p)) return "אב בית";

  // לא מזוהה
  return "";
};

// אפשרויות הסלקט בעברית (סט קבוע)
const ROLE_OPTIONS = ["מנהל", "מנקה", "אב בית"];

/**
 * props:
 * - reports: [{ position, month, salary, ... }]
 * - onFiltersChange?(filters)  // מסנכרן סינון עם הטבלה בדף הראשי
 */
export default function WorkerReportsSummary({ reports, onFiltersChange }) {
  const [filters, setFilters] = useState({ role: "", month: "" }); // month = "YYYY-MM"

  // עדכון הורה בסינון
  useEffect(() => {
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  // נתונים מסוננים לסיכומים
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filters.role && normalizeRoleHe(r.position) !== filters.role) return false;
      if (!isInMonth(r.month, filters.month)) return false;
      return true;
    });
  }, [reports, filters]);

  const totalSalary = useMemo(
    () => filtered.reduce((sum, r) => sum + Number(r.salary || 0), 0),
    [filtered]
  );
  const totalPeople = filtered.length;

  return (
    <div className={classes.topRow} dir="rtl">
      {/* סינונים – ימין */}
      <div className={classes.filters}>
        {/* ▼ תפקידים בעברית */}
        <select
          className={classes.ctrl}
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
          title="בחר תפקיד"
        >
          <option value="">כל התפקידים</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* 🗓️ חודש/שנה בלבד */}
        <input
          type="month"
          className={classes.ctrl}
          value={filters.month}
          onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
          title="בחר חודש"
        />
      </div>

      {/* סיכומים – שמאל */}
      <div className={classes.totals}>
        <div className={classes.card}>
          💰 סה״כ שכר:&nbsp;
          <b>
            {totalSalary.toLocaleString("he-IL", {
              style: "currency",
              currency: "ILS",
              minimumFractionDigits: 2,
            })}
          </b>
        </div>
        <div className={classes.card}>
          👷 עובדים בדוח:&nbsp;<b>{totalPeople}</b>
        </div>
      </div>
    </div>
  );
}
