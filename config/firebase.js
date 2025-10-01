const admin = require('firebase-admin');
const { hashPassword } = require('../utils/helpers');

console.log('🔧 Loading Firebase configuration...');

// Firebase configuration with proper Vercel handling
const getFirebaseConfig = () => {
  try {
    // Check if required environment variables exist
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('FIREBASE_PRIVATE_KEY environment variable is missing');
    }
    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error('FIREBASE_PROJECT_ID environment variable is missing');
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('FIREBASE_CLIENT_EMAIL environment variable is missing');
    }

    // Format the private key - handle Vercel environment
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // Debug: Log key info (don't log the actual key for security)
    console.log('🔐 Private key info:', {
      hasBegin: privateKey.includes('BEGIN PRIVATE KEY'),
      hasEnd: privateKey.includes('END PRIVATE KEY'),
      length: privateKey.length
    });

    return {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      universe_domain: 'googleapis.com'
    };
  } catch (error) {
    console.error('❌ Error creating Firebase config:', error.message);
    throw error;
  }
};

// Initialize Firebase with error handling
let db;
let isInitialized = false;

try {
  // Check if already initialized (important for serverless)
  if (admin.apps.length === 0) {
    const firebaseConfig = getFirebaseConfig();
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig)
    });
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.log('✅ Firebase Admin already initialized');
  }
  
  db = admin.firestore();
  isInitialized = true;
  
  // Test the connection
  db.collection('test').doc('connection').get()
    .then(() => console.log('✅ Firebase Firestore connection successful'))
    .catch(err => console.error('❌ Firebase Firestore connection failed:', err.message));
    
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  isInitialized = false;
}

/**
 * Initialize default admin account (only in production)
 */
const initializeDefaultAdmin = async () => {
  if (!isInitialized || !db) {
    console.log('❌ Firebase not initialized, skipping admin creation');
    return;
  }

  try {
    const adminEmail = 'admin@fieldops.com';
    
    // Check if admin already exists
    const adminSnapshot = await db.collection('users')
      .where('email', '==', adminEmail)
      .limit(1)
      .get();
    
    if (adminSnapshot.empty) {
      const hashedPassword = await hashPassword('Admin123!');
      
      const defaultAdmin = {
        name: 'System Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        phone: '+1000000000',
        isActive: true,
        isApproved: true,
        skills: [],
        experience: '',
        licenseNumber: '',
        rating: 0,
        totalTasksCompleted: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('users').add(defaultAdmin);
      console.log('✅ Default admin user created');
    } else {
      console.log('✅ Default admin already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
  }
};

// Initialize admin in production
if (process.env.NODE_ENV === 'production') {
  initializeDefaultAdmin().catch(console.error);
}

module.exports = { 
  admin, 
  db, 
  isInitialized,
  initializeDefaultAdmin
};