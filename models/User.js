const { db } = require('../config/firebase.js');

// User collection reference
const usersCollection = db.collection('users');

// function to hash passwords
const bcrypt = require('bcryptjs');
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// function to compare passwords
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * CREATE A NEW USER
 */
const createUser = async (userData) => {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Prepare user data
    const newUser = {
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: hashedPassword, // Store hashed password
      role: userData.role || 'user',
      phone: userData.phone || '',
      isActive: true,
      
      // Field worker specific fields
      skills: userData.skills || [],
      experience: userData.experience || '',
      licenseNumber: userData.licenseNumber || '',
      isApproved: userData.role === 'field_worker' ? false : true, // Field workers need approval
      
      // Ratings and stats
      rating: 0,
      totalTasksCompleted: 0,
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to Firestore
    const docRef = await usersCollection.add(newUser);
    
    console.log(`✅ User ${userData.email} created successfully`);

    // Return user without password
    return {
      id: docRef.id,
      ...newUser,
      password: undefined // Remove password from response
    };

  } catch (error) {
    console.error('❌ Error in createUser:', error);
    throw error;
  }
};

/**
 * GET USER BY ID
 */
const getUserById = async (id) => {
  try {
    const docRef = usersCollection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    const userData = doc.data();
    
    // Return user without password
    return {
      id: doc.id,
      ...userData,
      password: undefined
    };
    
  } catch (error) {
    console.error('❌ Error in getUserById:', error);
    throw error;
  }
};

/**
 * GET USER BY EMAIL (for login)
 */
const getUserByEmail = async (email) => {
  try {
    const snapshot = await usersCollection
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const userData = doc.data();
    
    return {
      id: doc.id,
      ...userData
      // Keep password for login verification
    };
    
  } catch (error) {
    console.error('❌ Error in getUserByEmail:', error);
    throw error;
  }
};

/**
 * UPDATE USER PROFILE
 */
const updateUser = async (id, updateData) => {
  try {
    const docRef = usersCollection.doc(id);
    
    // Add updated timestamp
    const updatedData = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Update the document
    await docRef.update(updatedData);
    
    // Return updated user (fetch to get complete data)
    const updatedUser = await getUserById(id);
    return updatedUser;
    
  } catch (error) {
    console.error('❌ Error in updateUser:', error);
    throw error;
  }
};

/**
 * GET ALL USERS (for admin)
 */
const getAllUsers = async (filters = {}) => {
  try {
    let query = usersCollection;
    
    // Apply filters if provided
    if (filters.role) {
      query = query.where('role', '==', filters.role);
    }
    if (filters.isActive !== undefined) {
      query = query.where('isActive', '==', filters.isActive);
    }
    if (filters.isApproved !== undefined) {
      query = query.where('isApproved', '==', filters.isApproved);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return [];
    }
    
    // Map through documents and remove passwords
    const users = snapshot.docs.map(doc => {
      const userData = doc.data();
      return {
        id: doc.id,
        ...userData,
        password: undefined
      };
    });
    
    return users;
    
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error);
    throw error;
  }
};

/**
 * GET PENDING FIELD WORKERS (for admin approval)
 */
const getPendingFieldWorkers = async () => {
  try {
    const snapshot = await usersCollection
      .where('role', '==', 'field_worker')
      .where('isApproved', '==', false)
      .get();
    
    if (snapshot.empty) {
      return [];
    }
    
    const pendingWorkers = snapshot.docs.map(doc => {
      const userData = doc.data();
      return {
        id: doc.id,
        ...userData,
        password: undefined
      };
    });
    
    return pendingWorkers;
    
  } catch (error) {
    console.error('❌ Error in getPendingFieldWorkers:', error);
    throw error;
  }
};


const approveFieldWorker = async (workerId) => {
  try {
    const docRef = usersCollection.doc(workerId);
    
    // First, check if the user exists and is a field worker
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Field worker not found');
    }
    
    const userData = doc.data();
    if (userData.role !== 'field_worker') {
      throw new Error('User is not a field worker');
    }
    
    if (userData.isApproved) {
      throw new Error('Field worker is already approved');
    }
    
    // Update the field worker to approved
    const updateData = {
      isApproved: true,
      updatedAt: new Date().toISOString()
    };
    
    await docRef.update(updateData);
    
    console.log(`✅ Field worker ${workerId} approved successfully`);
    
    // Return updated user data
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    
    return {
      id: updatedDoc.id,
      ...updatedData,
      password: undefined
    };
    
  } catch (error) {
    console.error('❌ Error in approveFieldWorker:', error);
    throw error;
  }
};

/**
 * REJECT FIELD WORKER (Improved version)
 */
const rejectFieldWorker = async (workerId) => {
  try {
    const docRef = usersCollection.doc(workerId);
    
    // First, check if the user exists and is a field worker
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('Field worker not found');
    }
    
    const userData = doc.data();
    if (userData.role !== 'field_worker') {
      throw new Error('User is not a field worker');
    }
    
    // Deactivate the field worker (soft delete)
    const updateData = {
      isActive: false,
      updatedAt: new Date().toISOString()
    };
    
    await docRef.update(updateData);
    
    console.log(`✅ Field worker ${workerId} rejected and deactivated`);
    
    return {
      success: true,
      message: 'Field worker rejected successfully'
    };
    
  } catch (error) {
    console.error('❌ Error in rejectFieldWorker:', error);
    throw error;
  }
};

/**
 * UPDATE USER PROFILE (Safe update - only allowed fields)
 */
const updateUserProfile = async (userId, updateData, currentUserRole) => {
  try {
    const docRef = usersCollection.doc(userId);
    
    // First, get the current user data
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('User not found');
    }
    
    const currentData = doc.data();
    
    // Allowed fields for each role
    const allowedFields = {
      // Mndatory fields 
      common: ['name', 'phone', 'address'],
      
      // Field worker specific fields
      field_worker: ['skills', 'experience', 'licenseNumber'],
      
      // Admin update fields
      admin: ['name', 'phone']
    };
    
    // Filter update data to only include allowed fields
    const filteredUpdateData = {};
    
    // Always allow common fields
    allowedFields.common.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field] = updateData[field];
      }
    });
    
    // Allow role-specific fields
    if (currentData.role === 'field_worker' && allowedFields.field_worker) {
      allowedFields.field_worker.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredUpdateData[field] = updateData[field];
        }
      });
    }
    
    // Add updated timestamp
    filteredUpdateData.updatedAt = new Date().toISOString();
    
    // Update the document
    await docRef.update(filteredUpdateData);
    
    console.log(`✅ User profile ${userId} updated successfully`);
    
    // Return updated user data
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    
    return {
      id: updatedDoc.id,
      ...updatedData,
      password: undefined
    };
    
  } catch (error) {
    console.error('❌ Error in updateUserProfile:', error);
    throw error;
  }
};

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  updateUserProfile,
  getAllUsers,
  getPendingFieldWorkers,
  approveFieldWorker,  
  rejectFieldWorker,   
  comparePassword,
  hashPassword
};