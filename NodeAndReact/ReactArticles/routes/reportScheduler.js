// 📁 reportScheduler.js – הרצת דוחות חודשיים אוטומטיים
const cron = require("node-cron");
const { generateMonthlyWorkerReports } = require("./generateMonthlyWorkerReports");
const { generateMonthlyBuildingReports } = require("./generateMonthlyBuildingReports.js");

// 🕓 ירוץ כל 1 לחודש בשעה 04:00
cron.schedule("0 4 1 * *", () => {
  console.log("🚀 יוצרים דוחות חודשיים...");
  generateMonthlyWorkerReports();
  generateMonthlyBuildingReports();
});
