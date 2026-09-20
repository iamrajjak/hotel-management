'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { hotelApi, authApi, Hotel } from '@/lib/api/services';
import { ShieldCheck, Building2, CheckCircle, AlertTriangle, Check, X, RefreshCw, Plus } from 'lucide-react';

export default function SuperAdminPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [pendingHotels, setPendingHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // New Hotel Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [form, setForm] = useState({
    hotelName: '',
    hotelSlug: '',
    ownerFullName: '',
    ownerEmail: '',
    ownerPassword: 'Password@123',
    ownerPhone: '',
    city: 'Goa',
    state: 'Goa'
  });

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
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const [allRes, pendingRes] = await Promise.all([
        hotelApi.getAllHotels(),
        hotelApi.getPendingHotels()
      ]);
      if (allRes.data) setHotels(allRes.data);
      if (pendingRes.data) setPendingHotels(pendingRes.data);
    } catch (err) {
      console.error('Error loading super-admin hotels data:', err);
    } finally {
      setLoading(false);
    }
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const handleApprove = async (id: string, name: string) => {
    setProcessingId(id);
    setMsg('');
    setErrorMsg('');
    try {
      const res = await hotelApi.approveHotel(id);
      if (res.success) {
        setMsg(`🎉 Hotel '${name}' approved & activated successfully!`);
        await loadData();
      } else {
        setErrorMsg(res.message || 'Approval failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error approving hotel');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to reject registration request for '${name}'?`)) return;
    setProcessingId(id);
    setMsg('');
    setErrorMsg('');
    try {
      const res = await hotelApi.rejectHotel(id);
      if (res.success) {
        setMsg(`Hotel '${name}' registration rejected.`);
        await loadData();
      } else {
        setErrorMsg(res.message || 'Rejection failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error rejecting hotel');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to suspend hotel '${name}'? Owner access will be deactivated.`)) return;
    setProcessingId(id);
    setMsg('');
    setErrorMsg('');
    try {
      const res = await hotelApi.suspendHotel(id);
      if (res.success) {
        setMsg(`Hotel '${name}' suspended successfully.`);
        await loadData();
      } else {
        setErrorMsg(res.message || 'Suspend failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error suspending hotel');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`⚠️ PERMANENT DELETE: Are you sure you want to delete hotel '${name}' from Database?`)) return;
    setProcessingId(id);
    setMsg('');
    setErrorMsg('');
    try {
      const res = await hotelApi.deleteHotel(id);
      if (res.success) {
        setMsg(`🗑️ Hotel '${name}' deleted permanently from Database.`);
        await loadData();
      } else {
        setErrorMsg(res.message || 'Delete failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting hotel');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hotelName || !form.ownerFullName || !form.ownerEmail || !form.ownerPassword) {
      setErrorMsg('Please fill in all required fields (Hotel Name, Owner Name, Email, Password)');
      return;
    }

    setSubmittingReg(true);
    setMsg('');
    setErrorMsg('');

    try {
      const regRes = await authApi.registerHotel({
        hotelName: form.hotelName,
        hotelSlug: form.hotelSlug || form.hotelName.toLowerCase().replace(/\s+/g, '-'),
        ownerFullName: form.ownerFullName,
        ownerEmail: form.ownerEmail,
        ownerPassword: form.ownerPassword,
        ownerPhone: form.ownerPhone,
        city: form.city,
        state: form.state
      });

      if (regRes.success) {
        const newHotelId = regRes.data?.hotelId;
        if (autoApprove && newHotelId) {
          await hotelApi.approveHotel(newHotelId);
          setMsg(`🎉 Hotel '${form.hotelName}' registered & approved instantly! Owner login is now active.`);
        } else {
          setMsg(`✅ Hotel '${form.hotelName}' registered successfully! Pending SuperAdmin approval.`);
        }

        setIsModalOpen(false);
        setForm({
          hotelName: '',
          hotelSlug: '',
          ownerFullName: '',
          ownerEmail: '',
          ownerPassword: 'Password@123',
          ownerPhone: '',
          city: 'Goa',
          state: 'Goa'
        });
        await loadData();
      } else {
        setErrorMsg(regRes.message || 'Registration failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error registering hotel');
    } finally {
      setSubmittingReg(false);
    }
  };

  const activeHotels = hotels.filter((h) => h.status === 'Active' || h.status === '0' || h.status === 'ACTIVE');

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Sidebar userRole="SuperAdmin" />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Super Admin Platform Console" userRole="SuperAdmin" userName="SaaS Administrator" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 border border-indigo-700/40 rounded-3xl p-6 sm:p-8 shadow-lg shadow-indigo-950/10 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-[10px] font-extrabold uppercase tracking-wider mb-2 border border-indigo-400/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Platform Governance Mode
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">SaaS Tenant Fleet Overview</h1>
              <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-xl">
                Approve new hotel registrations, onboard new tenant hotels, and enforce multi-tenant database isolation.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" /> Register New Hotel
              </button>
              <button
                onClick={loadData}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-md"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* Success / Error Alerts */}
          {msg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex justify-between items-center shadow-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> {msg}
              </span>
              <button onClick={() => setMsg('')}><X className="w-4 h-4 text-emerald-600" /></button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex justify-between items-center shadow-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> {errorMsg}
              </span>
              <button onClick={() => setErrorMsg('')}><X className="w-4 h-4 text-rose-600" /></button>
            </div>
          )}

          {/* Platform Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Hotels</span>
                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-3">{activeHotels.length}</h3>
              <p className="text-xs text-emerald-600 mt-1 font-bold">Shared Database Isolation Active</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Registrations</span>
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-3">{pendingHotels.length}</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Awaiting SuperAdmin Approval</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant Security</span>
                <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-purple-600 mt-3">EF Core RLS</h3>
              <p className="text-xs text-purple-700 mt-1 font-semibold">HotelId Scoped Query Filters</p>
            </div>
          </div>

          {/* SECTION 1: PENDING HOTEL REGISTRATIONS APPROVAL TABLE */}
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                  Approval Queue
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Pending Hotel Registration Requests
                </h3>
              </div>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
                {pendingHotels.length} Requests Pending
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500 text-xs font-bold animate-pulse">
                Fetching pending registrations...
              </div>
            ) : pendingHotels.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-medium">
                ✅ No pending hotel registration requests! All hotels have been processed.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[650px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Hotel Name</th>
                      <th className="py-3.5 px-4">Slug / Domain</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Contact Email & Phone</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pendingHotels.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-900 text-sm">{h.name}</td>
                        <td className="py-4 px-4 text-indigo-600 font-mono font-semibold">{h.slug}</td>
                        <td className="py-4 px-4">{h.city}, {h.state}</td>
                        <td className="py-4 px-4 text-slate-600">{h.email} • {h.phone}</td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">
                            Pending Approval
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            disabled={processingId === h.id}
                            onClick={() => handleApprove(h.id, h.name)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> {processingId === h.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            disabled={processingId === h.id}
                            onClick={() => handleReject(h.id, h.name)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: ALL HOTELS FLEET DIRECTORY */}
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" /> SaaS Fleet Directory & Tenant Control
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage all registered hotel tenants, change access status, or delete test hotels.
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search hotel, email, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all min-w-[200px]"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Suspended">Suspended Only</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500 text-xs font-bold animate-pulse">
                Loading tenant fleet...
              </div>
            ) : hotels.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-medium">
                No hotels registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Hotel Name</th>
                      <th className="py-3.5 px-4">Slug / Domain</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {hotels
                      .filter((h) => {
                        const searchLower = searchTerm.toLowerCase();
                        const matchesSearch =
                          h.name.toLowerCase().includes(searchLower) ||
                          (h.slug && h.slug.toLowerCase().includes(searchLower)) ||
                          (h.email && h.email.toLowerCase().includes(searchLower)) ||
                          (h.city && h.city.toLowerCase().includes(searchLower));

                        if (statusFilter === 'All') return matchesSearch;
                        const st = (h.status || '').toUpperCase();
                        if (statusFilter === 'Active') return matchesSearch && (st === 'ACTIVE' || st === '0');
                        if (statusFilter === 'Pending') return matchesSearch && st === 'PENDING';
                        if (statusFilter === 'Suspended') return matchesSearch && st === 'SUSPENDED';
                        return matchesSearch;
                      })
                      .map((h) => {
                        const isActive = h.status === 'Active' || h.status === 'ACTIVE' || h.status === '0';
                        const isPending = h.status === 'Pending' || h.status === 'PENDING';
                        const isSuspended = h.status === 'Suspended' || h.status === 'SUSPENDED';

                        return (
                          <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-900 text-sm">{h.name}</td>
                            <td className="py-4 px-4 text-indigo-600 font-mono text-xs font-semibold">{h.slug}</td>
                            <td className="py-4 px-4">{h.city}, {h.state}</td>
                            <td className="py-4 px-4 text-slate-600">{h.email} • {h.phone}</td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : isPending
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {isActive ? 'Active' : isPending ? 'Pending' : isSuspended ? 'Suspended' : h.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right space-x-2">
                              {isActive && (
                                <button
                                  disabled={processingId === h.id}
                                  onClick={() => handleSuspend(h.id, h.name)}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              )}
                              {(isPending || isSuspended) && (
                                <button
                                  disabled={processingId === h.id}
                                  onClick={() => handleApprove(h.id, h.name)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve / Activate
                                </button>
                              )}
                              <button
                                disabled={processingId === h.id}
                                onClick={() => handleDelete(h.id, h.name)}
                                className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Delete Hotel permanently from DB"
                              >
                                <X className="w-3.5 h-3.5" /> Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* REGISTER NEW HOTEL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Register New Hotel Tenant</h3>
                <p className="text-xs text-slate-500 mt-1">Onboard a new hotel into the SaaS platform fleet.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Hotel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Heritage Resort"
                  value={form.hotelName}
                  onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Owner Name"
                    value={form.ownerFullName}
                    onChange={(e) => setForm({ ...form, ownerFullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Owner Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@hotel.com"
                    value={form.ownerEmail}
                    onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Owner Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Password"
                    value={form.ownerPassword}
                    onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Owner Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={form.ownerPhone}
                    onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">City</label>
                  <input
                    type="text"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">State</label>
                  <input
                    type="text"
                    placeholder="State"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="autoApproveCheck"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="autoApproveCheck" className="text-slate-700 font-bold cursor-pointer">
                  Instantly approve & activate this hotel for login
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
                >
                  {submittingReg ? 'Registering...' : 'Register Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
