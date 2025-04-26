const express = require('express');
const app = express();
const cors = require('cors'); // ← חובה להוסיף

const authRoutes = require('./routes/auth'); // חדש

const port = 8801;
app.use(cors()); // ← חייב להיות לפני הראוטים שלך
app.use(express.json());

app.use('/api', authRoutes); // חדש – לכל מה שקשור ל-Login

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
 