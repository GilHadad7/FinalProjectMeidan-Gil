const express = require("express");
const router = express.Router();
const db = require("../db");

// ✅ POST: שליחת תזכורת והוספתה ללוג
router.post("/", (req, res) => {
  const { payment_id, tenant_id } = req.body;

  // ⚠️ בדיקת שדות חובה
  if (!payment_id || !tenant_id) {
    return res.status(400).json({ error: "Missing payment_id or tenant_id" });
  }

  // 🔁 בדיקה אם כבר נשלחה תזכורת ב־24 שעות האחרונות
  const checkQuery = `
    SELECT reminder_date FROM reminder_logs
    WHERE payment_id = ? AND tenant_id = ?
    AND reminder_date >= NOW() - INTERVAL 1 DAY
    ORDER BY reminder_date DESC
    LIMIT 1
  `;

  db.query(checkQuery, [payment_id, tenant_id], (checkErr, results) => {
    if (checkErr) {
      return res.status(500).json({ error: "Database error (check)" });
    }

    if (results.length > 0) {
      const lastSent = results[0].reminder_date;
      return res.status(409).json({
        error: "Reminder already sent in the last 24 hours",
        last_sent: lastSent
      });
    }

    // 📩 שליפת מייל וטלפון של הדייר
    const userQuery = `
      SELECT name, email, phone FROM users WHERE user_id = ?
    `;

    db.query(userQuery, [tenant_id], (userErr, userResults) => {
      if (userErr || userResults.length === 0) {
        return res.status(500).json({ error: "Failed to fetch tenant contact details" });
      }

      const { name, email, phone } = userResults[0];

      // ✅ הכנסת תזכורת חדשה עם זמן נוכחי
      const insertQuery = `
        INSERT INTO reminder_logs (payment_id, tenant_id, reminder_date)
        VALUES (?, ?, NOW())
      `;

      db.query(insertQuery, [payment_id, tenant_id], (insertErr, result) => {
        if (insertErr) {
          return res.status(500).json({ error: "Database error (insert)" });
        }


        // כאן בהמשך נוכל לקרוא לפונקציה sendEmail או sendWhatsApp
        // לדוגמה: sendEmail(email, name, payment_id);

        res.status(201).json({
          message: "Reminder logged successfully",
          reminder_id: result.insertId,
          tenant: { name, email, phone }
        });
      });
    });
  });
});

module.exports = router;
