// src/pages/ReportsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import WorkerReportsTable from "../components/WorkerReportsTable";
import BuildingsFinanceTable from "../components/BuildingsFinanceTable";
import WorkerReportsSummary from "../components/WorkerReportsSummary";
import BuildingsSummaryCard from "../components/BuildingsSummaryCard";
import OverviewReports from "../components/OverviewReports";
import classes from "./ReportsPage.module.css";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";

// ===== עזר לשמות חודשים בעברית =====
const HEB_MONTHS = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
];
const pad2 = (n) => String(n).padStart(2, "0");
const monthLabelHe = (ym) => {
  const [y, m] = ym.split("-");
  return `${HEB_MONTHS[parseInt(m, 10) - 1]} ${y}`;
};
const monthsForYear = (year) =>
  Array.from({ length: 12 }, (_, i) => `${year}-${pad2(i + 1)}`);

export default function ReportsPage() {
  const [workerReports, setWorkerReports] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().toISOString().slice(0, 7)
  );
  const selectedYear = selectedMonth.slice(0, 4);

  const [selectedBuilding, setSelectedBuilding] = useState("");

  const [buildingsSummary, setBuildingsSummary] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  // ✅ סטייט לסינון דוח עובדים (מגיע מה-Summary ונשלח לטבלה)
  const [wrFilters, setWrFilters] = useState({ month: "", role: "" });

  // דוח עובדים
  useEffect(() => {
    fetch("http://localhost:3000/api/reports/workers")
      .then((res) => res.json())
      .then((data) => setWorkerReports(data))
      .catch(console.error);
  }, []);

  // דוח לפי בניינים – שמירה ל-DB ואז שליפה מה-DB
  useEffect(() => {
    setLoadingBuildings(true);
    (async () => {
      try {
        // 1) רענון/שמירה לחודש הנבחר
        await fetch("http://localhost:3000/api/reports/buildings/recalc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: selectedMonth }),
        });

        // 2) שליפה מהטבלה השמורה
        const res = await fetch(
          `http://localhost:3000/api/reports/buildings?month=${selectedMonth}`
        );
        const rows = await res.json();
        setBuildingsSummary(rows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingBuildings(false);
      }
    })();
  }, [selectedMonth]);

  const filteredBuildings = useMemo(() => {
    return selectedBuilding
      ? buildingsSummary.filter((b) => b.building_name === selectedBuilding)
      : buildingsSummary;
  }, [buildingsSummary, selectedBuilding]);

  const buildingNames = useMemo(
    () => Array.from(new Set(buildingsSummary.map((b) => b.building_name))),
    [buildingsSummary]
  );

  const handleEditSalary = async (reportId, newSalary) => {
    await fetch(`http://localhost:3000/api/reports/workers/${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salary: newSalary }),
    });
    setWorkerReports((prev) =>
      prev.map((r) => (r.report_id === reportId ? { ...r, salary: newSalary } : r))
    );
  };

  const handleTogglePaid = async (reportId) => {
    await fetch(`http://localhost:3000/api/reports/workers/${reportId}/toggle`, {
      method: "PATCH",
    });
    setWorkerReports((prev) =>
      prev.map((r) => (r.report_id === reportId ? { ...r, paid: !r.paid } : r))
    );
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
          <OverviewReports workers={workerReports} buildings={buildingsSummary} />
        </TabPanel>

        {/* דוחות עובדים */}
        <TabPanel>
          <WorkerReportsSummary
            reports={workerReports}
            onFiltersChange={setWrFilters}
          />
          <WorkerReportsTable
            reports={workerReports}
            filterMonth={wrFilters.month}
            filterRole={wrFilters.role}
            onEdit={handleEditSalary}
            onTogglePaid={handleTogglePaid}
            onUploadPDF={handleUploadPDF}
          />
        </TabPanel>

        {/* דוח לפי בניינים */}
        <TabPanel>
          <div className={classes.filtersRow}>
            <div className={classes.filterGroup}>
              <label>בחר חודש:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={classes.selectMonth}
              >
                {monthsForYear(selectedYear).map((m) => (
                  <option key={m} value={m}>
                    {monthLabelHe(m)}
                  </option>
                ))}
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
                {buildingNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingBuildings ? (
            <div style={{ padding: 12 }} />
          ) : (
            <>
              <BuildingsSummaryCard buildings={filteredBuildings} />
              <BuildingsFinanceTable data={filteredBuildings} />
            </>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}
