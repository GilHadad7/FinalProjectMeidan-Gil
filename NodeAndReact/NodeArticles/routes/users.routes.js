const express = require("express");
const router = express.Router();
const db = require("../db");

// סט משרות מותרות לעובד (לשיקוף ה-UI)
const ALLOWED_POSITIONS = new Set([
  "super","cleaner","electrician","plumber","maintenance",
  "security","gardener","hvac","painter","other"
]);

/* ===================== עזר לשיוך אוטומטי של משימות ===================== */
const CLEAN_COND = `(r.type = 'ניקיון' OR r.type LIKE '%clean%' OR r.task_name LIKE '%ניק%')`;

function q(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );
}

async function recalcForBuilding(buildingId) {
  // ניקיון -> מנקה
  await q(
    `
    UPDATE routinetasks r
    JOIN (
      SELECT b.building_id, MIN(u.user_id) AS cleaner_id
      FROM buildings b
      JOIN users u
        ON u.role='worker'
       AND u.position='cleaner'
       AND FIND_IN_SET(u.user_id, REPLACE(b.assigned_workers,' ','')) > 0
      WHERE b.building_id = ?
      GROUP BY b.building_id
    ) c ON c.building_id = r.building_id
    SET r.responsible_user_id = c.cleaner_id
    WHERE r.building_id = ? AND ${CLEAN_COND};
  `,
    [buildingId, buildingId]
  );

  // כל מה שלא ניקיון -> אב בית
  await q(
    `
    UPDATE routinetasks r
    JOIN (
      SELECT b.building_id, MIN(u.user_id) AS super_id
      FROM buildings b
      JOIN users u
        ON u.role='worker'
       AND u.position='super'
       AND FIND_IN_SET(u.user_id, REPLACE(b.assigned_workers,' ','')) > 0
      WHERE b.building_id = ?
      GROUP BY b.building_id
    ) s ON s.building_id = r.building_id
    SET r.responsible_user_id = s.super_id
    WHERE r.building_id = ? AND r.responsible_user_id IS NULL AND NOT ${CLEAN_COND};
  `,
    [buildingId, buildingId]
  );

  // פולבאק – אם עדיין ריק: כל עובד כלשהו מהבניין
  await q(
    `
    UPDATE routinetasks r
    JOIN (
      SELECT b.building_id, MIN(u.user_id) AS any_worker_id
      FROM buildings b
      JOIN users u
        ON u.role='worker'
       AND FIND_IN_SET(u.user_id, REPLACE(b.assigned_workers,' ','')) > 0
      WHERE b.building_id = ?
      GROUP BY b.building_id
    ) w ON w.building_id = r.building_id
    SET r.responsible_user_id = w.any_worker_id
    WHERE r.building_id = ? AND r.responsible_user_id IS NULL;
  `,
    [buildingId, buildingId]
  );
}

async function recalcForUser(userId) {
  // כל הבניינים שבהם המשתמש מופיע ב-assigned_workers
  const rows = await q(
    `SELECT building_id
       FROM buildings
      WHERE FIND_IN_SET(?, REPLACE(assigned_workers,' ','')) > 0`,
    [userId]
  );
  for (const r of rows) {
    await recalcForBuilding(r.building_id);
  }
}
/* ====================================================================== */

