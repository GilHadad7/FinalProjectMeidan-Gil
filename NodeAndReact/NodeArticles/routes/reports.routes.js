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
      params.push(start, end);            // calls_opened
      if (buildingId) params.push(buildingId);
      params.push(start, end);            // calls_opened_closed
      if (buildingId) params.push(buildingId);
      params.push(start, end);            // executions
      if (buildingId) params.push(buildingId);

      return db.query(sql, params, (err, rows) => {
        if (err) { console.error(err); return res.status(500).json({ error: "DB error" }); }
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
      const params = buildingId ? [start, end, buildingId] : [start, end];
      return db.query(sql, params, (err, rows) => {
        if (err) { console.error(err); return res.status(500).json({ error: "DB error" }); }
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
  const name  = String(req.query.name || "").trim();
  const by    = String(req.query.by   || "open").toLowerCase(); // 'open' | 'handled'

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

  const sql    = by === "handled" ? qHandled : qOpen;
  const params = by === "handled" ? [month, name, name] : [month, name];

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
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
            paid:        sum(paidRows),
            debts:       sum(debtRows),
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

/* =========================================
   👷 פעילות עובדים (מבוסס לוגים + קריאות)
   =========================================
   GET /api/reports/workers/activity?month=YYYY-MM
*/
router.get("/workers/activity", (req, res) => {
  const month = (req.query.month || new Date().toISOString().slice(0, 7)).slice(0, 7);

  const qEmployees = `
    SELECT user_id, name, position
    FROM users
    WHERE LOWER(position) IN ('super','cleaner') OR position IN ('אב בית','מנקה')
    ORDER BY name ASC
  `;

  const qExec = `
    SELECT
      rte.execution_id AS exec_id,
      rte.task_id,
      rte.executed_at,
      u.name           AS worker_name,
      rt.task_name,
      rt.type          AS task_type,
      b.full_address   AS building_address
    FROM routinetaskexecutions rte
    JOIN routinetasks rt  ON rt.task_id = rte.task_id
    JOIN buildings b      ON b.building_id = rt.building_id
    LEFT JOIN users u     ON u.user_id = rte.employee_id
    WHERE DATE_FORMAT(rte.executed_at, '%Y-%m') = ?
    ORDER BY rte.executed_at DESC
  `;

  const qCalls = `
    SELECT
      sc.call_id,
      sc.created_at,
      sc.status,
      sc.service_type,
      uClose.name      AS handler_name,
      b.full_address   AS building_address
    FROM servicecalls sc
    LEFT JOIN users uClose ON uClose.user_id = sc.closed_by
    LEFT JOIN buildings b  ON b.building_id = sc.building_id
    WHERE DATE_FORMAT(sc.created_at, '%Y-%m') = ?
    ORDER BY sc.created_at DESC, sc.call_id DESC
  `;

  db.query(qEmployees, [], (eEmp, empRows) => {
    if (eEmp) { console.error(eEmp); return res.status(500).json({ error: eEmp.message }); }

    db.query(qExec, [month], (eEx, execRows) => {
      if (eEx) { console.error(eEx); return res.status(500).json({ error: eEx.message }); }

    db.query(qCalls, [month], (eC, callRows) => {
        if (eC) { console.error(eC); return res.status(500).json({ error: eC.message }); }

        const map = new Map();
        for (const e of empRows) {
          map.set(e.name, {
            name: e.name,
            role: e.position,
            tasksAssigned: 0,
            tasksDone: 0,
            callsHandled: 0,
            callsClosed: 0,
            lastActivity: 0,
            taskDetails: [],
            callDetails: [],
          });
        }

        for (const r of execRows) {
          const w = r.worker_name;
          if (!w || !map.has(w)) continue;
          const acc = map.get(w);
          acc.tasksAssigned += 1;
          acc.tasksDone     += 1;
          const ts = new Date(r.executed_at).getTime() || 0;
          if (ts > acc.lastActivity) acc.lastActivity = ts;
          acc.taskDetails.push({
            date: r.executed_at,
            title: r.task_name,
            building: r.building_address,
            status: "בוצע",
          });
        }

        for (const c of callRows) {
          const handler = (c.handler_name || "").trim();
          if (!handler || !map.has(handler)) continue;
          const acc = map.get(handler);
          acc.callsHandled += 1;
          const isClosed = ["closed","סגור"].includes(String(c.status||"").toLowerCase());
          if (isClosed) acc.callsClosed += 1;
          const ts = new Date(c.created_at).getTime() || 0;
          if (ts > acc.lastActivity) acc.lastActivity = ts;
          acc.callDetails.push({
            date: c.created_at,
            kind: isClosed ? "טיפל (סגר)" : "טיפל",
            type: c.service_type || "",
            address: c.building_address || "",
            status: c.status || "",
          });
        }

        const out = Array.from(map.values()).sort(
          (a,b) => b.lastActivity - a.lastActivity || a.name.localeCompare(b.name, "he")
        );

        res.json(out);
      });
    });
  });
});

// 🔁 תאימות לאחור: /api/reports/workers -> activity לחודש הנוכחי
router.get("/workers", (req, res, next) => {
  req.query.month = req.query.month || new Date().toISOString().slice(0, 7);
  // פשוט נשתמש באותו קוד של /workers/activity ע"י קריאה פנימית
  const fakeReq = { ...req, query: { month: req.query.month } };
  router.handle({ ...fakeReq, url: "/workers/activity", method: "GET" }, res, next);
});

module.exports = router;
