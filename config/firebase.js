const admin = require('firebase-admin');
const { hashPassword } = require('../utils/helpers');

// Firebase configuration from environment variables
const firebaseConfig = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: 'googleapis.com'
};

try {
  // Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Get Firestore database instance
const db = admin.firestore();

/* Initialize default admin account */
const initializeDefaultAdmin = async () => {
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
      console.log('📧 Email: admin@fieldops.com');
      console.log('🔑 Password: Admin123!');
      console.log('⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!');
    } else {
      console.log('✅ Default admin already exists');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

module.exports = { 
  admin, 
  db, 
  initializeDefaultAdmin
};