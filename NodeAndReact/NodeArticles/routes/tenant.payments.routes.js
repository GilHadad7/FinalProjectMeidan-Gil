// routes/tenant.payments.routes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// שולף מזהה בניין של הדייר (מסשן/req.user/או ?building_id= לפיתוח)
function getTenantContext(req) {
  const buildingId =
    req.session?.buildingId ??
    req.user?.building_id ??
    (req.query.building_id ? Number(req.query.building_id) : null);
  const userId =
    req.session?.userId ??
    req.user?.user_id ??
    (req.query.userId ? Number(req.query.userId) : null);
  return { buildingId, userId };
}

// GET /api/tenant/payments  → כל התשלומים של הבניין של הדייר
router.get("/", (req, res) => {
  const { buildingId } = getTenantContext(req);
  if (!buildingId) return res.json([]); // לא מפילים את ה־UI

  const sql = `
    SELECT
      p.payment_id,
      p.building_id,
      b.name  AS building_name,
      p.tenant_id,
      u.name  AS tenant_name,
      p.payment_date,
      p.category,
      p.description,
      p.amount,
      p.status,
      p.created_at
    FROM payments p
    JOIN buildings b ON b.building_id = p.building_id
    LEFT JOIN users    u ON u.user_id    = p.tenant_id
    WHERE p.building_id = ?
    ORDER BY p.payment_date DESC, p.payment_id DESC
  `;
  db.query(sql, [buildingId], (err, rows) => {
    if (err) {
      console.error("tenant payments select failed:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows || []);
  });
});

// (רשות) POST /api/tenant/payments  → יצירת תשלום לבניין של הדייר
// ה־building_id נלקח מהסשן; לא סומכים על נתון מהקליינט.
router.post("/", (req, res) => {
  const { buildingId, userId } = getTenantContext(req);
  if (!buildingId) return res.status(401).json({ error: "not authenticated" });

  const { payment_date, category, description, amount, status } = req.body || {};
  if (!payment_date || !amount || !category) {
    return res.status(400).json({ error: "missing fields" });
  }

  const insert = `
    INSERT INTO payments
      (tenant_id, building_id, payment_date, category, description, amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    insert,
    [userId || null, buildingId, payment_date, category, description || "", amount, status || "שולם"],
    (err, result) => {
      if (err) {
        console.error("tenant payments insert failed:", err);
        return res.status(500).json({ error: "Database error" });
      }
      const selectOne = `
        SELECT
          p.payment_id,
          p.building_id,
          b.name AS building_name,
          p.tenant_id,
          u.name AS tenant_name,
          p.payment_date, p.category, p.description, p.amount, p.status, p.created_at
        FROM payments p
        JOIN buildings b ON b.building_id = p.building_id
        LEFT JOIN users u ON u.user_id = p.tenant_id
        WHERE p.payment_id = ?
      `;
      db.query(selectOne, [result.insertId], (e2, rows) => {
        if (e2) return res.status(500).json({ error: "Database error" });
        res.status(201).json(rows[0] || null);
      });
    }
  );
});

module.exports = router;
