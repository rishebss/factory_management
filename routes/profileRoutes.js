const express = require('express');
const { 
  getUserProfile, 
  updateProfile, 
  changePassword 
} = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/', getUserProfile);

/**
 * @route   PUT /api/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/', updateProfile);

/**
 * @route   PUT /api/profile/password
 * @desc    Change current user's password
 * @access  Private
 */
router.put('/password', changePassword);

/**
 * @route   GET /api/profile/:id
 * @desc    Get specific user profile (for viewing others, with restrictions)
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { getUserById } = require('../models/User');
    
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Basic info that can be shown to anyone
    const publicProfile = {
      id: user.id,
      name: user.name,
      role: user.role,
      // Field workers can show their skills and rating
      ...(user.role === 'field_worker' && {
        skills: user.skills,
        experience: user.experience,
        rating: user.rating,
        totalTasksCompleted: user.totalTasksCompleted
      })
    };

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: publicProfile
      }
    });

  } catch (error) {
    console.error('Get user profile by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;