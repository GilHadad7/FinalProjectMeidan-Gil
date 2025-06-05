// 📁 generateMonthlyBuildingReports.js – חישוב דוחות בניינים לפי תשלומים אמיתיים
const db = require("../db");

function generateMonthlyBuildingReports(month = null) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // פורמט "2025-06"
  const targetMonth = month || currentMonth;

  db.query("SELECT building_id FROM buildings", (err, buildings) => {
    if (err) {
      console.error("❌ שגיאה בשליפת בניינים:", err);
      return;
    }

    buildings.forEach((b) => {
      const buildingId = b.building_id;

      const paidQuery = `
        SELECT SUM(amount) AS total_paid
        FROM payments
        WHERE building_id = ? AND status = 'שולם'
          AND DATE_FORMAT(payment_date, '%Y-%m') = ?
      `;

      const debtQuery = `
        SELECT SUM(amount) AS total_debt
        FROM payments
        WHERE building_id = ? AND status != 'שולם'
          AND DATE_FORMAT(payment_date, '%Y-%m') = ?
      `;

      db.query(paidQuery, [buildingId, targetMonth], (err1, [paidRow]) => {
        if (err1) return console.error("❌ שגיאה בתשלומים:", err1);

        db.query(debtQuery, [buildingId, targetMonth], (err2, [debtRow]) => {
          if (err2) return console.error("❌ שגיאה בחובות:", err2);

          const total_paid = paidRow.total_paid || 0;
          const balance_due = debtRow.total_debt || 0;
          const maintenance = 500; // ברירת מחדל

          // נבדוק אם כבר קיים דוח לאותו בניין וחודש
          db.query(
            "SELECT * FROM building_finance WHERE building_id = ? AND month = ?",
            [buildingId, targetMonth],
            (err3, results) => {
              if (err3) return console.error("❌ שגיאה בבדיקה:", err3);

              if (results.length === 0) {
                // הכנסה חדשה
                db.query(
                  `INSERT INTO building_finance (building_id, total_paid, balance_due, maintenance, month)
                   VALUES (?, ?, ?, ?, ?)`,
                  [buildingId, total_paid, balance_due, maintenance, targetMonth],
                  (err4) => {
                    if (err4) console.error("❌ שגיאה בהכנסה:", err4);
                    else console.log(`✅ דוח נוצר לבניין ${buildingId} לחודש ${targetMonth}`);
                  }
                );
              } else {
                // עדכון קיים
                db.query(
                  `UPDATE building_finance
                   SET total_paid = ?, balance_due = ?, maintenance = ?
                   WHERE building_id = ? AND month = ?`,
                  [total_paid, balance_due, maintenance, buildingId, targetMonth],
                  (err5) => {
                    if (err5) console.error("❌ שגיאה בעדכון:", err5);
                    
                  }
                );
              }
            }
          );
        });
      });
    });
  });
}

// ✨ הפעלה ידנית לבדיקת חודש מאי (לבדיקה)
if (require.main === module) {
  generateMonthlyBuildingReports("2025-05"); // שנה לפי הצורך
}

module.exports = { generateMonthlyBuildingReports };
