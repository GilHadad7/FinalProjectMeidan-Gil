// routes/buildings.routes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// עוזר קטן להריץ שאילתות כ-Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

/**
 * מעדכן את responsible_user_id לכל המשימות בבניין לפי הכללים:
 * - ניקיון -> cleaner
 * - אחר -> super
 * - אם אין תפקיד מתאים אבל יש עובדים משויכים -> כל עובד כלשהו (fallback)
 */
async function autoAssignRoutineTasksForBuilding(buildingId) {
  const CLEAN_PREDICATE = `
    (r.type = 'ניקיון'
      OR r.type LIKE '%clean%'
      OR r.task_name LIKE 'ניק%'
      OR r.task_name LIKE '%ניקיון%')
  `;

  const q1 = `
    UPDATE routinetasks r
    JOIN (
      SELECT b.building_id, MIN(u.user_id) AS cleaner_id
      FROM buildings b
      JOIN users u
        ON u.role='worker'
       AND u.position='cleaner'
       AND FIND_IN_SET(u.user_id, REPLACE(b.assigned_workers,' ','') ) > 0
      WHERE b.building_id = ?
      GROUP BY b.building_id
    ) c ON c.building_id = r.building_id
    SET r.responsible_user_id = c.cleaner_id
    WHERE r.building_id = ? AND ${CLEAN_PREDICATE}
  `;

  const q2 = `
    UPDATE routinetasks r
    JOIN (
      SELECT b.building_id, MIN(u.user_id) AS super_id
      FROM buildings b
      JOIN users u
        ON u.role='worker'
       AND u.position='super'
       AND FIND_IN_SET(u.user_id, REPLACE(b.assigned_workers,' ','') ) > 0
      WHERE b.building_id = ?
      GROUP BY b.building_id
    ) s ON s.building_id = r.building_id
    SET r.responsible_user_id = s.super_id
    WHERE r.building_id = ? AND NOT ${CLEAN_PREDICATE}
  `;

  const q3 = `
    UPDATE routinetasks r
    JOIN (
      SELECT b.building_id, MIN(u.user_id) AS any_worker_id
      FROM buildings b
      JOIN users u
        ON u.role='worker'
       AND FIND_IN_SET(u.user_id, REPLACE(b.assigned_workers,' ','') ) > 0
      WHERE b.building_id = ?
      GROUP BY b.building_id
    ) w ON w.building_id = r.building_id
    SET r.responsible_user_id = w.any_worker_id
    WHERE r.building_id = ? AND r.responsible_user_id IS NULL
  `;

  await run(q1, [buildingId, buildingId]);
  await run(q2, [buildingId, buildingId]);
  await run(q3, [buildingId, buildingId]);
}

/* ---------- GET: כל הבניינים ---------- */
router.get("/", (req, res) => {
  const sql = "SELECT * FROM buildings";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching buildings:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

/* ---------- GET: בניין יחיד לפי id (היה חסר) ---------- */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "bad id" });

  try {
    const rows = await run(
      `
      SELECT
        building_id,
        name,
        full_address AS address,     -- אם בפרונט מצפים לaddress
        maintenance_type,
        apartments,
        floors,
        committee,
        phone,
        assigned_workers
      FROM buildings
      WHERE building_id = ?
      LIMIT 1
      `,
      [id]
    );
    if (!rows?.length) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching building by id:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ---------- POST: יצירת בניין ---------- */
router.post("/", async (req, res) => {
  const {
    name,
    full_address,
    maintenance_type,
    apartments,
    floors,
    committee,
    phone,
    assigned_workers,
  } = req.body;

  const sql = `
    INSERT INTO buildings (
      name, full_address, maintenance_type,
      apartments, floors, committee, phone,
      assigned_workers
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const result = await run(sql, [
      name,
      full_address,
      maintenance_type,
      apartments,
      floors,
      committee,
      phone,
      assigned_workers || null,
    ]);

    await autoAssignRoutineTasksForBuilding(result.insertId);
    res.json({ success: true, insertedId: result.insertId });
  } catch (err) {
    console.error("Error inserting building:", err);
    res.status(500).json({ error: "Insert failed" });
  }
});

/* ---------- PUT: עדכון בניין ---------- */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    full_address,
    maintenance_type,
    apartments,
    floors,
    committee,
    phone,
    assigned_workers,
  } = req.body;

  const sql = `
    UPDATE buildings SET
      name = ?, full_address = ?, maintenance_type = ?,
      apartments = ?, floors = ?, committee = ?, phone = ?,
      assigned_workers = ?
    WHERE building_id = ?
  `;

  try {
    await run(sql, [
      name,
      full_address,
      maintenance_type,
      apartments,
      floors,
      committee,
      phone,
      assigned_workers || null,
      id,
    ]);

    await autoAssignRoutineTasksForBuilding(id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating building:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

/* ---------- DELETE: מחיקת בניין ---------- */
router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM buildings WHERE building_id = ?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Error deleting building:", err);
      return res.status(500).json({ error: "Delete failed" });
    }
    res.json({ success: true });
  });
});

module.exports = router;
