'use client';

import React from 'react';
import { UserProfile as UserProfileType } from '@/lib/auth-context';
import { ChevronLeft } from 'lucide-react';

interface UserProfileProps {
  user: UserProfileType;
  onBack: () => void;
}

export default function UserProfile({ user, onBack }: UserProfileProps) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-300 mb-4 transition"
      >
        <ChevronLeft size={20} />
        Back
      </button>

      <div className="bg-slate-800 rounded-lg p-6">
        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-cyan-400 rounded-full mb-4"></div>
        <h2 className="text-white text-2xl font-bold">{user.displayName}</h2>
        <p className="text-slate-400">@{user.handle}</p>
        <p className="text-slate-300 mt-4">{user.bio}</p>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400 text-sm">Following</p>
              <p className="text-white text-xl font-semibold">
                {user.following.length}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Joined</p>
              <p className="text-white text-sm">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-6">
          <button className="w-full py-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-semibold transition">
            Follow
          </button>
          <button className="w-full py-2 rounded-full border border-slate-600 hover:bg-slate-700 text-white transition">
            Message
          </button>
        </div>
      </div>
    </div>
  );
}
