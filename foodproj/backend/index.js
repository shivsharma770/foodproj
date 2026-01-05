/**
 * Food Rescue Platform - Backend API
 * Express server with Firebase integration
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { isDemo } = require('./config/firebase');

// Firebase initializes lazily on first isDemo() call
// Just trigger it once at startup to show the status message
isDemo();

const app = express();

// Middleware
app.use(express.json());

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In production, allow Railway/Vercel domains
    if (process.env.NODE_ENV === 'production') {
      if (origin.includes('railway.app') || 
          origin.includes('vercel.app') || 
          origin.includes('web.app') ||
          allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }
    
    // In development, allow localhost
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all for now (tighten in production)
  },
  credentials: true
}));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    demo: isDemo()
  });
});

// Root route (helps with Railway "service is up" checks and manual visits)
app.get('/', (req, res) => {
  res.json({
    name: 'Food Rescue Platform API',
    status: 'ok',
    health: '/health',
    demo: isDemo()
  });
});

// Routes
const authRoutes = require('./routes/auth');
const foodOffersRoutes = require('./routes/foodOffers');
const volunteersRoutes = require('./routes/volunteers');
const pickupsRoutes = require('./routes/pickups');
const messagesRoutes = require('./routes/messages');
const reportsRoutes = require('./routes/reports');

app.use('/auth', authRoutes);
app.use('/food_offers', foodOffersRoutes);
app.use('/volunteers', volunteersRoutes);
app.use('/pickups', pickupsRoutes);
app.use('/messages', messagesRoutes);
app.use('/reports', reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     Food Rescue Platform - Backend API            ║
╠═══════════════════════════════════════════════════╣
║  Server running on port ${PORT}                      ║
║  Environment: ${process.env.NODE_ENV || 'development'}                ║
${isDemo() ? '║  ⚠️  DEMO MODE (no Firebase credentials)         ║\n' : ''}╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = app;

