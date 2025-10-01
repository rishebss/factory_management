const ServiceRequest = require('../models/ServiceRequest');
const Task = require('../models/Task');
const { getAllUsers } = require('../models/User');

/* Get customer dashboard */
const getCustomerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only customers can access this dashboard.'
      });
    }

    // Get user's service requests
    const serviceRequests = await ServiceRequest.findByUserId(userId);
    
    // Calculate statistics
    const totalRequests = serviceRequests.length;
    const openRequests = serviceRequests.filter(req => req.status === 'open').length;
    const assignedRequests = serviceRequests.filter(req => req.status === 'assigned').length;
    const inProgressRequests = serviceRequests.filter(req => req.status === 'in-progress').length;
    const completedRequests = serviceRequests.filter(req => req.status === 'completed').length;

    // Get recent requests (last 5)
    const recentRequests = serviceRequests
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Get pending ratings (completed but not rated)
    const pendingRatings = serviceRequests.filter(req => 
      req.status === 'completed' && 
      req.assignedFieldWorkerId && 
      !req.customerRating
    ).length;

    res.json({
      success: true,
      message: 'Customer dashboard data retrieved successfully',
      data: {
        stats: {
          totalRequests: totalRequests,
          openRequests: openRequests,
          assignedRequests: assignedRequests,
          inProgressRequests: inProgressRequests,
          completedRequests: completedRequests,
          pendingRatings: pendingRatings
        },
        recentRequests: recentRequests,
        quickActions: [
          {
            title: 'Create New Request',
            description: 'Submit a new service request',
            action: 'create_request',
            endpoint: '/api/service-requests'
          },
          {
            title: 'View Pending Ratings',
            description: 'Rate your completed services',
            action: 'view_ratings', 
            endpoint: '/api/ratings/ratable-tasks'
          }
        ]
      }
    });

  } catch (error) {
    console.error('Customer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving customer dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/* Get field worker dashboard */
const getFieldWorkerDashboard = async (req, res) => {
  try {
    const fieldWorkerId = req.user.id;

    if (req.user.role !== 'field_worker') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only field workers can access this dashboard.'
      });
    }

    // Get field worker's tasks
    const tasks = await Task.findByFieldWorker(fieldWorkerId);
    
    // Calculate statistics
    const totalTasks = tasks.length;
    const assignedTasks = tasks.filter(task => task.status === 'assigned').length;
    const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    
    // Calculate completion rate
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Get average rating from user data (since we update it there)
    const userData = req.user; // From auth middleware
    const averageRating = userData.rating || 0;
    const totalRatings = tasks.filter(task => task.customerRating).length;

    // Get recent tasks (last 5)
    const recentTasks = tasks
      .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
      .slice(0, 5);

    // Calculate earnings (simplified - based on completed tasks)
    const estimatedEarnings = completedTasks * 50; // Assuming $50 per task

    res.json({
      success: true,
      message: 'Field worker dashboard data retrieved successfully',
      data: {
        stats: {
          totalTasks: totalTasks,
          assignedTasks: assignedTasks,
          inProgressTasks: inProgressTasks,
          completedTasks: completedTasks,
          completionRate: Math.round(completionRate),
          averageRating: averageRating,
          totalRatings: totalRatings,
          estimatedEarnings: estimatedEarnings
        },
        recentTasks: recentTasks,
        performance: {
          tasksThisMonth: completedTasks, // Simplified
          ratingTrend: 'stable', // Could be calculated from historical data
          completionSpeed: '2.5 days avg' // Could be calculated
        },
        quickActions: [
          {
            title: 'View Assigned Tasks',
            description: 'Check your current assignments',
            action: 'view_tasks',
            endpoint: '/api/tasks?status=assigned'
          },
          {
            title: 'Update Availability',
            description: 'Set your working hours',
            action: 'update_availability',
            endpoint: '/api/profile'
          }
        ]
      }
    });

  } catch (error) {
    console.error('Field worker dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving field worker dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/* Get admin dashboard (enhanced version) */
const getAdminDashboard = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can access this dashboard.'
      });
    }

    // Get all data for comprehensive admin dashboard
    const allUsers = await getAllUsers();
    const allServiceRequests = await ServiceRequest.findAll();
    const allTasks = await Task.findAll();

    // User statistics
    const customers = allUsers.filter(user => user.role === 'user');
    const fieldWorkers = allUsers.filter(user => user.role === 'field_worker');
    const pendingWorkers = fieldWorkers.filter(worker => !worker.isApproved);
    const approvedWorkers = fieldWorkers.filter(worker => worker.isApproved);
    const activeUsers = allUsers.filter(user => user.isActive);

    // Service request statistics
    const openRequests = allServiceRequests.filter(req => req.status === 'open');
    const assignedRequests = allServiceRequests.filter(req => req.status === 'assigned');
    const inProgressRequests = allServiceRequests.filter(req => req.status === 'in-progress');
    const completedRequests = allServiceRequests.filter(req => req.status === 'completed');

    // Task statistics
    const assignedTasks = allTasks.filter(task => task.status === 'assigned');
    const inProgressTasks = allTasks.filter(task => task.status === 'in-progress');
    const completedTasks = allTasks.filter(task => task.status === 'completed');

    // Calculate average rating for field workers
    const ratedWorkers = fieldWorkers.filter(worker => worker.rating > 0);
    const averageWorkerRating = ratedWorkers.length > 0 
      ? ratedWorkers.reduce((sum, worker) => sum + worker.rating, 0) / ratedWorkers.length 
      : 0;

    // Recent activities (last 10)
    const recentServiceRequests = allServiceRequests
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    const recentTasks = allTasks
      .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
      .slice(0, 10);

    res.json({
      success: true,
      message: 'Admin dashboard data retrieved successfully',
      data: {
        stats: {
          // User stats
          totalUsers: allUsers.length,
          totalCustomers: customers.length,
          totalFieldWorkers: fieldWorkers.length,
          pendingFieldWorkers: pendingWorkers.length,
          approvedFieldWorkers: approvedWorkers.length,
          activeUsers: activeUsers.length,
          
          // Request stats
          totalServiceRequests: allServiceRequests.length,
          openServiceRequests: openRequests.length,
          assignedServiceRequests: assignedRequests.length,
          inProgressServiceRequests: inProgressRequests.length,
          completedServiceRequests: completedRequests.length,
          
          // Task stats
          totalTasks: allTasks.length,
          assignedTasks: assignedTasks.length,
          inProgressTasks: inProgressTasks.length,
          completedTasks: completedTasks.length,
          
          // Performance stats
          averageWorkerRating: Math.round(averageWorkerRating * 10) / 10,
          completionRate: allServiceRequests.length > 0 
            ? (completedRequests.length / allServiceRequests.length) * 100 
            : 0
        },
        recentActivities: {
          serviceRequests: recentServiceRequests,
          tasks: recentTasks
        },
        pendingApprovals: pendingWorkers.slice(0, 5),
        quickActions: [
          {
            title: 'Manage Users',
            description: 'View and manage all users',
            action: 'manage_users',
            endpoint: '/api/admin/users'
          },
          {
            title: 'Approve Field Workers',
            description: 'Review pending field worker applications',
            action: 'approve_workers', 
            endpoint: '/api/admin/field-workers/pending'
          },
          {
            title: 'Assign Tasks',
            description: 'Assign service requests to field workers',
            action: 'assign_tasks',
            endpoint: '/api/tasks/assign'
          }
        ]
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving admin dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getCustomerDashboard,
  getFieldWorkerDashboard,
  getAdminDashboard
};