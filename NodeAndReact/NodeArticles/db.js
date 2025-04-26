const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",
  user: "root", // שנה לפי המשתמש שלך
  password: "", // אם יש סיסמה תוסיף כאן
  database: "building_maintenance", // שם הדאטהבייס שלך
});

db.connect((err) => {
  if (err) {
    console.error("❌ Error connecting to MySQL:", err.message);
    return;
  }
  console.log("✅ Connected to MySQL database");
});

module.exports = db;
