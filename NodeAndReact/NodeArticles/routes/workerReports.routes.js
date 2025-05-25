const express = require("express");
const router = express.Router();
const db = require("../db"); // ← חיבור למסד הנתונים

// שליפת כל הדוחות
router.get("/", (req, res) => {
  const sql = `
    SELECT r.*, u.name AS employee_name
    FROM employee_reports r
    JOIN users u ON r.employee_id = u.user_id
    ORDER BY r.month DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send("Error loading worker reports");
    res.json(results);
  });
});

// עדכון שכר חודשי
router.put("/:id", (req, res) => {
  const { salary } = req.body;
  const sql = `UPDATE employee_reports SET salary = ? WHERE report_id = ?`;
  db.query(sql, [salary, req.params.id], (err) => {
    if (err) return res.status(500).send("Failed to update salary");
    res.sendStatus(200);
  });
});

// טוגל: שולם / לא שולם
router.patch("/:id/toggle", (req, res) => {
  const sql = `
    UPDATE employee_reports
    SET paid = NOT paid
    WHERE report_id = ?
  `;
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).send("Failed to toggle payment");
    res.sendStatus(200);
  });
});

module.exports = router;
