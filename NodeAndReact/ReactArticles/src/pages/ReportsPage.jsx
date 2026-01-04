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

// עזר לשמות חודשים בעברית
const HEB_MONTHS = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
];

const pad2 = (n) => String(n).padStart(2, "0");

// מחזיר תווית חודש בעברית בפורמט: "ינואר 2026"
const monthLabelHe = (ym) => {
  const [y, m] = ym.split("-");
  return `${HEB_MONTHS[parseInt(m, 10) - 1]} ${y}`;
};

// מחזיר מערך של כל החודשים לשנה נתונה: ["2025-01"..."2025-12"]
const monthsForYear = (year) =>
  Array.from({ length: 12 }, (_, i) => `${year}-${pad2(i + 1)}`);

// מחזיר מערך שנים לבחירה (למשל: 2024-2026)
const yearsRange = (from, to) => {
  const out = [];
  for (let y = from; y <= to; y++) out.push(String(y));
  return out;
};

export default function ReportsPage() {
  // קומפוננטת דוחות ראשית
  const [workerReports, setWorkerReports] = useState([]);
  const [wrCount, setWrCount] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // סטייט חדש: בחירת שנה נפרדת (כדי לא להינעל לשנה הנוכחית)
  const currentYear = new Date().getFullYear();
  const [selectedYearUi, setSelectedYearUi] = useState(() => selectedMonth.slice(0, 4));

  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [buildingsSummary, setBuildingsSummary] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  // סטייט לסינון דוח עובדים
  const [wrFilters, setWrFilters] = useState({ month: "", role: "" });

  // כש-selectedMonth משתנה ידנית/אוטומטית – נסנכרן גם את השנה ב-UI
  useEffect(() => {
    try {
      setSelectedYearUi(selectedMonth.slice(0, 4));
    } catch (e) {
      console.error("Failed to sync year UI:", e);
    }
  }, [selectedMonth]);

  // טעינת פעילות עובדים לפי חודש
  useEffect(() => {
    (async () => {
      try {
        const url = `http://localhost:3000/api/reports/workers/activity?month=${selectedMonth}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setWorkerReports(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load workers activity:", e);
        setWorkerReports([]);
      }
    })();
  }, [selectedMonth]);

  // טעינת דוח לפי בניינים – רענון/שמירה ואז שליפה
  useEffect(() => {
    setLoadingBuildings(true);
    (async () => {
      try {
        await fetch("http://localhost:3000/api/reports/buildings/recalc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: selectedMonth }),
        });

        const res = await fetch(
          `http://localhost:3000/api/reports/buildings?month=${selectedMonth}`
        );
        const rows = await (res.ok ? res.json() : Promise.resolve([]));
        setBuildingsSummary(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error(e);
        setBuildingsSummary([]);
      } finally {
        setLoadingBuildings(false);
      }
    })();
  }, [selectedMonth]);

  // סינון טבלת בניינים לפי בניין נבחר
  const filteredBuildings = useMemo(() => {
    return selectedBuilding
      ? buildingsSummary.filter((b) => b.building_name === selectedBuilding)
      : buildingsSummary;
  }, [buildingsSummary, selectedBuilding]);

  // רשימת שמות בניינים לסלקט
  const buildingNames = useMemo(
    () => Array.from(new Set(buildingsSummary.map((b) => b.building_name))),
    [buildingsSummary]
  );

  // עדכון שכר בדוח עובדים
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

  // שינוי סטטוס שולם בדוח עובדים
  const handleTogglePaid = async (reportId) => {
    await fetch(`http://localhost:3000/api/reports/workers/${reportId}/toggle`, {
      method: "PATCH",
    });
    setWorkerReports((prev) =>
      prev.map((r) => (r.report_id === reportId ? { ...r, paid: !r.paid } : r))
    );
  };

  // העלאת PDF לדוח עובד (TODO)
  const handleUploadPDF = (reportId) => {
    alert("TODO: העלאת קובץ PDF לדוח " + reportId);
  };

  // טיפול בבחירת שנה: משאירים את החודש (MM) כמו שהוא, ומחליפים רק את השנה
  const onChangeYear = (newYear) => {
    try {
      const mm = selectedMonth.slice(5, 7);
      setSelectedYearUi(newYear);
      setSelectedMonth(`${newYear}-${mm}`);
    } catch (e) {
      console.error("Failed to change year:", e);
    }
  };

  // שנים לבחירה (כמו אצלך בצילום: 2024/2025/2026)
  const yearsOptions = useMemo(() => {
    const from = currentYear - 2;
    const to = currentYear; // אם תרצה גם שנה קדימה: currentYear + 1
    return yearsRange(from, to);
  }, [currentYear]);

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
            totalEmployees={wrCount}
          />
          <WorkerReportsTable
            reports={workerReports}
            filterMonth={wrFilters.month || selectedMonth}
            filterRole={wrFilters.role}
            onEdit={handleEditSalary}
            onTogglePaid={handleTogglePaid}
            onUploadPDF={handleUploadPDF}
            onCountChange={setWrCount}
          />
        </TabPanel>

        {/* דוח לפי בניינים */}
        <TabPanel>
          <div className={classes.filtersRow}>
            <div className={classes.filterGroup}>
              <label>בחר שנה:</label>
              <select
                value={selectedYearUi}
                onChange={(e) => onChangeYear(e.target.value)}
                className={classes.selectMonth}
              >
                {yearsOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className={classes.filterGroup}>
              <label>בחר חודש:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={classes.selectMonth}
              >
                {monthsForYear(selectedYearUi).map((m) => (
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
