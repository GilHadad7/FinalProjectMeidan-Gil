import React from "react";
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
  ResponsiveContainer
} from "recharts";

import classes from "./OverviewReports.module.css";

// צבעי העוגה
const COLORS = ["#0088FE", "#FF8042"];

export default function OverviewReports({ workers, buildings }) {
  // נתונים לגרף העמודות
  const barChartData = buildings.map(b => ({
    name: b.building_name,
    totalPaid: b.total_paid || 0
  }));

  // נתונים לגרף העוגה
  const totalPaid = buildings.reduce((sum, b) => sum + (b.total_paid || 0), 0);
  const totalDebt = buildings.reduce((sum, b) => sum + (b.open_debt || 0), 0);
  const pieChartData = [
    { name: "תשלומים", value: totalPaid },
    { name: "חובות פתוחים", value: totalDebt }
  ];

  return (
    <div className={classes.container}>
      {/* כותרת לגרף העמודות */}
      <h3 className={classes.sectionTitle}>📊 גרף תשלומים לפי בניין</h3>
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
    style: { direction: "rtl", unicodeBidi: "isolate" }
  }}
/>
    <Tooltip />
    <Bar dataKey="totalPaid" fill="#82ca9d" barSize={24} />
  </BarChart>
</ResponsiveContainer>

      </div>

      {/* כותרת לגרף העוגה */}
      <h3 className={classes.sectionTitle}>🥧 חלוקת חובות מול תשלומים</h3>
      <div className={classes.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
