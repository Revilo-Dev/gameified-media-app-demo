'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
} from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  handle: string;
  bio: string;
  avatar: string;
  following: string[];
  email: string;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (email: string, password: string, displayName: string, bio: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for offline testing
const DEMO_USER: UserProfile = {
  uid: 'demo-user-001',
  displayName: 'Demo User',
  handle: 'demouser',
  bio: '🎭 Demo account for testing Un-Useful',
  avatar: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" rx="60" fill="%231e293b"/%3E%3Ccircle cx="60" cy="50" r="24" fill="%238b5cf6"/%3E%3Cpath d="M28 102c8-19 24-29 32-29s24 10 29" fill="%2338bdf8"/%3E%3Ctext x="60" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="%23f8fafc"%3ED%3C/text%3E%3C/svg%3E',
  following: [],
  email: 'demo@example.com',
  createdAt: Date.now(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for demo mode in localStorage
    const demoMode = localStorage.getItem('demo-mode') === 'true';
    if (demoMode) {
      const mockUser = {
        uid: 'demo-user-001',
        email: DEMO_USER.email,
      } as User;
      setUser(mockUser);
      setUserProfile(DEMO_USER);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile);
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string, displayName: string, bio: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const handle = displayName.toLowerCase().replace(/\s+/g, '');
      const avatar = `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" rx="60" fill="%231e293b"/%3E%3Ccircle cx="60" cy="50" r="24" fill="%238b5cf6"/%3E%3Cpath d="M28 102c8-19 24-29 32-29s24 10 29" fill="%2338bdf8"/%3E%3Ctext x="60" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="%23f8fafc"%3E${displayName.charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E`;

      const profileData: UserProfile = {
        uid: newUser.uid,
        displayName,
        handle,
        bio,
        avatar,
        following: [],
        email,
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'users', newUser.uid), profileData);
      setUserProfile(profileData);
    } catch (error: any) {
      // If Firebase fails, offer demo mode
      if (error.code === 'auth/invalid-api-key' || error.message?.includes('api-key')) {
        localStorage.setItem('demo-mode', 'true');
        const mockUser = {
          uid: 'demo-user-' + Date.now(),
          email,
        } as User;
        setUser(mockUser);
        setUserProfile({
          uid: mockUser.uid,
          displayName,
          handle: displayName.toLowerCase().replace(/\s+/g, ''),
          bio,
          avatar: `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" rx="60" fill="%231e293b"/%3E%3Ccircle cx="60" cy="50" r="24" fill="%238b5cf6"/%3E%3Cpath d="M28 102c8-19 24-29 32-29s24 10 29" fill="%2338bdf8"/%3E%3Ctext x="60" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="%23f8fafc"%3E${displayName.charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E`,
          following: [],
          email,
          createdAt: Date.now(),
        });
      } else {
        throw error;
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profileDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (profileDoc.exists()) {
        setUserProfile(profileDoc.data() as UserProfile);
      }
    } catch (error: any) {
      // If Firebase fails, check for demo credentials
      if (email === 'demo@example.com' && password === 'demo123456') {
        localStorage.setItem('demo-mode', 'true');
        const mockUser = {
          uid: DEMO_USER.uid,
          email: DEMO_USER.email,
        } as User;
        setUser(mockUser);
        setUserProfile(DEMO_USER);
      } else if (error.code === 'auth/invalid-api-key' || error.message?.includes('api-key')) {
        throw new Error('⚠️ Firebase not configured. Use Demo Login to test the app.');
      } else {
        throw error;
      }
    }
  };

  const logout = async () => {
    localStorage.removeItem('demo-mode');
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
    setUser(null);
    setUserProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');
    
    // Check if in demo mode
    if (localStorage.getItem('demo-mode') === 'true') {
      setUserProfile({ ...userProfile!, ...data });
      return;
    }

    await updateDoc(doc(db, 'users', user.uid), data);
    setUserProfile({ ...userProfile!, ...data });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signup,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
