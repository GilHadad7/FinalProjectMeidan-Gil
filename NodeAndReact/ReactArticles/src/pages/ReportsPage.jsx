import React, { useEffect, useState } from "react";
import WorkerReportsTable from "../components/WorkerReportsTable";
import BuildingsFinanceTable from "../components/BuildingsFinanceTable";
import WorkerReportsSummary from "../components/WorkerReportsSummary";
import BuildingsSummaryCard from "../components/BuildingsSummaryCard";
import OverviewReports from "../components/OverviewReports";
import classes from "./ReportsPage.module.css";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

export default function ReportsPage() {
  const [workerReports, setWorkerReports] = useState([]);
  const [buildingsSummary, setBuildingsSummary] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [selectedBuilding, setSelectedBuilding] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/reports/workers")
      .then((res) => res.json())
      .then((data) => {
        console.log("🚀 דוח עובדים:", data);
        setWorkerReports(data);
      });
  }, []);

  useEffect(() => {
    fetch(`http://localhost:3000/api/reports/buildings?month=${selectedMonth}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("🏢 דוח בניינים לחודש", selectedMonth, ":", data);
        setBuildingsSummary(data);
      });
  }, [selectedMonth]);

  const filteredBuildings = buildingsSummary.filter((b) =>
    selectedBuilding ? b.building_name === selectedBuilding : true
  );

  const handleEditSalary = async (reportId, newSalary) => {
    await fetch(`http://localhost:3000/api/reports/workers/${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salary: newSalary }),
    });
    const updated = workerReports.map((r) =>
      r.report_id === reportId ? { ...r, salary: newSalary } : r
    );
    setWorkerReports(updated);
  };

  const handleTogglePaid = async (reportId) => {
    await fetch(`http://localhost:3000/api/reports/workers/${reportId}/toggle`, {
      method: "PATCH",
    });
    const updated = workerReports.map((r) =>
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
          <div className={classes.filtersRow}>
            <div className={classes.filterGroup}>
              <label>בחר חודש:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={classes.selectMonth}
              >
                <option value="2025-06">יוני 2025</option>
                <option value="2025-05">מאי 2025</option>
                <option value="2025-04">אפריל 2025</option>
              </select>
            </div>

            <div className={classes.filterGroup}>
              <label>סינון לפי בניין:</label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className={classes.selectInput}
              >
                <option value="">הצג הכול</option>
                {Array.from(new Set(buildingsSummary.map((b) => b.building_name))).map(
                  (name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <BuildingsSummaryCard buildings={filteredBuildings} />
          <BuildingsFinanceTable data={filteredBuildings} />
        </TabPanel>
      </Tabs>
    </div>
  );
}
