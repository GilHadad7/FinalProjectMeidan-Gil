// 📁 routes/reports.routes.js – קובץ ראוטים מאוחד לדוחות (ללא "משכורות")
const express = require("express");
const router = express.Router();
const db = require("../db");

/* =========================================================
   ✅ דוח עובדים לפי תפקיד: מנקה/אב בית
   =========================================================
   GET /api/reports/workers-by-role?role=cleaner|super&month=YYYY-MM&building_id=OPTIONAL
*/
router.get("/workers-by-role", (req, res) => {
  try {
    const role = String(req.query.role || "").toLowerCase(); // 'cleaner' | 'super'
    if (!["cleaner", "super"].includes(role)) {
      return res.status(400).json({ error: "role must be 'cleaner' or 'super'" });
    }

    const month = String(req.query.month || "").trim();
    const now = new Date();
    const [y, m] = /^\d{4}-\d{2}$/.test(month)
      ? month.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];

    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const buildingId = req.query.building_id ? Number(req.query.building_id) : null;

    // שיוך עובד↔בניין: או users.building_id או buildings.assigned_workers (CSV של user_id-ים)
    const userBuildingLink = `
      (b.building_id = u.building_id OR FIND_IN_SET(u.user_id, b.assigned_workers) > 0)
    `;

    // ---- דוח מנקה ----
    if (role === "cleaner") {
      const bFilter = buildingId ? "AND sc.building_id = ?" : "";
      const sql = `
        SELECT 
          u.user_id,
          u.name                         AS worker_name,
          b.building_id,
          b.name                         AS building_name,
          rt.task_id,
          rt.task_name,
          rt.description                 AS task_description,  /* ✅ תיאור משימה למנקה */
          rt.frequency,
          rt.next_date,
          rt.task_time,

          /* ביצועי משימות בחודש */
          COUNT(rte.execution_id)        AS done_in_month,
          MAX(rte.executed_at)           AS last_done_at,

          /* קריאות שירות שנפתחו ע"י המנקה בחודש */
          (
            SELECT COUNT(*)
            FROM servicecalls sc
            WHERE sc.created_by = u.name
              AND DATE(sc.created_at) BETWEEN ? AND ?
              ${bFilter}
          ) AS calls_opened,

          /* מתוכן שנסגרו */
          (
            SELECT COUNT(*)
            FROM servicecalls sc
            WHERE sc.created_by = u.name
              AND LOWER(sc.status) IN ('closed','סגור')
              AND DATE(sc.created_at) BETWEEN ? AND ?
              ${bFilter}
          ) AS calls_opened_closed

        FROM users u
        JOIN routinetasks rt
             ON rt.responsible_user_id = u.user_id
        LEFT JOIN buildings b
             ON b.building_id = rt.building_id
        LEFT JOIN routinetaskexecutions rte
             ON rte.task_id     = rt.task_id
            AND rte.employee_id = u.user_id
            AND DATE(rte.executed_at) BETWEEN ? AND ?
        WHERE u.position IN ('cleaner','מנקה')
          ${buildingId ? "AND rt.building_id = ?" : ""}
        GROUP BY u.user_id, b.building_id, rt.task_id
        ORDER BY worker_name, building_name, rt.task_name
      `;

      const params = [];
      params.push(start, end); // calls_opened
      if (buildingId) params.push(buildingId);
      params.push(start, end); // calls_opened_closed
      if (buildingId) params.push(buildingId);
      params.push(start, end); // executions
      if (buildingId) params.push(buildingId);

      return db.query(sql, params, (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "DB error" });
        }
        res.json({ role, range: { start, end }, rows });
      });
    }

    // ---- דוח אב בית ----
    if (role === "super") {
      const sql = `
        SELECT
          u.user_id,
          u.name AS worker_name,
          b.building_id,
          b.name AS building_name,

          /* ✅ משימות קבועות שלא ניקיון ששויכו לאב הבית בבניין */
          (
            SELECT COUNT(*)
            FROM routinetasks rt
            WHERE rt.building_id = b.building_id
              AND rt.responsible_user_id = u.user_id
              AND LOWER(TRIM(COALESCE(rt.type,''))) NOT LIKE '%ניקיון%'
          ) AS tasks_assigned,

          /* ✅ כמה מהמשימות האלו בוצעו בחודש */
          (
            SELECT COUNT(*)
            FROM routinetaskexecutions rte
            JOIN routinetasks rt2 ON rt2.task_id = rte.task_id
            WHERE rt2.building_id = b.building_id
              AND rt2.responsible_user_id = u.user_id
              AND LOWER(TRIM(COALESCE(rt2.type,''))) NOT LIKE '%ניקיון%'
              AND DATE(rte.executed_at) BETWEEN ? AND ?
          ) AS tasks_done,

          /* ✅ ביצוע אחרון למשימות לא ניקיון בחודש */
          (
            SELECT MAX(rte.executed_at)
            FROM routinetaskexecutions rte
            JOIN routinetasks rt2 ON rt2.task_id = rte.task_id
            WHERE rt2.building_id = b.building_id
              AND rt2.responsible_user_id = u.user_id
              AND LOWER(TRIM(COALESCE(rt2.type,''))) NOT LIKE '%ניקיון%'
              AND DATE(rte.executed_at) BETWEEN ? AND ?
          ) AS last_task_done_at,

          /* קריאות שירות */
          sc.call_id,
          sc.service_type,
          sc.status,
          sc.description,
          sc.created_at,
          sc.closed_by

        FROM users u
        JOIN buildings b ON ${userBuildingLink}
        LEFT JOIN servicecalls sc
               ON sc.building_id = b.building_id
              AND DATE(sc.created_at) BETWEEN ? AND ?
        WHERE u.position IN ('super','אב בית','janitor')
          ${buildingId ? "AND b.building_id = ?" : ""}
        ORDER BY worker_name, building_name, sc.created_at
      `;

      const params = [];
      params.push(start, end); // tasks_done
      params.push(start, end); // last_task_done_at
      params.push(start, end); // calls range
      if (buildingId) params.push(buildingId);

      return db.query(sql, params, (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "DB error" });
        }
        res.json({ role, range: { start, end }, rows });
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================================
   📄 רשימות קריאות לפי עובד (פתוחות/מטופלות)
   ========================================= */
