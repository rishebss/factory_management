const express = require('express');
const { 
  rateTask, 
  getFieldWorkerRatings, 
  getRatableTasks 
} = require('../controllers/ratingController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/ratings/tasks/:id/rate
 * @desc    Rate a completed task (Customer only)
 * @access  Private (Customers)
 */
router.post('/tasks/:id/rate', rateTask);

/**
 * @route   GET /api/ratings/field-workers/:id
 * @desc    Get ratings for a specific field worker
 * @access  Private
 */
router.get('/field-workers/:id', getFieldWorkerRatings);

/**
 * @route   GET /api/ratings/ratable-tasks
 * @desc    Get completed tasks that can be rated by current user
 * @access  Private (Customers)
 */
router.get('/ratable-tasks', getRatableTasks);

module.exports = router;