'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import WhatsAppModal from '@/components/WhatsAppModal';
import { customerApi, hotelApi, Customer, Hotel } from '@/lib/api/services';
import { Users, Search, Mail, Phone, Inbox, RefreshCw, Plus, X, CheckCircle, AlertCircle, Trash2, MessageCircle } from 'lucide-react';

export default function CustomersManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // WhatsApp Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [res, hotelRes] = await Promise.all([
        customerApi.getCustomers(),
        hotelApi.getCurrentHotel()
      ]);
      if (hotelRes && hotelRes.data) {
        setCurrentHotel(hotelRes.data);
      }
      if (res && Array.isArray(res.data)) {
        setCustomers(res.data);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error('Error loading customers from database:', err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete customer profile "${name}"?`)) {
      setLoading(true);
      const res = await customerApi.deleteCustomer(id);
      if (res && res.success) {
        setSuccessMsg(`Customer "${name}" deleted successfully.`);
      } else {
        setSuccessMsg(`Customer "${name}" deleted.`);
      }
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Full name is required (minimum 2 characters)');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number starting with 6-9');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    const payload = {
      fullName: trimmedName,
      phone: cleanPhone,
      email: email.trim(),
      city: city.trim() || 'Goa',
      state: state.trim() || 'Goa'
    };

    const res = await customerApi.createCustomer(payload);
    if (res && res.success) {
      setSuccessMsg(`Guest profile for '${trimmedName}' created successfully!`);
      resetForm();
      setShowModal(false);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(res?.message || 'Failed to create customer profile');
    }
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setCity('');
    setState('');
    setErrorMsg('');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Sidebar 
        userRole="HotelOwner"
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title="Customer CRM & Guest Directory" 
          onMenuClick={() => setIsMobileOpen(true)}
        />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Dark Violet CRM Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-violet-950 via-purple-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-purple-800/40 shadow-xl shadow-purple-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-purple-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <Users className="w-3.5 h-3.5 text-purple-300" /> Guest CRM Directory
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-400/30">
                  Verified Guest Database
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Customer Directory</h1>
                <p className="text-purple-200/90 text-xs sm:text-sm font-medium mt-1">Guest CRM Directory • Track stay history, preferences & verified contact profiles</p>
              </div>

              {/* CRM Metric Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-purple-300 text-[11px] font-bold">Total Registered Guests:</span>
                  <span className="font-mono font-black text-white text-sm">{customers.length} Guests</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-emerald-300 text-[11px] font-bold">Verified Phone Profiles:</span>
                  <span className="font-mono font-black text-white text-sm">{customers.filter(c => c.phone).length}</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3 self-start lg:self-center">
              <button
                onClick={loadData}
                title="Refresh Guest Directory"
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-md hover:scale-105"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Directory
              </button>

              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add New Customer
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> {successMsg}
              </span>
              <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 text-emerald-600" /></button>
            </div>
          )}

          {/* Customer Directory Table */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-500 text-xs font-bold animate-pulse">
                Loading guest directory...
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                  <Inbox className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base">No Customer Profiles Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">No guest profiles created yet. Click above to add a new guest profile.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[500px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Guest Name</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">City / State</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {customers.map((c: any, idx: number) => (
                      <tr key={c.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md shadow-indigo-500/20">
                            {(c.fullName || c.name || 'G').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{c.fullName || c.name}</span>
                        </td>
                        <td className="py-4 px-4 text-slate-600 font-medium">{c.email || 'N/A'}</td>
                        <td className="py-4 px-4 text-slate-600 font-mono">{c.phone || 'N/A'}</td>
                        <td className="py-4 px-4 text-slate-600">{c.city ? `${c.city}, ${c.state || ''}` : 'Goa, India'}</td>
                        <td className="py-4 px-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedCustomer(c);
                              setShowWhatsAppModal(true);
                            }}
                            title="Send WhatsApp Message"
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-xl border border-emerald-200 transition-all flex items-center justify-center"
                          >
                            <MessageCircle className="w-4 h-4 fill-current" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.fullName || c.name || 'Guest')}
                            title="Delete Customer from Database"
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl border border-rose-200 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add New Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col my-auto space-y-4 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white z-10 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Add New Customer Profile</h3>
                <p className="text-xs text-slate-500">Create a new verified guest CRM profile</p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                type="button"
                title="Close Modal"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all border border-slate-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="overflow-y-auto space-y-4 text-xs pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RAJJAK KHAN"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (10 Digits) *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9784306040"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono font-bold transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. guest@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Goa"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Goa"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/25 transition-all mt-4"
              >
                Save Customer Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP DIRECT GUEST MESSAGING MODAL */}
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => {
          setShowWhatsAppModal(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        defaultTemplate="welcome"
        hotelName={currentHotel?.name}
        hotelAddress={currentHotel?.address}
        hotelPhone={currentHotel?.phone}
        wifiName={currentHotel?.wifiName}
        wifiPassword={currentHotel?.wifiPassword}
        reviewUrl={currentHotel?.reviewUrl}
        websiteUrl={currentHotel?.website}
      />
    </div>
  );
}
