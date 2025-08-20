// routes/tenant.serviceCalls.routes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// קריאת המשתמש המחובר (התאם להרשאות שלך: session/req.user)
// יש גם פולבאק ל-query params בזמן פיתוח (?userId=...&userName=...)
function getLoggedUser(req) {
  if (req.user) return { user_id: req.user.id || req.user.user_id, name: req.user.name };
  if (req.session?.user) return { user_id: req.session.user.id || req.session.user.user_id, name: req.session.user.name };
  const user_id = Number(req.query.userId || 0) || null;
  const name = req.query.userName || null;
  return { user_id, name };
}

function ensureUserName(u, cb) {
  if (u?.name) return cb(null, u.name, u.user_id || null);
  if (!u?.user_id) return cb(new Error("no user"));
  db.query("SELECT name FROM users WHERE user_id = ?", [u.user_id], (err, rows) => {
    if (err) return cb(err);
    cb(null, rows[0]?.name || null, u.user_id);
  });
}

// GET /api/tenant/service-calls
// מחזיר את הקריאות שפתח הדייר (לפי created_by = שם המשתמש)
router.get("/", (req, res) => {
  const u = getLoggedUser(req);
  ensureUserName(u, (err, name) => {
    if (err || !name) return res.status(401).json({ error: "not authenticated" });

    const sql = `
      SELECT sc.call_id,
             sc.building_id,
             b.name AS building_name,
             sc.call_type,
             sc.description,
             sc.status,
             sc.created_at
      FROM servicecalls sc
      LEFT JOIN buildings b ON b.building_id = sc.building_id
      WHERE sc.created_by = ?
      ORDER BY sc.created_at DESC
    `;
    db.query(sql, [name], (e, rows) => {
      if (e) {
        console.error("tenant service-calls select failed:", e);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows || []);
    });
  });
});

// POST /api/tenant/service-calls  (פתיחת קריאה)
router.post("/", (req, res) => {
  const { building_id, call_type, description } = req.body || {};
  const u = getLoggedUser(req);
  ensureUserName(u, (err, name) => {
    if (err || !name) return res.status(401).json({ error: "not authenticated" });
    if (!building_id || !call_type || !description) {
      return res.status(400).json({ error: "missing fields" });
    }

    const sql = `
      INSERT INTO servicecalls
        (building_id, call_type, description, status, created_by, created_at)
      VALUES
        (?, ?, ?, 'Open', ?, NOW())
    `;
    db.query(sql, [building_id, call_type, description, name], (e, result) => {
      if (e) {
        console.error("tenant service-calls insert failed:", e);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ ok: true, id: result.insertId });
    });
  });
});

// GET /api/tenant/service-calls/buildings
// בניינים שהדייר משויך אליהם (לשדה בחירה בטופס פתיחת קריאה)
router.get("/buildings", (req, res) => {
  const u = getLoggedUser(req);
  const userId = u.user_id || Number(req.query.userId || 0);
  if (!userId) return res.status(401).json({ error: "not authenticated" });

  const sql = `
    SELECT b.building_id, b.name
    FROM tenants t
    JOIN buildings b ON b.building_id = t.building_id
    WHERE t.user_id = ?
    ORDER BY b.name
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("tenant buildings select failed:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows || []);
  });
});

module.exports = router;
