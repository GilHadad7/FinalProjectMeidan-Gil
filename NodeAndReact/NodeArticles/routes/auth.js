// routes/auth.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // בוחרים רק את העמודות שצריך, כולל building_id
  const sql = `
    SELECT user_id, name, role, email, building_id
    FROM users
    WHERE email = ? AND password = ?
    LIMIT 1
  `;

  db.query(sql, [email, password], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "SQL error", detail: err.message });
    }
    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];

    // ✅ שמירה לסשן (אם קיים express-session)
    try {
      if (req.session) {
        req.session.userId = user.user_id;
        req.session.userName = user.name;
        req.session.role = user.role;
        req.session.buildingId = user.building_id; // <-- חשוב
        req.session.email = user.email;
      }
    } catch (_) { /* לא נורא אם אין סשן */ }

    // מחזירים גם building_id כדי שהפרונט ישמור אותו ל-sessionStorage
    res.json({
      id: user.user_id,
      name: user.name,
      role: user.role,
      email: user.email,
      building_id: user.building_id,
    });
  });
});

// GET /api/auth/me — מחזיר את המשתמש המחובר
router.get("/me", (req, res) => {
  // 1) קודם כל – סשן אם קיים
  if (req.session?.userId) {
    return res.json({
      id: req.session.userId,
      name: req.session.userName || "",
      role: req.session.role || "",
      email: req.session.email || "",
      building_id: req.session.buildingId ?? null, // <-- מחזיר גם את זה
    });
  }

  // 2) fallback: ?userId= או כותרת x-user-id
  const idFromHeaderOrQuery = req.headers["x-user-id"] || req.query.userId;
  if (!idFromHeaderOrQuery) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  db.query(
    "SELECT user_id, name, role, email, building_id FROM users WHERE user_id = ? LIMIT 1",
    [idFromHeaderOrQuery],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const u = rows[0];
      res.json({
        id: u.user_id,
        name: u.name,
        role: u.role,
        email: u.email,
        building_id: u.building_id, // <-- גם פה
      });
    }
  );
});

module.exports = router;
