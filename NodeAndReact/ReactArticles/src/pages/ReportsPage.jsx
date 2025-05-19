// 📄 ReportsPage.jsx – דף ניהול הדוחות הראשי למנהל
import React, { useEffect, useState } from "react";
import WorkerReportsTable from "../components/WorkerReportsTable";
import MonthlySummaryTable from "../components/MonthlySummaryTable";
import BuildingsFinanceTable from "../components/BuildingsFinanceTable";
import classes from "./ReportsPage.module.css";

export default function ReportsPage() {
  const [workerReports, setWorkerReports] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [buildingsSummary, setBuildingsSummary] = useState([]);

  // טעינת הנתונים בהתחלה
  useEffect(() => {
    fetch("http://localhost:3000/api/reports/workers")
      .then(res => res.json())
      .then(data => setWorkerReports(data));

    fetch("http://localhost:3000/api/reports/monthly")
      .then(res => res.json())
      .then(data => setMonthlySummary(data));

    fetch("http://localhost:3000/api/building-reports")
      .then(res => res.json())
      .then(data => setBuildingsSummary(data));
  }, []);

  const handleEditSalary = async (reportId, newSalary) => {
    await fetch(`http://localhost:3000/api/reports/workers/${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salary: newSalary })
    });
    const updated = workerReports.map(r =>
      r.report_id === reportId ? { ...r, salary: newSalary } : r
    );
    setWorkerReports(updated);
  };

  const handleTogglePaid = async (reportId) => {
    await fetch(`http://localhost:3000/api/reports/workers/${reportId}/toggle`, { method: "PATCH" });
    const updated = workerReports.map(r =>
      r.report_id === reportId ? { ...r, paid: !r.paid } : r
    );
    setWorkerReports(updated);
  };

  const handleUploadPDF = (reportId) => {
    alert("TODO: העלאת קובץ PDF לדוח " + reportId);
  };

  return (
    <div className={classes.reportsPage}>
      <h2 className={classes.title}>דוחות</h2>

      <section className={classes.section}>
        <h3>דוח עובדים</h3>
        <WorkerReportsTable
          reports={workerReports}
          onEdit={handleEditSalary}
          onTogglePaid={handleTogglePaid}
          onUploadPDF={handleUploadPDF}
        />
      </section>

      <section className={classes.section}>
        <h3>דוח חודשי כללי</h3>
        <MonthlySummaryTable data={monthlySummary} />
      </section>

      <section className={classes.section}>
        <h3>דוח לפי בניינים</h3>
        <BuildingsFinanceTable data={buildingsSummary} />
      </section>
    </div>
  );
}
