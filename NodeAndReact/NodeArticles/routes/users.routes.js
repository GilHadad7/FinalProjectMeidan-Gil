const express = require("express");
const router = express.Router();
const db = require("../db");

// 🔹 Get all users or by role
router.get("/", (req, res) => {
  const { role } = req.query;

  let sql = "SELECT * FROM users"; // ✅ כל השדות


  if (role) {
    sql += " WHERE role = ?";
    db.query(sql, [role], (err, result) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(result);
    });
  } else {
    db.query(sql, (err, result) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(result);
    });
  }
});

module.exports = router;
