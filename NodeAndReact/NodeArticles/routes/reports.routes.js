const express = require("express");
const router = express.Router();
const db = require("../db");

// 📄 מחזיר את כל דוחות העובדים + שם העובד
router.get("/workers", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT er.*, u.full_name 
      FROM employee_reports er
      JOIN users u ON er.employee_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error loading worker reports:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
