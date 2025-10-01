const express = require('express');
const { 
  createUser, 
  getUserById, 
  getAllUsers,
  getPendingFieldWorkers 
} = require('../models/User');

const router = express.Router();

/**
 * @route   POST /api/users/register
 * @desc    Register a new user (customer or field worker)
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, skills, experience, licenseNumber } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields'
      });
    }

    // Validate role
    if (role && !['user', 'field_worker','admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "user" or "field_worker or "admin"'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Prepare user data
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: role || 'user',
      phone: phone ? phone.trim() : ''
    };

    // Add field worker specific fields if role is field_worker
    if (role === 'field_worker') {
      userData.skills = skills || [];
      userData.experience = experience || '';
      userData.licenseNumber = licenseNumber || '';
    }

    // Create user
    const user = await createUser(userData);

    // Prepare response message based on role
    let message = 'User registered successfully';
    if (role === 'field_worker') {
      message = 'Field worker registered successfully. Please wait for admin approval before you can receive tasks.';
    }

    res.status(201).json({
      success: true,
      message: message,
      data: {
        user: user
      }
    });

  } catch (error) {
    console.error('Register user error:', error);
    
    // Handle duplicate email error
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/users
 * @desc    Get all registered users (customers only - not field workers)
 * @access  Public (for now, later we'll add admin authentication)
 */
router.get('/', async (req, res) => {
  try {
    // Get only regular users (customers), not field workers
    const users = await getAllUsers({ role: 'user' });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: users,
        count: users.length
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Public (for now, later we'll add authentication)
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: user
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/users/field-workers/pending
 * @desc    Get all pending field workers (for admin approval)
 * @access  Public (for now, later we'll add admin authentication)
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
    console.error('Get pending workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving pending field workers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


/**
 * UPDATE USER
 */
const updateUser = async (id, updateData) => {
  try {
    const docRef = usersCollection.doc(id);
    
    // Add updated timestamp
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Update the document
    await docRef.update(dataToUpdate);
    
    // Return updated user
    const updatedDoc = await docRef.get();
    const userData = updatedDoc.data();
    
    return {
      id: updatedDoc.id,
      ...userData,
      password: undefined
    };
    
  } catch (error) {
    console.error('❌ Error in updateUser:', error);
    throw error;
  }
};

module.exports = router;