require('dotenv').config();
const express = require('express');
const helmet = require('helmet'); 
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const userRoutes = require('./routes/userRoutes');
const fieldWorkerRoutes = require('./routes/fieldWorkerRoutes');
const authRoutes = require('./routes/authRoutes'); 
const adminRoutes = require('./routes/adminRoutes');
const serviceRequestRoutes = require('./routes/serviceRequestRoutes');
const taskRoutes = require('./routes/taskRoutes');
const profileRoutes = require('./routes/profileRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Import admin initialization
const { initializeDefaultAdmin } = require('./config/firebase');

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize default admin on startup
initializeDefaultAdmin().then(() => {
  console.log('✅ Admin initialization completed');
}).catch(error => {
  console.error('❌ Admin initialization failed:', error);
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/field-workers', fieldWorkerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Basic route (default root server response)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 FieldOps API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      // Authentication
      login: 'POST /api/auth/login',
      getProfile: 'GET /api/auth/me',
      logout: 'POST /api/auth/logout',
      
      // User endpoints
      registerUser: 'POST /api/users/register',
      getAllUsers: 'GET /api/users',
      getUserById: 'GET /api/users/:id',
      
      // Field worker endpoints
      getAllFieldWorkers: 'GET /api/field-workers',
      getPendingFieldWorkers: 'GET /api/field-workers/pending',
      getApprovedFieldWorkers: 'GET /api/field-workers/approved',
      
      // Admin endpoints
      adminDashboard: 'GET /api/admin/dashboard',
      adminUsers: 'GET /api/admin/users',
      activateUser: 'PUT /api/admin/users/:id/status',
      approveFieldWorker: 'PUT /api/admin/field-workers/:id/approve',
      rejectFieldWorker: 'PUT /api/admin/field-workers/:id/reject',
      adminPendingWorkers: 'GET /api/admin/field-workers/pending',
      
      // Service Request endpoints
      createServiceRequest: 'POST /api/service-requests',
      getServiceRequests: 'GET /api/service-requests',
      getServiceRequest: 'GET /api/service-requests/:id',
      updateServiceRequest: 'PUT /api/service-requests/:id',
      
      // Task endpoints
      assignTask: 'POST /api/tasks/assign',
      getTasks: 'GET /api/tasks',
      getTask: 'GET /api/tasks/:id',
      updateTaskStatus: 'PUT /api/tasks/:id/status',
      
      // Profile endpoints
      getProfile: 'GET /api/profile',
      updateProfile: 'PUT /api/profile',
      changePassword: 'PUT /api/profile/password',
      getPublicProfile: 'GET /api/profile/:id',
      
      // Rating endpoints
      rateTask: 'POST /api/ratings/tasks/:id/rate',
      getFieldWorkerRatings: 'GET /api/ratings/field-workers/:id',
      getRatableTasks: 'GET /api/ratings/ratable-tasks',
      
      // Dashboard endpoints
      getDashboard: 'GET /api/dashboard',
      getCustomerDashboard: 'GET /api/dashboard/customer',
      getFieldWorkerDashboard: 'GET /api/dashboard/field-worker',
      getAdminDashboard: 'GET /api/dashboard/admin'
    }
  });
});

// Health check (best practice for monitoring)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: ' Server is healthy',
    database: 'Firebase Firestore',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server - Vercel will handle this


// Start server
app.listen(PORT, () => {
  console.log(` FieldOps Server running on port ${PORT}`);
  console.log(` Base URL: http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` Available endpoints:`);
  console.log(` AUTH ROUTES:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/api/auth/me (Protected)`);
  console.log(`   POST http://localhost:${PORT}/api/auth/logout (Protected)`);
  console.log(` USER ROUTES:`);
  console.log(`   POST http://localhost:${PORT}/api/users/register`);
  console.log(`   GET  http://localhost:${PORT}/api/users`);
  console.log(`   GET  http://localhost:${PORT}/api/users/{id}`);
  console.log(` FIELD WORKER ROUTES:`);
  console.log(`   GET  http://localhost:${PORT}/api/field-workers`);
  console.log(`   GET  http://localhost:${PORT}/api/field-workers/pending`);
  console.log(`   GET  http://localhost:${PORT}/api/field-workers/approved`);
  console.log(` ADMIN ROUTES (Protected):`);
  console.log(`   GET  http://localhost:${PORT}/api/admin/dashboard`);
  console.log(`   GET  http://localhost:${PORT}/api/admin/users`);
  console.log(`   PUT  http://localhost:${PORT}/api/admin/users/{id}/status`);
  console.log(`   PUT  http://localhost:${PORT}/api/admin/field-workers/{id}/approve`);
  console.log(`   PUT  http://localhost:${PORT}/api/admin/field-workers/{id}/reject`);
  console.log(`   GET  http://localhost:${PORT}/api/admin/field-workers/pending`);
  console.log(` SERVICE REQUEST ROUTES (Protected):`);
  console.log(`   POST http://localhost:${PORT}/api/service-requests (Customer only)`);
  console.log(`   GET  http://localhost:${PORT}/api/service-requests`);
  console.log(`   GET  http://localhost:${PORT}/api/service-requests/{id}`);
  console.log(`   PUT  http://localhost:${PORT}/api/service-requests/{id}`);
  console.log(` TASK ROUTES (Protected):`);
  console.log(`   POST http://localhost:${PORT}/api/tasks/assign (Admin only)`);
  console.log(`   GET  http://localhost:${PORT}/api/tasks`);
  console.log(`   GET  http://localhost:${PORT}/api/tasks/{id}`);
  console.log(`   PUT  http://localhost:${PORT}/api/tasks/{id}/status`);
  console.log(` PROFILE ROUTES (Protected):`);
  console.log(`   GET  http://localhost:${PORT}/api/profile`);
  console.log(`   PUT  http://localhost:${PORT}/api/profile`);
  console.log(`   PUT  http://localhost:${PORT}/api/profile/password`);
  console.log(`   GET  http://localhost:${PORT}/api/profile/{id}`);
  console.log(` RATING ROUTES (Protected):`);
  console.log(`   POST http://localhost:${PORT}/api/ratings/tasks/{id}/rate (Customer only)`);
  console.log(`   GET  http://localhost:${PORT}/api/ratings/field-workers/{id}`);
  console.log(`   GET  http://localhost:${PORT}/api/ratings/ratable-tasks (Customer only)`);
  console.log(` DASHBOARD ROUTES (Protected):`);
  console.log(`   GET  http://localhost:${PORT}/api/dashboard (Auto-role-based)`);
  console.log(`   GET  http://localhost:${PORT}/api/dashboard/customer (Customer only)`);
  console.log(`   GET  http://localhost:${PORT}/api/dashboard/field-worker (Field Worker only)`);
  console.log(`   GET  http://localhost:${PORT}/api/dashboard/admin (Admin only)`);
  console.log(`💡 TIP: Use Authorization: Bearer <token> header for protected routes`);
});

