'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/app/lib/api';
import { decodeToken } from '@/app/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ username, password });
      const userInfo = decodeToken(response.token);
      if (userInfo) {
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        router.push(userInfo.role === 'Admin' ? '/admin' : '/kasir');
      } else {
        router.push('/kasir');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#f5f5f5]">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-[45%] bg-white flex flex-col px-8 sm:px-12 lg:px-16 py-12 relative">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-[#1a4d52] rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg">point_of_sale</span>
          </div>
          <span className="text-lg font-semibold text-[#1a4d52]">Kasir.Net</span>
        </div>

        {/* Form Container - Centered */}
        <div className="flex-1 flex flex-col justify-center max-w-[380px] mx-auto w-full pb-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[28px] font-semibold text-gray-900 mb-2">Welcome Back!</h1>
            <p className="text-[15px] text-gray-500 leading-relaxed">
              Sign in to access your dashboard and continue<br />optimizing your POS system.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">Username</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">person</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1a4d52] focus:ring-1 focus:ring-[#1a4d52] transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="w-full pl-11 pr-11 py-3 bg-white border border-gray-300 rounded-lg text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1a4d52] focus:ring-1 focus:ring-[#1a4d52] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <a href="#" className="text-[13px] text-[#1a4d52] hover:underline font-medium">Forgot Password?</a>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-[13px] rounded-lg border border-red-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a4d52] hover:bg-[#153d41] text-white text-[14px] font-medium py-3 rounded-lg transition-colors"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 py-1">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-[13px] text-gray-400">OR</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            {/* Demo Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-gray-600 text-[20px]">admin_panel_settings</span>
                <span className="text-[14px] font-medium text-gray-700">Continue with Admin Demo</span>
              </button>
              <button
                type="button"
                onClick={() => { setUsername('kasir'); setPassword('kasir123'); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-gray-600 text-[20px]">point_of_sale</span>
                <span className="text-[14px] font-medium text-gray-700">Continue with Kasir Demo</span>
              </button>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-[13px] text-gray-500 pt-2">
              Don&apos;t have an Account? <a href="#" className="text-[#1a4d52] font-semibold hover:underline">Sign Up</a>
            </p>
          </form>
        </div>
      </div>

      {/* Right Panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#1a4d52] to-[#0f3538] flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-400/10 rounded-full blur-[100px] -translate-y-1/4 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[80px] translate-y-1/4 -translate-x-1/4"></div>

        {/* Hero Text */}
        <div className="relative z-10 mt-8">
          <h2 className="text-[42px] font-light text-white leading-[1.15] tracking-tight">
            Revolutionize POS with<br />
            <span className="font-semibold">Smarter Automation</span>
          </h2>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 max-w-md">
          <div className="text-white/30 text-[60px] leading-none font-serif">"</div>
          <p className="text-white/90 text-[17px] leading-relaxed -mt-4 mb-6">
            Kasir.Net has completely transformed our retail process. It&apos;s reliable, efficient, and ensures our operations are always top-notch.
          </p>
        </div>

        {/* Trust Logos */}
        <div className="relative z-10">
          <p className="text-white/40 text-[11px] uppercase tracking-[0.15em] mb-5 font-medium">
            Join Now
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-1.5 text-white/70">
              <span className="material-symbols-outlined text-[22px]">storefront</span>
              <span className="font-semibold text-[15px]">RetailPro</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/70">
              <span className="material-symbols-outlined text-[22px]">local_cafe</span>
              <span className="font-semibold text-[15px]">BrewCo</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/70">
              <span className="material-symbols-outlined text-[22px]">restaurant</span>
              <span className="font-semibold text-[15px]">RestoMax</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/70">
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              <span className="font-semibold text-[15px]">Mart24</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
