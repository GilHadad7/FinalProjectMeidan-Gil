// routes/worker.reports.routes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* ---------- Helpers ---------- */
const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

async function resolveBuildingId(req) {
  if (req.session?.buildingId) return req.session.buildingId;
  if (req.query.buildingId || req.headers["x-building-id"]) {
    return Number(req.query.buildingId || req.headers["x-building-id"]);
  }
  const uid = req.session?.userId || req.headers["x-user-id"] || req.query.userId;
  if (!uid) return null;
  const rows = await query(
    "SELECT building_id FROM users WHERE user_id = ? LIMIT 1",
    [uid]
  ).catch(() => []);
  return rows?.[0]?.building_id ?? null;
}

// מביא פרטי עובד (שם לשיוך הפעולות)
async function resolveWorker(req) {
  const id =
    req.session?.userId ||
    Number(req.query.workerId) ||
    Number(req.headers["x-user-id"]) ||
    null;
  if (!id) return { id: null, name: null, building_id: null };
  const rows = await query(
    "SELECT user_id, name, building_id FROM users WHERE user_id = ? LIMIT 1",
    [id]
  ).catch(() => []);
  if (!rows?.length) return { id, name: null, building_id: null };
  return { id: rows[0].user_id, name: rows[0].name || null, building_id: rows[0].building_id ?? null };
}

function normStatus(s) {
  const t = String(s || "").trim().toLowerCase();
  if (t === "closed" || t === "סגור") return "closed";
  if (t === "open" || t === "פתוח") return "open";
  if (t.includes("progress") || t === "בטיפול") return "in_progress";
  if (["pending", "ממתין", "awaiting", "waiting"].includes(t)) return "pending";
  return t;
}

function monthRange(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return null;
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1); // first of next month
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

