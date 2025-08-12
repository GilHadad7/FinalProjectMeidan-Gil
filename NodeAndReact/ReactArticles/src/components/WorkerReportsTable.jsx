import React, { useMemo } from "react";
import classes from "./WorkerReportsTable.module.css";

// תאריך בסגנון 22.8.2025
const formatHeDate = (value) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("he-IL");
  }
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d) ? String(value).replace(/-/g, ".") : d.toLocaleDateString("he-IL");
};

// בדיקה אם ערך תאריך שייך לחודש נתון (YYYY-MM)
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

export default function WorkerReportsTable({
  reports,
  onTogglePaid,
  onUploadPDF,
  filterMonth = "",   // ← חדש: חודש בפורמט YYYY-MM
  filterRole = ""     // ← חדש: תפקיד
}) {

  const visibleReports = useMemo(() => {
    return reports.filter(r =>
      (!filterRole || r.position === filterRole) &&
      isInMonth(r.month, filterMonth)
    );
  }, [reports, filterMonth, filterRole]);

  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th>עובד</th>
          <th>תפקיד</th>
          <th>חודש</th>
          <th>שכר חודשי (ברוטו)</th>
          <th>שולם?</th>
          <th>תלוש</th>
        </tr>
      </thead>
      <tbody>
        {visibleReports.map((report) => (
          <tr key={report.report_id}>
            <td>{report.employee_name}</td>
            <td>{report.position}</td>
            <td>{formatHeDate(report.month)}</td>
            <td>₪{Number(report.salary).toLocaleString("he-IL")}</td>
            <td>
              <button
                className={classes.paidBtn}
                onClick={() => onTogglePaid(report.report_id)}
              >
                {report.paid ? "✓" : "✗"}
              </button>
            </td>
            <td>
              {report.payslip_url ? (
                <a
                  href={report.payslip_url}
                  target="_blank"
                  rel="noreferrer"
                  className={classes.paidBtn}
                >
                  PDF
                </a>
              ) : (
                <button
                  className={classes.paidBtn}
                  onClick={() => onUploadPDF(report.report_id)}
                >
                  העלה
                </button>
              )}
            </td>
          </tr>
        ))}
        {visibleReports.length === 0 && (
          <tr>
            <td colSpan={6} style={{ background: "#fff", padding: 16, textAlign: "center", color: "#7a6c5d" }}>
              אין נתונים לחודש/תפקיד שנבחרו.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
