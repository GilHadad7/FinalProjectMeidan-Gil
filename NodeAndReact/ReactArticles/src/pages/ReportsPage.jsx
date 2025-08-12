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
  const [y,m] = ym.split("-");
  return `${HEB_MONTHS[parseInt(m,10)-1]} ${y}`;
};
const monthsForYear = (year) =>
  Array.from({length:12},(_,i)=>`${year}-${pad2(i+1)}`);

// קטגוריות שנחשבות “הוצאות תחזוקה” מתוך תשלומים
const MAINTENANCE_CATS = new Set(["תחזוקת בניין","ניקיון","שירות מעלית","אבטחה"]);

// אגרגציית תשלומים -> בסיס לסיכומים פר בניין
function aggregatePaymentsByBuilding(list) {
  const map = new Map();

  list.forEach((p) => {
    const bId   = p.building_id ?? p.buildingId ?? p.building?.id;
    const bName = p.building_name ?? p.buildingName ?? p.building?.name ?? "";
    const addr  = p.building_address ?? p.address ?? p.building?.address ?? "";
    if (!bId && !bName) return;
    const key = bId ?? bName;

    if (!map.has(key)) {
      map.set(key, {
        building_id: bId,
        building_name: bName,
        address: addr,
        total_paid: 0,
        balance_due: 0,
        maintenance: 0,
      });
    }

    const rec = map.get(key);
    const amount = Number(p.amount) || 0;
    const status = (p.status || "").trim();

    if (status === "שולם") rec.total_paid += amount;
    if (status === "חוב" || status === "ממתין") rec.balance_due += amount;

    const cat = (p.category || "").trim();
    if (status === "שולם" && MAINTENANCE_CATS.has(cat)) {
      rec.maintenance += amount;
    }
  });

  return map;
}

export default function ReportsPage() {
  const [workerReports, setWorkerReports] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().toISOString().slice(0, 7)
  );
  const selectedYear = selectedMonth.slice(0, 4);
  

  const [selectedBuilding, setSelectedBuilding] = useState("");

  const [buildingsSummary, setBuildingsSummary] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  // אינדקסים להשלמת שם/כתובת
  const [buildingsById, setBuildingsById] = useState({});
  const [buildingsByName, setBuildingsByName] = useState({});
  const [buildingsByAddress, setBuildingsByAddress] = useState({});

  // ✅ סטייט לסינון דוח עובדים (מגיע מה-Summary ונשלח לטבלה)
  const [wrFilters, setWrFilters] = useState({ month: "", role: "" });

  // דוח עובדים
  useEffect(() => {
    fetch("http://localhost:3000/api/reports/workers")
      .then((res) => res.json())
      .then((data) => setWorkerReports(data))
      .catch(console.error);
  }, []);

  // טען פעם אחת את הבניינים ובנה אינדקסים
  useEffect(() => {
    fetch("http://localhost:3000/api/buildings")
      .then((res) => res.json())
      .then((list) => {
        const byId = {};
        const byName = {};
        const byAddress = {};
        list.forEach((b) => {
          byId[String(b.building_id)] = b;
          const nm = (b.name || b.building_name || "").toLowerCase();
          if (nm) byName[nm] = b;

          const addr =
            (b.full_address ||
              b.address ||
              [b.street, b.house_number, b.city].filter(Boolean).join(" ")
            || "").toLowerCase();
          if (addr) byAddress[addr] = b;
        });
        setBuildingsById(byId);
        setBuildingsByName(byName);
        setBuildingsByAddress(byAddress);
      })
      .catch(console.error);
  }, []);

  // דוח בניינים – תשלומים + קריאות שירות לחודש הנבחר
  useEffect(() => {
    setLoadingBuildings(true);

    const fetchPayments = fetch(`http://localhost:3000/api/payments?month=${selectedMonth}`)
      .then((r) => r.json())
      .then((rows) => (rows || []).filter((p) => {
        const ym = (p.payment_date || p.date || "").slice(0, 7);
        return ym === selectedMonth;
      }))
      .catch(() => []);

    const fetchCalls = fetch(`http://localhost:3000/api/service-calls?month=${selectedMonth}`)
      .then((r) => r.json())
      .then((rows) => (rows || []).filter((c) => {
        const ym = (c.created_at || "").slice(0, 7);
        return ym === selectedMonth;
      }))
      .catch(() => []);

    Promise.all([fetchPayments, fetchCalls])
      .then(([payments, calls]) => {
        const map = aggregatePaymentsByBuilding(payments);

        calls.forEach((c) => {
          const statusOk = (c.status || "").toLowerCase() === "closed";
          if (!statusOk) return;

          const cost = Number(c.cost);
          if (!isFinite(cost) || cost <= 0) return;

          const bId = c.building_id ?? c.buildingId;
          const addr = (c.building_address || c.address || "").toLowerCase();
          const bName = c.building_name || c.buildingName || "";

          let b = undefined;
          if (bId != null) b = buildingsById[String(bId)];
          if (!b && addr)   b = buildingsByAddress[addr];
          if (!b && bName)  b = buildingsByName[(bName || "").toLowerCase()];

          const key = (b?.building_id ?? bId ?? bName) || addr;
          if (!key) return;

          if (!map.has(key)) {
            map.set(key, {
              building_id: b?.building_id ?? bId ?? null,
              building_name: b?.name || b?.building_name || bName || "",
              address:
                b?.full_address ||
                b?.address ||
                (addr || "") ||
                [b?.street, b?.house_number, b?.city].filter(Boolean).join(" "),
              total_paid: 0,
              balance_due: 0,
              maintenance: 0,
            });
          }

          const rec = map.get(key);
          rec.maintenance += cost;

          if (!rec.building_name) {
            rec.building_name = b?.name || b?.building_name || bName || rec.building_name;
          }
          if (!rec.address) {
            rec.address =
              b?.full_address ||
              b?.address ||
              (addr || "") ||
              [b?.street, b?.house_number, b?.city].filter(Boolean).join(" ");
          }
        });

        const enriched = Array.from(map.values()).map((r) => {
          const b =
            (r.building_id != null && buildingsById[String(r.building_id)]) ||
            (r.building_name && buildingsByName[r.building_name.toLowerCase()]) ||
            (r.address && buildingsByAddress[r.address.toLowerCase()]) ||
            undefined;

          const joinAddr = [b?.street, b?.house_number, b?.city].filter(Boolean).join(" ");

          return {
            ...r,
            building_name: r.building_name || b?.name || b?.building_name || "",
            address: r.address || b?.full_address || b?.address || joinAddr,
          };
        });

        enriched.sort((a,b) =>
          (a.building_name || "").localeCompare(b.building_name || "","he")
        );

        setBuildingsSummary(enriched);
      })
      .finally(() => setLoadingBuildings(false));
  }, [selectedMonth, buildingsById, buildingsByName, buildingsByAddress]);

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
          {/* ✅ מחברים: ה-Summary מעדכן את הסטייט המרכזי */}
          <WorkerReportsSummary
            reports={workerReports}
            onFiltersChange={setWrFilters}
          />

          {/* ✅ והטבלה מקבלת את הסינון ומציגה רק את השורות הרלוונטיות */}
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
                  <option key={m} value={m}>{monthLabelHe(m)}</option>
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
                  <option key={name} value={name}>{name}</option>
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
