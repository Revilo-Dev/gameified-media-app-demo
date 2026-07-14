# Un-Useful - Modern Social Media Demo

A beautiful, real-time social media application built with **Next.js 16**, **React**, **TypeScript**, **Tailwind CSS**, and **Firebase**.

## 🚀 Features

- 🔐 **Firebase Authentication** - Secure email/password authentication
- 📱 **Real-time Posts** - Create and view posts instantly
- ❤️ **Interactions** - Like and bookmark posts
- 👤 **User Profiles** - Customizable profiles with bio and avatar
- 🌙 **Dark/Light Mode** - Toggle theme with one click
- 📱 **Responsive Design** - Mobile-first design approach
- ⚡ **Real-time Updates** - Firestore-powered instant updates
- 🎨 **Beautiful UI** - Modern design with Tailwind CSS

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Backend** | Firebase (Auth, Firestore) |
| **Icons** | Lucide React |
| **Build** | Turbopack |

## 📋 Prerequisites

- **Node.js** v20.10.0 or higher
- **npm** or **yarn**
- Firebase account (free tier is fine)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** (Email/Password)
4. Create a **Firestore Database**
5. Copy your Firebase config

### 3. Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

## 📚 Detailed Setup Guide

See [SETUP.md](./SETUP.md) for comprehensive setup instructions including Firestore rules, collection structure, and troubleshooting.

## 🏗️ Project Structure

```
├── app/
│   ├── page.tsx              # Main page (auth/dashboard router)
│   └── layout.tsx            # Root layout with providers
├── components/
│   ├── auth-page.tsx         # Authentication UI
│   ├── dashboard.tsx         # Main dashboard
│   ├── post-form.tsx         # Post creation form
│   └── user-profile.tsx      # User profile view
├── lib/
│   ├── firebase.ts           # Firebase initialization
│   ├── auth-context.tsx      # Auth state management
│   └── types.ts              # TypeScript types
├── public/                   # Static assets
├── styles/                   # Global styles
└── .env.local               # Environment variables
```

## 🎯 Usage

### Sign Up / Log In

1. Create an account with email and password
2. Add your display name and bio
3. You're ready to post!

### Create a Post

1. Click in the "What's happening?!" box
2. Type your message
3. Click "Post"
4. Your post appears instantly to all users

### Interact with Posts

- **Like** - Click the heart icon
- **Bookmark** - Click the bookmark icon  
- **Reply** - Click the message icon (coming soon)

### Manage Profile

- Click your profile card on the right sidebar
- Edit your bio and display name
- View your follow count and join date

## 🔧 Available Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint
```

## 🔒 Security

- Firestore security rules restrict data access
- Only authenticated users can create posts
- Users can only modify their own posts and profiles
- Passwords are handled by Firebase Auth

## 🐛 Troubleshooting

### Firebase Connection Issues
- Verify `.env.local` has all required variables
- Check that Firestore database is in production mode
- Ensure Firebase project has Authentication enabled

### Posts Not Loading
- Check Firestore security rules in SETUP.md
- Verify your user is authenticated
- Check browser console for error messages

### Build Errors
- Run `npm install` again
- Clear `.next` folder: `rm -rf .next`
- Restart the dev server

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🚀 Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Then add your Firebase credentials to Vercel environment variables.

### Deploy to Other Platforms

This is a standard Next.js app and can be deployed to:
- **Netlify**
- **AWS Amplify**
- **Google Cloud Run**
- **Docker**

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to submit pull requests.

## 📧 Questions?

Check out the [SETUP.md](./SETUP.md) file or refer to official documentation for your respective tools.

---

**Happy coding! 🎉**

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
