'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { Heart, MessageCircle, Bookmark, Share, Moon, Sun } from 'lucide-react';
import PostForm from './post-form';
import UserProfile from './user-profile';

interface Post {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar: string;
  text: string;
  timestamp: number;
  likes: string[];
  bookmarks: string[];
  replies: Reply[];
}

interface Reply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export default function Dashboard() {
  const { user, userProfile, logout } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOled, setIsOled] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!user) return;

    try {
      const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];
        setPosts(postsData);
        setLoading(false);
      });
      return unsubscribe;
    } catch (err) {
      // Fallback to demo posts if Firebase fails
      setPosts([
        {
          id: '1',
          userId: userProfile?.uid || 'user1',
          userName: userProfile?.displayName || 'Demo User',
          userHandle: userProfile?.handle || 'demo',
          userAvatar: userProfile?.avatar || '',
          text: '🎭 Welcome to Un-Useful! This is demo mode - Firebase is being configured.',
          timestamp: Date.now(),
          likes: [],
          bookmarks: [],
          replies: [],
        },
      ]);
      setLoading(false);
    }
  }, [user, userProfile]);

  const toggleLike = async (postId: string, post: Post) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      const likes = post.likes || [];
      const hasLiked = likes.includes(user.uid);
      const newLikes = hasLiked
        ? likes.filter((id) => id !== user.uid)
        : [...likes, user.uid];

      await updateDoc(postRef, { likes: newLikes });
    } catch (err) {
      console.error('Error updating likes:', err);
    }
  };

  const toggleBookmark = async (postId: string, post: Post) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      const bookmarks = post.bookmarks || [];
      const hasBookmarked = bookmarks.includes(user.uid);
      const newBookmarks = hasBookmarked
        ? bookmarks.filter((id) => id !== user.uid)
        : [...bookmarks, user.uid];

      await updateDoc(postRef, { bookmarks: newBookmarks });
    } catch (err) {
      console.error('Error updating bookmarks:', err);
    }
  };

  if (!user || !userProfile) return null;

  const bgPrimary = isDarkMode 
    ? isOled ? 'bg-black' : 'bg-slate-950'
    : 'bg-white';
  
  const bgSecondary = isDarkMode
    ? isOled ? 'bg-neutral-900' : 'bg-slate-900'
    : 'bg-slate-100';

  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-300' : 'text-slate-700';
  const textTertiary = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  
  const borderColor = isDarkMode 
    ? isOled ? 'border-neutral-800' : 'border-slate-800'
    : 'border-slate-200';

  const hoverBg = isDarkMode
    ? isOled ? 'hover:bg-neutral-800/50' : 'hover:bg-slate-900/50'
    : 'hover:bg-slate-100/50';

  return (
    <div className={`flex min-h-screen ${bgPrimary} transition-colors duration-300`}>
      {/* Left Sidebar */}
      <aside className={`hidden lg:block w-80 border-r ${borderColor} ${bgSecondary} p-6`}>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>
          Un-Useful
        </h1>
        <p className={`${textTertiary} mt-2 text-sm`}>
          A strange little social demo
        </p>

        <nav className="space-y-4 mt-12">
          <button className={`${textSecondary} hover:${isDarkMode ? 'text-white' : 'text-slate-900'} transition font-semibold`}>
            Home
          </button>
          <button className={`${textSecondary} hover:${isDarkMode ? 'text-white' : 'text-slate-900'} transition font-semibold`}>
            Explore
          </button>
        </nav>

        <div className="mt-auto pt-8 space-y-2">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setIsOled(!isOled)}
              className={`flex-1 py-2 rounded transition font-semibold text-sm ${
                isDarkMode
                  ? isOled
                    ? 'bg-neutral-700 text-yellow-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              ⚫ OLED
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`flex-1 py-2 rounded transition font-semibold text-sm ${
                isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          <button
            onClick={logout}
            className={`w-full py-2 rounded transition font-semibold ${
              isDarkMode
                ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                : 'bg-red-100/50 hover:bg-red-100 text-red-700'
            }`}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Feed */}
      <main className="flex-1 max-w-2xl border-r border-l border-slate-800 min-h-screen">
        {/* Header */}
        <div className={`sticky top-0 z-10 ${bgPrimary}/80 backdrop-blur border-b ${borderColor} p-4`}>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Home</h2>
        </div>

        {/* Post Form */}
        <PostForm />

        {/* Posts Feed */}
        <div className={`divide-y ${borderColor}`}>
          {posts.length === 0 ? (
            <div className={`p-8 text-center ${textTertiary}`}>
              No posts yet. Be the first to post! 🎉
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className={`p-4 ${hoverBg} transition cursor-pointer border-b ${borderColor}`}
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={`font-bold ${textPrimary}`}>
                        {post.userName}
                      </span>
                      <span className={`text-sm ${textTertiary}`}>
                        @{post.userHandle}
                      </span>
                      <span className={`text-sm ${textTertiary}`}>
                        •{' '}
                        {new Date(post.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <p className={`${textSecondary} text-base mt-2 break-words`}>
                      {post.text}
                    </p>

                    <div className="flex justify-between mt-4 text-slate-500 max-w-xs">
                      <button className={`hover:text-sky-400 transition flex items-center gap-2`}>
                        <MessageCircle size={16} />
                        <span className="text-sm">0</span>
                      </button>
                      <button className={`hover:text-sky-400 transition flex items-center gap-2`}>
                        <Share size={16} />
                      </button>
                      <button
                        onClick={() => toggleLike(post.id, post)}
                        className={`transition flex items-center gap-2 ${
                          post.likes?.includes(user.uid)
                            ? 'text-red-500'
                            : 'hover:text-red-500'
                        }`}
                      >
                        <Heart
                          size={16}
                          fill={
                            post.likes?.includes(user.uid)
                              ? 'currentColor'
                              : 'none'
                          }
                        />
                        <span className="text-sm">
                          {post.likes?.length || 0}
                        </span>
                      </button>
                      <button
                        onClick={() => toggleBookmark(post.id, post)}
                        className={`transition flex items-center gap-2 ${
                          post.bookmarks?.includes(user.uid)
                            ? 'text-yellow-500'
                            : 'hover:text-yellow-500'
                        }`}
                      >
                        <Bookmark
                          size={16}
                          fill={
                            post.bookmarks?.includes(user.uid)
                              ? 'currentColor'
                              : 'none'
                          }
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className={`hidden xl:block w-80 ${bgSecondary} p-6`}>
        {showProfile ? (
          <UserProfile user={userProfile} onBack={() => setShowProfile(false)} />
        ) : (
          <div
            className={`${isDarkMode ? bgSecondary : 'bg-white'} rounded-lg p-6 cursor-pointer hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'} transition`}
            onClick={() => setShowProfile(true)}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-full mb-4"></div>
            <h3 className={`${textPrimary} font-semibold`}>
              {userProfile.displayName}
            </h3>
            <p className={`${textTertiary} text-sm`}>
              @{userProfile.handle}
            </p>
            <p className={`${textSecondary} text-sm mt-2`}>
              {userProfile.bio}
            </p>

            <div className="space-y-2 mt-4">
              <button className={`w-full py-2 rounded transition text-sm ${
                isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}>
                Edit profile
              </button>
              <button className={`w-full py-2 rounded transition text-sm ${
                isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}>
                ★ Premium
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
