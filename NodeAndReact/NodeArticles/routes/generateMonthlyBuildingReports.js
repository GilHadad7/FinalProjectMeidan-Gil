// jobs/generateMonthlyBuildingReports.js  (או היכן שהקובץ אצלך)
const db = require("../db");

function generateMonthlyBuildingReports() {
  const sql = `
    DELETE FROM building_finance
    WHERE total_paid = 5000
      AND balance_due = 700
      AND maintenance = 1800
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ שגיאה במחיקת נתוני דמו מ-building_finance:", err);
      return;
    }

  });
}

module.exports = { generateMonthlyBuildingReports };
