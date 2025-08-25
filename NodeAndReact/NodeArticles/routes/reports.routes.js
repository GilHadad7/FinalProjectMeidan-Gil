// 📁 routes/reports.routes.js – קובץ ראוטים מאוחד לדוחות
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

// ✅ GET /api/reports/buildings?month=YYYY-MM
router.get("/buildings", (req, res) => {
  const month = (req.query.month || new Date().toISOString().slice(0, 7)).slice(0, 7);

  const sql = `
    SELECT
      b.name AS building_name,
      b.full_address AS address,
      f.total_paid,
      f.balance_due,
      COALESCE(f.maintenance, 0) AS maintenance,
      f.month
    FROM building_finance f
    JOIN buildings b
      ON f.building_id = b.building_id
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

// ✅ POST /api/reports/buildings/recalc { month: "YYYY-MM" }
// משתמש ב־UPSERT כדי למנוע כפילויות
router.post("/buildings/recalc", (req, res) => {
  const month = (req.body.month || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "month (YYYY-MM) is required" });
  }

  const insertSql = `
  INSERT INTO building_finance (building_id, month, total_paid, balance_due, maintenance)
  SELECT
    b.building_id,
    ? AS month,
    COALESCE(tp.total_paid, 0)  AS total_paid,
    COALESCE(bd.balance_due, 0) AS balance_due,
    COALESCE(ms.maint_from_calls, 0) AS maintenance
  FROM buildings b
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS total_paid
    FROM payments
    WHERE status = 'שולם'
      AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) tp ON tp.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS balance_due
    FROM payments
    WHERE status IN ('חוב','ממתין')
      AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) bd ON bd.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(COALESCE(cost,0)) AS maint_from_calls
    FROM servicecalls
    WHERE status IN ('Closed','סגור')
      AND DATE_FORMAT(created_at, '%Y-%m') = ?
    GROUP BY building_id
  ) ms ON ms.building_id = b.building_id
  WHERE ( COALESCE(tp.total_paid,0)
        + COALESCE(bd.balance_due,0)
        + COALESCE(ms.maint_from_calls,0) ) > 0
  ON DUPLICATE KEY UPDATE
    total_paid = VALUES(total_paid),
    balance_due = VALUES(balance_due),
    maintenance = VALUES(maintenance);
  `;

  db.query(insertSql, [month, month, month, month], (err, result) => {
    if (err) {
      console.error("❌ insert month rows failed:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ ok: true, inserted: result.affectedRows, month });
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
