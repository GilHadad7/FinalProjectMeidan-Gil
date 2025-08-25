// routes/tenant.reports.routes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// עוזר: מי הדייר המחובר
function getLoggedUser(req) {
  // אם שמרת בסשן בלוגין:
  if (req.session?.userId) {
    return {
      user_id: req.session.userId,
      name: req.session.userName || null,
      building_id: req.session.buildingId ?? null,
    };
  }
  // פיתוח: query/header
  const user_id = Number(req.query.userId || req.headers["x-user-id"] || 0) || null;
  return { user_id, name: null, building_id: null };
}

// מביא שם דייר + בניין מה-DB אם חסר בסשן
function hydrateUser(u) {
  return new Promise((resolve, reject) => {
    if (u.building_id != null && u.name) return resolve(u);
    if (!u.user_id) return reject(new Error("unauthenticated"));
    db.query(
      "SELECT name, building_id FROM users WHERE user_id = ? LIMIT 1",
      [u.user_id],
      (err, rows) => {
        if (err) return reject(err);
        const r = rows?.[0] || {};
        resolve({
          user_id: u.user_id,
          name: u.name ?? r.name ?? null,
          building_id: u.building_id ?? r.building_id ?? null,
        });
      }
    );
  });
}

// GET /api/tenant/reports/overview
// מחזיר סיכומים לדייר והבניין שלו
router.get("/overview", async (req, res) => {
  try {
    const raw = getLoggedUser(req);
    const user = await hydrateUser(raw);
    if (!user.user_id || !user.building_id) {
      return res.status(401).json({ error: "not authenticated" });
    }

    const ym = new Date().toISOString().slice(0, 7);

    const qBuilding =
      "SELECT building_id, name, full_address FROM buildings WHERE building_id = ? LIMIT 1";

    const qMyPayments = `
      SELECT
        SUM(CASE WHEN status='שולם' THEN amount ELSE 0 END) AS total_paid,
        SUM(CASE WHEN status IN ('חוב','ממתין') THEN amount ELSE 0 END) AS total_debt
      FROM payments
      WHERE tenant_id = ? AND building_id = ?
    `;

    const qLastPayment = `
      SELECT amount, payment_date
      FROM payments
      WHERE tenant_id = ? AND building_id = ? AND status='שולם'
      ORDER BY payment_date DESC
      LIMIT 1
    `;

    const qOpenCallsCount = `
      SELECT COUNT(*) AS cnt
      FROM servicecalls
      WHERE building_id = ? AND (status IS NULL OR status <> 'Closed')
    `;

    const qMyRecentCalls = `
      SELECT call_id, description, status, created_at
      FROM servicecalls
      WHERE building_id = ? AND (created_by = ? OR created_by_name = ?)
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const qFinanceMonth = `
      SELECT month, total_paid, balance_due, maintenance
      FROM building_finance
      WHERE building_id = ? AND month = ?
      LIMIT 1
    `;

    // Promise.all כדי לרוץ במקביל
    const [
      buildingRows,
      paymentsRows,
      lastPayRows,
      openCallsRows,
      myCallsRows,
      finRows,
    ] = await Promise.all([
      new Promise((r, j) => db.query(qBuilding, [user.building_id], (e, rows) => e ? j(e) : r(rows))),
      new Promise((r, j) => db.query(qMyPayments, [user.user_id, user.building_id], (e, rows) => e ? j(e) : r(rows))),
      new Promise((r, j) => db.query(qLastPayment, [user.user_id, user.building_id], (e, rows) => e ? j(e) : r(rows))),
      new Promise((r, j) => db.query(qOpenCallsCount, [user.building_id], (e, rows) => e ? j(e) : r(rows))),
      new Promise((r, j) => db.query(qMyRecentCalls, [user.building_id, user.name, user.name], (e, rows) => e ? j(e) : r(rows))),
      new Promise((r, j) => db.query(qFinanceMonth, [user.building_id, ym], (e, rows) => e ? j(e) : r(rows))),
    ]);

    const building = buildingRows?.[0] || {};
    const my = paymentsRows?.[0] || {};
    const last = lastPayRows?.[0] || null;
    const openCalls = openCallsRows?.[0]?.cnt ?? 0;
    const fin = finRows?.[0] || { month: ym, total_paid: 0, balance_due: 0, maintenance: 0 };

    res.json({
      building,
      month: ym,
      building_finance: fin,
      me: {
        total_paid: Number(my.total_paid || 0),
        total_debt: Number(my.total_debt || 0),
        last_payment: last ? {
          amount: Number(last.amount || 0),
          date: last.payment_date,
        } : null,
      },
      service_calls: {
        open_count: Number(openCalls || 0),
        my_recent: myCallsRows || [],
      },
    });
  } catch (err) {
    console.error("tenant overview failed:", err);
    res.status(500).json({ error: "server error" });
  }
});

// GET /api/tenant/reports/payments.csv
router.get("/payments.csv", async (req, res) => {
  try {
    const user = await hydrateUser(getLoggedUser(req));
    if (!user.user_id || !user.building_id) return res.status(401).json({ error: "not authenticated" });

    db.query(
      `SELECT payment_date, category, description, amount, status
       FROM payments
       WHERE tenant_id = ? AND building_id = ?
       ORDER BY payment_date DESC`,
      [user.user_id, user.building_id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: "db error" });

        const header = "תאריך,קטגוריה,תיאור,סכום,סטטוס";
        const lines = (rows || []).map(r =>
          [
            r.payment_date ? new Date(r.payment_date).toISOString().slice(0,10) : "",
            (r.category || "").replace(/,/g, " "),
            (r.description || "").replace(/,/g, " "),
            Number(r.amount || 0),
            r.status || "",
          ].join(",")
        );
        const csv = [header, ...lines].join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="payments_${user.user_id}.csv"`);
        res.send("\uFEFF" + csv); // BOM כדי שהעברית תיפתח נכון באקסל
      }
    );
  } catch {
    res.status(500).json({ error: "server error" });
  }
});

// GET /api/tenant/reports/service-calls.csv
router.get("/service-calls.csv", async (req, res) => {
  try {
    const user = await hydrateUser(getLoggedUser(req));
    if (!user.user_id || !user.building_id) return res.status(401).json({ error: "not authenticated" });

    db.query(
      `SELECT DATE(created_at) AS d, TIME(created_at) AS t, service_type, description, status
       FROM servicecalls
       WHERE building_id = ? AND (created_by = ? OR created_by_name = ?)
       ORDER BY created_at DESC`,
      [user.building_id, user.name, user.name],
      (err, rows) => {
        if (err) return res.status(500).json({ error: "db error" });

        const header = "תאריך,שעה,סוג תקלה,תיאור,סטטוס";
        const lines = (rows || []).map(r =>
          [
            r.d || "",
            r.t || "",
            (r.service_type || "").replace(/,/g, " "),
            (r.description || "").replace(/,/g, " "),
            r.status || "",
          ].join(",")
        );
        const csv = [header, ...lines].join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="service_calls_${user.user_id}.csv"`);
        res.send("\uFEFF" + csv);
      }
    );
  } catch {
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
