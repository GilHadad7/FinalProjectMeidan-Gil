const db = require("../db");

function generateMonthlyBuildingReports() {
  // נניח שהערכים מחושבים כל חודש מחדש
  //צריך לחשב לכל בניין את :
  // 1. סה"כ שכר
  // 2. חובות פתוחים
  // 3. סה"כ תשלומים    
  const simulatedPaid = 5000;
  const simulatedDebt = 700;
  const simulatedMaintenance = 1800;

  db.query("SELECT building_id FROM buildings", (err, buildings) => {
    if (err) {
      console.error("❌ שגיאה בשליפת בניינים:", err);
      return;
    }

    buildings.forEach((b) => {
      const buildingId = b.building_id;

      // בדיקה אם יש כבר שורת נתונים בבניין
      db.query(
        "SELECT * FROM building_finance WHERE building_id = ?",
        [buildingId],
        (err, results) => {
          if (err) {
            console.error("❌ שגיאה בבדיקת building_finance:", err);
            return;
          }

          if (results.length === 0) {
            // אם אין שורה – נכניס שורה חדשה
            db.query(
              `INSERT INTO building_finance 
               (building_id, total_paid, balance_due, maintenance) 
               VALUES (?, ?, ?, ?)`,
              [buildingId, simulatedPaid, simulatedDebt, simulatedMaintenance],
              (err) => {
                if (err) {
                  console.error("❌ שגיאה בהכנסת נתונים לבניין:", err);
                } else {
                  console.log(`✅ נוצר רישום חדש בבניין ${buildingId}`);
                }
              }
            );
          } else {
            // אם יש – נעדכן את הערכים
            db.query(
              `UPDATE building_finance 
               SET total_paid = ?, balance_due = ?, maintenance = ?
               WHERE building_id = ?`,
              [simulatedPaid, simulatedDebt, simulatedMaintenance, buildingId],
              (err) => {
                if (err) {
                  console.error("❌ שגיאה בעדכון נתונים לבניין:", err);
                } else {
                  console.log(`🔁 עודכן רישום קיים בבניין ${buildingId}`);
                }
              }
            );
          }
        }
      );
    });
  });
}

module.exports = { generateMonthlyBuildingReports };
