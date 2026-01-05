// 📁 C:\PATH\TO\YOUR\PROJECT\server\routes\tenant.payments.routes.js
// הקובץ מטפל ב-API של תשלומי דייר כך שכל דייר יראה/יערוך/ימחק רק את התשלומים ששייכים אליו (ורק "ממתין")

const express = require("express");
const router = express.Router();
const db = require("../db");

/* ---------------- helpers ---------------- */

// פונקציה שממירה ערך למספר בצורה בטוחה
function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

// פונקציה שמחזירה תאריך בפורמט YYYY-MM-DD בצורה בטוחה (מונע בעיות timezone)
function dateKey(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.includes("T") ? s.split("T")[0] : s.slice(0, 10);
}

// פונקציה שמחזירה הקשר של הדייר (building_id + tenant/user id) מה-session או מה-query/body
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
    num(req.query?.tenant_id) ??
    num(req.query?.userId) ??
    num(req.query?.user_id) ??
    null;

  return { buildingId, userId };
}

/* ---------------- GET: כל התשלומים של הדייר בלבד ---------------- */
// פונקציה שמחזירה רק תשלומים של הדייר המחובר (לפי tenant_id) + מחזירה payment_date כמחרוזת YYYY-MM-DD
router.get("/", (req, res) => {
  try {
    const { buildingId, userId } = getTenantContext(req);

    if (!userId) return res.json([]);

    const sql = `
      SELECT
        p.payment_id,
        p.building_id,
        b.name  AS building_name,
        p.tenant_id,
        u.name  AS tenant_name,
        DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
        p.category,
        p.description,
        p.amount,
        p.status,
        p.created_at
      FROM payments p
      JOIN buildings b ON b.building_id = p.building_id
      LEFT JOIN users u ON u.user_id = p.tenant_id
      WHERE p.tenant_id = ?
        ${buildingId ? "AND p.building_id = ?" : ""}
      ORDER BY p.payment_date DESC, p.payment_id DESC
    `;

    const params = buildingId ? [userId, buildingId] : [userId];

    db.query(sql, params, (err, rows) => {
      if (err) {
        console.error("tenant payments select failed:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows || []);
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- POST: יצירת תשלום ע"י דייר ---------------- */
// פונקציה שיוצרת תשלום חדש לדייר המחובר ומכריחה סטטוס "ממתין"
router.post("/", (req, res) => {
  try {
    const { buildingId, userId } = getTenantContext(req);

    if (!userId) {
      return res.status(401).json({ error: "missing tenant_id (session/body/query)" });
    }

    if (!buildingId) {
      return res.status(400).json({ error: "missing building_id (session/body/query)" });
    }

    const payment_date = dateKey(req.body?.payment_date);
    const category = String(req.body?.category || "").trim();
    const description = String(req.body?.description || "").trim() || null;
    const amount = num(req.body?.amount);

    if (!payment_date || !category || !amount || amount <= 0) {
      return res.status(400).json({ error: "missing/invalid fields (payment_date/category/amount)" });
    }

    const insert = `
      INSERT INTO payments
        (tenant_id, building_id, payment_date, category, description, amount, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ממתין')
    `;

    const values = [userId, buildingId, payment_date, category, description, amount];

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
          DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
          p.category, p.description, p.amount, p.status, p.created_at
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- PATCH: עריכת תשלום ע"י דייר ---------------- */
// פונקציה שמאפשרת לדייר לערוך רק תשלום ששייך לו ורק אם הסטטוס "ממתין" (בלי timezone shift)
router.patch("/:id", (req, res) => {
  try {
    const { userId } = getTenantContext(req);
    const paymentId = num(req.params.id);

    if (!userId) return res.status(401).json({ error: "missing tenant_id" });
    if (!paymentId) return res.status(400).json({ error: "invalid payment_id" });

    const payment_date = dateKey(req.body?.payment_date);
    const category = String(req.body?.category || "").trim();
    const description = String(req.body?.description || "").trim() || null;
    const amount = num(req.body?.amount);

    if (!payment_date || !category || !amount || amount <= 0) {
      return res.status(400).json({ error: "missing/invalid fields (payment_date/category/amount)" });
    }

    // ✅ עדכון רק אם זה של הדייר ורק אם "ממתין"
    const updateSql = `
      UPDATE payments
      SET payment_date = ?, category = ?, description = ?, amount = ?
      WHERE payment_id = ?
        AND tenant_id = ?
        AND status = 'ממתין'
      LIMIT 1
    `;

    const params = [payment_date, category, description, amount, paymentId, userId];

    db.query(updateSql, params, (err, result) => {
      if (err) {
        console.error("tenant payment update failed:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (!result || result.affectedRows === 0) {
        return res.status(403).json({ error: "not allowed (only your pending payment can be edited)" });
      }

      const selectOne = `
        SELECT
          p.payment_id,
          p.building_id,
          b.name AS building_name,
          p.tenant_id,
          u.name AS tenant_name,
          DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
          p.category, p.description, p.amount, p.status, p.created_at
        FROM payments p
        JOIN buildings b ON b.building_id = p.building_id
        LEFT JOIN users u ON u.user_id = p.tenant_id
        WHERE p.payment_id = ?
      `;

      db.query(selectOne, [paymentId], (e2, rows) => {
        if (e2) return res.status(500).json({ error: "Database error" });
        res.json(rows?.[0] || null);
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE: מחיקת תשלום ע"י דייר ---------------- */
// פונקציה שמאפשרת לדייר למחוק רק תשלום ששייך לו ורק אם הסטטוס "ממתין"
router.delete("/:id", (req, res) => {
  try {
    const { userId } = getTenantContext(req);
    const paymentId = num(req.params.id);

    if (!userId) return res.status(401).json({ error: "missing tenant_id" });
    if (!paymentId) return res.status(400).json({ error: "invalid payment_id" });

    const delSql = `
      DELETE FROM payments
      WHERE payment_id = ?
        AND tenant_id = ?
        AND status = 'ממתין'
      LIMIT 1
    `;

    db.query(delSql, [paymentId, userId], (err, result) => {
      if (err) {
        console.error("tenant payment delete failed:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (!result || result.affectedRows === 0) {
        return res.status(403).json({ error: "not allowed (only your pending payment can be deleted)" });
      }

      res.json({ ok: true });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
