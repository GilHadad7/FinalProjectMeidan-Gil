const express = require("express");
const router = express.Router();
const db = require("../db");

// GET: Fetch all payments with tenant_name and building_name via JOIN
router.get("/", (req, res) => {
  const query = `
    SELECT
      p.payment_id,
      p.tenant_id,
      u.name       AS tenant_name,
      b.name       AS building_name,
      p.payment_date,
      p.category,
      p.description,
      p.amount,
      p.status,
      p.created_at
    FROM payments p
    LEFT JOIN users u ON p.tenant_id = u.user_id
    LEFT JOIN buildings b ON p.building_id = b.building_id
    ORDER BY p.payment_date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("\u274C Error fetching payments:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// POST: Add a new payment
router.post("/", (req, res) => {
  const {
    tenant_id,
    building_id,
    payment_date,
    category = null,
    description = null,
    amount,
    status,
  } = req.body;

  const insertQuery = `
    INSERT INTO payments
      (tenant_id, building_id, payment_date, category, description, amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertQuery,
    [tenant_id, building_id, payment_date, category, description, amount, status],
    (err, result) => {
      if (err) {
        console.error("\u274C Error adding payment:", err);
        return res.status(500).json({ error: err.message });
      }

      const selectQuery = `
        SELECT
          p.payment_id,
          p.tenant_id,
          u.name       AS tenant_name,
          b.name       AS building_name,
          p.payment_date,
          p.category,
          p.description,
          p.amount,
          p.status,
          p.created_at
        FROM payments p
        JOIN users u ON p.tenant_id = u.user_id
        JOIN buildings b ON p.building_id = b.building_id
        WHERE p.payment_id = ?
      `;

      db.query(selectQuery, [result.insertId], (err2, rows) => {
        if (err2) {
          console.error("\u274C Error fetching new payment:", err2);
          return res.status(500).json({ error: err2.message });
        }
        res.status(201).json(rows[0]);
      });
    }
  );
});

// PATCH: Update only provided fields
router.patch("/:id", (req, res) => {
  const paymentId = req.params.id;
  const fields = req.body;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const setClause = Object.keys(fields).map(key => `${key} = ?`).join(", ");
  const values = [...Object.values(fields), paymentId];

  const updateQuery = `UPDATE payments SET ${setClause} WHERE payment_id = ?`;

  db.query(updateQuery, values, (err, result) => {
    if (err) {
      console.error("\u274C Error updating payment:", err);
      return res.status(500).json({ error: err.message });
    }

    const selectQuery = `
      SELECT
        p.payment_id,
        p.tenant_id,
        u.name       AS tenant_name,
        b.name       AS building_name,
        p.payment_date,
        p.category,
        p.description,
        p.amount,
        p.status,
        p.created_at
      FROM payments p
      JOIN users u ON p.tenant_id = u.user_id
      JOIN buildings b ON p.building_id = b.building_id
      WHERE p.payment_id = ?
    `;

    db.query(selectQuery, [paymentId], (err2, rows) => {
      if (err2) {
        return res.status(500).json({ error: err2.message });
      }
      res.json(rows[0]);
    });
  });
});

// DELETE: Remove a payment by ID
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const deleteQuery = `DELETE FROM payments WHERE payment_id = ?`;
  db.query(deleteQuery, [id], (err, result) => {
    if (err) {
      console.error("\u274C Error deleting payment:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Payment deleted successfully" });
  });
});

module.exports = router;