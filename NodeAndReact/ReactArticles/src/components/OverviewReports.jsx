// 📄 OverviewReports.jsx – דף גרפי ראשוני לדוחות
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ResponsiveContainer
} from "recharts";

import classes from "./OverviewReports.module.css";

// צבעים לגרף עוגה
const COLORS = ["#0088FE", "#FF8042"];

export default function OverviewReports({ workers, buildings }) {
  // גרף עמודות – תשלומים לפי בניין
  const barChartData = buildings.map(b => ({
    name: b.building_name,
    totalPaid: b.total_paid || 0
  }));

  // גרף עוגה – סכום תשלומים מול חובות
  const totalPaid = buildings.reduce((sum, b) => sum + (b.total_paid || 0), 0);
  const totalDebt = buildings.reduce((sum, b) => sum + (b.open_debt || 0), 0);
  const pieChartData = [
    { name: "תשלומים", value: totalPaid },
    { name: "חובות פתוחים", value: totalDebt }
  ];

  return (
    <div className={classes.container}>
      <h3 className={classes.sectionTitle}>📊 גרף תשלומים לפי בניין</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barChartData} layout="vertical" margin={{ left: 50 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" />
          <Tooltip />
          <Bar dataKey="totalPaid" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>

      <h3 className={classes.sectionTitle}>🥧 חלוקת חובות מול תשלומים</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieChartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
