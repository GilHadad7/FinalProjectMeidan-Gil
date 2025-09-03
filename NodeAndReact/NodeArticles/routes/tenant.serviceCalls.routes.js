// routes/serviceCalls.routes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");

// ---------- helpers ----------
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
const UP_BASE = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
const UP_DIR = path.join(UP_BASE, "servicecalls");
ensureDir(UP_DIR);

// save file to /uploads/servicecalls
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const fname = `call_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, fname);
  },
});
const upload = multer({ storage });

// מחזיר את המשתמש המחובר (התאם ליישום שלך)
function getLoggedUser(req) {
  if (req.user) {
    return {
      id: req.user.id || req.user.user_id,
      name: req.user.name || req.user.full_name || null,
      email: req.user.email || null,
      role: req.user.role || req.user.position || null,
    };
  }
  if (req.session?.user) {
    return {
      id: req.session.user.id || req.session.user.user_id,
      name: req.session.user.name || req.session.user.full_name || null,
      email: req.session.user.email || null,
      role: req.session.user.role || req.session.user.position || null,
    };
  }
  // fallback לפיתוח דרך query
  return {
    id: Number(req.query.userId || 0) || null,
    name: req.query.userName || null,
    email: req.query.userEmail || null,
    role: req.query.userRole || null,
  };
}

// מקבל ערך סטטוס באנגלית או בעברית ומחזיר אחד מ: Open | Closed
function normalizeStatus(s) {
  const t = String(s || "").trim().toLowerCase();
  if (t === "closed" || t === "סגור") return "Closed";
  return "Open";
}

// ---------- READ: לפי בניין ----------
router.get("/by-building", (req, res) => {
  const buildingId = Number(req.query.building_id || req.query.buildingId || 0);
  if (!buildingId) return res.status(400).json({ error: "missing building_id" });

  const sql = `
    SELECT
      sc.call_id,
      sc.building_id,
      b.name  AS building_name,
      b.address AS building_address,
      sc.call_type         AS service_type,     -- אליאס לשם שהפרונט מצפה לו
      sc.description,
      sc.status,
      sc.location_in_building,
      sc.image_url,
      sc.created_at,
      sc.created_by        AS created_by_name,
      sc.updated_by_name,
      sc.updated_by_email,
      sc.updated_by_id,
      sc.closed_at
    FROM servicecalls sc
    LEFT JOIN buildings b ON b.building_id = sc.building_id
    WHERE sc.building_id = ?
    ORDER BY sc.created_at DESC
  `;
  db.query(sql, [buildingId], (err, rows) => {
    if (err) {
      console.error("service-calls by-building failed:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows || []);
  });
});

// ---------- UPDATE (עם תמונה) ----------
router.put("/:id", upload.single("image"), (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "bad id" });

  // שדות מהלקוח
  const {
    service_type,      // מהפרונט
    call_type,         // גיבוי אם שולחים בשם אחר
    description,
    location_in_building,
    status,
    updated_by_name,
    updated_by_email,
    updated_by_id,
    closed_at,
  } = req.body || {};

  // בונה SET דינמי
  const sets = [];
  const vals = [];

  // מיפוי שם השדה בעמודה
  const _callType = service_type ?? call_type;
  if (_callType !== undefined) { sets.push("call_type = ?"); vals.push(_callType || null); }
  if (description !== undefined) { sets.push("description = ?"); vals.push(description || null); }
  if (location_in_building !== undefined) { sets.push("location_in_building = ?"); vals.push(location_in_building || null); }
  if (status !== undefined) { sets.push("status = ?"); vals.push(normalizeStatus(status)); }

  // תמונה (אופציונלי)
  if (req.file) {
    // ודא שבשרת הגדרת static ל- /uploads (ראה למטה)
    const publicUrl = `/uploads/servicecalls/${req.file.filename}`;
    sets.push("image_url = ?");
    vals.push(publicUrl);
  }

  // אם סטטוס נסגר – שים “בוצע ע״י”
  const finalStatus = status !== undefined ? normalizeStatus(status) : null;
  if (finalStatus === "Closed") {
    if (updated_by_name !== undefined) { sets.push("updated_by_name = ?"); vals.push(updated_by_name || null); }
    if (updated_by_email !== undefined) { sets.push("updated_by_email = ?"); vals.push(updated_by_email || null); }
    if (updated_by_id !== undefined)    { sets.push("updated_by_id = ?"); vals.push(updated_by_id || null); }
    sets.push("closed_at = COALESCE(?, NOW())");
    vals.push(closed_at || null);
  }

  // אם פותחים מחדש ורוצים לאפס שדות סגירה:
  if (finalStatus === "Open") {
    sets.push("closed_at = NULL");
    // לאפס גם updated_by_* אם זה הקונספט אצלך:
    // sets.push("updated_by_name = NULL, updated_by_email = NULL, updated_by_id = NULL");
  }

  if (sets.length === 0) return res.status(400).json({ error: "no fields to update" });
  vals.push(id);

  const sql = `UPDATE servicecalls SET ${sets.join(", ")} WHERE call_id = ?`;
  db.query(sql, vals, (err) => {
    if (err) {
      console.error("service-calls update failed:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.sendStatus(204);
  });
});

// ---------- PATCH סטטוס בלבד (אופציונלי) ----------
router.patch("/:id/status", (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "bad id" });

  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "missing status" });

  const normalized = normalizeStatus(status);
  const u = getLoggedUser(req);

  const sets = ["status = ?"];
  const vals = [normalized];

  if (normalized === "Closed") {
    sets.push("updated_by_name = ?", "updated_by_email = ?", "updated_by_id = ?", "closed_at = NOW()");
    vals.push(u.name || null, u.email || null, u.id || null);
  } else {
    sets.push("closed_at = NULL");
  }

  vals.push(id);

  const sql = `UPDATE servicecalls SET ${sets.join(", ")} WHERE call_id = ?`;
  db.query(sql, vals, (err) => {
    if (err) {
      console.error("service-calls patch status failed:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.sendStatus(204);
  });
});

// ---------- DELETE ----------
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "bad id" });

  // אם אתה רוצה למחוק גם קובץ תמונה, תחילה משוך את הנתיב:
  db.query("SELECT image_url FROM servicecalls WHERE call_id = ?", [id], (e1, rows) => {
    if (e1) {
      console.error("service-calls select before delete failed:", e1);
      return res.status(500).json({ error: "Database error" });
    }
    const url = rows?.[0]?.image_url || null;

    db.query("DELETE FROM servicecalls WHERE call_id = ?", [id], (e2) => {
      if (e2) {
        console.error("service-calls delete failed:", e2);
        return res.status(500).json({ error: "Database error" });
      }

      // מחיקת הקובץ (best effort)
      if (url && url.startsWith("/uploads/servicecalls/")) {
        const p = path.join(UP_BASE, url.replace("/uploads/", ""));
        fs.unlink(p, () => {}); // ignore errors
      }
      res.sendStatus(204);
    });
  });
});

module.exports = router;
