const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

/** helper: שמירת חודש לדוח הבניינים (UPSERT) */
function recalcBuildingsMonth(month, cb = () => {}) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    month = new Date().toISOString().slice(0, 7);
  }
  const sql = `
  INSERT INTO building_finance (building_id, month, total_paid, balance_due, maintenance)
  SELECT
    b.building_id,
    ? AS month,
    COALESCE(tp.total_paid, 0) AS total_paid,
    COALESCE(bd.balance_due, 0) AS balance_due,
    COALESCE(mp.maint_from_payments, 0) + COALESCE(ms.maint_from_calls, 0) AS maintenance
  FROM buildings b
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS total_paid
    FROM payments
    WHERE status = 'שולם' AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) tp ON tp.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS balance_due
    FROM payments
    WHERE status IN ('חוב','ממתין') AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) bd ON bd.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(amount) AS maint_from_payments
    FROM payments
    WHERE status = 'שולם'
      AND category IN ('תחזוקת בניין','ניקיון','שירות מעלית','אבטחה')
      AND DATE_FORMAT(payment_date, '%Y-%m') = ?
    GROUP BY building_id
  ) mp ON mp.building_id = b.building_id
  LEFT JOIN (
    SELECT building_id, SUM(COALESCE(cost,0)) AS maint_from_calls
    FROM servicecalls
    WHERE status IN ('Closed','סגור')
      AND DATE_FORMAT(created_at, '%Y-%m') = ?
    GROUP BY building_id
  ) ms ON ms.building_id = b.building_id
  ON DUPLICATE KEY UPDATE
    total_paid = VALUES(total_paid),
    balance_due = VALUES(balance_due),
    maintenance = VALUES(maintenance);
  `;
  db.query(sql, [month, month, month, month, month], (err) => {
    if (err) console.error("recalcBuildingsMonth failed:", err);
    cb(err || null);
  });
}

function ymFrom(v) {
  if (!v) return new Date().toISOString().slice(0, 7);
  const d = new Date(v);
  return isNaN(d) ? String(v).slice(0, 7) : d.toISOString().slice(0, 7);
}

/**
 * ⭕ GET /api/service-calls
 * מחזיר קריאות שירות. תומך בסינון לפי month=YYYY-MM.
 * מבטל Join כפולים ל-users (שגרמו להכפלות) ומצרף כתובת בניין בלבד.
 */
router.get("/", (req, res) => {
  const { month } = req.query || {};
  const params = [];
  let where = "";

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    where = "WHERE DATE_FORMAT(sc.created_at, '%Y-%m') = ?";
    params.push(month);
  }

  const sql = `
    SELECT
      sc.*,
      b.full_address AS building_address,
      sc.created_by AS created_by_name,
      sc.closed_by  AS updated_by_name
    FROM servicecalls sc
    LEFT JOIN buildings b ON sc.building_id = b.building_id
    ${where}
    ORDER BY sc.call_id DESC
  `;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching service calls:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(results);
  });
});

/**
 * 🔄 PUT /api/service-calls/:id
 * עידכון קריאה קיימת, כולל cost
 */
router.put("/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const {
    status,
    description,
    location_in_building,
    service_type,
    closed_by,
    cost, // ← קיבלנו מהפורם
  } = req.body;

  const image_url = req.file
    ? `http://localhost:8801/uploads/${req.file.filename}`
    : undefined;

  const fields = [];
  const values = [];

  if (typeof status !== "undefined") { fields.push("status = ?"); values.push(status); }
  if (typeof description !== "undefined") { fields.push("description = ?"); values.push(description); }
  if (typeof location_in_building !== "undefined") { fields.push("location_in_building = ?"); values.push(location_in_building); }
  if (typeof service_type !== "undefined") { fields.push("service_type = ?"); values.push(service_type); }
  if (typeof image_url !== "undefined") { fields.push("image_url = ?"); values.push(image_url); }

  // cost
  if (typeof cost !== "undefined") {
    if (cost === "") {
      fields.push("cost = NULL");
    } else {
      fields.push("cost = ?");
      values.push(parseFloat(cost));
    }
  }

  // closed_by
  if (status === "Closed" && closed_by) {
    fields.push("closed_by = ?");
    values.push(closed_by);
  } else if (status !== "Closed") {
    fields.push("closed_by = NULL");
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: "לא נשלחו שדות לעדכון" });
  }

  const sql = `
    UPDATE servicecalls
    SET ${fields.join(", ")}
    WHERE call_id = ?
  `;
  values.push(id);

  db.query(sql, values, (err) => {
    if (err) {
      console.error("שגיאה בעדכון:", err);
      return res.status(500).json({ message: "שגיאה במסד" });
    }
    // לשלוף, להשיב, ואז לרענן חודש
    db.query("SELECT * FROM servicecalls WHERE call_id = ?", [id], (err2, rows) => {
      if (err2 || !rows.length) {
        return res.status(500).json({ message: "שגיאה בשליפה" });
      }
      const row = rows[0];
      res.json(row); // משיבים ללקוח מיד
      const ym = ymFrom(row.closed_at || row.created_at || new Date());
      recalcBuildingsMonth(ym);
    });
  });
});

/**
 * ➕ POST /api/service-calls
 * יצירת קריאה חדשה, כולל cost
 */
router.post("/", upload.single("image"), (req, res) => {
  const {
    building_id,
    description,
    location_in_building,
    service_type,
    status,
    read_index,
    created_by,
    cost, // ← cost אקרא מהפורם
  } = req.body;

  if (
    !building_id ||
    !description ||
    !location_in_building ||
    !service_type ||
    !status ||
    !read_index ||
    !created_by
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const image_url = req.file
    ? `http://localhost:8801/uploads/${req.file.filename}`
    : null;

  const cols = [
    "building_id",
    "description",
    "location_in_building",
    "service_type",
    "status",
    "read_index",
    "created_by",
    "image_url",
    "cost",
  ];
  const placeholders = cols.map(() => "?").join(", ");
  const values = [
    building_id,
    description,
    location_in_building,
    service_type,
    status,
    read_index,
    created_by,
    image_url,
    cost && cost !== "" ? parseFloat(cost) : null,
  ];

  const sql = `
    INSERT INTO servicecalls 
    (${cols.join(", ")})
    VALUES (${placeholders})
  `;

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error inserting service call:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(201).json({ message: "Service call created", id: result.insertId });
    // רענון חודש נוכחי (או לפי created_at של הרשומה – בהיעדר, נשתמש בחודש הנוכחי)
    const ym = new Date().toISOString().slice(0, 7);
    recalcBuildingsMonth(ym);
  });
});

/**
 * 🗑 DELETE /api/service-calls/:id
 */
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM servicecalls WHERE call_id = ?", [id], (err) => {
    if (err) {
      console.error("שגיאה במחיקה:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(200).json({ message: "הקריאה נמחקה בהצלחה" });
  });
});

module.exports = router;
