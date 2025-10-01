const express = require('express');
const { 
  getAllUsers,
  getPendingFieldWorkers,
  updateUser 
} = require('../models/User');

const router = express.Router();

/**
 * @route   GET /api/field-workers
 * @desc    Get all field workers (approved and pending)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const fieldWorkers = await getAllUsers({ role: 'field_worker' });

    res.json({
      success: true,
      message: 'Field workers retrieved successfully',
      data: {
        workers: fieldWorkers,
        count: fieldWorkers.length
      }
    });

  } catch (error) {
    console.error('Get field workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving field workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/field-workers/pending
 * @desc    Get all pending field workers
 * @access  Public
 */
router.get('/pending', async (req, res) => {
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
    console.error('Get pending workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving pending field workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/field-workers/approved
 * @desc    Get all approved field workers
 * @access  Public
 */
router.get('/approved', async (req, res) => {
  try {
    const approvedWorkers = await getAllUsers({ 
      role: 'field_worker', 
      isApproved: true 
    });

    res.json({
      success: true,
      message: 'Approved field workers retrieved successfully',
      data: {
        workers: approvedWorkers,
        count: approvedWorkers.length
      }
    });

  } catch (error) {
    console.error('Get approved workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving approved field workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/field-workers/:id/approve
 * @desc    Approve a field worker
 * @access  Public (for now - anyone can approve)
 */
router.put('/:id/approve', async (req, res) => {
  try {
    const workerId = req.params.id;

    // Validate worker ID
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Field worker ID is required'
      });
    }

    // Get the worker first to check if they exist and are a field worker
    const worker = await getAllUsers({ role: 'field_worker' }).then(workers => 
      workers.find(w => w.id === workerId)
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Field worker not found'
      });
    }

    if (worker.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Field worker is already approved'
      });
    }

    // Update the field worker to approved
    const updateData = {
      isApproved: true,
      updatedAt: new Date().toISOString()
    };

    const approvedWorker = await updateUser(workerId, updateData);

    res.json({
      success: true,
      message: 'Field worker approved successfully',
      data: {
        worker: approvedWorker
      }
    });

  } catch (error) {
    console.error('Approve field worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving field worker',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/field-workers/:id/reject
 * @desc    Reject a field worker (deactivate them)
 * @access  Public (for now - anyone can reject)
 */
router.put('/:id/reject', async (req, res) => {
  try {
    const workerId = req.params.id;

    // Validate worker ID
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Field worker ID is required'
      });
    }

    // Get the worker first to check if they exist and are a field worker
    const worker = await getAllUsers({ role: 'field_worker' }).then(workers => 
      workers.find(w => w.id === workerId)
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Field worker not found'
      });
    }

    // Deactivate the field worker
    const updateData = {
      isActive: false,
      updatedAt: new Date().toISOString()
    };

    const rejectedWorker = await updateUser(workerId, updateData);

    res.json({
      success: true,
      message: 'Field worker rejected and deactivated successfully',
      data: {
        worker: rejectedWorker
      }
    });

  } catch (error) {
    console.error('Reject field worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting field worker',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;