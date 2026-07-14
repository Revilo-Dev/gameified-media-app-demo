'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Moon, Sun } from 'lucide-react';

export default function AuthPage() {
  const { signup, login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOled, setIsOled] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, displayName, bio);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login('demo@example.com', 'demo123456');
    } catch (err: any) {
      setError('Demo login not available - configure Firebase first');
    } finally {
      setLoading(false);
    }
  };

  const bgColor = isDarkMode 
    ? isOled ? 'bg-black' : 'bg-slate-950'
    : 'bg-white';
  
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDarkMode 
    ? isOled ? 'bg-neutral-900' : 'bg-slate-900'
    : 'bg-slate-100';
  const inputBorder = isDarkMode ? 'border-slate-700' : 'border-slate-300';
  const buttonHover = isDarkMode ? 'hover:bg-sky-600' : 'hover:bg-sky-500';

  return (
    <div className={`flex min-h-screen ${bgColor} transition-colors duration-300`}>
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Top Right Theme Toggle */}
        <div className="absolute top-8 right-8 flex gap-2">
          <button
            onClick={() => setIsOled(!isOled)}
            className={`p-2 rounded-lg transition ${
              isDarkMode
                ? isOled
                  ? 'bg-neutral-800 text-yellow-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
            title={isOled ? 'Switch to Standard Dark' : 'Switch to OLED'}
          >
            ⚫
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition ${
              isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${
              isDarkMode ? 'text-sky-400' : 'text-sky-600'
            } mb-2`}>
              Un-Useful
            </h1>
            <p className={`${textSecondary} text-sm`}>
              A strange little social demo with shared state and playful interactions.
            </p>
          </div>

          <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {!isLogin && (
              <>
                <div>
                  <label className={`block text-sm ${textSecondary} mb-2`}>Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full ${inputBg} border ${inputBorder} rounded-lg px-4 py-2 ${textPrimary} placeholder-slate-500 focus:outline-none focus:border-sky-400 transition`}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm ${textSecondary} mb-2`}>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={`w-full ${inputBg} border ${inputBorder} rounded-lg px-4 py-2 ${textPrimary} placeholder-slate-500 focus:outline-none focus:border-sky-400 transition`}
                    placeholder="Tell people a bit about yourself"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div>
              <label className={`block text-sm ${textSecondary} mb-2`}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full ${inputBg} border ${inputBorder} rounded-lg px-4 py-2 ${textPrimary} placeholder-slate-500 focus:outline-none focus:border-sky-400 transition`}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className={`block text-sm ${textSecondary} mb-2`}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${inputBg} border ${inputBorder} rounded-lg px-4 py-2 ${textPrimary} placeholder-slate-500 focus:outline-none focus:border-sky-400 transition`}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-sky-500 ${buttonHover} disabled:bg-slate-700 text-white font-semibold py-2 rounded-lg transition`}
            >
              {loading ? 'Loading...' : isLogin ? 'Log in' : 'Sign up'}
            </button>
          </form>

          {/* Demo Login Button */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition border-2 mb-4 ${
              isDarkMode
                ? 'border-purple-600 text-purple-400 hover:bg-purple-600/10'
                : 'border-purple-500 text-purple-600 hover:bg-purple-500/10'
            } disabled:opacity-50`}
          >
            🎭 Demo Login (Temporary)
          </button>

          {/* Toggle Auth Mode */}
          <div className={`text-center ${textSecondary}`}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className={`${isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'} transition font-semibold`}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
