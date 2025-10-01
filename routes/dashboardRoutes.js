const express = require('express');
const { 
  getCustomerDashboard,
  getFieldWorkerDashboard,
  getAdminDashboard
} = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard based on user role
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    switch (req.user.role) {
      case 'user':
        return await getCustomerDashboard(req, res);
      case 'field_worker':
        return await getFieldWorkerDashboard(req, res);
      case 'admin':
        return await getAdminDashboard(req, res);
      default:
        return res.status(403).json({
          success: false,
          message: 'Unknown user role'
        });
    }
  } catch (error) {
    console.error('Dashboard route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/dashboard/customer
 * @desc    Get customer dashboard (explicit endpoint)
 * @access  Private (Customers)
 */
router.get('/customer', getCustomerDashboard);

/**
 * @route   GET /api/dashboard/field-worker
 * @desc    Get field worker dashboard (explicit endpoint)
 * @access  Private (Field Workers)
 */
router.get('/field-worker', getFieldWorkerDashboard);

/**
 * @route   GET /api/dashboard/admin
 * @desc    Get admin dashboard (explicit endpoint)
 * @access  Private (Admins)
 */
router.get('/admin', getAdminDashboard);

module.exports = router;