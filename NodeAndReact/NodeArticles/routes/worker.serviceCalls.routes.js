const express = require("express");
const router = express.Router();
const db = require("../db");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

/* ---------- אחסון תמונות ---------- */
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
const UP_BASE = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
const UP_DIR = path.join(UP_BASE, "servicecalls");
ensureDir(UP_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `call_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage });

/* ---------- עזר: זיהוי עובד + בניין ---------- */
function getWorkerFromReq(req) {
  const user_id = req.session?.userId ?? null;
  const name = req.session?.userName ?? null;
  const building_id =
    req.session?.buildingId ??
    (Number(req.query.building_id || req.query.buildingId || req.headers["x-building-id"] || NaN) ||
      null);
  return { user_id, name, building_id };
}

/* ---------- נרמול סטטוס ---------- */
function normalizeStatus(s) {
  const t = String(s || "").trim().toLowerCase();
  if (t === "closed" || t === "סגור") return "Closed";
  return "Open";
}

/* ---------- בריאות ---------- */
router.get("/health", (req, res) => {
  res.json({ ok: true, user: getWorkerFromReq(req) });
});

/* ---------- שליפה לפי בניין ---------- */
router.get("/by-building", (req, res) => {
  const u = getWorkerFromReq(req);
  const buildingId = u.building_id;
  if (!buildingId) return res.status(400).json({ error: "missing building_id" });

  const sql = `
    SELECT
      call_id,
      building_id,
      service_type,
      description,
      status,
      location_in_building,
      image_url,
      created_at,
      created_by       AS created_by_name,
      closed_by        AS updated_by_name
    FROM servicecalls
    WHERE building_id = ?
    ORDER BY created_at DESC, call_id DESC
  `;
  db.query(sql, [buildingId], (err, rows) => {
    if (err) return res.status(500).json({ error: "db error", detail: err.message });
    res.json(rows || []);
  });
});

/* ---------- שליפה עם פילטרים (אופציונלי) ---------- */
router.get("/", (req, res) => {
  const u = getWorkerFromReq(req);
  if (!u.building_id) return res.status(401).json({ error: "no building on session" });

  const status = String(req.query.status || "").trim();
  const q = String(req.query.q || "").trim();
  const from = String(req.query.from || "").slice(0, 10);
  const to = String(req.query.to || "").slice(0, 10);

  const params = [u.building_id];
  let where = "WHERE building_id = ?";

  if (status) {
    where += " AND (LOWER(status) = LOWER(?))";
    params.push(status);
  }
  if (q) {
    where +=
      " AND (service_type LIKE CONCAT('%', ?, '%') OR description LIKE CONCAT('%', ?, '%'))";
    params.push(q, q);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    where += " AND DATE(created_at) >= ?";
    params.push(from);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    where += " AND DATE(created_at) <= ?";
    params.push(to);
  }

  const sql = `
    SELECT
      call_id, building_id, service_type, description, status,
      location_in_building, image_url, created_at,
      created_by AS created_by_name,
      closed_by  AS updated_by_name
    FROM servicecalls
    ${where}
    ORDER BY created_at DESC, call_id DESC
  `;
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "db error", detail: err.message });
    res.json(rows || []);
  });
});

/* ---------- פריט בודד ---------- */
router.get("/:id", (req, res) => {
  const u = getWorkerFromReq(req);
  if (!u.building_id) return res.status(401).json({ error: "no building on session" });

  const id = Number(req.params.id || NaN);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const sql = `
    SELECT call_id, building_id, service_type, description, status,
           location_in_building, image_url, created_at,
           created_by AS created_by_name,
           closed_by  AS updated_by_name
    FROM servicecalls
    WHERE call_id = ? AND building_id = ?
    LIMIT 1
  `;
  db.query(sql, [id, u.building_id], (err, rows) => {
    if (err) return res.status(500).json({ error: "db error", detail: err.message });
    if (!rows?.length) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  });
});

/* ---------- יצירה ---------- */
router.post("/", (req, res) => {
  const u = getWorkerFromReq(req);
  if (!u.building_id) return res.status(401).json({ error: "no building on session" });

  const { service_type, description, location_in_building } = req.body || {};
  if (!service_type || !description) return res.status(400).json({ error: "missing fields" });

  const sql = `
    INSERT INTO servicecalls
      (building_id, service_type, description, location_in_building, status, created_at, created_by)
    VALUES (?, ?, ?, ?, 'Open', NOW(), ?)
  `;
  db.query(
    sql,
    [u.building_id, service_type, description, location_in_building || "", u.name || "Worker"],
    (err, result) => {
      if (err) return res.status(500).json({ error: "db error", detail: err.message });
      res.json({ ok: true, call_id: result.insertId });
    }
  );
});

/* ---------- עדכון שדות + קובץ + סגירה (אופציונלי) ---------- */
router.put("/:id", upload.single("image"), (req, res) => {
  const u = getWorkerFromReq(req);
  if (!u.building_id) return res.status(401).json({ error: "no building on session" });

  const id = Number(req.params.id || NaN);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const { service_type, description, location_in_building } = req.body || {};
  const status = normalizeStatus(req.body?.status);

  const sets = [];
  const vals = [];

  if (service_type !== undefined) { sets.push("service_type = ?"); vals.push(service_type || null); }
  if (description !== undefined) { sets.push("description = ?"); vals.push(description || null); }
  if (location_in_building !== undefined) { sets.push("location_in_building = ?"); vals.push(location_in_building || null); }

  if (status !== undefined) {
    sets.push("status = ?");
    vals.push(status);
    if (status === "Closed") {
      const who = req.body?.closed_by || u.name || null;
      sets.push("closed_by = ?");
      vals.push(who);
    } else {
      sets.push("closed_by = NULL");
    }
  }

  if (req.file) {
    const publicUrl = `/uploads/servicecalls/${req.file.filename}`;
    sets.push("image_url = ?");
    vals.push(publicUrl);
  }

  if (!sets.length) return res.status(400).json({ error: "no fields to update" });

  vals.push(id, u.building_id);
  const sql = `UPDATE servicecalls SET ${sets.join(", ")} WHERE call_id = ? AND building_id = ?`;
  db.query(sql, vals, (err, result) => {
    if (err) return res.status(500).json({ error: "db error", detail: err.message });
    if (!result.affectedRows) return res.status(404).json({ error: "not found" });
    res.sendStatus(204);
  });
});

/* ---------- עדכון סטטוס בלבד (כותב closed_by) ---------- */
router.patch("/:id/status", (req, res) => {
  const u = getWorkerFromReq(req);
  if (!u.building_id) return res.status(401).json({ error: "no building on session" });

  const id = Number(req.params.id || NaN);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const status = normalizeStatus(req.body?.status);
  const sets = ["status = ?"];
  const vals = [status];

  if (status === "Closed") {
    sets.push("closed_by = ?");
    vals.push(req.body?.closed_by || u.name || null);
  } else {
    sets.push("closed_by = NULL");
  }

  vals.push(id, u.building_id);
  const sql = `UPDATE servicecalls SET ${sets.join(", ")} WHERE call_id = ? AND building_id = ?`;
  db.query(sql, vals, (err, result) => {
    if (err) return res.status(500).json({ error: "db error", detail: err.message });
    if (!result.affectedRows) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  });
});
// הערה: קריאות שירות לפי בניין או לפי עובד (הכל לפי assigned_workers)

router.get("/by-building", (req, res) => {
  // הערה: GET /api/service-calls/by-building?building_id=ID  או  ?worker_id=ID
  try {
    const buildingId = req.query.building_id ? Number(req.query.building_id) : null;
    const workerId = req.query.worker_id ? Number(req.query.worker_id) : null;

    const where = [];
    const params = [];

    if (buildingId) {
      where.push("sc.building_id = ?");
      params.push(buildingId);
    } else if (workerId) {
      where.push("FIND_IN_SET(?, b.assigned_workers)");
      params.push(workerId);
    } else {
      return res.status(400).json({ error: "building_id or worker_id is required" });
    }

    const sql = `
      SELECT sc.*, b.full_address AS building_address
      FROM servicecalls sc
      JOIN buildings b ON sc.building_id = b.building_id
      WHERE ${where.join(" AND ")}
      ORDER BY sc.call_id DESC
    `;

    db.query(sql, params, (err, rows) => {
      if (err) {
        console.error("service-calls by-building error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      return res.json(rows || []);
    });
  } catch (e) {
    console.error("service-calls by-building crash:", e);
    return res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
