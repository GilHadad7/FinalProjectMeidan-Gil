import React, { useMemo } from "react";
import classes from "./WorkerReportsTable.module.css";

/* ---------- Role mapping (code <-> Hebrew) ---------- */
// Add/adjust aliases here to match your DB values (codes or alternative labels)
const ROLE_CODE_TO_HE = {
  manager: "מנהל",
  cleaner: "מנקה",
  super: "אב בית",

  // Optional aliases if they appear in your DB:
  janitor: "אב בית",
  supervisor: "אב בית",
  "head manager": "מנהל",
};

// Reverse map Hebrew -> FIRST matching code (for filtering by exact Hebrew label)
const ROLE_HE_TO_CODE = Object.fromEntries(
  Object.entries(ROLE_CODE_TO_HE).map(([code, he]) => [he, code])
);

// Normalize Hebrew by removing all spaces (also NBSP) for robust matching
function heNormalize(s) {
  return String(s || "")
    .replace(/[\u00A0\s]+/g, "") // remove normal spaces & non-breaking spaces
    .trim();
}

// Convert any input (Hebrew or English code) to an internal "code" if known
function normalizeRoleToCode(val) {
  if (!val) return "";
  const raw = String(val).trim();

  // Exact Hebrew label -> code (e.g., "מנהל" -> "manager")
  if (ROLE_HE_TO_CODE[raw]) return ROLE_HE_TO_CODE[raw];

  // Lowercase English code -> code (e.g., "Manager" -> "manager")
  const lower = raw.toLowerCase();
  if (ROLE_CODE_TO_HE[lower]) return lower;

  // Unknown stays as-is (used later for partial Hebrew matching)
  return raw;
}

// Convert DB/Code to Hebrew label for display
function roleToHeb(val) {
  if (!val) return "";
  const lower = String(val).toLowerCase().trim();
  return ROLE_CODE_TO_HE[lower] || String(val); // if already Hebrew/unknown -> show as-is
}

// Flexible matcher: match by code OR by (normalized) Hebrew includes
function roleMatches(position, filterRole) {
  if (!filterRole) return true;

  const posCode = normalizeRoleToCode(position);
  const fltCode = normalizeRoleToCode(filterRole);

  // If both normalized to known codes, compare codes first (fast path)
  if (posCode && fltCode && ROLE_CODE_TO_HE[posCode] && ROLE_CODE_TO_HE[fltCode]) {
    if (posCode === fltCode) return true;
  }

  // Otherwise, compare Hebrew labels as normalized substrings.
  // This handles cases like "מנהל" vs "מנהל ראשי" and spacing/NBSP issues.
  const posHeb = heNormalize(roleToHeb(position));
  const fltHeb = heNormalize(ROLE_CODE_TO_HE[fltCode] || String(filterRole));

  return posHeb.includes(fltHeb);
}

/* ---------- Date helpers ---------- */
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
  filterMonth = "",   // YYYY-MM
  filterRole = ""     // Can be Hebrew ("אב בית"/"מנהל"/"מנקה") or code ("super"/"manager"/"cleaner")
}) {

  const visibleReports = useMemo(() => {
    return reports.filter(r =>
      roleMatches(r.position, filterRole) &&
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
            {/* Display role in Hebrew */}
            <td>{roleToHeb(report.position)}</td>
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
