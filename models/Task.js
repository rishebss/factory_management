const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

/* Task Class - Assigned task to field workers */
class Task {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.serviceRequestId = data.serviceRequestId;
    this.fieldWorkerId = data.fieldWorkerId;
    this.assignedBy = data.assignedBy; // Admin ID 
    this.status = data.status || 'assigned'; // options: 'assigned', 'in-progress', 'completed', 'cancelled'
    this.assignedAt = data.assignedAt || new Date().toISOString();
    this.startedAt = data.startedAt || null;
    this.completedAt = data.completedAt || null;
    this.completionNotes = data.completionNotes || '';
    this.completionPhotos = data.completionPhotos || [];
    this.customerRating = data.customerRating || null;
    this.customerFeedback = data.customerFeedback || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /* Save task to Firestore */
  async save() {
    try {
      const taskData = {
        serviceRequestId: this.serviceRequestId,
        fieldWorkerId: this.fieldWorkerId,
        assignedBy: this.assignedBy,
        status: this.status,
        assignedAt: this.assignedAt,
        startedAt: this.startedAt,
        completedAt: this.completedAt,
        completionNotes: this.completionNotes,
        completionPhotos: this.completionPhotos,
        customerRating: this.customerRating,
        customerFeedback: this.customerFeedback,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };

      await db.collection('tasks').doc(this.id).set(taskData);
      console.log(`✅ Task ${this.id} saved successfully`);
      return this;

    } catch (error) {
      console.error('❌ Error saving task:', error);
      throw error;
    }
  }

  /*  Find task by ID */
  static async findById(id) {
    try {
      const doc = await db.collection('tasks').doc(id).get();
      if (!doc.exists) return null;
      return new Task({ id: doc.id, ...doc.data() });
    } catch (error) {
      console.error('❌ Error finding task:', error);
      throw error;
    }
  }

  /* Find tasks by field worker ID */
  static async findByFieldWorker(fieldWorkerId, status = null) {
    try {
      let query = db.collection('tasks').where('fieldWorkerId', '==', fieldWorkerId);
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      const snapshot = await query.orderBy('assignedAt', 'desc').get();
      
      return snapshot.docs.map(doc => 
        new Task({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      console.error('❌ Error finding field worker tasks:', error);
      throw error;
    }
  }

  /*  Find task by service request ID */
  static async findByServiceRequest(serviceRequestId) {
    try {
      const snapshot = await db.collection('tasks')
        .where('serviceRequestId', '==', serviceRequestId)
        .get();
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return new Task({ id: doc.id, ...doc.data() });
    } catch (error) {
      console.error('❌ Error finding task by service request:', error);
      throw error;
    }
  }

  /* Find all tasks with filters (for admin) */
  static async findAll(filters = {}) {
    try {
      let query = db.collection('tasks');
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.fieldWorkerId) {
        query = query.where('fieldWorkerId', '==', filters.fieldWorkerId);
      }

      const snapshot = await query.orderBy('assignedAt', 'desc').get();
      
      return snapshot.docs.map(doc => 
        new Task({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      console.error('❌ Error finding all tasks:', error);
      throw error;
    }
  }

  /* Update task */
  async update(updateData) {
    try {
      const taskRef = db.collection('tasks').doc(this.id);
      updateData.updatedAt = new Date().toISOString();
      
      await taskRef.update(updateData);
      
      // Update current instance
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  }

  /* Add rating to completed task */
static async addRating(taskId, rating, feedback) {
  try {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Validate task is completed
    if (task.status !== 'completed') {
      throw new Error('Cannot rate a task that is not completed');
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Update task with rating and feedback
    const updateData = {
      customerRating: rating,
      customerFeedback: feedback || '',
      updatedAt: new Date().toISOString()
    };

    await task.update(updateData);

    console.log(`✅ Rating ${rating} added to task ${taskId}`);

    // Update field worker's overall rating
    await Task.updateFieldWorkerRating(task.fieldWorkerId);

    return task;

  } catch (error) {
    console.error('❌ Error adding rating:', error);
    throw error;
  }
}

/* Update field worker's overall rating */
static async updateFieldWorkerRating(fieldWorkerId) {
  try {
    // Get all completed tasks for this field worker with ratings
    const completedTasks = await Task.findAll({
      fieldWorkerId: fieldWorkerId,
      status: 'completed'
    });

    const ratedTasks = completedTasks.filter(task => task.customerRating);
    
    if (ratedTasks.length === 0) {
      return;
    }

    // Calculate new average rating
    const totalRating = ratedTasks.reduce((sum, task) => sum + task.customerRating, 0);
    const averageRating = totalRating / ratedTasks.length;
    const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal

    // Update field worker's rating in users collection
    const { db } = require('../config/firebase');
    await db.collection('users').doc(fieldWorkerId).update({
      rating: roundedRating,
      totalTasksCompleted: completedTasks.length,
      updatedAt: new Date().toISOString()
    });

    console.log(`✅ Field worker ${fieldWorkerId} rating updated to ${roundedRating}`);

  } catch (error) {
    console.error('❌ Error updating field worker rating:', error);
    throw error;
  }
}

/* Get tasks with ratings for a field worker */
static async getRatingsForFieldWorker(fieldWorkerId, limit = 10) {
  try {
    const snapshot = await db.collection('tasks')
      .where('fieldWorkerId', '==', fieldWorkerId)
      .where('customerRating', '>', 0)
      .orderBy('completedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => 
      new Task({ id: doc.id, ...doc.data() })
    );

  } catch (error) {
    console.error('❌ Error getting field worker ratings:', error);
    throw error;
  }
}
}



module.exports = Task;