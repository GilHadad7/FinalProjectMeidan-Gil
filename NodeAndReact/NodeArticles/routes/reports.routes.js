// 📁 routes/reports.routes.js – קובץ ראוטים מאוחד לדוחות (ללא await)
const express = require("express");
const router = express.Router();
const db = require("../db");

// 📄 דוחות עובדים - שליפה
router.get("/workers", (req, res) => {
  const sql = `
    SELECT 
      er.report_id,
      er.month,
      er.salary,
      er.paid,
      er.payslip_url,
      u.name AS employee_name,
      u.position
    FROM employee_reports er
    JOIN users u ON er.employee_id = u.user_id
    ORDER BY er.month DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error loading worker reports:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// 📝 עדכון שכר לעובד
router.put("/workers/:id", (req, res) => {
  const { salary } = req.body;
  const sql = "UPDATE employee_reports SET salary = ? WHERE report_id = ?";
  db.query(sql, [salary, req.params.id], (err) => {
    if (err) {
      console.error("❌ Failed to update salary:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.sendStatus(200);
  });
});

// ✅ טוגל שולם / לא שולם
router.patch("/workers/:id/toggle", (req, res) => {
  const sql = "UPDATE employee_reports SET paid = NOT paid WHERE report_id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) {
      console.error("❌ Failed to toggle paid:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.sendStatus(200);
  });
});

// ✅ GET /api/reports/buildings?month=2025-05
router.get("/buildings", (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7); // ברירת מחדל: החודש הנוכחי

  const sql = `
    SELECT 
      b.name AS building_name,
      b.full_address AS address,
      f.total_paid,
      f.balance_due,
      f.maintenance,
      f.month
    FROM building_finance f
    JOIN buildings b ON f.building_id = b.building_id
    WHERE f.month = ?
    ORDER BY b.name ASC
  `;

  db.query(sql, [month], (err, results) => {
    if (err) {
      console.error("❌ שגיאה בשליפת דוחות בניינים:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});


// 📊 דוחות חודשיים כלליים
router.get("/monthly", (req, res) => {
  const sql = `
    SELECT 
      month,
      income,
      expense,
      debt,
      profit
    FROM monthly_reports
    ORDER BY month DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error loading monthly reports:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});


module.exports = router;
