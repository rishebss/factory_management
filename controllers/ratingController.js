const Task = require('../models/Task');
const ServiceRequest = require('../models/ServiceRequest');

/* Rate a completed task only users allowed to rate the task ,field workers cannot edit*/
const rateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { rating, feedback } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!rating) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required'
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Get the task first to verify ownership
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get the service request to verify customer ownership
    const serviceRequest = await ServiceRequest.findById(task.serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Verify that the current user is the customer who requested the service
    if (serviceRequest.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only rate services that you requested'
      });
    }

    // Check if task is already rated
    if (task.customerRating) {
      return res.status(400).json({
        success: false,
        message: 'This task has already been rated'
      });
    }

    // Add rating to task
    const updatedTask = await Task.addRating(taskId, rating, feedback);

    res.json({
      success: true,
      message: 'Thank you for your rating!',
      data: {
        task: updatedTask
      }
    });

  } catch (error) {
    console.error('Rate task error:', error);
    
    if (error.message.includes('not found') || 
        error.message.includes('not completed') ||
        error.message.includes('already been rated')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting rating',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/* Get ratings for a field worker */
const getFieldWorkerRatings = async (req, res) => {
  try {
    const fieldWorkerId = req.params.id;
    const { limit = 10 } = req.query;

    // Get ratings for the field worker
    const ratings = await Task.getRatingsForFieldWorker(fieldWorkerId, parseInt(limit));

    // Calculate statistics
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum, task) => sum + task.customerRating, 0) / totalRatings
      : 0;

    const ratingDistribution = {
      5: ratings.filter(task => task.customerRating === 5).length,
      4: ratings.filter(task => task.customerRating === 4).length,
      3: ratings.filter(task => task.customerRating === 3).length,
      2: ratings.filter(task => task.customerRating === 2).length,
      1: ratings.filter(task => task.customerRating === 1).length
    };

    res.json({
      success: true,
      message: 'Field worker ratings retrieved successfully',
      data: {
        ratings: ratings,
        statistics: {
          totalRatings: totalRatings,
          averageRating: Math.round(averageRating * 10) / 10, // 1 decimal
          ratingDistribution: ratingDistribution
        }
      }
    });

  } catch (error) {
    console.error('Get field worker ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving field worker ratings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/* Get ratable tasks for current user (completed but not rated) */
const getRatableTasks = async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can rate tasks'
      });
    }

    // Get all service requests by this user
    const userServiceRequests = await ServiceRequest.findByUserId(userId);
    
    // Get task IDs from service requests
    const serviceRequestIds = userServiceRequests.map(req => req.id);
    
    if (serviceRequestIds.length === 0) {
      return res.json({
        success: true,
        message: 'No completed tasks found for rating',
        data: {
          tasks: [],
          count: 0
        }
      });
    }

    // Get completed tasks for these service requests that haven't been rated (only completed tasks can be rated)
    const ratableTasks = [];
    
    for (const serviceRequest of userServiceRequests) {
      if (serviceRequest.status === 'completed') {
        const task = await Task.findByServiceRequest(serviceRequest.id);
        if (task && task.status === 'completed' && !task.customerRating) {
          // Add service request details to task for display
          const taskWithDetails = {
            ...task,
            serviceRequestTitle: serviceRequest.title,
            serviceRequestDescription: serviceRequest.description
          };
          ratableTasks.push(taskWithDetails);
        }
      }
    }

    res.json({
      success: true,
      message: 'Ratable tasks retrieved successfully',
      data: {
        tasks: ratableTasks,
        count: ratableTasks.length
      }
    });

  } catch (error) {
    console.error('Get ratable tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving ratable tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  rateTask,
  getFieldWorkerRatings,
  getRatableTasks
};