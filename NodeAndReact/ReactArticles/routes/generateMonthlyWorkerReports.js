const db = require("../db");

async function generateMonthlyWorkerReports() {
  const month = new Date().toISOString().slice(0, 7);

  // שולף את כל העובדים בלי לנסות להביא שכר
  const [workers] = await db.query("SELECT user_id FROM users WHERE role = 'worker'");

  for (const w of workers) {
    const [exists] = await db.query(
      "SELECT * FROM employee_reports WHERE employee_id = ? AND month = ?",
      [w.user_id, month]
    );

    if (exists.length === 0) {
      await db.query(
        `INSERT INTO employee_reports (employee_id, month, salary, paid)
         VALUES (?, ?, ?, false)`,
        [w.user_id, month, 2000]
      );
      console.log(`👷 נוצר דוח לעובד ${w.user_id} לחודש ${month} עם שכר 2000 ₪`);
    } else {
      console.log(`🔁 כבר קיים דוח לעובד ${w.user_id} לחודש ${month}`);
    }
  }
}

module.exports = { generateMonthlyWorkerReports };
