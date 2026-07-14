# Un-Useful - Next.js Social Media Demo

A modern social media demo app built with Next.js, React, Tailwind CSS, and Firebase.

## Features

- **Authentication**: Email/password signup and login with Firebase Auth
- **Posts**: Create, view, and interact with posts in real-time
- **Reactions**: Like and bookmark posts
- **User Profiles**: Create and edit your profile with bio and avatar
- **Real-time Updates**: Firestore-powered real-time feed
- **Dark/Light Mode**: Toggle between dark and light themes
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Next.js 16+, React 18+, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **UI Components**: Lucide React for icons
- **Development**: Vite-optimized with Turbopack

## Prerequisites

- Node.js v20.10.0 or higher
- npm or yarn package manager
- A Firebase project with Firestore and Auth enabled

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" and follow the setup wizard
3. Enable Authentication (Email/Password method)
4. Enable Firestore Database
5. Copy your Firebase config

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory with your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Set Up Firestore Collections

In Firebase Console, create the following collection structure:

**Collection: `users`**
```json
{
  "uid": "user_id",
  "displayName": "User Name",
  "handle": "username",
  "bio": "User biography",
  "avatar": "avatar_data_url",
  "following": ["user_id_1", "user_id_2"],
  "email": "user@example.com",
  "createdAt": 1720000000000
}
```

**Collection: `posts`**
```json
{
  "userId": "user_id",
  "userName": "User Name",
  "userHandle": "username",
  "userAvatar": "avatar_data_url",
  "text": "Post content",
  "timestamp": 1720000000000,
  "likes": ["user_id_1"],
  "bookmarks": ["user_id_2"],
  "replies": []
}
```

### 5. Set Firestore Rules

In Firebase Console, set the following Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read all profiles but only write their own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == userId;
      allow update, delete: if request.auth.uid == userId;
    }
    
    // Posts can be read by authenticated users
    // Only post creators can modify their posts
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
  }
}
```

## Running the App

### Development Mode

```bash
export PATH="$HOME/.local/bin:$PATH"  # If Node isn't in PATH
npm run dev
```

The app will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Demo Credentials

When testing with demo data, you can use:
- **Email**: demo@example.com
- **Password**: demo123

Or create your own account by signing up.

## Project Structure

```
├── app/
│   ├── page.tsx              # Main app entry point
│   └── layout.tsx            # Root layout with AuthProvider
├── components/
│   ├── auth-page.tsx         # Login/signup component
│   ├── dashboard.tsx         # Main dashboard
│   ├── post-form.tsx         # Create post form
│   └── user-profile.tsx      # User profile view
├── lib/
│   ├── firebase.ts           # Firebase configuration
│   └── auth-context.tsx      # Authentication context
├── styles/
│   └── globals.css           # Global styles
└── .env.local                # Environment variables (create this)
```

## API Reference

### Authentication Context (`useAuth`)

```typescript
const { user, userProfile, loading, signup, login, logout, updateProfile } = useAuth();
```

- `user`: Firebase User object or null
- `userProfile`: UserProfile object or null
- `loading`: Boolean indicating auth state loading
- `signup(email, password, displayName, bio)`: Create new account
- `login(email, password)`: Sign in
- `logout()`: Sign out
- `updateProfile(data)`: Update user profile

## Troubleshooting

### Firebase Config Issues
- Double-check your `.env.local` file has all required variables
- Ensure your Firebase project has Firestore and Auth enabled
- Check that Firestore security rules are properly configured

### Posts Not Loading
- Verify Firestore collection rules allow authenticated reads
- Check browser console for error messages
- Ensure Firebase is properly initialized

### Authentication Errors
- Verify email format is correct
- Ensure password is at least 6 characters
- Check that email/password auth is enabled in Firebase

## Future Enhancements

- [ ] Image upload support
- [ ] Follow/unfollow users
- [ ] Direct messaging
- [ ] Notifications
- [ ] Search functionality
- [ ] Hashtags and mentions
- [ ] Reply threads
- [ ] User recommendations

## License

MIT

## Support

For issues or questions, please check the Firebase documentation or Next.js documentation.
