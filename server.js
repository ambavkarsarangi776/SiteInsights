require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

// Initialize database pool (triggers startup test query)
require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes
const scanRoutes = require('./routes/scan');
app.use('/api', scanRoutes);

// Central error handler (registered last)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Website Speed Doctor server running on port ${PORT}`);
});

module.exports = app;
