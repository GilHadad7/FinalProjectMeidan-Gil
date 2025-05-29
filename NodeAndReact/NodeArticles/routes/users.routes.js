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

router.post("/", (req, res) => {
  const { name, role, phone, email, password, id_number } = req.body;

  const sql = `
    INSERT INTO users (name, role, phone, email, password, id_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [name, role, phone, email, password, id_number], (err, result) => {
    if (err) {
      console.error("Insert failed:", err);
      return res.status(500).json({ error: "Insert failed" });
    }

    res.json({ id: result.insertId, name, role, phone, email, id_number });
  });
});

router.put("/:id", (req, res) => {
  const { name, role, phone, email, id_number } = req.body;

  const sql = `
    UPDATE users
    SET name = ?, role = ?, phone = ?, email = ?, id_number = ?
    WHERE user_id = ?
  `;

  db.query(sql, [name, role, phone, email, id_number, req.params.id], (err) => {
    if (err) {
      console.error("Update failed:", err);
      return res.status(500).json({ error: "Update failed" });
    }

    res.sendStatus(200);
  });
});

router.delete("/:id", (req, res) => {
  const sql = "DELETE FROM users WHERE user_id = ?";

  db.query(sql, [req.params.id], (err) => {
    if (err) {
      console.error("Delete failed:", err);
      return res.status(500).json({ error: "Delete failed" });
    }

    res.sendStatus(200);
  });
});

module.exports = router;
