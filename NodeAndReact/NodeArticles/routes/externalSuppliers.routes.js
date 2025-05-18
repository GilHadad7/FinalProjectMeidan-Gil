const express = require("express");
const router = express.Router();
const db = require("../db"); // החיבור למסד הנתונים שלך

// GET – שליפת כל הספקים
router.get("/", (req, res) => {
  const sql = "SELECT * FROM external_suppliers";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send("Error loading suppliers");
    res.json(results);
  });
});

// POST – הוספת ספק חדש
router.post("/", (req, res) => {
  const { name, field, phone, email } = req.body;
  const sql = "INSERT INTO external_suppliers (name, field, phone, email) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, field, phone, email], (err, result) => {
    if (err) return res.status(500).send("Insert failed");
    res.json({ id: result.insertId, name, field, phone, email });
  });
});

// PUT – עדכון ספק קיים
router.put("/:id", (req, res) => {
  const { name, field, phone, email } = req.body;
  const sql = "UPDATE external_suppliers SET name = ?, field = ?, phone = ?, email = ? WHERE id = ?";
  db.query(sql, [name, field, phone, email, req.params.id], (err) => {
    if (err) return res.status(500).send("Update failed");
    res.json({ id: req.params.id, name, field, phone, email });
  });
});

// DELETE – מחיקת ספק
router.delete("/:id", (req, res) => {
  const sql = "DELETE FROM external_suppliers WHERE id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).send("Delete failed");
    res.sendStatus(200);
  });
});

module.exports = router;
