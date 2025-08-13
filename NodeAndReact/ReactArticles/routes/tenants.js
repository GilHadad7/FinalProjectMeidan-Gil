const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tenants?building_id=7
router.get('/tenants', (req, res) => {
  const { building_id } = req.query;

  if (building_id) {
    db.query(
      `SELECT user_id AS tenant_id, name, building_id
       FROM users
       WHERE role='tenant' AND building_id = ?`,
      [building_id],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'failed to fetch tenants' });
        }
        res.json(rows);
      }
    );
  } else {
    db.query(
      `SELECT user_id AS tenant_id, name, building_id
       FROM users
       WHERE role='tenant'`,
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'failed to fetch tenants' });
        }
        res.json(rows);
      }
    );
  }
});

module.exports = router;
