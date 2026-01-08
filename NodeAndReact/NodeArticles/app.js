const express = require('express');
const app = express();
const cors = require('cors'); // נשאר
const authRoutes = require('./routes/auth');
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
const cron = require("node-cron");
const { generateMonthlyBuildingReports } = require("./routes/generateMonthlyBuildingReports.js");
const { generateMonthlyWorkerReports } = require("./routes/generateMonthlyWorkerReports.js");
const reportsRoutes = require("./routes/reports.routes");
const usersRoutes = require("./routes/users.routes");
const paymentsRoutes = require("./routes/payments.routes");
const remindersRoutes = require("./routes/reminders.js");
const tenantsRouter = require("./routes/tenants");
const managerRoutes = require("./routes/manager.routes");
require("./routes/reportScheduler");

// דייר
const tenantServiceCallsRoutes = require('./routes/tenant.serviceCalls.routes');

// עובד
const workerServiceCallsRoutes = require("./routes/worker.serviceCalls.routes");
const workerReportsRoutes = require("./routes/worker.reports.routes");
const workerScheduleRoutes = require("./routes/worker.schedule.routes");


// עובד
app.use("/api/worker/service-calls", workerServiceCallsRoutes);
app.use("/api/worker/reports", workerReportsRoutes);
app.use("/api/worker/schedule", workerScheduleRoutes);

/* ========= CORS עם credentials (חשוב לשים לפני כל הראוטים) ========= */
const corsOptions = {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // פרה-פלייט
app.use(express.json());
/* ================== Routes ================== */
app.use("/api/users", usersRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", tasksRouter);
app.use("/api/buildings", buildingsRouter);
app.use("/api", scheduleRoutes);
app.use("/api/service-calls", serviceCallsRoutes);
app.use('/api', authRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api", tenantsRouter);
app.use("/api/manager", managerRoutes);
// דייר
app.use('/api/tenant/service-calls', tenantServiceCallsRoutes);
app.use("/api/tenant/payments", require("./routes/tenant.payments.routes"));
app.use("/api/tenant/reports", require("./routes/tenant.reports.routes"));

/* =============== Cron =============== */
cron.schedule("0 2 1 * *", () => {
  console.log("📅 מריץ דוחות חודשיים לעובדים...");
  generateMonthlyWorkerReports();
});

cron.schedule("0 1 1 * *", () => {
  console.log("🕐 מריץ דוחות חודשיים לבניינים...");
  generateMonthlyBuildingReports();
});

/* =============== Error handler =============== */
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
generateMonthlyBuildingReports();
