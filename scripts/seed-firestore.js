/**
 * Firestore Seed Data Script
 * 
 * This script populates your Firestore database with demo data.
 * 
 * IMPORTANT: You must have initialized a user account first by signing up through the app.
 * Then update the USER_ID below with your actual Firebase user ID.
 * 
 * Usage:
 * 1. Sign up in the app to create your user account
 * 2. Get your UID from Firebase Console > Authentication > Users
 * 3. Update USER_ID in this script
 * 4. Run: node scripts/seed-firestore.js
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json not found!');
  console.error('\nTo get your service account key:');
  console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.error('2. Click "Generate New Private Key"');
  console.error('3. Save the JSON file as serviceAccountKey.json in the project root');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// UPDATE THIS with your Firebase User ID
const USER_ID = 'YOUR_USER_ID_HERE';

async function seedDatabase() {
  if (USER_ID === 'YOUR_USER_ID_HERE') {
    console.error('❌ Please update USER_ID in the script!');
    process.exit(1);
  }

  try {
    console.log('🌱 Starting database seeding...\n');

    // Add sample posts
    const posts = [
      {
        userId: USER_ID,
        userName: 'You',
        userHandle: 'yourhandle',
        userAvatar: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" rx="60" fill="%231e293b"/%3E%3Ccircle cx="60" cy="50" r="24" fill="%238b5cf6"/%3E%3Cpath d="M28 102c8-19 24-29 32-29s24 10 29" fill="%2338bdf8"/%3E%3Ctext x="60" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="%23f8fafc"%3EY%3C/text%3E%3C/svg%3E',
        text: 'Welcome to Un-Useful! A strange little social demo with shared state and playful interactions.',
        timestamp: Date.now(),
        likes: [],
        bookmarks: [],
        replies: [],
      },
      {
        userId: USER_ID,
        userName: 'You',
        userHandle: 'yourhandle',
        userAvatar: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" rx="60" fill="%231e293b"/%3E%3Ccircle cx="60" cy="50" r="24" fill="%238b5cf6"/%3E%3Cpath d="M28 102c8-19 24-29 32-29s24 10 29" fill="%2338bdf8"/%3E%3Ctext x="60" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="%23f8fafc"%3EY%3C/text%3E%3C/svg%3E',
        text: 'Built with Next.js, React, Tailwind, and Firebase. Modern tech stack for a modern app.',
        timestamp: Date.now() - 3600000,
        likes: [],
        bookmarks: [],
        replies: [],
      },
      {
        userId: USER_ID,
        userName: 'You',
        userHandle: 'yourhandle',
        userAvatar: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" rx="60" fill="%231e293b"/%3E%3Ccircle cx="60" cy="50" r="24" fill="%238b5cf6"/%3E%3Cpath d="M28 102c8-19 24-29 32-29s24 10 29" fill="%2338bdf8"/%3E%3Ctext x="60" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="%23f8fafc"%3EY%3C/text%3E%3C/svg%3E',
        text: 'Try creating posts, liking them, and bookmarking your favorites!',
        timestamp: Date.now() - 7200000,
        likes: [],
        bookmarks: [],
        replies: [],
      },
    ];

    console.log('📝 Adding sample posts...');
    for (const post of posts) {
      await db.collection('posts').add(post);
      console.log('  ✓ Post added');
    }

    console.log('\n✅ Database seeding complete!\n');
    console.log('Your posts should now appear in the app feed.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
