'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function PostForm() {
  const { user, userProfile } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !text.trim()) return;

    setLoading(true);
    try {
      // Check if in demo mode
      if (localStorage.getItem('demo-mode') === 'true') {
        // Store post in localStorage for demo
        const posts = JSON.parse(localStorage.getItem('demo-posts') || '[]');
        posts.unshift({
          id: 'demo-' + Date.now(),
          userId: user.uid,
          userName: userProfile.displayName,
          userHandle: userProfile.handle,
          userAvatar: userProfile.avatar,
          text: text.trim(),
          timestamp: Date.now(),
          likes: [],
          bookmarks: [],
          replies: [],
        });
        localStorage.setItem('demo-posts', JSON.stringify(posts.slice(0, 50)));
        // Trigger a reload or refresh
        window.location.reload();
      } else {
        // Use Firebase
        await addDoc(collection(db, 'posts'), {
          userId: user.uid,
          userName: userProfile.displayName,
          userHandle: userProfile.handle,
          userAvatar: userProfile.avatar,
          text: text.trim(),
          timestamp: Date.now(),
          likes: [],
          bookmarks: [],
          replies: [],
        });
        setText('');
      }
    } catch (err) {
      console.error('Error posting:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !userProfile) return null;

  const isDarkMode = true; // Could be passed as prop
  const isOled = true; // Could be passed as prop

  const bgColor = isOled ? 'bg-neutral-900' : 'bg-slate-900';
  const hoverColor = isOled ? 'hover:bg-neutral-800/50' : 'hover:bg-slate-900/50';

  return (
    <form
      onSubmit={handleSubmit}
      className={`border-b ${isOled ? 'border-neutral-800' : 'border-slate-800'} p-4 ${hoverColor} transition`}
    >
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex-shrink-0" />

        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's happening?!"
            className={`w-full ${bgColor} text-2xl text-white placeholder-slate-500 outline-none resize-none`}
            rows={3}
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setText('')}
              className="px-4 py-2 rounded-full text-sky-400 border border-sky-400 hover:bg-sky-400/10 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim() || loading}
              className="px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 text-white font-semibold transition"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
