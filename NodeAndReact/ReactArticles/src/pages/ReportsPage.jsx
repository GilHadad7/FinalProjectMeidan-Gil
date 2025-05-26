// 📄 ReportsPage.jsx – דף ניהול הדוחות הראשי למנהל
import React, { useEffect, useState } from "react";
import WorkerReportsTable from "../components/WorkerReportsTable";
import BuildingsFinanceTable from "../components/BuildingsFinanceTable";
import WorkerReportsSummary from "../components/WorkerReportsSummary";
import BuildingsSummaryCard from "../components/BuildingsSummaryCard";
import OverviewReports from "../components/OverviewReports"; // ✅ חדש
import classes from "./ReportsPage.module.css";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

export default function ReportsPage() {
  const [workerReports, setWorkerReports] = useState([]);
  const [buildingsSummary, setBuildingsSummary] = useState([]);

  // טעינת הנתונים בהתחלה
  useEffect(() => {
    fetch("http://localhost:3000/api/reports/workers")
      .then(res => res.json())
      .then(data => {
        console.log("🚀 דוח עובדים:", data);
        setWorkerReports(data);
      });

    fetch("http://localhost:3000/api/reports/buildings")
      .then(res => res.json())
      .then(data => {
        console.log("🏢 דוח בניינים:", data);
        setBuildingsSummary(data);
      });
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
    await fetch(`http://localhost:3000/api/reports/workers/${reportId}/toggle`, {
      method: "PATCH"
    });
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

      <Tabs>
        <TabList>
          <Tab>📊 סקירה כללית</Tab>
          <Tab>👷 דוח עובדים</Tab>
          <Tab>🏢 דוח לפי בניינים</Tab>
        </TabList>

        {/* סקירה כללית */}
        <TabPanel>
          <OverviewReports
            workers={workerReports}
            buildings={buildingsSummary}
          />
        </TabPanel>

        {/* דוחות עובדים */}
        <TabPanel>
          <WorkerReportsSummary reports={workerReports} />
          <WorkerReportsTable
            reports={workerReports}
            onEdit={handleEditSalary}
            onTogglePaid={handleTogglePaid}
            onUploadPDF={handleUploadPDF}
          />
        </TabPanel>

        {/* דוחות בניינים */}
        <TabPanel>
          <BuildingsSummaryCard buildings={buildingsSummary} />
          <BuildingsFinanceTable data={buildingsSummary} />
        </TabPanel>
      </Tabs>
    </div>
  );
}
