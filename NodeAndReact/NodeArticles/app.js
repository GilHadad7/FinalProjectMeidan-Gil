const express = require('express');
const app = express();
const cors = require('cors'); // ← חובה להוסיף
const authRoutes = require('./routes/auth'); // חדש
const serviceCallsRoutes = require("./routes/serviceCalls.routes");
const scheduleRoutes = require("./routes/schedule.routes");
const path = require("path");
const port = 8801;
const buildingsRouter = require("./routes/buildings.routes");
const tasksRouter = require("./routes/tasks");
const userRoutes = require("./routes/UserManagement");
// הפוך את התיקייה uploads לציבורית
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const suppliersRoutes = require("./routes/externalSuppliers.routes");
const workerReportsRoutes = require("./routes/workerReports.routes");
const buildingReportsRoutes = require("./routes/buildingReports.routes");
const cron = require("node-cron");
const { generateMonthlyBuildingReports } = require("./routes/generateMonthlyBuildingReports"); // שנה נתיב בהתאם
const { generateMonthlyWorkerReports } = require("./routes/generateMonthlyWorkerReports");
const reportsRoutes = require("./routes/reports.routes");
const usersRoutes = require("./routes/users.routes");



app.use("/api/reports/workers", workerReportsRoutes);
app.use("/api/reports/buildings", buildingReportsRoutes);



app.use(cors()); // ← חייב להיות לפני הראוטים שלך
app.use(express.json());
app.use("/api/users", usersRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", tasksRouter);
app.use("/api/buildings", buildingsRouter);
app.use("/api", scheduleRoutes);
app.use("/api/service-calls", serviceCallsRoutes);
app.use('/api', authRoutes); // חדש – לכל מה שקשור ל-Login
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/worker-reports", workerReportsRoutes);
app.use("/api/building-reports", buildingReportsRoutes);




cron.schedule("0 2 1 * *", () => {
  console.log("📅 מריץ דוחות חודשיים לעובדים...");
  generateMonthlyWorkerReports();
});

cron.schedule("0 1 1 * *", () => {
  console.log("🕐 מריץ דוחות חודשיים לבניינים...");
  generateMonthlyBuildingReports();
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});





app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
 