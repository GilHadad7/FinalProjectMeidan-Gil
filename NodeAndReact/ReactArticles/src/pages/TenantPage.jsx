import React from "react";

const navItems = [
  "Service calls",
  "Schedule",
  "Payments",
  "Reports"
];

export default function TenantPage() {
  const colors = [
    "brown", "orange", "blue", "purple", "green", "gray", "skyblue", "gold"
  ];

  return (
    <div style={{ fontFamily: "serif", backgroundColor: "#fefdf6", padding: 20, textAlign: "center" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold" }}>TENANT VIEW</h1>

      {/* Navigation Bar */}
      <div style={{
        display: "flex",
        flexWrap: "nowrap",
        overflowX: "auto",
        justifyContent: "center",
        gap: 10,
        marginBottom: 30,
        padding: 10
      }}>
        {navItems.map((item) => (
          <button key={item} style={{
            padding: "10px 20px",
            backgroundColor: "#e0d3b8",
            borderRadius: 20,
            border: "none",
            whiteSpace: "nowrap",
            fontSize: "14px",
            cursor: "pointer"
          }}>
            {item}
          </button>
        ))}
      </div>

      <h2 style={{ marginBottom: 30, fontSize: "18px" }}>Welcome, dear tenant 🏡</h2>

      {/* Content Area */}
      <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 40 }}>
        {/* Notifications */}
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: "bold" }}>
            INSTANT NOTIFICATION'S <span style={{ fontSize: "13px" }}>(התראות דחופות לדייר)</span>
          </h3>
          <div style={{
            width: 380,
            height: 180,
            border: "2px solid black",
            backgroundImage: "linear-gradient(to top, #a8d08d, #dbeef3)",
            position: "relative",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
          }}>
            <div style={{ backgroundColor: "#f8d697", height: 20, width: "100%", position: "absolute", top: 0 }}></div>
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#333" }}>No new alerts</span>
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: "bold" }}>
            SCHEDULE <span style={{ fontSize: "13px" }}>(לוח זמנים של הבניין)</span>
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 40px)",
            gap: 5,
            border: "1px solid #000",
            padding: 10,
            backgroundColor: "#fff",
            borderRadius: 6,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
          }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} style={{
                width: 40,
                height: 40,
                border: "1px solid #ccc",
                borderRadius: "50%",
                backgroundColor: colors[i % colors.length]
              }}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
