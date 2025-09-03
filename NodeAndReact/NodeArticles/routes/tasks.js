// routes/routinetasks.routes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* ------------ helpers ------------- */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

// DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD -> YYYY-MM-DD
function normalizeDate(d) {
  if (!d) return null;
  if (d instanceof Date && !isNaN(d)) {
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tz).toISOString().slice(0, 10);
  }
  const s = String(d).trim();
  // already ISO-ish
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\D(\d{1,2})\D(\d{2,4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const MM = String(m[2]).padStart(2, "0");
    const yyyy = String(m[3]).length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${MM}-${dd}`;
  }
  // fallback: Date.parse
  const t = Date.parse(s);
  if (!isNaN(t)) {
    const tz = new Date(t).getTimezoneOffset() * 60000;
    return new Date(t - tz).toISOString().slice(0, 10);
  }
  return null;
}

function normalizeTime(t) {
  if (!t) return null;
  const [h = "00", m = "00", s = "00"] = String(t).split(":");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

// זיהוי "ניקיון" (כולל clean/cleaning)
function isCleaningType(type) {
  const t = String(type || "").toLowerCase();
  return /(ניקי?ו?ן|clean)/i.test(t);
}

/* בחירת אחראי: ניקיון->cleaner, אחרת->super; נפילות חכמות, ואז כל עובד בבניין */
function pickResponsible(buildingId, type) {
  const want = isCleaningType(type) ? "cleaner" : "super";
  const sqlPos = `
    SELECT u.user_id
    FROM buildings b
    JOIN users u ON FIND_IN_SET(u.user_id, COALESCE(b.assigned_workers,'')) > 0
    WHERE b.building_id = ? AND u.role='worker' AND u.position = ?
    ORDER BY u.user_id ASC LIMIT 1
  `;
  const sqlAny = `
    SELECT u.user_id
    FROM buildings b
    JOIN users u ON FIND_IN_SET(u.user_id, COALESCE(b.assigned_workers,'')) > 0
    WHERE b.building_id = ? AND u.role='worker'
    ORDER BY u.user_id ASC LIMIT 1
  `;
  return new Promise((resolve, reject) => {
    db.query(sqlPos, [buildingId, want], (e, r) => {
      if (e) return reject(e);
      if (r?.length) return resolve(r[0].user_id);
      const fb = want === "cleaner" ? "super" : "cleaner";
      db.query(sqlPos, [buildingId, fb], (e2, r2) => {
        if (e2) return reject(e2);
        if (r2?.length) return resolve(r2[0].user_id);
        db.query(sqlAny, [buildingId], (e3, r3) => {
          if (e3) return reject(e3);
          resolve(r3?.[0]?.user_id ?? null);
        });
      });
    });
  });
}

/* ------------- APIs -------------- */

// רשימה (עם שם אחראי)
router.get("/", (req, res) => {
  const sql = `
    SELECT r.*, b.name AS building_name, b.full_address,
           u.name AS responsible_name, u.position AS responsible_position
    FROM routinetasks r
    JOIN buildings b ON r.building_id = b.building_id
    LEFT JOIN users u ON u.user_id = r.responsible_user_id
    ORDER BY r.building_id, r.next_date
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows || []);
  });
});

// המלצה ל־UI
router.get("/recommend", async (req, res) => {
  try {
    const buildingId = Number(req.query.buildingId);
    const type = String(req.query.type || "");
    if (!Number.isFinite(buildingId)) return res.status(400).json({ error: "buildingId required" });
    const uid = await pickResponsible(buildingId, type);
    if (!uid) return res.json({ user_id: null, name: null, position: null });
    db.query("SELECT user_id, name, position FROM users WHERE user_id = ?", [uid], (e, r) => {
      if (e) return res.status(500).json({ error: "DB error" });
      res.json(r?.[0] || { user_id: null, name: null, position: null });
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "server error" });
  }
});

