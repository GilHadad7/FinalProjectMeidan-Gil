// 📁 C:\PATH\TO\YOUR\PROJECT\Node\routes\worker.schedule.routes.js
// הערה: ראוט לוח זמנים לעובד (routine + service) לפי building_id

const express = require("express");
const router = express.Router();
const db = require("../db");

// הערה: GET /api/worker/schedule?building_id=ID
router.get("/", (req, res) => {
  try {
    const buildingIdRaw = req.query.building_id || req.query.buildingId || null;
    const buildingId = buildingIdRaw ? Number(buildingIdRaw) : null;

    if (!buildingId) {
      return res.status(400).json({ message: "missing building_id" });
    }

    const sql = `
      SELECT *
      FROM (
        SELECT 
          rt.task_id AS id,
          'routine' AS origin_type,
          rt.task_name AS description,
          rt.type AS type,
          rt.next_date AS date,
          rt.task_time AS time,
          rt.frequency AS frequency,
          CAST(CONCAT(rt.next_date, ' ', COALESCE(rt.task_time,'00:00:00')) AS DATETIME) AS scheduled_datetime,
          rt.building_id,
          b.name AS building_name,
          b.full_address AS building_address,
          '' AS worker,
          '' AS status,
          NULL AS image_url
        FROM routinetasks rt
        JOIN buildings b ON b.building_id = rt.building_id
        WHERE rt.building_id = ?

        UNION ALL

        SELECT 
          sc.call_id AS id,
          'service' AS origin_type,
          sc.description AS description,
          sc.service_type AS type,
          DATE(sc.created_at) AS date,
          TIME(sc.created_at) AS time,
          NULL AS frequency,
          sc.created_at AS scheduled_datetime,
          sc.building_id,
          b.name AS building_name,
          b.full_address AS building_address,
          COALESCE(sc.closed_by,'') AS worker,
          sc.status AS status,
          sc.image_url AS image_url
        FROM servicecalls sc
        JOIN buildings b ON b.building_id = sc.building_id
        WHERE sc.building_id = ?
      ) x
      ORDER BY x.scheduled_datetime ASC
    `;

    db.query(sql, [buildingId, buildingId], (err, rows) => {
      if (err) {
        console.error("worker schedule db error:", err);
        return res.status(500).json({ message: "db error", error: err.message });
      }
      return res.json(Array.isArray(rows) ? rows : []);
    });
  } catch (e) {
    console.error("worker schedule crash:", e);
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
