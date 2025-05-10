const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/buildings - שליפת כל הבניינים
router.get("/", (req, res) => {
  const sql = "SELECT * FROM buildings";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching buildings:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(results);
  });
});

module.exports = router;
