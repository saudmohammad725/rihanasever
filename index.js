import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/config.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import bookingRoutes from './routes/bookings.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const PORT = config.PORT || 5000;

// Middleware
app.use(cors({
  origin: config.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files (Admin Panel)
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root path - redirect to admin panel
app.get('/', (req, res) => {
  res.redirect('/admin.html');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Rihana Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler - only for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: true,
    message: 'API route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Rihana Server Started Successfully!\n');
  console.log('📍 Admin Panel:    http://localhost:' + PORT + '/admin.html');
  console.log('📍 Backend API:    http://localhost:' + PORT);
  console.log('📍 API Health:     http://localhost:' + PORT + '/api/health');
  console.log('📍 Website:        http://localhost:5173');
  console.log('\n✅ Server is ready!');
  console.log('💡 Admin Login: admin@rihana.com / Admin@123456\n');
});

export default app;