// יצירה
router.post("/", async (req, res) => {
  try {
    const {
      building_id,
      task_name,
      frequency,
      next_date,
      task_time,
      type,
      responsible_user_id,
      autoAssign,
      description
    } = req.body || {};

    if (!building_id || !task_name || !frequency || !next_date || !type) {
      return res.status(400).json({ error: "missing required fields" });
    }

    const nd = normalizeDate(next_date);
    const tt = normalizeTime(task_time);
    if (!nd) return res.status(400).json({ error: "bad next_date" });

    let responsible = responsible_user_id || null;
    if (!responsible || String(autoAssign || "0") === "1") {
      responsible = await pickResponsible(Number(building_id), type);
    }

    const created_at = new Date();

    // ניסיון ראשון – עם description/responsible_user_id
    const insertFull = `
      INSERT INTO routinetasks
        (building_id, task_name, frequency, next_date, created_at, task_time, type, responsible_user_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      await run(insertFull, [
        building_id, task_name, frequency, nd, created_at, tt, type, responsible, description ?? null
      ]);
      return res.json({ success: true });
    } catch (e) {
      // אם חסרה עמודה בטבלה (1054) – ננסה בלי העמודות החדשות
      if (e?.errno !== 1054) throw e;
      const insertFallback = `
        INSERT INTO routinetasks
          (building_id, task_name, frequency, next_date, created_at, task_time, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      await run(insertFallback, [
        building_id, task_name, frequency, nd, created_at, tt, type
      ]);
      return res.json({ success: true, note: "inserted without newer columns" });
    }
  } catch (e) {
    console.error("POST /api/tasks failed:", e);
    res.status(500).json({ error: "Insert failed" });
  }
});

// עדכון
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      building_id, task_name, frequency, next_date, task_time, type,
      responsible_user_id, autoAssign, description
    } = req.body || {};

    const nd = next_date != null ? normalizeDate(next_date) : null;
    const tt = task_time != null ? normalizeTime(task_time) : null;

    let responsible = responsible_user_id ?? null;
    if (String(autoAssign || "0") === "1" && building_id && type) {
      responsible = await pickResponsible(Number(building_id), type);
    }

    const sql = `
      UPDATE routinetasks SET
        building_id = COALESCE(?, building_id),
        task_name   = COALESCE(?, task_name),
        frequency   = COALESCE(?, frequency),
        next_date   = COALESCE(?, next_date),
        task_time   = COALESCE(?, task_time),
        type        = COALESCE(?, type),
        responsible_user_id = COALESCE(?, responsible_user_id),
        description = COALESCE(?, description)
      WHERE task_id = ?
    `;
    await run(sql, [
      building_id ?? null,
      task_name ?? null,
      frequency ?? null,
      nd ?? null,
      tt ?? null,
      type ?? null,
      responsible,
      description ?? null,
      id
    ]);

    res.json({ success: true });
  } catch (e) {
    console.error("PUT /api/tasks/:id failed:", e);
    res.status(500).json({ error: "Update failed" });
  }
});

// מחיקה
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM routinetasks WHERE task_id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "Delete failed" });
    res.json({ success: true });
  });
});

// שיוך אוטומטי גורף (לא חובה)
router.post("/auto-assign-all", async (req, res) => {
  try {
    const buildingId = req.query.buildingId ? Number(req.query.buildingId) : null;
    const rows = await run(
      `SELECT task_id, building_id, type FROM routinetasks ${buildingId ? "WHERE building_id=?" : ""}`,
      buildingId ? [buildingId] : []
    );
    for (const r of rows) {
      const uid = await pickResponsible(r.building_id, r.type);
      await run("UPDATE routinetasks SET responsible_user_id=? WHERE task_id=?", [uid, r.task_id]);
    }
    res.json({ updated: rows.length });
  } catch (e) {
    console.error("auto-assign-all failed:", e);
    res.status(500).json({ error: e.message || "server error" });
  }
});

module.exports = router;
