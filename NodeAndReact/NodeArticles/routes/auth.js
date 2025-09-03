// routes/auth.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* ---------------------------------------------------------
   Helper: נסיון למציאת בניין לעובד לפי עמודת buildings.assigned_workers
   תומך בשני פורמטים נפוצים:
   - CSV: לדוגמה "4,11,19"  (FIND_IN_SET)
   - JSON: לדוגמה "[4,11,19]" (JSON_CONTAINS)
   אם אף אחד לא קיים או לא נמצא — מחזיר null ולא שובר כלום.
--------------------------------------------------------- */
function findBuildingForWorker(userId, cb) {
  if (!userId) return cb(null, null);

  // 1) JSON array (למשל '[4,11,19]') — ננסה רק אם העמודה תקינה כ-JSON
  const qJson = `
    SELECT building_id
    FROM buildings
    WHERE JSON_VALID(assigned_workers)
      AND JSON_CONTAINS(assigned_workers, CAST(? AS JSON))
    LIMIT 1
  `;
  db.query(qJson, [String(userId)], (e1, r1) => {
    if (!e1 && r1 && r1.length) {
      return cb(null, r1[0].building_id);
    }

    // 2) CSV (למשל "4,11,19")
    const qCsv = `
      SELECT building_id
      FROM buildings
      WHERE FIND_IN_SET(?, assigned_workers) > 0
      LIMIT 1
    `;
    db.query(qCsv, [userId], (e2, r2) => {
      if (!e2 && r2 && r2.length) {
        return cb(null, r2[0].building_id);
      }
      // לא נמצא כלום / או MySQL בלי פונקציות JSON — נחזיר null בשקט
      return cb(null, null);
    });
  });
}

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

    // פונקציה שסוגרת את הזרימה—שומרת סשן ומחזירה תגובה
    const finish = (finalBuildingId) => {
      // ✅ שמירה לסשן (אם קיים express-session)
      try {
        if (req.session) {
          req.session.userId     = user.user_id;
          req.session.userName   = user.name;
          req.session.role       = user.role;
          req.session.buildingId = finalBuildingId ?? null; // <-- חשוב
          req.session.email      = user.email;
        }
      } catch (_) { /* לא נורא אם אין סשן */ }

      // מחזירים גם building_id כדי שהפרונט ישמור אותו
      res.json({
        id: user.user_id,
        name: user.name,
        role: user.role,
        email: user.email,
        building_id: finalBuildingId ?? null,
      });
    };

    // אם זה עובד ולמשתמש ב-Users אין building_id — ננסה להסיק מטבלת buildings
    if (user.role === "worker" && (user.building_id == null)) {
      return findBuildingForWorker(user.user_id, (_e, bId) => finish(bId ?? null));
    }

    // אחרת—מה שכבר יש ב-users
    finish(user.building_id ?? null);
  });
});

// GET /api/auth/me — מחזיר את המשתמש המחובר
router.get("/me", (req, res) => {
  // 1) קודם כל – סשן אם קיים
  if (req.session?.userId) {
    const sessUser = {
      id: req.session.userId,
      name: req.session.userName || "",
      role: req.session.role || "",
      email: req.session.email || "",
      building_id: req.session.buildingId ?? null, // <-- מחזיר גם את זה
    };

    // אם זה עובד ואין בניין בסשן – ננסה להשלים מטבלת buildings ולעדכן סשן
    if (sessUser.role === "worker" && (sessUser.building_id == null)) {
      return findBuildingForWorker(sessUser.id, (_e, bId) => {
        const finalB = bId ?? null;
        try { if (req.session) req.session.buildingId = finalB; } catch (_) {}
        return res.json({ ...sessUser, building_id: finalB });
      });
    }

    return res.json(sessUser);
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

      // אם זה עובד וללא בניין—נשלים מהבניינים (לא שובר כלום אם לא נמצא)
      if (u.role === "worker" && (u.building_id == null)) {
        return findBuildingForWorker(u.user_id, (_e, bId) => {
          return res.json({
            id: u.user_id,
            name: u.name,
            role: u.role,
            email: u.email,
            building_id: bId ?? null,
          });
        });
      }

      // כמו שהיה קודם (לשאר התפקידים או אם כבר יש building_id)
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
