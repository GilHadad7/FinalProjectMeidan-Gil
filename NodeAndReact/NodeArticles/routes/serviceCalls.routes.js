const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ✅ עדכון קריאה קיימת
router.put("/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const {
    status,
    description,
    location_in_building,
    service_type,
    closed_by
  } = req.body;

  const image_url = req.file
    ? `http://localhost:8801/uploads/${req.file.filename}`
    : undefined;

  const fields = [];
  const values = [];

  if (typeof status !== "undefined") {
    fields.push("status = ?");
    values.push(status);
  }
  if (typeof description !== "undefined") {
    fields.push("description = ?");
    values.push(description);
  }
  if (typeof location_in_building !== "undefined") {
    fields.push("location_in_building = ?");
    values.push(location_in_building);
  }
  if (typeof service_type !== "undefined") {
    fields.push("service_type = ?");
    values.push(service_type);
  }
  if (typeof image_url !== "undefined") {
    fields.push("image_url = ?");
    values.push(image_url);
  }

  // 💡 אם סטטוס הפך ל-Closed, שמור גם את סוגר הקריאה
  if (status === "Closed" && closed_by) {
    fields.push("closed_by = ?");
    values.push(closed_by);
  } else if (status === "Open" || status === "In Progress") {
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

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("שגיאה בעדכון:", err);
      return res.status(500).json({ message: "שגיאה במסד" });
    }

    db.query("SELECT * FROM servicecalls WHERE call_id = ?", [id], (err2, rows) => {
      if (err2 || !rows.length) {
        return res.status(500).json({ message: "שגיאה בשליפה" });
      }
      res.json(rows[0]);
    });
  });
});

// ✅ שליפת כל הקריאות כולל כתובת ושמות פותח וסוגר
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      sc.*,
      b.full_address AS building_address,
      u.name AS created_by_name,
      u2.name AS updated_by_name
    FROM servicecalls sc
    LEFT JOIN buildings b ON sc.building_id = b.building_id
    LEFT JOIN users u ON sc.created_by = u.name
    LEFT JOIN users u2 ON sc.closed_by = u2.name
    ORDER BY sc.call_id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching service calls:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(results);
  });
});

// ✅ מחיקת קריאה
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM servicecalls WHERE call_id = ?", [id], (err, result) => {
    if (err) {
      console.error("שגיאה במחיקה:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(200).json({ message: "הקריאה נמחקה בהצלחה" });
  });
});

// ✅ יצירת קריאה חדשה
router.post("/", upload.single("image"), (req, res) => {
  const {
    building_id,
    description,
    location_in_building,
    service_type,
    status,
    read_index,
    created_by
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

  const image_url = req.file ? `http://localhost:8801/uploads/${req.file.filename}` : null;

  const sql = `
    INSERT INTO servicecalls 
    (building_id, description, location_in_building, service_type, status, read_index, created_by, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [building_id, description, location_in_building, service_type, status, read_index, created_by, image_url],
    (err, result) => {
      if (err) {
        console.error("Error inserting service call:", err);
        return res.status(500).json({ message: "Database error" });
      }

      res.status(201).json({ message: "Service call created", id: result.insertId });
    }
  );
});

module.exports = router;
