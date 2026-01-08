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
// הערה: שליפת בניינים לפי עובד מהעמודה assigned_workers

router.get("/by-worker/:workerId", (req, res) => {
  // הערה: מחזיר את כל הבניינים שה-worker מופיע אצלם ב-assigned_workers
  try {
    const workerId = Number(req.params.workerId || 0);
    if (!workerId) return res.status(400).json({ error: "bad workerId" });

    const sql = `
      SELECT
        building_id,
        name,
        full_address AS address
      FROM buildings
      WHERE FIND_IN_SET(?, REPLACE(assigned_workers,' ','')) > 0
      ORDER BY building_id DESC
    `;

    db.query(sql, [workerId], (err, rows) => {
      if (err) {
        console.error("Error in by-worker:", err);
        return res.status(500).json({ error: "Database error" });
      }
      return res.json(rows);
    });
  } catch (e) {
    console.error("Error in by-worker try:", e);
    return res.status(500).json({ error: "Server error" });
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


// הערה: ראוט שמחזיר את הבניינים שמשויכים לעובד לפי assigned_workers (CSV)

router.get("/by-worker/:workerId", (req, res) => {
  // הערה: מחזיר בניינים לעובד לפי FIND_IN_SET על העמודה assigned_workers
  try {
    const workerId = Number(req.params.workerId);
    if (!workerId) return res.status(400).json({ error: "workerId is required" });

    const sql = `
      SELECT building_id, name, full_address
      FROM buildings
      WHERE FIND_IN_SET(?, assigned_workers)
      ORDER BY building_id ASC
    `;

    db.query(sql, [workerId], (err, rows) => {
      if (err) {
        console.error("Error fetching buildings by worker:", err);
        return res.status(500).json({ error: "Database error" });
      }
      return res.json(rows || []);
    });
  } catch (e) {
    console.error("buildings by-worker crash:", e);
    return res.status(500).json({ error: "Server error" });
  }
});
// ראוט: שליפת בניינים לפי עובד (לפי עמודת assigned_workers בבניינים)

router.get("/buildings/by-worker/:workerId", (req, res) => {
  // הערה: מחזיר את כל הבניינים שבהם העובד מופיע בשדה assigned_workers (CSV כמו: "2,7")
  try {
    const workerId = Number(req.params.workerId);
    if (!workerId) return res.status(400).json({ message: "invalid workerId" });

    const sql = `
      SELECT building_id, name, address, assigned_workers
      FROM buildings
      WHERE
        FIND_IN_SET(?, REPLACE(IFNULL(assigned_workers,''), ' ', '')) > 0
        OR assigned_workers LIKE ?
        OR assigned_workers LIKE ?
        OR assigned_workers = ?
    `;

    const likeMid = `%${workerId}%`;
    const likeStart = `${workerId},%`;
    const likeEnd = `%,${workerId}`;

    db.query(sql, [workerId, likeStart, likeEnd, String(workerId)], (err, rows) => {
      try {
        if (err) return res.status(500).json({ message: "db error", error: err.message });
        return res.json(Array.isArray(rows) ? rows : []);
      } catch {
        return res.json([]);
      }
    });
  } catch (e) {
    return res.status(500).json({ message: "server error", error: String(e.message || e) });
  }
});
router.get("/buildings/by-worker/:workerId", (req, res) => {
  // הערה: מחזיר רשימת בניינים שהעובד משויך אליהם (assigned_workers)
  try {
    const workerId = Number(req.params.workerId);
    if (!workerId) return res.status(400).json({ message: "missing workerId" });

    const sql = `
      SELECT 
        building_id,
        name,
        COALESCE(full_address, address, '') AS address
      FROM buildings
      WHERE 
        (
          JSON_CONTAINS(assigned_workers, CAST(? AS JSON), '$')
          OR FIND_IN_SET(?, REPLACE(assigned_workers, ' ', ''))
          OR assigned_workers LIKE CONCAT('%', ?, '%')
        )
      ORDER BY building_id DESC
    `;

    db.query(sql, [workerId, String(workerId), String(workerId)], (err, rows) => {
      if (err) {
        console.error("by-worker error:", err);
        return res.status(500).json({ message: "db error" });
      }
      return res.json(Array.isArray(rows) ? rows : []);
    });
  } catch (e) {
    console.error("by-worker crash:", e);
    return res.status(500).json({ message: "server error" });
  }
});

router.get("/by-worker/:workerId", (req, res) => {
  // הערה: מחזיר בניינים שבהם workerId נמצא בעמודת assigned_workers
  try {
    const workerId = Number(req.params.workerId);
    if (!workerId) return res.status(400).json({ message: "invalid workerId" });

    const sql = `
      SELECT
        building_id,
        name,
        full_address AS address
      FROM buildings
      WHERE FIND_IN_SET(?, REPLACE(IFNULL(assigned_workers,''), ' ', '')) > 0
      ORDER BY name ASC
    `;

    db.query(sql, [workerId], (err, rows) => {
      if (err) {
        console.error("buildings/by-worker db error:", err);
        return res.status(500).json({ message: "db error", error: err.message });
      }
      return res.json(Array.isArray(rows) ? rows : []);
    });
  } catch (e) {
    return res.status(500).json({ message: "server error", error: String(e.message || e) });
  }
});
module.exports = router;
