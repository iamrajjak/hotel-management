'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/services';
import { Crown, Lock, Mail, ArrowRight, Building2, User, Phone, ShieldCheck, Briefcase, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // --- LOGIN FORM STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'HotelOwner' | 'StaffManager'>('HotelOwner');
  const [rememberMe, setRememberMe] = useState(true);

  // --- REGISTRATION FORM STATE ---
  const [registerData, setRegisterData] = useState({
    hotelName: '',
    hotelSlug: '',
    phone: '',
    email: '',
    address: '123 Beach Road',
    city: 'Goa',
    state: 'Goa',
    country: 'India',
    pincode: '403001',
    ownerFullName: '',
    ownerEmail: '',
    ownerPassword: '',
    staffPassword: '',
    ownerPhone: '',
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // --- FORGOT PASSWORD MODAL STATE ---
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotRole, setForgotRole] = useState<'HotelOwner' | 'StaffManager' | 'Both'>('Both');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Handle Reset Password Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotMsg('');

    try {
      const res = await authApi.resetPassword({
        email: forgotEmail,
        targetRole: forgotRole,
        newPassword: forgotNewPassword,
      });

      if (res.success) {
        setForgotMsg('🎉 Password updated & saved in Turso cloud DB! You can now log in with your new password.');
        setEmail(forgotEmail);
        setPassword(forgotNewPassword);
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotMsg('');
        }, 2000);
      } else {
        setForgotError(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Error resetting password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    }

    const res = await authApi.login({ email, password, role: selectedRole });
    setLoading(false);

    if (res.success && res.data && res.data.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('user_info', JSON.stringify(res.data));
        window.location.href = res.data.isSuperAdmin ? '/super-admin' : '/dashboard';
      }
    } else {
      setError(res.message || 'Invalid email or password');
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (!registerData.ownerPassword) {
      setError('Owner Password is required');
      setLoading(false);
      return;
    }

    if (!registerData.staffPassword) {
      setError('Staff/Manager Password is required');
      setLoading(false);
      return;
    }

    const res = await authApi.registerHotel(registerData);
    setLoading(false);

    if (res.success && res.data) {
      setEmail(registerData.ownerEmail);
      setPassword(registerData.ownerPassword);
      setActiveTab('login');
      setSuccessMsg(`🎉 Hotel '${registerData.hotelName}' registered successfully! Both Owner and Staff/Manager passwords have been created. Submitted for SuperAdmin approval.`);
    } else {
      setError(res.message || 'Hotel registration failed.');
    }
  };

  // Auto-generate Slug on Hotel Name change
  const handleRegChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'hotelName') {
        updated.hotelSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      if (name === 'ownerEmail' && !prev.email) {
        updated.email = value;
      }
      if (name === 'ownerPhone' && !prev.phone) {
        updated.phone = value;
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-100 font-sans">
      {/* Left Purple Luxury Branding Panel */}
      <div className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950 p-12 flex flex-col justify-between text-white overflow-hidden shadow-2xl">
        <Image
          src="/images/resort-hero.jpg"
          alt="Royal Stay Resort"
          fill
          className="object-cover opacity-20"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30">
            <Crown className="w-7 h-7 fill-slate-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-wider text-white uppercase">ROYAL STAY</h1>
            <p className="text-xs text-amber-400 font-bold uppercase tracking-widest">HOTELS & RESORTS</p>
          </div>
        </div>

        <div className="relative z-10 space-y-4 max-w-md my-auto py-12">
          <span className="px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
            Multi-Tenant SaaS Portal
          </span>
          <h2 className="text-4xl font-black tracking-tight leading-tight">
            Manage Hotel Operations, Rooms & Guests Seamlessly
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Support dual login profiles: <span className="font-bold text-amber-300">Hotel Owner</span> (Full P&L analytics, financial controls) & <span className="font-bold text-indigo-300">Staff / Manager</span> (Front desk operations, KOT, attendance).
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-400 font-medium">
          © 2026 Royal Stay Hotels & Resorts. All rights reserved.
        </div>
      </div>

      {/* Right Form Container with Dual Mode Switcher */}
      <div className="flex items-center justify-center p-6 sm:p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* Top Mode Selector Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Portal Login
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register Hotel
            </button>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-slate-900">
              {activeTab === 'login' ? 'Account Login' : 'Register Your Hotel'}
            </h2>
            <p className="text-xs text-slate-400">
              {activeTab === 'login'
                ? 'Select your role and log in with your account password'
                : 'Configure Owner & Staff access passwords during hotel setup'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
              {successMsg}
            </div>
          )}

          {/* TAB 1: LOGIN FORM WITH ROLE SELECTOR */}
          {activeTab === 'login' && (
            <div className="space-y-6">
              {/* Role Switcher Pill */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Login As Role:</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-extrabold">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('HotelOwner')}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      selectedRole === 'HotelOwner'
                        ? 'bg-slate-900 text-amber-400 shadow-sm border border-slate-800'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> Hotel Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('StaffManager')}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      selectedRole === 'StaffManager'
                        ? 'bg-slate-900 text-indigo-300 shadow-sm border border-slate-800'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Staff / Manager
                  </button>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter registered email"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {selectedRole === 'HotelOwner' ? 'Owner Password' : 'Staff / Manager Password'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder={`Enter ${selectedRole === 'HotelOwner' ? 'Owner' : 'Staff'} password`}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-indigo-600 accent-indigo-600"
                    />
                    <span>Remember Me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotEmail(email);
                      setForgotError('');
                      setForgotMsg('');
                    }}
                    className="text-indigo-600 font-bold hover:underline bg-transparent border-0 p-0 text-xs cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : `Login as ${selectedRole === 'HotelOwner' ? 'Hotel Owner' : 'Staff Manager'}`} <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  New Hotel Owner?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-indigo-600 font-extrabold hover:underline"
                  >
                    Register Your Hotel Here
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTRATION FORM WITH DUAL PASSWORDS */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hotel Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    name="hotelName"
                    value={registerData.hotelName}
                    onChange={handleRegChange}
                    required
                    placeholder="Grand Royal Resort"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subdomain Slug (Unique Key) *</label>
                <input
                  type="text"
                  name="hotelSlug"
                  value={registerData.hotelSlug}
                  onChange={handleRegChange}
                  required
                  placeholder="grand-royal"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Owner Full Name *</label>
                  <input
                    type="text"
                    name="ownerFullName"
                    value={registerData.ownerFullName}
                    onChange={handleRegChange}
                    required
                    placeholder="Rajesh Sharma"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Owner Phone *</label>
                  <input
                    type="text"
                    name="ownerPhone"
                    value={registerData.ownerPhone}
                    onChange={handleRegChange}
                    required
                    placeholder="9876543210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Registered Hotel Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    name="ownerEmail"
                    value={registerData.ownerEmail}
                    onChange={handleRegChange}
                    required
                    placeholder="owner@grandroyal.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* DUAL PASSWORDS: OWNER & STAFF */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-900 font-extrabold text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Configure Dual Account Passwords</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">1. Hotel Owner Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-amber-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      name="ownerPassword"
                      value={registerData.ownerPassword}
                      onChange={handleRegChange}
                      required
                      placeholder="Master Owner Password"
                      className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Full access to revenues, P&L analytics, expenses & admin settings.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">2. Staff / Manager Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      name="staffPassword"
                      value={registerData.staffPassword}
                      onChange={handleRegChange}
                      required
                      placeholder="Staff Operational Password"
                      className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Operational access to bookings, check-in, KOT orders & attendance.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Onboarding Hotel...' : 'Complete Hotel Registration'} <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-indigo-600 font-extrabold hover:underline"
                  >
                    Back to Login
                  </button>
                </p>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-indigo-900 font-black text-lg">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <span>Reset Account Password</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Select which password you want to reset, enter your registered email address, and enter your new password. The updated password will be saved & synced directly to Turso Cloud DB.
            </p>

            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium">
                {forgotError}
              </div>
            )}

            {forgotMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
                {forgotMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Account Password *</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setForgotRole('Both')}
                    className={`py-2 rounded-xl text-center transition-all ${
                      forgotRole === 'Both'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotRole('HotelOwner')}
                    className={`py-2 rounded-xl text-center transition-all ${
                      forgotRole === 'HotelOwner'
                        ? 'bg-slate-900 text-amber-400 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Owner Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotRole('StaffManager')}
                    className={`py-2 rounded-xl text-center transition-all ${
                      forgotRole === 'StaffManager'
                        ? 'bg-slate-900 text-indigo-300 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Staff Only
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Registered Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder="owner@hotel.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {forgotLoading ? 'Updating...' : 'Save & Sync Password'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
