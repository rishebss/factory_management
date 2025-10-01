const express = require('express');
const { 
  getAllUsers,
  getPendingFieldWorkers,
  updateUser,
  approveFieldWorker,
  rejectFieldWorker
} = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const allUsers = await getAllUsers();
    
    // Calculate statistics
    const customers = allUsers.filter(user => user.role === 'user');
    const fieldWorkers = allUsers.filter(user => user.role === 'field_worker');
    const pendingWorkers = fieldWorkers.filter(worker => !worker.isApproved);
    const approvedWorkers = fieldWorkers.filter(worker => worker.isApproved);
    const activeUsers = allUsers.filter(user => user.isActive);
    const inactiveUsers = allUsers.filter(user => !user.isActive);

    const stats = {
      totalUsers: allUsers.length,
      totalCustomers: customers.length,
      totalFieldWorkers: fieldWorkers.length,
      pendingFieldWorkers: pendingWorkers.length,
      approvedFieldWorkers: approvedWorkers.length,
      activeUsers: activeUsers.length,
      inactiveUsers: inactiveUsers.length,
      // Future stats (when we have tasks)
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0
    };

    // Recent pending workers (last 10)
    const recentPendingWorkers = pendingWorkers
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({
      success: true,
      message: 'Admin dashboard data retrieved successfully',
      data: {
        stats: stats,
        recentPendingWorkers: recentPendingWorkers,
        recentActivity: [] // Can add recent activities later
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering and pagination
 * @access  Private (Admin only)
 */
router.get('/users', async (req, res) => {
  try {
    const { role, isActive, isApproved, page = 1, limit = 10 } = req.query;
    
    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isApproved !== undefined) filters.isApproved = isApproved === 'true';

    const allUsers = await getAllUsers(filters);
    
    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = allUsers.slice(startIndex, endIndex);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: paginatedUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(allUsers.length / limit),
          totalUsers: allUsers.length,
          hasNext: endIndex < allUsers.length,
          hasPrev: startIndex > 0
        }
      }
    });

  } catch (error) {
    console.error('Get users admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Activate or deactivate any user
 * @access  Private (Admin only)
 */
router.put('/users/:id/status', async (req, res) => {
  try {
    const userId = req.params.id;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean (true or false)'
      });
    }

    // Prevent admin from deactivating themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const updateData = { isActive };
    const updatedUser = await updateUser(userId, updateData);

    const action = isActive ? 'activated' : 'deactivated';
    
    res.json({
      success: true,
      message: `User ${action} successfully`,
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/admin/field-workers/:id/approve
 * @desc    Approve a field worker (Admin only version)
 * @access  Private (Admin only)
 */
router.put('/field-workers/:id/approve', async (req, res) => {
  try {
    const workerId = req.params.id;

    const approvedWorker = await approveFieldWorker(workerId);

    res.json({
      success: true,
      message: 'Field worker approved successfully',
      data: {
        worker: approvedWorker
      }
    });

  } catch (error) {
    console.error('Approve field worker admin error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not a field worker') || error.message.includes('already approved')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error approving field worker',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/admin/field-workers/:id/reject
 * @desc    Reject a field worker (Admin only version)
 * @access  Private (Admin only)
 */
router.put('/field-workers/:id/reject', async (req, res) => {
  try {
    const workerId = req.params.id;

    const result = await rejectFieldWorker(workerId);

    res.json({
      success: true,
      message: 'Field worker rejected successfully',
      data: result
    });

  } catch (error) {
    console.error('Reject field worker admin error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not a field worker')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error rejecting field worker',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/admin/field-workers/pending
 * @desc    Get pending field workers with details (Admin only)
 * @access  Private (Admin only)
 */
router.get('/field-workers/pending', async (req, res) => {
  try {
    const pendingWorkers = await getPendingFieldWorkers();

    res.json({
      success: true,
      message: 'Pending field workers retrieved successfully',
      data: {
        workers: pendingWorkers,
        count: pendingWorkers.length
      }
    });

  } catch (error) {
    console.error('Get pending workers admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving pending field workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;