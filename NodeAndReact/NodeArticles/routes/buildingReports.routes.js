const express = require("express");
const router = express.Router();
const db = require("../db");

// שליפת דוח כספי לפי בניינים
router.get("/", (req, res) => {
  const sql = "SELECT * FROM building_finance";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send("Error loading building reports");
    res.json(results);
  });
});

module.exports = router;
