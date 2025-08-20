// routes/auth.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "SQL error",
        detail: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];

    // ✅ שמירה לסשן (לא תפגע אם אין express-session)
    try {
      if (req.session) {
        req.session.userId = user.user_id;
        req.session.userName = user.name;
        req.session.role = user.role;
      }
    } catch (_) {
      // לא נורא אם אין סשן מוגדר
    }

    // שמרנו בדיוק את אותו פורמט תגובה כמו קודם
    res.json({
      id: user.user_id,
      name: user.name,
      role: user.role,
    });
  });
});

// GET /api/auth/me — מחזיר את המשתמש המחובר
router.get("/me", (req, res) => {
  // 1) קודם כל – סשן
  const sid = req.session?.userId;
  if (sid) {
    return res.json({
      id: req.session.userId,
      name: req.session.userName || "",
      role: req.session.role || "",
    });
  }

  // 2) fallback: כותרת x-user-id או פרמטר ?userId=
  const idFromHeaderOrQuery = req.headers["x-user-id"] || req.query.userId;
  if (!idFromHeaderOrQuery) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  db.query(
    "SELECT user_id, name, role FROM users WHERE user_id = ?",
    [idFromHeaderOrQuery],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const u = rows[0];
      res.json({ id: u.user_id, name: u.name, role: u.role });
    }
  );
});

module.exports = router;
