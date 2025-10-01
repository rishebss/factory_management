const express = require('express');
const ServiceRequest = require('../models/ServiceRequest');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/service-requests
 * @desc    Create a new service request (Customers only)
 * @access  Private (Customers)
 */
router.post('/', requireRole(['user']), async (req, res) => {
  try {
    const { title, description, location, urgency, category, budget, preferredDate } = req.body;
    const userId = req.user.id; // From authentication middleware

    // Validate required fields
    if (!title || !description || !location || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, location, and category are required fields'
      });
    }

    // Validate urgency
    const validUrgencies = ['low', 'medium', 'high', 'critical'];
    if (urgency && !validUrgencies.includes(urgency)) {
      return res.status(400).json({
        success: false,
        message: 'Urgency must be: low, medium, high, or critical'
      });
    }

    // Create service request
    const serviceRequestData = {
      userId: userId,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      urgency: urgency || 'medium',
      category: category.trim(),
      budget: budget || 0,
      preferredDate: preferredDate || null
    };

    const serviceRequest = new ServiceRequest(serviceRequestData);
    await serviceRequest.save();

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: {
        serviceRequest: serviceRequest
      }
    });

  } catch (error) {
    console.error('Create service request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/service-requests
 * @desc    Get service requests for the current user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let serviceRequests;

    if (req.user.role === 'user') {
      // Customers can only see their own requests
      serviceRequests = await ServiceRequest.findByUserId(req.user.id, status);
    } else if (req.user.role === 'admin') {
      // Admins can see all requests
      serviceRequests = await ServiceRequest.findAll({ status });
    } else if (req.user.role === 'field_worker') {
      // Field workers can see assigned requests
      serviceRequests = await ServiceRequest.findAll({ 
        status, 
        assignedFieldWorkerId: req.user.id 
      });
    }

    res.json({
      success: true,
      message: 'Service requests retrieved successfully',
      data: {
        serviceRequests: serviceRequests,
        count: serviceRequests.length
      }
    });

  } catch (error) {
    console.error('Get service requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving service requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/service-requests/:id
 * @desc    Get specific service request by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    const serviceRequest = await ServiceRequest.findById(requestId);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Authorization check
    if (req.user.role === 'user' && serviceRequest.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own service requests.'
      });
    }

    if (req.user.role === 'field_worker' && serviceRequest.assignedFieldWorkerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This request is not assigned to you.'
      });
    }

    res.json({
      success: true,
      message: 'Service request retrieved successfully',
      data: {
        serviceRequest: serviceRequest
      }
    });

  } catch (error) {
    console.error('Get service request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving service request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/service-requests/:id
 * @desc    Update service request (Customers can update their own, Admins can update any)
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { title, description, location, urgency, budget, preferredDate } = req.body;

    const serviceRequest = await ServiceRequest.findById(requestId);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Authorization check
    if (req.user.role === 'user' && serviceRequest.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own service requests.'
      });
    }

    // Prepare update data
    const updateData = {};
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (location) updateData.location = location.trim();
    if (urgency) updateData.urgency = urgency;
    if (budget !== undefined) updateData.budget = budget;
    if (preferredDate !== undefined) updateData.preferredDate = preferredDate;

    // Update service request
    await serviceRequest.update(updateData);

    res.json({
      success: true,
      message: 'Service request updated successfully',
      data: {
        serviceRequest: serviceRequest
      }
    });

  } catch (error) {
    console.error('Update service request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;