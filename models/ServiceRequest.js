const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

/** ServiceRequest Class - Represents a service request from customers */
class ServiceRequest {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId; 
    this.title = data.title;
    this.description = data.description;
    this.location = data.location;
    this.urgency = data.urgency || 'medium'; 
    this.category = data.category; 
    this.status = data.status || 'open'; 
    this.budget = data.budget || 0;
    this.preferredDate = data.preferredDate; 
    this.assignedFieldWorkerId = data.assignedFieldWorkerId || null; 
    this.customerRating = data.customerRating || null; 
    this.customerFeedback = data.customerFeedback || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /** Save service request to Firestore */
  async save() {
    try {
      const requestData = {
        userId: this.userId,
        title: this.title,
        description: this.description,
        location: this.location,
        urgency: this.urgency,
        category: this.category,
        status: this.status,
        budget: this.budget,
        preferredDate: this.preferredDate,
        assignedFieldWorkerId: this.assignedFieldWorkerId,
        customerRating: this.customerRating,
        customerFeedback: this.customerFeedback,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };

      await db.collection('serviceRequests').doc(this.id).set(requestData);
      console.log(`✅ Service request "${this.title}" saved successfully`);
      return this;

    } catch (error) {
      console.error('❌ Error saving service request:', error);
      throw error;
    }
  }

  /** Find service request by ID */
  static async findById(id) {
    try {
      const doc = await db.collection('serviceRequests').doc(id).get();
      if (!doc.exists) return null;
      return new ServiceRequest({ id: doc.id, ...doc.data() });
    } catch (error) {
      console.error('❌ Error finding service request:', error);
      throw error;
    }
  }

  /** Find service requests by user ID (customer) */
  static async findByUserId(userId, status = null) {
    try {
      let query = db.collection('serviceRequests').where('userId', '==', userId);
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      
      return snapshot.docs.map(doc => 
        new ServiceRequest({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      console.error('❌ Error finding user service requests:', error);
      throw error;
    }
  }

  /** Find all service requests with filters (for admin) */
  static async findAll(filters = {}) {
    try {
      let query = db.collection('serviceRequests');
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.urgency) {
        query = query.where('urgency', '==', filters.urgency);
      }
      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      
      return snapshot.docs.map(doc => 
        new ServiceRequest({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      console.error('❌ Error finding all service requests:', error);
      throw error;
    }
  }

  /** Update service request */
  async update(updateData) {
    try {
      const requestRef = db.collection('serviceRequests').doc(this.id);
      updateData.updatedAt = new Date().toISOString();
      
      await requestRef.update(updateData);
      
      // Update current instance
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      console.error('❌ Error updating service request:', error);
      throw error;
    }
  }
}

module.exports = ServiceRequest;