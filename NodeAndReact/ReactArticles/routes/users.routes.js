const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/users  (אפשר לסנן לפי role)
router.get("/", (req, res) => {
  const { role } = req.query;

  // הערה: אנחנו שומרים על ההחזר הקיים (u.* + שם/כתובת של בניין לדיירים),
  // ומוסיפים לעובדים את רשימת הבניינים דרך assigned_workers:
  // worker_buildings_names / worker_buildings_full_addresses / worker_buildings_ids (CSV)
  let sql = `
    SELECT
      u.*,

      -- דיירים: שיוך ישיר דרך users.building_id
      b1.name         AS building_name,
      b1.full_address AS building_full_address,

      -- עובדים: כל הבניינים בהם הוא משויך דרך assigned_workers (CSV של user_id-ים)
      GROUP_CONCAT(DISTINCT b2.name ORDER BY b2.name SEPARATOR ', ')          AS worker_buildings_names,
      GROUP_CONCAT(DISTINCT b2.full_address ORDER BY b2.full_address SEPARATOR ', ') AS worker_buildings_full_addresses,
      GROUP_CONCAT(DISTINCT b2.building_id ORDER BY b2.building_id SEPARATOR ',')    AS worker_buildings_ids
    FROM users u
    LEFT JOIN buildings b1
      ON b1.building_id = u.building_id
    LEFT JOIN buildings b2
      ON FIND_IN_SET(u.user_id, b2.assigned_workers) > 0
  `;

  const params = [];
  if (role) {
    sql += ` WHERE u.role = ?`;
    params.push(role);
  }

  // מאחדים שורות לכל משתמש (העמודות של b2 הן אגרגטיביות)
  sql += ` GROUP BY u.user_id`;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

// POST /api/users — דייר חייב building_id (כמו אצלך)
router.post("/", (req, res) => {
  const { name, role, phone, email, password, id_number, building_id } = req.body || {};

  if (!name || !role || !email || !password) {
    return res.status(400).json({ error: "name, role, email, password are required" });
  }
  if (role === "tenant" && !building_id) {
    return res.status(400).json({ error: "tenant must have building_id" });
  }

  const bId = role === "tenant" ? Number(building_id) : null;

  const sql = `
    INSERT INTO users (name, role, phone, email, password, id_number, building_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [name, role, phone ?? null, email, password, id_number ?? null, bId], (err, result) => {
    if (err) {
      console.error("Insert failed:", err);
      return res.status(500).json({ error: "Insert failed" });
    }
    res.status(201).json({
      id: result.insertId,
      name, role, phone, email, id_number,
      building_id: bId
    });
  });
});

// PUT /api/users/:id — דייר חייב building_id (כמו אצלך)
router.put("/:id", (req, res) => {
  const { name, role, phone, email, id_number, building_id, password } = req.body || {};

  if (!name || !role || !email) {
    return res.status(400).json({ error: "name, role, email are required" });
  }
  if (role === "tenant" && !building_id) {
    return res.status(400).json({ error: "tenant must have building_id" });
  }

  const bId = role === "tenant" ? Number(building_id) : null;

  const sql = `
    UPDATE users
    SET name = ?, role = ?, phone = ?, email = ?, id_number = ?, building_id = ?, password = COALESCE(?, password)
    WHERE user_id = ?
  `;

  db.query(sql, [name, role, phone ?? null, email, id_number ?? null, bId, password ?? null, req.params.id], (err) => {
    if (err) {
      console.error("Update failed:", err);
      return res.status(500).json({ error: "Update failed" });
    }
    res.sendStatus(200);
  });
});

// DELETE /api/users/:id
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM users WHERE user_id = ?", [req.params.id], (err) => {
    if (err) {
      console.error("Delete failed:", err);
      return res.status(500).json({ error: "Delete failed" });
    }
    res.sendStatus(200);
  });
});

module.exports = router;
