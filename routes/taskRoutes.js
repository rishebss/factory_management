const express = require('express');
const Task = require('../models/Task');
const ServiceRequest = require('../models/ServiceRequest');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/tasks/assign
 * @desc    Assign a service request to a field worker (Admin only)
 * @access  Private (Admin)
 */
router.post('/assign', requireRole(['admin']), async (req, res) => {
  try {
    const { serviceRequestId, fieldWorkerId } = req.body;
    const adminId = req.user.id; // Admin who is assigning

    // Validate required fields
    if (!serviceRequestId || !fieldWorkerId) {
      return res.status(400).json({
        success: false,
        message: 'Service request ID and field worker ID are required'
      });
    }

    // Check if service request exists and is open
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    if (serviceRequest.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Service request is already assigned or completed'
      });
    }

    // Check if task already exists for this service request
    const existingTask = await Task.findByServiceRequest(serviceRequestId);
    if (existingTask) {
      return res.status(400).json({
        success: false,
        message: 'This service request is already assigned to a field worker'
      });
    }

    // Create new task
    const taskData = {
      serviceRequestId: serviceRequestId,
      fieldWorkerId: fieldWorkerId,
      assignedBy: adminId,
      status: 'assigned'
    };

    const task = new Task(taskData);
    await task.save();

    // Update service request status and assigned field worker
    await serviceRequest.update({
      status: 'assigned',
      assignedFieldWorkerId: fieldWorkerId
    });

    res.status(201).json({
      success: true,
      message: 'Service request assigned to field worker successfully',
      data: {
        task: task,
        serviceRequest: serviceRequest
      }
    });

  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning task',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/tasks
 * @desc    Get tasks based on user role
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let tasks;

    if (req.user.role === 'admin') {
      // Admins can see all tasks
      tasks = await Task.findAll({ status });
    } else if (req.user.role === 'field_worker') {
      // Field workers can see their assigned tasks
      tasks = await Task.findByFieldWorker(req.user.id, status);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and field workers can view tasks.'
      });
    }

    res.json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: {
        tasks: tasks,
        count: tasks.length
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/tasks/:id/status
 * @desc    Update task status (Field workers can update their own tasks)
 * @access  Private
 */
router.put('/:id/status', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status, completionNotes, completionPhotos } = req.body;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['assigned', 'in-progress', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required: assigned, in-progress, completed, cancelled'
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Authorization check
    if (req.user.role === 'field_worker' && task.fieldWorkerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own tasks.'
      });
    }

    // Prepare update data
    const updateData = { status };
    
    // Add completion data if task is being completed
    if (status === 'completed') {
      updateData.completedAt = new Date().toISOString();
      updateData.completionNotes = completionNotes || '';
      updateData.completionPhotos = completionPhotos || [];
    } else if (status === 'in-progress' && task.status === 'assigned') {
      updateData.startedAt = new Date().toISOString();
    }

    // Update task
    await task.update(updateData);

    // Also update service request status
    const serviceRequest = await ServiceRequest.findById(task.serviceRequestId);
    if (serviceRequest) {
      await serviceRequest.update({ status: status });
    }

    res.json({
      success: true,
      message: `Task status updated to ${status} successfully`,
      data: {
        task: task
      }
    });

  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get specific task by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Authorization check
    if (req.user.role === 'field_worker' && task.fieldWorkerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own tasks.'
      });
    }

    res.json({
      success: true,
      message: 'Task retrieved successfully',
      data: {
        task: task
      }
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving task',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;