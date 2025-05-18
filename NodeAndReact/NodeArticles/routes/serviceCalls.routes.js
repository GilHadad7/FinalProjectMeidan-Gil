const express = require("express");
const router = express.Router();
const db = require("../db"); // התחברות למסד הנתונים
const multer = require("multer");
const path = require("path");

// הגדרת אחסון קבצים
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // תיקייה שבה ישמרו הקבצים
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });


// ✅ יצירת קריאה חדשה עם קובץ תמונה

router.put("/:id", upload.single("image"), (req, res) => {

  const { id } = req.params;
  const {
    status,
    description,
    location_in_building,
    service_type
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
  if ( typeof service_type !== "undefined") {
    fields.push("service_type = ?");
    values.push(service_type);
  }
  if (typeof image_url !== "undefined") {
    fields.push("image_url = ?");
    values.push(image_url);
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



// ✅ שליפת כל הקריאות עם כתובת בניין ושם יוזר
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      sc.*,
      b.full_address AS building_address,
      u.name AS created_by_name
    FROM servicecalls sc
    LEFT JOIN buildings b ON sc.building_id = b.building_id
    LEFT JOIN users u ON sc.created_by = u.name
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


// ✅ מחיקת קריאה לפי ID
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM servicecalls WHERE call_id = ?`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("שגיאה במחיקה:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(200).json({ message: "הקריאה נמחקה בהצלחה" });
  });
});
// ✅ יצירת קריאת שירות חדשה
router.post("/", upload.single("image"), (req, res) => {
  const {
    building_id,
    description,
    location_in_building,
    service_type,
    status,
    read_index,
    created_by,
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
