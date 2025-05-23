const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all users
router.get("/", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).send("Error loading users");
    res.json(results);
  });
});

// POST new user
router.post("/", (req, res) => {
  const { name, role, phone, email, password } = req.body;
  const sql = "INSERT INTO users (name, role, phone, email, password) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [name, role, phone, email, password], (err, result) => {
    if (err) return res.status(500).send("Insert failed");
    res.json({ id: result.insertId, name, role, phone, email });
  });
});

// PUT update user
router.put("/:id", (req, res) => {
  const { name, role, phone, email } = req.body;
  const sql = "UPDATE users SET name=?, role=?, phone=?, email=? WHERE user_id=?";
  db.query(sql, [name, role, phone, email, req.params.id], (err) => {
    if (err) return res.status(500).send("Update failed");
    res.json({ id: req.params.id, name, role, phone, email });
  });
});


// DELETE user
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM users WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).send("Delete failed");
    res.sendStatus(200);
  });
});

module.exports = router;
