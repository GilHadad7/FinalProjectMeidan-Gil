const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
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
    if (err) return res.status(500).send("Error loading monthly reports");
    res.json(results);
  });
});

module.exports = router;
