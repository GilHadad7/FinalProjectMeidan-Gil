// routes/manager.routes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

// GET /api/manager/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/agenda", (req, res) => {
  const from = req.query.from;
  const to   = req.query.to;
  if (!isISO(from) || !isISO(to)) {
    return res.status(400).json({ error: "from & to must be YYYY-MM-DD" });
  }

  const sql = `
    SELECT
      sc.call_id                              AS id,
      'servicecall'                           AS type,
      COALESCE(NULLIF(sc.description,''),'קריאת שירות') AS title,
      b.name                                  AS building_name,
      sc.building_id                          AS building_id,
      sc.status                               AS status,
      sc.created_by                           AS assignee,

      -- שבת -> ראשון להצגה
      CASE
        WHEN DAYOFWEEK(DATE(sc.created_at)) = 7 THEN DATE_ADD(sc.created_at, INTERVAL 1 DAY)
        ELSE sc.created_at
      END                                      AS start,

      NULL                                    AS \`end\`
    FROM servicecalls sc
    JOIN buildings b ON b.building_id = sc.building_id
    WHERE DATE(sc.created_at) BETWEEN ? AND ?
    ORDER BY start ASC
  `;

  db.query(sql, [from, to], (err, rows) => {
    if (err) {
      console.error("agenda query failed:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows || []);
  });
});

module.exports = router;
