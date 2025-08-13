const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = `
    SELECT 
      b.name AS building_name,
      b.full_address AS address,
      f.total_paid,
      f.balance_due,
      f.maintenance
    FROM building_finance f
    JOIN buildings b ON f.building_id = b.building_id
    ORDER BY b.name ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send("Error loading building reports");
    res.json(results);
  });
});


module.exports = router;
