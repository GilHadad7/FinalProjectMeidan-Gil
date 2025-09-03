// routes/schedule.routes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* ===== תתי-שאילתות לעובדי בניין לפי תפקיד ===== */
const CLEANER_PER_BUILDING = `
  SELECT b.building_id,
         MIN(u.user_id)  AS cleaner_id,
         MIN(u.name)     AS cleaner_name
  FROM buildings b
  JOIN users u
    ON u.role='worker'
   AND u.position='cleaner'
   AND FIND_IN_SET(u.user_id, REPLACE(b.assigned_workers,' ','')) > 0
  GROUP BY b.building_id
`;

const SUPER_PER_BUILDING = `
  SELECT b.building_id,
         MIN(u.user_id)  AS super_id,
         MIN(u.name)     AS super_name
  FROM buildings b
  JOIN users u
    ON u.role='worker'
   AND u.position='super'
   AND FIND_IN_SET(u.user_id, REPLACE(b.assigned_workers,' ','')) > 0
  GROUP BY b.building_id
`;

const ANY_WORKER_PER_BUILDING = `
  SELECT b.building_id,
         MIN(u.user_id)  AS any_worker_id,
         MIN(u.name)     AS any_name
  FROM buildings b
  JOIN users u
    ON u.role='worker'
   AND FIND_IN_SET(u.user_id, REPLACE(b.assigned_workers,' ','')) > 0
  GROUP BY b.building_id
`;

/* תנאי זיהוי "ניקיון" */
const IS_CLEAN_EXPR = `(rt.type = 'ניקיון' OR rt.type LIKE '%clean%' OR rt.task_name LIKE '%ניק%')`;

/* ====== הסטות שבת->ראשון (MySQL DAYOFWEEK: 1=ראשון ... 7=שבת) ====== */
const bumpRoutineDate = `
  CASE
    WHEN DAYOFWEEK(rt.next_date) = 7 THEN DATE_ADD(rt.next_date, INTERVAL 1 DAY)
    ELSE rt.next_date
  END
`;
// משתמשים ב-COALESCE לשעה כדי למנוע NULL
const bumpRoutineDateTime = `
  CASE
    WHEN DAYOFWEEK(rt.next_date) = 7 THEN
      CAST(CONCAT(DATE_ADD(rt.next_date, INTERVAL 1 DAY), ' ', COALESCE(rt.task_time,'00:00:00')) AS DATETIME)
    ELSE
      CAST(CONCAT(rt.next_date, ' ', COALESCE(rt.task_time,'00:00:00')) AS DATETIME)
  END
`;

const bumpServiceDate = `
  CASE
    WHEN DAYOFWEEK(DATE(sc.created_at)) = 7 THEN DATE_ADD(DATE(sc.created_at), INTERVAL 1 DAY)
    ELSE DATE(sc.created_at)
  END
`;
const bumpServiceDateTime = `
  CASE
    WHEN DAYOFWEEK(DATE(sc.created_at)) = 7 THEN DATE_ADD(sc.created_at, INTERVAL 1 DAY)
    ELSE sc.created_at
  END
`;

/* ========= לוח זמנים למנהל ========= */
router.get("/schedule", (_req, res) => {
  const routineQuery = `
    SELECT
      rt.task_id                              AS id,
      b.full_address                          AS building_address,
      rt.task_name                            AS description,
      rt.type                                 AS type,
      ${bumpRoutineDate}                      AS date,                  -- שבת -> ראשון
      rt.task_time                            AS time,
      COALESCE(u.name,
               IF(${IS_CLEAN_EXPR}, cl.cleaner_name, sp.super_name),
               aw.any_name)                   AS worker,
      'routine'                               AS origin_type,
      NULL                                    AS status,
      rt.frequency                            AS frequency,
      ${bumpRoutineDateTime}                  AS scheduled_datetime     -- גם למיון/תצוגה
    FROM routinetasks rt
    JOIN buildings b ON b.building_id = rt.building_id
    LEFT JOIN users u ON u.user_id = rt.responsible_user_id
    LEFT JOIN (${CLEANER_PER_BUILDING}) cl ON cl.building_id = rt.building_id
    LEFT JOIN (${SUPER_PER_BUILDING})   sp ON sp.building_id = rt.building_id
    LEFT JOIN (${ANY_WORKER_PER_BUILDING}) aw ON aw.building_id = rt.building_id
  `;

  const serviceQuery = `
    SELECT
      sc.call_id                               AS id,
      b.full_address                           AS building_address,
      sc.description,
      sc.service_type                           AS type,
      ${bumpServiceDate}                       AS date,                 -- שבת -> ראשון
      TIME(${bumpServiceDateTime})             AS time,
      sc.created_by                             AS worker,
      'service'                                 AS origin_type,
      sc.status,
      NULL                                      AS frequency,
      ${bumpServiceDateTime}                   AS scheduled_datetime
    FROM servicecalls sc
    JOIN buildings b ON sc.building_id = b.building_id
  `;

  const sql = `
    ${routineQuery}
    UNION ALL
    ${serviceQuery}
    ORDER BY scheduled_datetime ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("schedule union failed:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

/* ========= לוח זמנים לדייר (מסונן לפי בניין) ========= */
router.get("/schedule/tenant", (req, res) => {
  const buildingId =
    req.session?.buildingId ||
    Number(req.query.building_id || req.headers["x-building-id"] || 0) ||
    null;

  if (!buildingId) return res.status(401).json({ error: "missing tenant building_id" });

  const routineQuery = `
    SELECT
      rt.task_id                              AS id,
      b.full_address                          AS building_address,
      rt.task_name                            AS description,
      rt.type                                 AS type,
      ${bumpRoutineDate}                      AS date,
      rt.task_time                            AS time,
      COALESCE(u.name,
               IF(${IS_CLEAN_EXPR}, cl.cleaner_name, sp.super_name),
               aw.any_name)                   AS worker,
      'routine'                               AS origin_type,
      NULL                                    AS status,
      rt.frequency                            AS frequency,
      ${bumpRoutineDateTime}                  AS scheduled_datetime
    FROM routinetasks rt
    JOIN buildings b ON b.building_id = rt.building_id
    LEFT JOIN users u ON u.user_id = rt.responsible_user_id
    LEFT JOIN (${CLEANER_PER_BUILDING}) cl ON cl.building_id = rt.building_id
    LEFT JOIN (${SUPER_PER_BUILDING})   sp ON sp.building_id = rt.building_id
    LEFT JOIN (${ANY_WORKER_PER_BUILDING}) aw ON aw.building_id = rt.building_id
    WHERE rt.building_id = ?
  `;

  const serviceQuery = `
    SELECT
      sc.call_id                               AS id,
      b.full_address                           AS building_address,
      sc.description,
      sc.service_type                           AS type,
      ${bumpServiceDate}                       AS date,
      TIME(${bumpServiceDateTime})             AS time,
      sc.created_by                             AS worker,
      'service'                                 AS origin_type,
      sc.status,
      NULL                                      AS frequency,
      ${bumpServiceDateTime}                   AS scheduled_datetime
    FROM servicecalls sc
    JOIN buildings b ON sc.building_id = b.building_id
    WHERE sc.building_id = ?
  `;

  const sql = `
    ${routineQuery}
    UNION ALL
    ${serviceQuery}
    ORDER BY scheduled_datetime ASC
  `;

  db.query(sql, [buildingId, buildingId], (err, rows) => {
    if (err) {
      console.error("tenant schedule union failed:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

module.exports = router;
