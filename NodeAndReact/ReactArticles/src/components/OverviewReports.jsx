import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
import classes from "./OverviewReports.module.css";

// צבעי העוגה – תשלומים (כחול), חובות פתוחים (אדום), תחזוקה (צהוב)
const COLORS = ["#0088FE", "#E53935", "#F2C94C"];

// חודש בטוח בפורמט YYYY-MM
const safeMonth = (m) =>
  m && /^\d{4}-\d{2}$/.test(m) ? m : new Date().toISOString().slice(0, 7);

// פורמט ₪ עם הפרדת אלפים
const formatNIS = (v) => `₪ ${Number(v || 0).toLocaleString("he-IL")}`;

export default function OverviewReports({ workers, buildings }) {
  // חודש מוצג בגרפים (עצמאי מה-ReportsPage)
  const [month, setMonth] = useState(() => safeMonth());
  // נתוני הבניינים בחודש שנבחר (נטען מה-API)
  const [monthlyBuildings, setMonthlyBuildings] = useState(null);
  const [loading, setLoading] = useState(false);

  // טען נתונים לחודש שנבחר + הבטח שכל הבניינים מופיעים (גם אם 0)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const m = safeMonth(month);

        // מרענן/שומר את החודש בטבלת building_finance
        await fetch("http://localhost:3000/api/reports/buildings/recalc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: m }),
        });

        // שולף מהטבלה את החודש
        const resFin = await fetch(
          `http://localhost:3000/api/reports/buildings?month=${m}`
        );
        const finance = await resFin.json();

        // רשימת כל הבניינים (כדי למלא 0 למי שאין שורות)
        const resAll = await fetch("http://localhost:3000/api/buildings");
        const allBuildings = await resAll.json();

        const byName = new Map(
          (finance || []).map((r) => [String(r.building_name || "").trim(), r])
        );

        const merged = (allBuildings || [])
          .map((b) => {
            const name = (b.name || b.building_name || "").trim();
            const row = byName.get(name);
            if (row) return row;
            return {
              building_name: name,
              address: b.full_address || b.address || "",
              total_paid: 0,
              balance_due: 0,
              maintenance: 0,
              month: m,
            };
          })
          .sort((a, b) =>
            (a.building_name || "").localeCompare(b.building_name || "", "he")
          );

        if (!cancelled) setMonthlyBuildings(merged);
      } catch (e) {
        console.error("Overview month load failed:", e);
        if (!cancelled) setMonthlyBuildings(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [month]);

  // מקור הנתונים לגרפים
  const dataSource =
    monthlyBuildings && Array.isArray(monthlyBuildings)
      ? monthlyBuildings
      : buildings;

  // נתונים לגרף העמודות
  const barChartData = useMemo(
    () =>
      (dataSource || []).map((b) => ({
        name: b.building_name,
        totalPaid: Number(b.total_paid) || 0,
      })),
    [dataSource]
  );

  // סכומים לעוגה (כולל תחזוקה)
  const totals = useMemo(() => {
    let paid = 0;
    let debt = 0;
    let maintenance = 0;
    for (const b of dataSource || []) {
      paid += Number(b.total_paid) || 0;
      debt += Number(b.open_debt ?? b.balance_due) || 0;
      maintenance += Number(b.maintenance ?? b.maintenance_cost ?? 0) || 0;
    }
    return { totalPaid: paid, totalDebt: debt, totalMaintenance: maintenance };
  }, [dataSource]);

  const pieChartData = useMemo(
    () => [
      { name: "תשלומים", value: totals.totalPaid },
      { name: "חובות פתוחים", value: totals.totalDebt },
      { name: "הוצאות תחזוקה", value: totals.totalMaintenance },
    ],
    [totals]
  );

  return (
    <div className={classes.container}>
      {/* כותרת + בורר חודש (גרף עמודות) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 className={classes.sectionTitle} style={{ margin: 0 }}>
          📊 גרף תשלומים לפי בניין
        </h3>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #ddd" }}
          />
        </label>
      </div>

      <div className={classes.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barChartData}
            layout="vertical"
            margin={{ top: 20, bottom: 20, left: 100, right: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              dataKey="name"
              type="category"
              width={160}
              tickFormatter={(value) => value}
              tick={{
                fontSize: 16,
                dx: -10,
                textAnchor: "start",
                style: { direction: "rtl", unicodeBidi: "isolate" },
              }}
            />
            <Tooltip />
            <Bar dataKey="totalPaid" fill="#82ca9d" barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* גרף העוגה */}
      <h3 className={classes.sectionTitle}>🥧 חלוקת תשלומים · חובות · תחזוקה</h3>

      <div className={classes.pieWrapper}>
        {/* סיכום למעלה */}
        <div className={classes.pieSummary}>
          <span className={`${classes.summaryItem} ${classes.paid}`}>
            תשלומים: <strong>{formatNIS(totals.totalPaid)}</strong>
          </span>
          <span className={`${classes.summaryItem} ${classes.debt}`}>
            חובות פתוחים: <strong>{formatNIS(totals.totalDebt)}</strong>
          </span>
          <span
            className={classes.summaryItem}
            style={{ color: "#F2C94C", marginInlineStart: 12 }}
          >
            הוצאות תחזוקה: <strong>{formatNIS(totals.totalMaintenance)}</strong>
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 20, bottom: 48, left: 20 }}>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="52%"            // מספיק מקום למעלה (סיכום) ולמטה (מקרא)
              outerRadius={112}
              labelLine={false}
              label={false}
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            {/* מקרא – בתחתית */}
            <Legend
              verticalAlign="bottom"
              align="center"
              layout="horizontal"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => [formatNIS(value), name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {loading && (
        <div style={{ textAlign: "center", marginTop: 8 }}>טוען נתוני חודש…</div>
      )}
    </div>
  );
}
