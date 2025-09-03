const express = require("express");
const router = express.Router();
const db = require("../db");

/* ===================== עוזרי זמן/תדירות ===================== */
function toDate(x) {
  const d = new Date(x);
  return isNaN(d) ? null : d;
}
function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function startOfMonth(ym) {
  // ym: 'YYYY-MM'
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1, 0, 0, 0, 0);
}
function endOfMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0, 23, 59, 59, 999); // היום האחרון בחודש
}
function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function normFreq(s) {
  const t = String(s || "").trim().toLowerCase();
  if (t.includes("day") || t.includes("יומ")) return "daily";
  if (t.includes("biweek") || t.includes("דו") || t.includes("פעמיים")) return "biweekly";
  if (t.includes("week") || t.includes("שבוע")) return "weekly";
  if (t.includes("month") || t.includes("חוד")) return "monthly";
  return "once"; // ברירת מחדל: חד-פעמי
}

/** -------------------------------------------
 *  עוזרים לזיהוי המשתמש (פיתוח/פרודקשן)
 *  ------------------------------------------- */

// מי הדייר המחובר: קודם session, אחרת query/header
function getLoggedUser(req) {
  if (req.session?.userId) {
    return {
      user_id: req.session.userId,
      name: req.session.userName || null,
      building_id: req.session.buildingId ?? null,
    };
  }
  const user_id = Number(req.query.userId || req.headers["x-user-id"] || 0) || null;
  const building_id = Number(req.query.buildingId || req.headers["x-building-id"] || NaN);
  return {
    user_id,
    name: null,
    building_id: Number.isFinite(building_id) ? building_id : null,
  };
}

// hydrate: משלים name/building_id מה-DB. וגם מאפשר override של buildingId
function hydrateUser(u, req) {
  return new Promise((resolve, reject) => {
    if (!u.user_id) {
      const e = new Error("not authenticated");
      e.code = 401;
      return reject(e);
    }

    const overrideBuilding = Number(req.query.buildingId || req.headers["x-building-id"] || NaN);
    if (Number.isFinite(overrideBuilding)) {
      u.building_id = overrideBuilding;
    }

    if (u.building_id != null && u.name) return resolve(u);

    db.query(
      "SELECT name, building_id FROM users WHERE user_id = ? LIMIT 1",
      [u.user_id],
      (err, rows) => {
        if (err) return reject(err);
        const r = rows?.[0] || {};
        const user = {
          user_id: u.user_id,
          name: u.name ?? r.name ?? null,
          building_id:
            u.building_id != null ? u.building_id : r.building_id != null ? r.building_id : null,
        };

        if (user.building_id != null) return resolve(user);

        // fallback: להסיק בניין מתשלומים
        db.query(
          "SELECT building_id FROM payments WHERE tenant_id = ? ORDER BY payment_date DESC LIMIT 1",
          [user.user_id],
          (e2, rows2) => {
            if (e2) return reject(e2);
            const b = rows2?.[0]?.building_id ?? null;
            if (b != null) user.building_id = b;
            resolve(user);
          }
        );
      }
    );
  });
}

/** -------------------------------------------
 *  בריאות
 *  ------------------------------------------- */
router.get("/health", async (req, res) => {
  try {
    const raw = getLoggedUser(req);
    const user = await hydrateUser(raw, req);
    res.json({ ok: true, user });
  } catch (e) {
    res.status(e.code === 401 ? 401 : 500).json({ ok: false, error: e.message });
  }
});

/** -------------------------------------------
 *  overview (כמו שהיה)
 *  ------------------------------------------- */
router.get("/overview", async (req, res) => {
  try {
    const raw = getLoggedUser(req);
    const user = await hydrateUser(raw, req);
    if (!user.user_id || user.building_id == null) {
      return res.status(401).json({ error: "not authenticated (no building)" });
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
      WHERE building_id = ? AND (status IS NULL OR status NOT IN ('Closed','סגור'))
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

    const [buildingRows, paymentsRows, lastPayRows, openCallsRows, myCallsRows, finRows] =
      await Promise.all([
        new Promise((r, j) => db.query(qBuilding, [user.building_id], (e, rows) => (e ? j(e) : r(rows)))),
        new Promise((r, j) =>
          db.query(qMyPayments, [user.user_id, user.building_id], (e, rows) => (e ? j(e) : r(rows)))
        ),
        new Promise((r, j) =>
          db.query(qLastPayment, [user.user_id, user.building_id], (e, rows) => (e ? j(e) : r(rows)))
        ),
        new Promise((r, j) => db.query(qOpenCallsCount, [user.building_id], (e, rows) => (e ? j(e) : r(rows)))),
        new Promise((r, j) =>
          db.query(qMyRecentCalls, [user.building_id, user.name, user.name], (e, rows) =>
            e ? j(e) : r(rows)
          )
        ),
        new Promise((r, j) => db.query(qFinanceMonth, [user.building_id, ym], (e, rows) => (e ? j(e) : r(rows)))),
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
        last_payment: last ? { amount: Number(last.amount || 0), date: last.payment_date } : null,
      },
      service_calls: { open_count: Number(openCalls || 0), my_recent: myCallsRows || [] },
    });
  } catch (err) {
    console.error("tenant overview failed:", err);
    res.status(err.code === 401 ? 401 : 500).json({ error: err.message || "server error" });
  }
});

/** -------------------------------------------
 *  היסטוריית תשלומי הבניין (ללא שינוי)
 *  ------------------------------------------- */
