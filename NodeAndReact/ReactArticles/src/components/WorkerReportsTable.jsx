import React from "react";
import classes from "./WorkerReportsTable.module.css";

export default function WorkerReportsTable({ reports, onTogglePaid, onUploadPDF }) {
  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th>עובד</th>
          <th>תפקיד</th> {/* ✅ עמודה חדשה */}
          <th>חודש</th>
          <th>שכר חודשי (ברוטו)</th>
          <th>שולם?</th>
          <th>תלוש</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <tr key={report.report_id}>
            <td>{report.employee_name}</td>
            <td>{report.position}</td> {/* ✅ ערך חדש */}
            <td>{report.month}</td>
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
                <a href={report.payslip_url} target="_blank" rel="noreferrer">PDF 📄</a>
              ) : (
                <button onClick={() => onUploadPDF(report.report_id)}>העלה</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
