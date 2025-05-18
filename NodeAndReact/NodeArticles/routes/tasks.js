const express = require("express");
const router = express.Router();
const db = require("../db");

// ✅ Get all routine tasks
router.get("/", (req, res) => {
  const sql = `
  SELECT r.*, b.name AS building_name, b.full_address
  FROM routinetasks r
  JOIN buildings b ON r.building_id = b.building_id
`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching tasks:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json(result);
  });
});

// ✅ Add new task
router.post("/", (req, res) => {
  const { building_id, task_name, frequency, next_date, task_time, type } = req.body;
  const created_at = new Date();

  const sql = `
    INSERT INTO routinetasks 
    (building_id, task_name, frequency, next_date, created_at, task_time, type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [building_id, task_name, frequency, next_date, created_at, task_time, type],
    (err, result) => {
      if (err) {
        console.error("Error inserting task:", err);
        return res.status(500).json({ error: "Insert failed" });
      }
      res.json({ success: true, insertedId: result.insertId });
    }
  );
});

// ✅ Update existing task
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { building_id, task_name, frequency, next_date, task_time, type } = req.body;

  const sql = `
    UPDATE routinetasks SET
      building_id = ?, task_name = ?, frequency = ?, next_date = ?, task_time = ?, type = ?
    WHERE task_id = ?
  `;

  db.query(
    sql,
    [building_id, task_name, frequency, next_date, task_time, type, id],
    (err) => {
      if (err) {
        console.error("Error updating task:", err);
        return res.status(500).json({ error: "Update failed" });
      }
      res.json({ success: true });
    }
  );
});

// ✅ Delete task
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM routinetasks WHERE task_id = ?";
  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Error deleting task:", err);
      return res.status(500).json({ error: "Delete failed" });
    }
    res.json({ success: true });
  });
});

module.exports = router;
