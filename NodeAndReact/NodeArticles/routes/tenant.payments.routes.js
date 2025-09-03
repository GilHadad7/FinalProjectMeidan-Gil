// routes/tenant.payments.routes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* ---------------- helpers ---------------- */
function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

// מחזיר הקשר של הדייר: ננסה קודם סשן/req.user,
// ואם אין (בסביבת dev) נקבל גם מה-body או מה-query.
function getTenantContext(req) {
  const buildingId =
    req.session?.buildingId ??
    req.user?.building_id ??
    num(req.body?.building_id) ??
    num(req.query?.building_id) ??
    null;

  const userId =
    req.session?.userId ??
    req.user?.user_id ??
    num(req.body?.tenant_id) ??
    num(req.query?.userId) ??
    null;

  return { buildingId, userId };
}

/* ---------------- GET: כל התשלומים של הבניין ---------------- */
router.get("/", (req, res) => {
  const { buildingId } = getTenantContext(req);
  if (!buildingId) return res.json([]); // לא מפילים UI, פשוט ריק

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

/* ---------------- POST: יצירת תשלום ע"י דייר ----------------
   ❗ חשוב:
   - לא תלוי בסשן בלבד; לוקח building_id/tenant_id גם מה-body/Query.
   - status נכפה תמיד ל"ממתין" (אי אפשר לעקוף מהקליינט).
-------------------------------------------------------------- */
router.post("/", (req, res) => {
  const { buildingId, userId } = getTenantContext(req);

  if (!buildingId) {
    return res.status(400).json({ error: "missing building_id (session/body/query)" });
  }

  const payment_date = String(req.body?.payment_date || "").slice(0, 10); // YYYY-MM-DD
  const category     = String(req.body?.category || "").trim();
  const description  = String(req.body?.description || "").trim() || null;
  const amount       = num(req.body?.amount);

  if (!payment_date || !category || !amount || amount <= 0) {
    return res.status(400).json({ error: "missing/invalid fields (payment_date/category/amount)" });
  }

  const insert = `
    INSERT INTO payments
      (tenant_id, building_id, payment_date, category, description, amount, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ממתין')
  `;

  const values = [
    userId,                 // יכול להיות null אם אין זיהוי דייר – זה בסדר אצלך במבנה
    buildingId,
    payment_date,
    category,
    description,
    amount,
  ];

  db.query(insert, values, (err, result) => {
    if (err) {
      console.error("❌ tenant add payment failed:", err);
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
      res.status(201).json(rows?.[0] || null);
    });
  });
});

module.exports = router;
