const express = require("express");
const router = express.Router();
const db = require("../db"); // התחברות למסד הנתונים

router.get("/schedule", (req, res) => {
  const routineQuery = `
    SELECT
      rt.task_id AS id,
      b.full_address AS building_address,
      rt.task_name AS description,
      rt.type AS type,
      rt.next_date AS date,
      rt.task_time AS time,
      NULL AS worker,
      'routine' AS origin_type,
      NULL AS status,
      rt.frequency AS frequency,
      CAST(CONCAT(rt.next_date, ' ', rt.task_time) AS DATETIME) AS scheduled_datetime
    FROM routinetasks rt
    JOIN buildings b ON rt.building_id = b.building_id
  `;

  const serviceQuery = `
    SELECT
      sc.call_id AS id,
      b.full_address AS building_address,
      sc.description,
      sc.service_type AS type,
      DATE(sc.created_at) AS date,
      TIME(sc.created_at) AS time,
      sc.created_by AS worker,
      'service' AS origin_type,
      sc.status,
      NULL AS frequency,
      sc.created_at AS scheduled_datetime
    FROM servicecalls sc
    JOIN buildings b ON sc.building_id = b.building_id
  `;

  const sql = `
    ${routineQuery}
    UNION ALL
    ${serviceQuery}
    ORDER BY scheduled_datetime ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ שגיאה באיחוד המשימות:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

module.exports = router;
