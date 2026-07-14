# Deployment Guide for Un-Useful

This guide covers deploying your Un-Useful application to production.

## 📋 Pre-Deployment Checklist

- [ ] Firebase security rules are configured (see SETUP.md)
- [ ] Environment variables are set in `.env.local`
- [ ] Application builds successfully (`npm run build`)
- [ ] All features work in development (`npm run dev`)
- [ ] You've tested authentication flow
- [ ] You've tested creating posts

## 🚀 Deploy to Vercel (Recommended)

Vercel is the easiest option since it's made by the Next.js creators.

### Step 1: Prepare Your Project

```bash
# Make sure everything builds
npm run build

# Create a git repository (if you haven't)
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Push to GitHub

1. Create a GitHub account if you don't have one
2. Create a new repository
3. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/social-media-app-demo.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Sign in with GitHub
3. Click "Add new project"
4. Select your repository
5. Click "Import"
6. Add environment variables (from `.env.local`):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
7. Click "Deploy"

Your app will be live in minutes!

### Step 4: Update Firebase Settings

In Firebase Console:

1. Go to Authentication > Settings
2. Add your Vercel domain to authorized redirect URIs
3. Go to Firestore > Rules and ensure they're set correctly

## 🐳 Deploy with Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t un-useful .
docker run -p 3000:3000 -e NEXT_PUBLIC_FIREBASE_API_KEY=... un-useful
```

## ☁️ Other Deployment Options

### Netlify

1. Push code to GitHub
2. Go to [Netlify](https://netlify.com)
3. Click "New site from Git"
4. Select your repository
5. Add environment variables
6. Deploy

### AWS Amplify

1. Go to [AWS Amplify](https://amplify.aws)
2. Click "Connect your code"
3. Select GitHub
4. Configure build settings
5. Add environment variables
6. Deploy

### Google Cloud Run

1. Create a GCP project
2. Enable Cloud Run API
3. Create `cloudbuild.yaml`:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/un-useful', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/un-useful']
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args: ['run', '--deploy', '--', '--set', 'image=gcr.io/$PROJECT_ID/un-useful']
```

4. Set environment variables in Cloud Run
5. Deploy

## 🔒 Security Considerations

### Environment Variables

Never commit `.env.local` to git. Add to `.gitignore`:

```
.env.local
.env.*.local
```

### Firebase Security Rules

Ensure these rules are in place:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticated users can only read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == userId;
      allow update, delete: if request.auth.uid == userId;
    }
    
    // Authenticated users can read all posts, only write their own
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
  }
}
```

### CORS Configuration

If using a separate API, configure CORS properly in Firebase.

## 📊 Monitoring

### Vercel Analytics

Vercel automatically provides performance monitoring:
- Go to your project on Vercel
- Click "Analytics"
- View performance metrics

### Firebase Console

Monitor your Firebase usage:
- Authentication usage
- Firestore reads/writes
- Storage usage

## 🚨 Troubleshooting

### App crashes after deployment

Check error logs:
- **Vercel**: Go to "Deployments" > click latest > "Functions"
- **Netlify**: Go to "Deploys" > click latest > "Deploy log"

### Firebase connection fails

- Verify environment variables are set correctly
- Check CORS settings in Firebase
- Ensure Firestore rules allow the requests

### Pages won't load

- Check build logs for TypeScript errors
- Verify all imports are correct
- Ensure node_modules are installed

## 📞 Getting Help

- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)

---

**Good luck deploying! 🚀**