router.get("/payments-history", async (req, res) => {
  try {
    const user = await hydrateUser(getLoggedUser(req), req);
    if (user.building_id == null) {
      return res.status(401).json({ error: "not authenticated (no building)" });
    }

    const all = (req.query.all || "1") === "1";
    const month = String(req.query.month || "").slice(0, 7);

    const whereMonth = all ? "" : "AND DATE_FORMAT(payment_date, '%Y-%m') = ?";
    const params = all ? [user.building_id] : [user.building_id, month];

    const sql = `
      SELECT payment_id, tenant_id, building_id, payment_date,
             category, description, amount, status
      FROM payments
      WHERE building_id = ?
      ${whereMonth}
      ORDER BY payment_date DESC, payment_id DESC
    `;

    db.query(sql, params, (err, rows) => {
      if (err) {
        console.error("payments-history db error:", err);
        return res.status(500).json({ error: "db error" });
      }
      const items = rows || [];
      const totals = items.reduce(
        (acc, r) => {
          const a = Number(r.amount || 0);
          const st = String(r.status || "");
          if (st === "שולם") acc.paid += a;
          else if (st === "חוב" || st === "ממתין") acc.debt += a;
          return acc;
        },
        { paid: 0, debt: 0 }
      );
      res.json({ totals, items });
    });
  } catch (e) {
    console.error("payments-history failed:", e);
    res.status(e.code === 401 ? 401 : 500).json({ error: e.message || "server error" });
  }
});

/** -------------------------------------------
 *  פעילות חודשית בבניין (מעודכן – מפיק occurrences)
 *  GET /api/tenant/reports/activity?month=YYYY-MM
 *  ------------------------------------------- */
router.get("/activity", async (req, res) => {
  try {
    const user = await hydrateUser(getLoggedUser(req), req);
    if (user.building_id == null) {
      return res.status(401).json({ error: "not authenticated (no building)" });
    }

    const ymRaw = String(req.query.month || "").slice(0, 7);
    const ym = /^\d{4}-\d{2}$/.test(ymRaw) ? ymRaw : new Date().toISOString().slice(0, 7);

    const mStart = startOfMonth(ym);
    const mEnd = endOfMonth(ym);

    // קריאות שירות (ללא שינוי)
    const qCalls = `
      SELECT call_id, service_type, description, status, created_at, location_in_building
      FROM servicecalls
      WHERE building_id = ?
        AND DATE_FORMAT(created_at, '%Y-%m') = ?
      ORDER BY created_at DESC, call_id DESC
    `;

    // משימות קבועות – מביאים כולן לבניין, ונחשב מופעים בחודש
    const qTasks = `
      SELECT
        task_id,
        task_name,
        frequency,
        next_date,
        TIME_FORMAT(task_time, '%H:%i') AS task_time
      FROM routinetasks
      WHERE building_id = ?
      ORDER BY task_id ASC
    `;

    const [callRows, taskRows] = await Promise.all([
      new Promise((r, j) => db.query(qCalls, [user.building_id, ym], (e, rows) => (e ? j(e) : r(rows)))),
      new Promise((r, j) => db.query(qTasks, [user.building_id], (e, rows) => (e ? j(e) : r(rows)))),
    ]);

    const calls = callRows || [];
    const closed = calls.filter((c) => /^(closed|סגור)$/i.test(String(c.status || ""))).length;

    // מייצרים מופעים לכל משימה לפי התדירות והעוגן (next_date)
    const occurrences = [];
    for (const t of taskRows || []) {
      const anchor = toDate(t.next_date) || mStart; // אם אין next_date – נתחיל מתחילת החודש
      const freq = normFreq(t.frequency);
      const time = t.task_time || "";

      if (freq === "monthly") {
        // פעם בחודש ביום של העוגן
        const d = new Date(mStart);
        const day = anchor.getDate();
        d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
        occurrences.push({
          task_id: t.task_id,
          task_name: t.task_name,
          frequency: t.frequency || "",
          when: ymd(d),
          time,
        });
      } else if (freq === "weekly" || freq === "biweekly" || freq === "daily") {
        const step = freq === "daily" ? 1 : freq === "weekly" ? 7 : 14;

        // נסוג מהעוגן אחורה עד שמגיעים/עוברים את תחילת החודש
        let s = new Date(anchor);
        while (s > mStart) s = addDays(s, -step);
        while (s < mStart) s = addDays(s, step);

        // עכשיו נזרום עד סוף החודש
        for (let d = s; d <= mEnd; d = addDays(d, step)) {
          occurrences.push({
            task_id: t.task_id,
            task_name: t.task_name,
            frequency: t.frequency || "",
            when: ymd(d),
            time,
          });
        }
      } else {
        // once / לא מזוהה – אם העוגן בתוך החודש: נציג אותו
        if (anchor >= mStart && anchor <= mEnd) {
          occurrences.push({
            task_id: t.task_id,
            task_name: t.task_name,
            frequency: t.frequency || "",
            when: ymd(anchor),
            time,
          });
        }
      }
    }

    // מיון לפי תאריך ואז שם משימה
    occurrences.sort((a, b) => (a.when === b.when ? (a.task_name || "").localeCompare(b.task_name || "") : a.when.localeCompare(b.when)));

    res.json({
      service_calls: { total: calls.length, closed, items: calls },
      routine_tasks: { total: occurrences.length, items: occurrences },
    });
  } catch (e) {
    console.error("activity failed:", e);
    res.status(e.code === 401 ? 401 : 500).json({ error: e.message || "server error" });
  }
});

/** -------------------------------------------
 *  הורדות CSV + דפי HTML + PDF (כמו שהיה)
 *  ------------------------------------------- */
// ... שאר הקובץ ללא שינוי ...

module.exports = router;
