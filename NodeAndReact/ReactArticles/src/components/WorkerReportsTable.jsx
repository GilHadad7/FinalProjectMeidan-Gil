// 📄 WorkerReportsTable.jsx – טבלת דוחות עובדים עם עריכה, תשלום ו-PDF
import React, { useState } from "react";
import classes from "./WorkerReportsTable.module.css";

export default function WorkerReportsTable({ reports, onEdit, onTogglePaid, onUploadPDF }) {
  const [editId, setEditId] = useState(null);
  const [editSalary, setEditSalary] = useState("");

  const handleEditClick = (report) => {
    setEditId(report.report_id);
    setEditSalary(report.salary);
  };

  const handleEditSave = () => {
    onEdit(editId, parseFloat(editSalary));
    setEditId(null);
    setEditSalary("");
  };

  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th>עובד</th>
          <th>חודש</th>
          <th>שכר חודשי (ברוטו)</th>
          <th>שולם?</th>
          <th>תלוש</th>
          <th>פעולות</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <tr key={report.report_id}>
            <td>{report.employee_name}</td>
            <td>{report.month}</td>
            <td>
              {editId === report.report_id ? (
                <input
                  type="number"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  className={classes.input}
                />
              ) : (
                `₪${report.salary.toLocaleString()}`
              )}
            </td>
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
            <td>
              {editId === report.report_id ? (
                <>
                  <button onClick={handleEditSave}>💾</button>
                  <button onClick={() => setEditId(null)}>❌</button>
                </>
              ) : (
                <button onClick={() => handleEditClick(report)}>✏️</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}