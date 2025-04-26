export default function AdminPage() {
  const navItems = [
    "Service calls",
    "Schedule",
    "Payments",
    "Details of buildings",
    "Assignment of tasks",
    "User management",
    "External suppliers",
    "Reports",
  ];

  const colors = [
    "brown",
    "orange",
    "blue",
    "purple",
    "green",
    "gray",
    "skyblue",
    "gold",
  ];

  return (
    <div
      style={{
        fontFamily: "serif",
        backgroundColor: "#fefdf6",
        padding: 20,
        textAlign: "center",
      }}
    >
      <h1>MANAGER VIEW</h1>

      <div
        style={{
          display: "flex",
          flexWrap: "nowrap", // אין ירידת שורות
          overflowX: "auto", // גלילה אופקית במקרה הצורך
          justifyContent: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {navItems.map((item) => (
          <button
            key={item}
            style={{
              padding: "10px 20px",
              backgroundColor: "#e0d3b8",
              borderRadius: 20,
              border: "none",
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <h2>WELCOME TO “XXXXXXXXXXXXXX” BUILDING</h2>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          flexWrap: "wrap",
          gap: 40,
        }}
      >
        <div>
          <h3>INSTANT NOTIFICATION'S (התראות דחופות)</h3>
          <div
            style={{
              width: 380,
              height: 180,
              border: "2px solid black",
              backgroundImage: "linear-gradient(to top, #a8d08d, #dbeef3)",
              position: "relative",
            }}
          >
            <div
              style={{
                backgroundColor: "#f8d697",
                height: 20,
                width: "100%",
                position: "absolute",
                top: 0,
              }}
            ></div>
          </div>
        </div>

        <div>
          <h3>SCHEDULE (לוח זמנים של חברת XXXX)</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 40px)",
              gap: 5,
            }}
          >
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  border: "1px solid #ccc",
                  borderRadius: "50%",
                  backgroundColor: colors[i % colors.length],
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