/* ---------- OVERVIEW (כמו קודם) ---------- */
router.get("/overview", async (req, res) => {
  try {
    const ym = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : null;
    const buildingId = await resolveBuildingId(req);
    if (!buildingId) {
      return res
        .status(401)
        .json({ error: "Unauthenticated", detail: "buildingId missing" });
    }

    const calls = await query(
      `SELECT call_id,
              service_type,
              description,
              status,
              location_in_building,
              created_at
       FROM servicecalls
       WHERE building_id = ?
         ${ym ? "AND DATE_FORMAT(created_at,'%Y-%m')=?" : ""}
       ORDER BY created_at DESC`,
      ym ? [buildingId, ym] : [buildingId]
    );

    let open = 0, inProg = 0, closedThis = 0, overdue = 0;
    for (const c of calls) {
      const st = normStatus(c.status);
      if (st === "open") open++;
      else if (st === "in_progress") inProg++;
      if (st === "closed") closedThis++;
    }

    // ----- Routines: כל המופעים בתוך החודש הנבחר -----
    const rawTasks =
      (await query(
        `SELECT task_id, task_name, frequency, next_date, task_time, created_at
         FROM routinetasks
         WHERE building_id = ?`,
        [buildingId]
      ).catch(() => [])) || [];

    const range = monthRange(ym);
    let upcoming = [];
    if (range) {
      const { start, end } = range;
      const pushWhileInMonth = (base, stepFn, t) => {
        let guardBack = 0;
        while (base >= start && guardBack++ < 100) {
          const prev = new Date(base.getTime());
          stepFn(prev, -1);
          if (prev < start) break;
          base = prev;
        }
        let guardFwd = 0;
        while (base < end && guardFwd++ < 200) {
          if (base >= start) {
            upcoming.push({
              task_id: t.task_id,
              task_name: t.task_name,
              frequency: t.frequency,
              when: base.toISOString().slice(0, 10),
              time: t.task_time,
            });
          }
          stepFn(base, +1);
        }
      };
      for (const t of rawTasks) {
        const freq = String(t.frequency || "").trim().toLowerCase();
        let base =
          (t.next_date && new Date(t.next_date)) ||
          (t.created_at && new Date(t.created_at)) ||
          new Date(start);
        if (isNaN(base)) continue;
        const step = (d, dir) => {
          if (freq.includes("שבוע") || freq.includes("week")) d.setDate(d.getDate() + (dir * 7));
          else if (freq.includes("חודש") || freq.includes("month")) d.setMonth(d.getMonth() + dir);
          else if (freq.includes("יום") || freq.includes("day") || freq.includes("יומי")) d.setDate(d.getDate() + dir);
          else if (freq.includes("דו") && freq.includes("שבוע")) d.setDate(d.getDate() + (dir * 14));
          else {
            if (base >= start && base < end) {
              upcoming.push({
                task_id: t.task_id, task_name: t.task_name, frequency: t.frequency,
                when: base.toISOString().slice(0, 10), time: t.task_time,
              });
            }
          }
        };
        pushWhileInMonth(base, step, t);
      }
      upcoming.sort((a, b) => a.when === b.when
        ? String(a.time || "").localeCompare(String(b.time || ""))
        : a.when.localeCompare(b.when));
    }

    // ----- Payments: כל התשלומים של החודש -----
    const payRows =
      (await query(
        `SELECT payment_id, amount, status, category, description, payment_date
         FROM payments
         WHERE building_id = ?
         ${ym ? "AND DATE_FORMAT(payment_date,'%Y-%m')=?" : ""}
         ORDER BY payment_date DESC
         LIMIT 500`,
        ym ? [buildingId, ym] : [buildingId]
      ).catch(() => [])) || [];

    let paid = 0, debt = 0;
    for (const p of payRows) {
      const amt = Number(p.amount || 0);
      const st = String(p.status || "").toLowerCase();
      if (st === "paid" || st === "שולם") paid += amt;
      else debt += amt;
    }

    res.json({
      kpis: { open, in_progress: inProg, closed_this_month: closedThis, overdue, avg_close_hours: 0 },
      service_calls: { items: calls },
      routine_tasks: { upcoming },
      payments: { totals: { paid, debt }, items: payRows },
    });
  } catch (e) {
    console.error("worker/reports/overview error:", e);
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

/* ---------- דוח פעילות לעובד: HTML Printable ---------- */
router.get("/page/activity", async (req, res) => {
  try {
    const ym = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : null;
    const buildingId = await resolveBuildingId(req);
    const worker = await resolveWorker(req);
    if (!buildingId) return res.status(401).send("Unauthenticated");

    const activities = [];

    // 1) פעולות: קריאות שנוצרו ע"י העובד בחודש
    {
      let sql =
        `SELECT call_id AS id, created_at AS ts, service_type, status,
                location_in_building, description, created_by
         FROM servicecalls
         WHERE building_id = ?
           ${ym ? "AND DATE_FORMAT(created_at,'%Y-%m')=?" : ""}`;
      const params = ym ? [buildingId, ym] : [buildingId];
      if (worker.name || worker.id) {
        sql += " AND (created_by = ? OR created_by = ?)";
        params.push(String(worker.name || ""), String(worker.id || ""));
      }
      const rows = await query(sql, params).catch(() => []);
      for (const r of rows) {
        activities.push({
          ts: r.ts,
          type: "קריאת שירות (נפתח)",
          ref: `#${r.id}`,
          where: r.location_in_building || "—",
          desc: r.description || "",
          extra: `${r.service_type || ""} · ${r.status || ""}`,
        });
      }
    }

    // 2) עדכונים לקריאות (אם קיימת טבלה servicecallupdates)
    try {
      let sql =
        `SELECT u.update_id AS id, u.created_at AS ts, u.status, u.comment,
                u.call_id, u.created_by
         FROM servicecallupdates u
         JOIN servicecalls c ON c.call_id = u.call_id
         WHERE c.building_id = ?
           ${ym ? "AND DATE_FORMAT(u.created_at,'%Y-%m')=?" : ""}`;
      const params = ym ? [buildingId, ym] : [buildingId];
      if (worker.name || worker.id) {
        sql += " AND (u.created_by = ? OR u.created_by = ?)";
        params.push(String(worker.name || ""), String(worker.id || ""));
      }
      const rows = await query(sql, params);
      for (const r of rows) {
        activities.push({
          ts: r.ts,
          type: "עדכון קריאה",
          ref: `#${r.call_id}`,
          where: "",
          desc: r.comment || "",
          extra: r.status || "",
        });
      }
    } catch (_) {
      /* אם אין טבלה/עמודות – מדלגים בשקט */
    }

    // 3) ביצועי משימות קבועות (אם קיימת טבלת routinetaskexecutions)
    try {
      let sql =
        `SELECT e.exec_id AS id, e.executed_at AS ts, e.note AS comment,
                e.created_by, e.executed_by, t.task_name
         FROM routinetaskexecutions e
         JOIN routinetasks t ON t.task_id = e.task_id
         WHERE t.building_id = ?
           ${ym ? "AND DATE_FORMAT(e.executed_at,'%Y-%m')=?" : ""}`;
      const params = ym ? [buildingId, ym] : [buildingId];
      if (worker.name || worker.id) {
        sql += " AND (e.created_by = ? OR e.executed_by = ?)";
        params.push(String(worker.name || ""), String(worker.name || ""));
      }
      const rows = await query(sql, params);
      for (const r of rows) {
        activities.push({
          ts: r.ts,
          type: "ביצוע משימה קבועה",
          ref: r.task_name || "",
          where: "",
          desc: r.comment || "",
          extra: "",
        });
      }
    } catch (_) {}

    // מיין לפי זמן יורד
    activities.sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")));

    const title = `דוח פעילות עובד — ${worker.name || "עובד"} — ${ym || ""}`;
    const rowsHtml = activities
      .map(
        (a) => `<tr>
          <td>${a.ts ? new Date(a.ts).toLocaleString("he-IL") : "—"}</td>
          <td>${a.type}</td>
          <td>${a.ref}</td>
          <td>${a.where || "—"}</td>
          <td>${(a.desc || "").replace(/</g, "&lt;")}</td>
          <td>${a.extra || ""}</td>
        </tr>`
      )
      .join("");

    const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif; margin:24px; color:#222;}
  h1{margin:0 0 12px;}
  .sub{color:#666; margin-bottom:20px}
  table{border-collapse:collapse; width:100%;}
  th,td{border:1px solid #ddd; padding:8px; font-size:14px;}
  th{background:#f5f5f5; text-align:right;}
  tr:nth-child(even){background:#fafafa;}
  .muted{color:#888; font-size:13px;}
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="sub">בניין: ${buildingId} · עובד: ${worker.name || worker.id || "—"}</div>
  ${
    activities.length
      ? `<table>
           <thead>
             <tr><th>תאריך</th><th>סוג פעולה</th><th>ייחוס</th><th>מיקום</th><th>פרטים</th><th>נוסף</th></tr>
           </thead>
           <tbody>${rowsHtml}</tbody>
         </table>`
      : `<div class="muted">לא נמצאו פעולות לחודש המבוקש.</div>`
  }
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    console.error("page/activity error:", e);
    res.status(500).send("Server error");
  }
});

/* ---------- PDF: worker activity (download) ---------- */
router.get("/pdf/activity", async (req, res) => {
  try {
    // נבנה קודם את ה-HTML בעזרת אותו קוד כמו /page/activity
    // נשתמש בפונקציה עזר קטנה שמחזירה {title, html, filename}
    const buildHtml = async () => {
      const ym = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : null;
      const buildingId = await resolveBuildingId(req);
      const worker = await resolveWorker(req);
      if (!buildingId) throw Object.assign(new Error("Unauthenticated"), { code: 401 });

      const activities = [];

      // 1) קריאות שנפתחו ע"י העובד
      {
        let sql =
          `SELECT call_id AS id, created_at AS ts, service_type, status,
                  location_in_building, description, created_by
           FROM servicecalls
           WHERE building_id = ?
             ${ym ? "AND DATE_FORMAT(created_at,'%Y-%m')=?" : ""}`;
        const params = ym ? [buildingId, ym] : [buildingId];
        if (worker.name || worker.id) {
          sql += " AND (created_by = ? OR created_by = ?)";
          params.push(String(worker.name || ""), String(worker.id || ""));
        }
        const rows = await query(sql, params).catch(() => []);
        for (const r of rows) {
          activities.push({
            ts: r.ts,
            type: "קריאת שירות (נפתח)",
            ref: `#${r.id}`,
            where: r.location_in_building || "—",
            desc: r.description || "",
            extra: `${r.service_type || ""} · ${r.status || ""}`,
          });
        }
      }

      // 2) עדכוני קריאות (אם קיימת הטבלה)
      try {
        let sql =
          `SELECT u.update_id AS id, u.created_at AS ts, u.status, u.comment,
                  u.call_id, u.created_by
           FROM servicecallupdates u
           JOIN servicecalls c ON c.call_id = u.call_id
           WHERE c.building_id = ?
             ${ym ? "AND DATE_FORMAT(u.created_at,'%Y-%m')=?" : ""}`;
        const params = ym ? [buildingId, ym] : [buildingId];
        if (worker.name || worker.id) {
          sql += " AND (u.created_by = ? OR u.created_by = ?)";
          params.push(String(worker.name || ""), String(worker.id || ""));
        }
        const rows = await query(sql, params);
        for (const r of rows) {
          activities.push({
            ts: r.ts,
            type: "עדכון קריאה",
            ref: `#${r.call_id}`,
            where: "",
            desc: r.comment || "",
            extra: r.status || "",
          });
        }
      } catch (_) {}

      // 3) ביצוע משימות קבועות (אם קיימת הטבלה)
      try {
        let sql =
          `SELECT e.exec_id AS id, e.executed_at AS ts, e.note AS comment,
                  e.created_by, e.executed_by, t.task_name
           FROM routinetaskexecutions e
           JOIN routinetasks t ON t.task_id = e.task_id
           WHERE t.building_id = ?
             ${ym ? "AND DATE_FORMAT(e.executed_at,'%Y-%m')=?" : ""}`;
        const params = ym ? [buildingId, ym] : [buildingId];
        if (worker.name || worker.id) {
          sql += " AND (e.created_by = ? OR e.executed_by = ?)";
          params.push(String(worker.name || ""), String(worker.name || ""));
        }
        const rows = await query(sql, params);
        for (const r of rows) {
          activities.push({
            ts: r.ts,
            type: "ביצוע משימה קבועה",
            ref: r.task_name || "",
            where: "",
            desc: r.comment || "",
            extra: "",
          });
        }
      } catch (_) {}

      activities.sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")));

      const title = `דוח פעילות עובד — ${worker.name || "עובד"} — ${ym || ""}`;
      const rowsHtml = activities
        .map(
          (a) => `<tr>
            <td>${a.ts ? new Date(a.ts).toLocaleString("he-IL") : "—"}</td>
            <td>${a.type}</td>
            <td>${a.ref}</td>
            <td>${a.where || "—"}</td>
            <td>${(a.desc || "").replace(/</g, "&lt;")}</td>
            <td>${a.extra || ""}</td>
          </tr>`
        )
        .join("");

      const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  @page { size: A4; margin: 20mm 12mm; }
  body{font-family:Arial,Helvetica,sans-serif; color:#222;}
  h1{margin:0 0 12px; text-align:center; font-size:28px;}
  .sub{color:#666; margin-bottom:16px; text-align:center}
  table{border-collapse:collapse; width:100%;}
  th,td{border:1px solid #ddd; padding:8px; font-size:12.5px;}
  th{background:#f5f5f5; text-align:right;}
  tr:nth-child(even){background:#fafafa;}
  .muted{color:#888; font-size:13px; text-align:center; padding:24px;}
</style>
</head>
<body>
  <h1>${ym || ""} — דוח פעילויות עובד</h1>
  <div class="sub">עובד: ${worker.name || worker.id || "—"} · בניין: ${buildingId}</div>
  ${
    activities.length
      ? `<table>
           <thead>
             <tr><th>תאריך</th><th>סוג פעולה</th><th>ייחוס</th><th>מיקום</th><th>פרטים</th><th>נוסף</th></tr>
           </thead>
           <tbody>${rowsHtml}</tbody>
         </table>`
      : `<div class="muted">לא נמצאו פעולות לחודש המבוקש.</div>`
  }
</body>
</html>`;
      const filename = `worker-activity-${ym || "all"}-worker-${worker.id || "unknown"}.pdf`;
      return { html, filename };
    };

    const { html, filename } = await buildHtml();

    // הפקה ל-PDF עם Puppeteer
    const puppeteer = require("puppeteer");
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "12mm", bottom: "20mm", left: "12mm" },
    });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (e) {
    console.error("pdf/activity error:", e);
    if (e.code === 401) return res.status(401).send("Unauthenticated");
    if (e.code === "MODULE_NOT_FOUND") {
      return res
        .status(501)
        .send('Puppeteer לא מותקן. הרץ: npm i puppeteer');
    }
    res.status(500).send("Server error");
  }
});

/* ---------- דוח פעילות לעובד: CSV ---------- */
router.get("/csv/activity", async (req, res) => {
  try {
    const ym = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : null;
    const buildingId = await resolveBuildingId(req);
    const worker = await resolveWorker(req);
    if (!buildingId) return res.status(401).json({ error: "Unauthenticated" });

    const items = [];

    // servicecalls
    {
      let sql =
        `SELECT call_id AS id, created_at AS ts, service_type, status,
                location_in_building, description, created_by
         FROM servicecalls
         WHERE building_id = ?
           ${ym ? "AND DATE_FORMAT(created_at,'%Y-%m')=?" : ""}`;
      const params = ym ? [buildingId, ym] : [buildingId];
      if (worker.name || worker.id) {
        sql += " AND (created_by = ? OR created_by = ?)";
        params.push(String(worker.name || ""), String(worker.id || ""));
      }
      const rows = await query(sql, params).catch(() => []);
      for (const r of rows) {
        items.push({
          type: "servicecall_open",
          ts: r.ts,
          ref: r.id,
          where: r.location_in_building || "",
          details: (r.description || "").replace(/"/g, '""'),
          extra: `${r.service_type || ""} ${r.status ? "(" + r.status + ")" : ""}`.trim(),
        });
      }
    }

    // servicecallupdates (optional)
    try {
      let sql =
        `SELECT u.update_id AS id, u.created_at AS ts, u.status, u.comment, u.call_id, u.created_by
         FROM servicecallupdates u
         JOIN servicecalls c ON c.call_id = u.call_id
         WHERE c.building_id = ?
           ${ym ? "AND DATE_FORMAT(u.created_at,'%Y-%m')=?" : ""}`;
      const params = ym ? [buildingId, ym] : [buildingId];
      if (worker.name || worker.id) {
        sql += " AND (u.created_by = ? OR u.created_by = ?)";
        params.push(String(worker.name || ""), String(worker.id || ""));
      }
      const rows = await query(sql, params);
      for (const r of rows) {
        items.push({
          type: "servicecall_update",
          ts: r.ts,
          ref: r.call_id,
          where: "",
          details: (r.comment || "").replace(/"/g, '""'),
          extra: r.status || "",
        });
      }
    } catch (_) {}

    // routinetaskexecutions (optional)
    try {
      let sql =
        `SELECT e.exec_id AS id, e.executed_at AS ts, e.note AS comment,
                e.created_by, e.executed_by, t.task_name
         FROM routinetaskexecutions e
         JOIN routinetasks t ON t.task_id = e.task_id
         WHERE t.building_id = ?
           ${ym ? "AND DATE_FORMAT(e.executed_at,'%Y-%m')=?" : ""}`;
      const params = ym ? [buildingId, ym] : [buildingId];
      if (worker.name || worker.id) {
        sql += " AND (e.created_by = ? OR e.executed_by = ?)";
        params.push(String(worker.name || ""), String(worker.name || ""));
      }
      const rows = await query(sql, params);
      for (const r of rows) {
        items.push({
          type: "routine_execution",
          ts: r.ts,
          ref: r.task_name || "",
          where: "",
          details: (r.comment || "").replace(/"/g, '""'),
          extra: "",
        });
      }
    } catch (_) {}

    // sort
    items.sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")));

    const header = ["timestamp", "type", "ref", "where", "details", "extra"];
    const csv =
      [header.join(",")]
        .concat(
          items.map((r) =>
            [
              `"${r.ts || ""}"`,
              `"${r.type || ""}"`,
              `"${String(r.ref || "")}"`,
              `"${(r.where || "").replace(/"/g, '""')}"`,
              `"${r.details || ""}"`,
              `"${r.extra || ""}"`,
            ].join(",")
          )
        )
        .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="worker-activity-${ym || "all"}-worker-${worker.id || "unknown"}.csv"`
    );
    res.send(csv);
  } catch (e) {
    console.error("csv activity error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
