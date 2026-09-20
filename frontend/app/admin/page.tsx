'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { hotelApi, authApi, Hotel } from '@/lib/api/services';
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  CheckCircle, 
  TrendingUp, 
  Plus, 
  DollarSign, 
  CreditCard, 
  Globe, 
  Key, 
  Search, 
  ToggleLeft, 
  ToggleRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';

export default function SaaSAdminPortalPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Hotel Onboarding Form State
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelSlug, setNewHotelSlug] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newPlan, setNewPlan] = useState<'Basic' | 'Pro' | 'Enterprise'>('Pro');
  const [onboardMsg, setOnboardMsg] = useState('');

  // Live API Onboarding & Fetching
  async function loadAllHotels() {
    setLoading(true);
    const res = await hotelApi.getAllHotels();
    if (res.data) setHotels(res.data);
    setLoading(false);
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userInfoStr = localStorage.getItem('user_info');
      if (userInfoStr) {
        try {
          const user = JSON.parse(userInfoStr);
          if (!user.isSuperAdmin) {
            window.location.href = '/dashboard';
            return;
          }
        } catch {
          window.location.href = '/login';
          return;
        }
      } else {
        window.location.href = '/login';
        return;
      }
    }
    loadAllHotels();
  }, []);

  const handleOnboardHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardMsg('');
    try {
      const res = await authApi.registerHotel({
        hotelName: newHotelName,
        slug: newHotelSlug,
        ownerFullName: newOwnerName,
        email: newOwnerEmail,
        password: 'Password@123',
        phone: '9876543210',
        address: 'India',
        city: 'City',
        state: 'State',
        pincode: '400001'
      });

      if (res.success) {
        setOnboardMsg(`Hotel "${newHotelName}" onboarded successfully into Database!`);
        await loadAllHotels();
        setTimeout(() => {
          setOnboardMsg('');
          setShowAddModal(false);
          setNewHotelName('');
          setNewHotelSlug('');
          setNewOwnerName('');
          setNewOwnerEmail('');
        }, 2000);
      } else {
        setOnboardMsg(`Error: ${res.message || 'Onboarding failed'}`);
      }
    } catch (err: any) {
      setOnboardMsg(`Error: ${err.message || 'Server error'}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar 
        userRole="SuperAdmin" 
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title="SaaS Master Super-Admin Console" 
          userRole="SuperAdmin" 
          userName="SaaS Platform Admin" 
          onMenuClick={() => setIsMobileOpen(true)}
        />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* SaaS Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl border border-purple-500/30 shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-wider mb-2 border border-purple-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> SaaS Platform Master Control
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Multi-Tenant Hotel SaaS Engine</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Manage hotel clients, subscriptions, tenant database isolation, and platform MRR revenue.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/20 flex items-center gap-2 transition-all hover:scale-105 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Onboard New Hotel Client
            </button>
          </div>

          {/* SaaS Revenue Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
            {[
              { label: 'Total Hotel Clients', val: hotels.length, color: 'text-amber-400', icon: Building2, sub: 'Database Tenants' },
              { label: 'Active Subscriptions', val: `${hotels.filter(h => h.status === 'Active' || !h.status).length} Active`, color: 'text-emerald-400', icon: CheckCircle, sub: 'Live Tenants' },
              { label: 'Monthly Revenue (MRR)', val: `₹${(hotels.length * 2999).toLocaleString()}`, color: 'text-amber-300', icon: TrendingUp, sub: 'Estimated MRR' },
              { label: 'Platform Database', val: 'Connected', color: 'text-purple-400', icon: Globe, sub: 'Turso SQLite DB' }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{stat.label}</span>
                    <div className="w-9 h-9 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center shadow-inner">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className={`text-xl sm:text-2xl font-black ${stat.color}`}>{stat.val}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">{stat.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subscription Plans Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <CreditCard className="w-4.5 h-4.5 text-amber-400" /> Active SaaS Subscription Plans
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Offered pricing tiers for hotel owners</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: 'Starter Plan (Admin Panel Only)', price: '₹1,499', period: '/ month', features: ['Offline Walk-in Booking Desk', 'Housekeeping & Room Inventory', 'POS Restaurant Billing', 'GST Invoice Generator'], color: 'border-slate-800 bg-slate-950' },
                { name: 'Pro Plan (Admin + Booking Engine)', price: '₹2,999', period: '/ month', popular: true, features: ['Everything in Starter', 'Custom Online Booking Website', 'Auto-Rotating Photo Slider', 'Pay at Desk & Pay Online Gateway'], color: 'border-amber-500/50 bg-slate-950 shadow-lg shadow-amber-500/10' },
                { name: 'Enterprise Plan (Multi-Property Chain)', price: '₹6,999', period: '/ month', features: ['Everything in Pro Plan', 'Multi-Hotel Property Switching', 'Custom Subdomain / Domain', 'Dedicated Account Manager'], color: 'border-purple-500/50 bg-slate-950' }
              ].map((plan, i) => (
                <div key={i} className={`p-5 rounded-2xl border space-y-3 ${plan.color} relative`}>
                  {plan.popular && (
                    <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase shadow-md">
                      Most Popular 👑
                    </span>
                  )}
                  <h4 className="font-bold text-white text-sm">{plan.name}</h4>
                  <div>
                    <span className="text-2xl font-black text-amber-400">{plan.price}</span>
                    <span className="text-slate-400 text-xs font-semibold">{plan.period}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Hotel Clients Directory Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" /> Hotel Tenants Directory
                </h3>
                <p className="text-slate-400 text-xs">Complete list of registered SaaS hotel clients in Database</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-8 text-slate-400 text-xs font-bold animate-pulse">Loading database tenants...</div>
              ) : hotels.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-bold">No hotel tenants in database yet. Onboard your first hotel above!</div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
                  <thead className="bg-slate-950 text-[10px] uppercase font-black text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Hotel Name</th>
                      <th className="py-3.5 px-4">Website Slug / URL</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Plan</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-medium">
                    {hotels.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-4 font-extrabold text-white">{h.name}</td>
                        <td className="py-4 px-4 font-mono text-indigo-400">
                          <a href={`/book/${h.slug}`} target="_blank" className="hover:underline flex items-center gap-1">
                            /book/{h.slug} <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-white">{h.email}</p>
                          <p className="text-[10px] text-slate-400">{h.phone}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                            Pro Plan
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {h.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <a
                            href="/dashboard"
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-[11px] rounded-xl transition-all"
                          >
                            Dashboard 🔑
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Onboard New Hotel Client Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> Onboard New Hotel Client
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
                </div>

                {onboardMsg && (
                  <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-2xl">
                    {onboardMsg}
                  </div>
                )}

                <form onSubmit={handleOnboardHotel} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Hotel Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SeaBreeze Luxury Resort"
                      value={newHotelName}
                      onChange={(e) => {
                        setNewHotelName(e.target.value);
                        setNewHotelSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Website URL Slug *</label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3">
                      <span className="text-slate-500 font-mono text-xs">/book/</span>
                      <input
                        type="text"
                        required
                        value={newHotelSlug}
                        onChange={(e) => setNewHotelSlug(e.target.value)}
                        className="w-full bg-transparent text-amber-400 font-mono font-bold focus:outline-none ml-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Owner Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Verma"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Owner Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="owner@seabreeze.com"
                        value={newOwnerEmail}
                        onChange={(e) => setNewOwnerEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Select Subscription Plan *</label>
                    <select
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="Basic">Basic Plan (Admin Panel Only - ₹1,499/mo)</option>
                      <option value="Pro">Pro Plan (Admin + Booking Website - ₹2,999/mo)</option>
                      <option value="Enterprise">Enterprise Plan (Multi-Property Chain - ₹6,999/mo)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 transition-all mt-4"
                  >
                    Onboard Hotel & Generate Login 🚀
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
