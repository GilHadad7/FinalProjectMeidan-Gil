const express = require("express");
const router = express.Router();
const db = require("../db");

// שליפת דוח חודשי כללי
router.get("/", (req, res) => {
  const sql = "SELECT * FROM monthly_reports ORDER BY month DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send("Error loading monthly reports");
    res.json(results);
  });
});

module.exports = router;
