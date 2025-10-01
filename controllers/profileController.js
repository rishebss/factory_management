const { updateUserProfile, getUserById } = require('../models/User');

/* Get user profile */
const getUserProfile = async (req, res) => {
  try {
    // req.user is set by authentication middleware
    const user = req.user;

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: user
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/* Update user profile */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // only user themself is updating their own profile
    if (req.params.id && req.params.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    // Basic validation
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update data provided'
      });
    }

    // Validate email cannot be changed (best security practice for preserving identity)
    if (updateData.email) {
      return res.status(400).json({
        success: false,
        message: 'Email cannot be changed. Please contact support if you need to change your email.'
      });
    }

    // Validate role cannot be changed
    if (updateData.role) {
      return res.status(400).json({
        success: false,
        message: 'Role cannot be changed. Please contact admin if you need to change your role.'
      });
    }

    // Validate skills format if provided
    if (updateData.skills && !Array.isArray(updateData.skills)) {
      return res.status(400).json({
        success: false,
        message: 'Skills must be an array'
      });
    }

    // Update user profile
    const updatedUser = await updateUserProfile(userId, updateData, req.user.role);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/* Change password */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const { comparePassword, hashPassword } = require('../models/User');
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password no other entity should see plain text password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    const { updateUser } = require('../models/User');
    await updateUser(userId, { password: hashedNewPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  changePassword
};