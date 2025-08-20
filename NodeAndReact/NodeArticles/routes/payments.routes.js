const express = require("express");
const router = express.Router();
const db = require("../db");

// helper: רענון חודש בטבלת building_finance
function recalcBuildingsMonth(month, cb = () => {}) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    month = new Date().toISOString().slice(0, 7);
  }
  const sql = `
  INSERT INTO building_finance (building_id, month, total_paid, balance_due, maintenance)
  SELECT
    b.building_id,
    ? AS month,
    COALESCE(tp.total_paid, 0) AS total_paid,
    COALESCE(bd.balance_due, 0) AS balance_due,
    COALESCE(mp.maint_from_payments, 0) + COALESCE(ms.maint_from_calls, 0) AS maintenance
  FROM buildings b
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS total_paid
    FROM payments
    WHERE status='שולם' AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) tp ON tp.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS balance_due
    FROM payments
    WHERE status IN ('חוב','ממתין') AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) bd ON bd.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS maint_from_payments
    FROM payments
    WHERE status='שולם'
      AND category IN ('תחזוקת בניין','ניקיון','שירות מעלית','אבטחה')
      AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) mp ON mp.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(COALESCE(cost,0)) AS maint_from_calls
    FROM servicecalls
    WHERE status IN ('Closed','סגור')
      AND DATE_FORMAT(created_at, '%Y-%m') = ?
    GROUP BY building_id
  ) ms ON ms.building_id = b.building_id
  ON DUPLICATE KEY UPDATE
    total_paid = VALUES(total_paid),
    balance_due = VALUES(balance_due),
    maintenance = VALUES(maintenance);
  `;
  db.query(sql, [month, month, month, month, month], (err) => {
    if (err) console.error("recalcBuildingsMonth (payments) failed:", err);
    cb(err || null);
  });
}

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
      console.error("❌ Error fetching payments:", err);
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
        console.error("❌ Error adding payment:", err);
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
          console.error("❌ Error fetching new payment:", err2);
          return res.status(500).json({ error: err2.message });
        }
        res.status(201).json(rows[0]);
        // רענון חודש של התשלום
        const ym = (payment_date && /^\d{4}-\d{2}-\d{2}$/.test(payment_date))
          ? payment_date.slice(0, 7)
          : new Date().toISOString().slice(0, 7);
        recalcBuildingsMonth(ym);
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

  db.query(updateQuery, values, (err) => {
    if (err) {
      console.error("❌ Error updating payment:", err);
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
      const row = rows[0];
      res.json(row);
      // רענון חודש של התשלום המעודכן
      const ym = row && row.payment_date
        ? new Date(row.payment_date).toISOString().slice(0, 7)
        : new Date().toISOString().slice(0, 7);
      recalcBuildingsMonth(ym);
    });
  });
});

// DELETE: Remove a payment by ID
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const deleteQuery = `DELETE FROM payments WHERE payment_id = ?`;
  db.query(deleteQuery, [id], (err) => {
    if (err) {
      console.error("❌ Error deleting payment:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Payment deleted successfully" });
  });
});

module.exports = router;