// GET /api/users  (אפשר לסנן לפי role)
router.get("/", (req, res) => {
  const { role } = req.query;

  let sql = `
    SELECT
      u.*,

      -- לדיירים (שיוך ישיר)
      b1.name         AS building_name,
      b1.full_address AS building_full_address,

      -- לעובדים (מכלילים את כל הבניינים מה-assigned_workers)
      GROUP_CONCAT(DISTINCT b2.name ORDER BY b2.name SEPARATOR ', ')                AS worker_buildings_names,
      GROUP_CONCAT(DISTINCT b2.full_address ORDER BY b2.full_address SEPARATOR ', ') AS worker_buildings_full_addresses,
      GROUP_CONCAT(DISTINCT b2.building_id ORDER BY b2.building_id SEPARATOR ',')    AS worker_buildings_ids
    FROM users u
    LEFT JOIN buildings b1
      ON b1.building_id = u.building_id
    LEFT JOIN buildings b2
      ON FIND_IN_SET(u.user_id, b2.assigned_workers) > 0
  `;

  const params = [];
  if (role) {
    sql += ` WHERE u.role = ?`;
    params.push(role);
  }

  sql += ` GROUP BY u.user_id`;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

// POST /api/users — תומך ב-position לעובד וב-building_id לדייר
router.post("/", (req, res) => {
  let { name, role, position, phone, email, password, id_number, building_id } = req.body || {};

  if (!name || !role || !email || !password) {
    return res.status(400).json({ error: "name, role, email, password are required" });
  }

  role = String(role).trim();

  // ולידציית building_id לדיירים בלבד
  if (role === "tenant") {
    if (!building_id && building_id !== 0) {
      return res.status(400).json({ error: "tenant must have building_id" });
    }
    building_id = Number(building_id);
  } else {
    building_id = null;
  }

  // position נשמר רק לעובדים; לאחרים NULL
  if (role === "worker") {
    position = (position || "").toLowerCase().trim();
    if (position && !ALLOWED_POSITIONS.has(position)) {
      return res.status(400).json({ error: "invalid worker position" });
    }
  } else {
    position = null;
  }

  const sql = `
    INSERT INTO users (name, role, position, phone, email, password, id_number, building_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [name, role, position, phone ?? null, email, password, id_number ?? null, building_id], async (err, result) => {
    if (err) {
      console.error("Insert failed:", err);
      return res.status(500).json({ error: "Insert failed" });
    }

    // אם זה עובד – ננסה לרנדר משימות לבניינים שהוא כבר משויך אליהם (אם קיים)
    if (role === "worker") {
      try { await recalcForUser(result.insertId); } catch (e) { console.error("recalcForUser (post) failed:", e); }
    }

    res.status(201).json({
      id: result.insertId,
      name, role, position, phone, email, id_number, building_id
    });
  });
});

// PUT /api/users/:id — תומך בעדכון position + building_id בהתאם ל-role
router.put("/:id", (req, res) => {
  let { name, role, position, phone, email, id_number, building_id, password } = req.body || {};

  if (!name || !role || !email) {
    return res.status(400).json({ error: "name, role, email are required" });
  }

  role = String(role).trim();

  if (role === "tenant") {
    if (!building_id && building_id !== 0) {
      return res.status(400).json({ error: "tenant must have building_id" });
    }
    building_id = Number(building_id);
  } else {
    building_id = null;
  }

  if (role === "worker") {
    position = (position || "").toLowerCase().trim();
    if (position && !ALLOWED_POSITIONS.has(position)) {
      return res.status(400).json({ error: "invalid worker position" });
    }
  } else {
    position = null;
  }

  const sql = `
    UPDATE users
       SET name = ?, role = ?, position = ?, phone = ?, email = ?, id_number = ?, building_id = ?, password = COALESCE(?, password)
     WHERE user_id = ?
  `;
  db.query(sql, [name, role, position, phone ?? null, email, id_number ?? null, building_id, password ?? null, req.params.id], async (err) => {
    if (err) {
      console.error("Update failed:", err);
      return res.status(500).json({ error: "Update failed" });
    }

    // אחרי שינוי תפקיד/משרה – נרנדר את אחראי המשימות בכל הבניינים שהעובד משויך אליהם
    try { await recalcForUser(req.params.id); } catch (e) { console.error("recalcForUser (put) failed:", e); }

    res.sendStatus(200);
  });
});

// DELETE /api/users/:id
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM users WHERE user_id = ?", [req.params.id], (err) => {
    if (err) {
      console.error("Delete failed:", err);
      return res.status(500).json({ error: "Delete failed" });
    }
    res.sendStatus(200);
  });
});

module.exports = router;
