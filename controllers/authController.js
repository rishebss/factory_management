const { getUserByEmail, comparePassword } = require('../models/User');
const { generateToken } = require('../utils/helpers');

/* Login same for all users */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.'
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // For field workers, check if approved
    if (user.role === 'field_worker' && !user.isApproved) {
      return res.status(401).json({
        success: false,
        message: 'Your account is pending admin approval. You cannot login until approved.'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Remove password from user object
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token: token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/* Get current user profile (protected route) */
const getCurrentUser = async (req, res) => {
  try {
    // req.user is set by the authentication middleware
    const user = req.user;

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: user
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/*
 Logout user (client-side token removal)
 */
const logoutUser = async (req, res) => {
  try {
   
    
    res.json({
      success: true,
      message: 'Logout successful. Please remove the token from client storage.'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

//Note: The logout is handled on the client side by deleting the token. 

module.exports = {
  loginUser,
  getCurrentUser,
  logoutUser
};