// src/components/WorkerReportsSummary.jsx
import React, { useEffect, useState } from "react";
import classes from "./WorkerReportsSummary.module.css";

const pad2 = (n) => String(n).padStart(2, "0");
const now = new Date();
const DEFAULT_MONTH = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;

// UI זהה, רק מקבל totalEmployees ומוסר החוצה את המסננים
export default function WorkerReportsSummary({ onFiltersChange, totalEmployees = 0 }) {
  const [filters, setFilters] = useState({
    role: "",            // "" = כל התפקידים | "cleaner" | "super"
    month: DEFAULT_MONTH // YYYY-MM
  });

  useEffect(() => {
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  return (
    <div className={classes.topRow} dir="rtl">
      {/* סינונים – ימין */}
      <div className={classes.filters}>
        <select
          className={classes.ctrl}
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
          title="בחר תפקיד"
        >
          <option value="">כל התפקידים</option>
          <option value="cleaner">מנקה</option>
          <option value="super">אב בית</option>
        </select>

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
          👷 עובדים בדוח:&nbsp;<b>{totalEmployees}</b>
        </div>
      </div>
    </div>
  );
}
