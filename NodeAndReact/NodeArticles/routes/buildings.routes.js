const express = require("express");
const router = express.Router();
const db = require("../db"); // ודא שיש לך קובץ db.js שמתחבר ל-MySQL

// 🔹 Get all buildings
router.get("/", (req, res) => {
  const sql = "SELECT * FROM buildings";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching buildings:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

// 🔹 Add new building
router.post("/", (req, res) => {
  const {
    name,
    full_address,
    maintenance_type,
    apartments,
    floors,
    committee,
    phone,
    assigned_workers // ← נלקח מהגוף של הבקשה
  } = req.body;

  const sql = `
    INSERT INTO buildings (
      name, full_address, maintenance_type,
      apartments, floors, committee, phone,
      assigned_workers
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, full_address, maintenance_type, apartments, floors, committee, phone, assigned_workers],
    (err, result) => {
      if (err) {
        console.error("Error inserting building:", err);
        return res.status(500).json({ error: "Insert failed" });
      }
      res.json({ success: true, insertedId: result.insertId });
    }
  );
});

// 🔹 Delete building by ID
router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM buildings WHERE building_id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting building:", err);
      return res.status(500).json({ error: "Delete failed" });
    }
    res.json({ success: true });
  });
});

// 🔹 Update existing building
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const {
    name,
    full_address,
    maintenance_type,
    apartments,
    floors,
    committee,
    phone,
    assigned_workers // ← גם כאן נדרש לעדכון
  } = req.body;

  const sql = `
    UPDATE buildings SET
      name = ?, full_address = ?, maintenance_type = ?,
      apartments = ?, floors = ?, committee = ?, phone = ?,
      assigned_workers = ?
    WHERE building_id = ?
  `;

  db.query(
    sql,
    [name, full_address, maintenance_type, apartments, floors, committee, phone, assigned_workers, id],
    (err, result) => {
      if (err) {
        console.error("Error updating building:", err);
        return res.status(500).json({ error: "Update failed" });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;