router.get("/worker/calls", (req, res) => {
  const month = (req.query.month || new Date().toISOString().slice(0, 7)).slice(0, 7);
  const name = String(req.query.name || "").trim();
  const by = String(req.query.by || "open").toLowerCase(); // 'open' | 'handled'

  if (!name) return res.status(400).json({ error: "name is required" });

  const qOpen = `
    SELECT sc.call_id, sc.created_at, sc.status, sc.service_type,
           b.full_address AS building_address
    FROM servicecalls sc
    LEFT JOIN buildings b ON b.building_id = sc.building_id
    WHERE DATE_FORMAT(sc.created_at, '%Y-%m') = ?
      AND sc.created_by = ?
    ORDER BY sc.created_at DESC, sc.call_id DESC
  `;

  const qHandled = `
    SELECT sc.call_id, sc.created_at, sc.status, sc.service_type,
           b.full_address AS building_address
    FROM servicecalls sc
    LEFT JOIN buildings b ON b.building_id = sc.building_id
    WHERE DATE_FORMAT(sc.created_at, '%Y-%m') = ?
      AND (sc.closed_by = ? OR sc.updated_by_name = ?)
    ORDER BY sc.created_at DESC, sc.call_id DESC
  `;

  const sql = by === "handled" ? qHandled : qOpen;
  const params = by === "handled" ? [month, name, name] : [month, name];

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

/* =========================================
   ✅ פירוט משימות קבועות לפי עובד וחודש (לפרונט)
   =========================================
   GET /api/reports/worker/tasks?month=YYYY-MM&name=WORKER_NAME
   - מחזיר:
     * למנקה: כל המשימות ששויכו אליו
     * לאב בית: רק משימות "לא ניקיון"
*/
router.get("/worker/tasks", (req, res) => {
  try {
    const month = (req.query.month || new Date().toISOString().slice(0, 7)).slice(0, 7);
    const name = String(req.query.name || "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    const sql = `
      SELECT
        rt.task_id,
        rt.task_name,
        rt.description AS description,
        rt.frequency,
        rt.next_date,
        rt.task_time,
        b.name AS building_name,
        u.name AS worker_name,

        /* כמה בוצע בחודש */
        (
          SELECT COUNT(*)
          FROM routinetaskexecutions rte
          WHERE rte.task_id = rt.task_id
            AND DATE_FORMAT(rte.executed_at, '%Y-%m') = ?
        ) AS done_in_month,

        /* ביצוע אחרון */
        (
          SELECT MAX(rte.executed_at)
          FROM routinetaskexecutions rte
          WHERE rte.task_id = rt.task_id
        ) AS last_done_at

      FROM routinetasks rt
      JOIN users u ON u.user_id = rt.responsible_user_id
      LEFT JOIN buildings b ON b.building_id = rt.building_id
      WHERE u.name = ?
        AND (
          /* מנקה */
          u.position IN ('cleaner','מנקה')
          OR
          /* אב בית: לא ניקיון */
          (u.position IN ('super','אב בית','janitor') AND LOWER(TRIM(COALESCE(rt.type,''))) NOT LIKE '%ניקיון%')
        )
      ORDER BY rt.next_date ASC, rt.task_time ASC, rt.task_id ASC
    `;

    db.query(sql, [month, name], (err, rows) => {
      if (err) {
        console.error("❌ worker/tasks error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json(rows || []);
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================================
   🏢 דוח לפי בניינים (שמירה + שליפה)
   ========================================= */

// ✅ GET /api/reports/buildings?month=YYYY-MM
router.get("/buildings", (req, res) => {
  const month = (req.query.month || new Date().toISOString().slice(0, 7)).slice(0, 7);

  const sql = `
    SELECT
      b.building_id,
      b.name AS building_name,
      b.full_address AS address,
      f.total_paid,
      f.balance_due,
      COALESCE(f.maintenance, 0) AS maintenance,
      f.month
    FROM building_finance f
    JOIN buildings b
      ON f.building_id = b.building_id
    WHERE f.month = ?
    ORDER BY b.name ASC
  `;

  db.query(sql, [month], (err, results) => {
    if (err) {
      console.error("❌ שגיאה בשליפת דוחות בניינים:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// ✅ POST /api/reports/buildings/recalc { month: "YYYY-MM" }
router.post("/buildings/recalc", (req, res) => {
  const month = (req.body.month || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "month (YYYY-MM) is required" });
  }

  const insertSql = `
  INSERT INTO building_finance (building_id, month, total_paid, balance_due, maintenance)
  SELECT
    b.building_id,
    ? AS month,
    COALESCE(tp.total_paid, 0)  AS total_paid,
    COALESCE(bd.balance_due, 0) AS balance_due,
    COALESCE(ms.maint_from_calls, 0) AS maintenance
  FROM buildings b
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS total_paid
    FROM payments
    WHERE status = 'שולם'
      AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) tp ON tp.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS balance_due
    FROM payments
    WHERE status IN ('חוב','ממתין')
      AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) bd ON bd.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(COALESCE(cost,0)) AS maint_from_calls
    FROM servicecalls
    WHERE status IN ('Closed','סגור')
      AND DATE_FORMAT(created_at, '%Y-%m') = ?
    GROUP BY building_id
  ) ms ON ms.building_id = b.building_id
  WHERE ( COALESCE(tp.total_paid,0)
        + COALESCE(bd.balance_due,0)
        + COALESCE(ms.maint_from_calls,0) ) > 0
  ON DUPLICATE KEY UPDATE
    total_paid = VALUES(total_paid),
    balance_due = VALUES(balance_due),
    maintenance = VALUES(maintenance);
  `;

  db.query(insertSql, [month, month, month, month], (err, result) => {
    if (err) {
      console.error("❌ insert month rows failed:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ ok: true, inserted: result.affectedRows, month });
  });
});

/* =========================================
   🔎 פירוט לפי בניין וחודש  (נדרש למודאל “פירוט”)
   =========================================
   GET /api/reports/building/:buildingId/details?month=YYYY-MM
*/
router.get("/building/:buildingId/details", (req, res) => {
  const buildingId = Number(req.params.buildingId);
  const month = (req.query.month || "").trim(); // "YYYY-MM"

  if (!buildingId || !/^\d{4}-\d{2}$/.test(month)) {
    return res
      .status(400)
      .json({ error: "missing/invalid buildingId or month (YYYY-MM)" });
  }

  const params = [buildingId, month];

  const qPaid = `
    SELECT p.payment_id, p.payment_date, p.amount, p.category, p.description,
           u.user_id AS tenant_id, u.name AS tenant_name
    FROM payments p
    LEFT JOIN users u ON u.user_id = p.tenant_id
    WHERE p.building_id = ?
      AND DATE_FORMAT(p.payment_date, '%Y-%m') = ?
      AND p.status = 'שולם'
    ORDER BY p.payment_date DESC, p.payment_id DESC
  `;

  const qDebt = `
    SELECT p.payment_id, p.payment_date, p.amount, p.category, p.description, p.status,
           u.user_id AS tenant_id, u.name AS tenant_name
    FROM payments p
    LEFT JOIN users u ON u.user_id = p.tenant_id
    WHERE p.building_id = ?
      AND DATE_FORMAT(p.payment_date, '%Y-%m') = ?
      AND p.status IN ('חוב','ממתין')
    ORDER BY p.payment_date DESC, p.payment_id DESC
  `;

  const qMaintFromCalls = `
    SELECT
      s.call_id,
      s.created_at AS date,
      COALESCE(s.cost, 0) AS amount,
      s.service_type AS type,
      s.description
    FROM servicecalls s
    WHERE s.building_id = ?
      AND DATE_FORMAT(s.created_at, '%Y-%m') = ?
      AND s.status IN ('Closed','סגור')
    ORDER BY s.created_at DESC, s.call_id DESC
  `;

  const qBuilding = `
    SELECT building_id, name, full_address AS address
    FROM buildings
    WHERE building_id = ?
    LIMIT 1
  `;

  db.query(qBuilding, [buildingId], (eB, bRows) => {
    if (eB) return res.status(500).json({ error: eB.message });
    const building = bRows?.[0] || { building_id: buildingId, name: "", address: "" };

    db.query(qPaid, params, (e1, paidRows) => {
      if (e1) return res.status(500).json({ error: e1.message });

      db.query(qDebt, params, (e2, debtRows) => {
        if (e2) return res.status(500).json({ error: e2.message });

        db.query(qMaintFromCalls, params, (e3, maintCallRows) => {
          if (e3) return res.status(500).json({ error: e3.message });

          const sum = (xs) => (xs || []).reduce((a, x) => a + Number(x.amount || 0), 0);

          const totals = {
            paid: sum(paidRows),
            debts: sum(debtRows),
            maintenance: sum(maintCallRows),
          };

          res.json({
            building,
            month,
            totals,
            paid: paidRows,
            debts: debtRows,
            maintenance: {
              fromServiceCalls: maintCallRows,
            },
          });
        });
      });
    });
  });
});

/* =========================================
   📊 דוחות חודשיים כלליים
   ========================================= */
router.get("/monthly", (req, res) => {
  const sql = `
    SELECT 
      month,
      income,
      expense,
      debt,
      profit
    FROM monthly_reports
    ORDER BY month DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error loading monthly reports:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

module.exports = router;
