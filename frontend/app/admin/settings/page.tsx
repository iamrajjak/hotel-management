'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HotelLogo from '@/components/HotelLogo';
import { hotelApi, Hotel } from '@/lib/api/services';
import { 
  Building2, 
  Crown, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Clock, 
  Receipt, 
  CreditCard, 
  Globe, 
  ShieldCheck, 
  X, 
  Sparkles, 
  Edit3, 
  ArrowUpRight,
  Phone,
  Mail,
  MapPin,
  FileText,
  Lock,
  Zap,
  Check,
  MessageSquare
} from 'lucide-react';

export default function HotelSettingsPage() {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Editable Form States
  const [hotelName, setHotelName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [gstNumber, setGstNumber] = useState('');
  const [taxRate, setTaxRate] = useState('12%');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountNo, setAccountNo] = useState('50100293847162');
  const [ifsc, setIfsc] = useState('HDFC0000123');
  const [upiId, setUpiId] = useState('grandpalace@upi');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [wifiName, setWifiName] = useState('Hotel_Guest_WiFi');
  const [wifiPassword, setWifiPassword] = useState('Welcome2026');
  const [reviewUrl, setReviewUrl] = useState('https://g.page/r/your-hotel-review');
  const [waProvider, setWaProvider] = useState('UltraMsg / Twilio');
  const [waApiKey, setWaApiKey] = useState('');
  const [waInstanceId, setWaInstanceId] = useState('');
  const [autoSendNotifications, setAutoSendNotifications] = useState(true);

  useEffect(() => {
    loadHotelSettings();
  }, []);

  async function loadHotelSettings() {
    setLoading(true);
    try {
      const res = await hotelApi.getCurrentHotel();
      if (res.data) {
        setHotel(res.data);
        setHotelName(res.data.name || 'Grand Palace Hotel & Resorts');
        setPhone(res.data.phone || '+91 9876543210');
        setEmail(res.data.email || 'contact@grandpalace.com');
        setAddress(res.data.address || '123 Luxury Boulevard, Beach Road');
        setCity(res.data.city || 'Goa');
        setStateName(res.data.state || 'Goa');
        setPincode(res.data.pincode || '403001');
        setCheckInTime(res.data.checkInTime || '14:00');
        setCheckOutTime(res.data.checkOutTime || '11:00');
        setGstNumber(res.data.gstNumber || '30AAAAA0000A1Z5');
        setTaxRate(res.data.taxRate || '12%');
        setBankName(res.data.bankName || 'HDFC Bank');
        setAccountNo(res.data.accountNo || '50100293847162');
        setIfsc(res.data.ifscCode || 'HDFC0000123');
        setUpiId(res.data.upiId || 'grandpalace@upi');
        setWebsite(res.data.website || 'https://grandpalace.com');
        setLogoUrl(res.data.logoUrl || '');
        setCoverImageUrl(res.data.coverImageUrl || '');
        setWifiName(res.data.wifiName || 'Hotel_Guest_WiFi');
        setWifiPassword(res.data.wifiPassword || 'Welcome2026');
        setReviewUrl(res.data.reviewUrl || 'https://g.page/r/your-hotel-review');
      }
    } catch (err) {
      console.error('Error loading hotel settings:', err);
    } finally {
      setLoading(false);
    }
  }

  const showNotice = (text: string, isErr: boolean = false) => {
    setMsg(text);
    setMsgType(isErr ? 'error' : 'success');
    setTimeout(() => setMsg(''), 6000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');

    if (!hotelName.trim() || hotelName.trim().length < 3) {
      showNotice('Hotel Name is required (minimum 3 characters)', true);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      showNotice('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)', true);
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showNotice('Please enter a valid email address (e.g. contact@hotel.com)', true);
      return;
    }

    if (gstNumber.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gstNumber.trim())) {
      showNotice('Please enter a valid 15-character Indian GSTIN (e.g. 30AAAAA0000A1Z5)', true);
      return;
    }

    if (ifsc.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc.trim())) {
      showNotice('Please enter a valid 11-character Indian IFSC code (e.g. HDFC0000123)', true);
      return;
    }

    try {
      const res = await hotelApi.updateHotel({
        name: hotelName,
        phone,
        email,
        address,
        city,
        state: stateName,
        pincode,
        checkInTime,
        checkOutTime,
        gstNumber,
        taxRate,
        bankName,
        accountNo,
        ifscCode: ifsc,
        upiId,
        website,
        logoUrl,
        coverImageUrl,
        wifiName,
        wifiPassword,
        reviewUrl
      });

      if (res.success) {
        showNotice('Settings updated successfully in Database & Turso Cloud!');
        if (res.data) setHotel(res.data);

        // Update local storage so Header & Sidebar reflect changes live
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('user_info');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.hotelName = hotelName;
              parsed.email = email;
              parsed.phone = phone;
              localStorage.setItem('user_info', JSON.stringify(parsed));
              window.dispatchEvent(new Event('user_info_updated'));
              window.dispatchEvent(new Event('storage'));
            } catch {}
          }
        }

        setActiveModal(null);
      } else {
        showNotice(res.message || 'Phone number or email address is already saved/registered with another hotel!', true);
      }
    } catch (err: any) {
      showNotice(err?.message || 'Failed to save settings. Please try again.', true);
    }
  };

  const settingCards = [
    {
      id: 'general',
      title: 'Hotel Profile & Contact',
      sub: 'Hotel Name, Phone, Email & Address',
      icon: Building2,
      color: 'text-indigo-600',
      bgGlow: 'bg-indigo-50 border-indigo-100 text-indigo-700',
      preview: `${hotelName || 'Grand Palace Hotel'} • ${phone}`
    },
    {
      id: 'policy',
      title: 'Check-In & Policy Rules',
      sub: 'Check-In/Out times, Early/Late Rules',
      icon: Clock,
      color: 'text-emerald-600',
      bgGlow: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      preview: `Check-In: ${checkInTime} | Check-Out: ${checkOutTime}`
    },
    {
      id: 'tax',
      title: 'GST & Tax Configuration',
      sub: 'GSTIN, Tax Slab % & Invoice Prefix',
      icon: Receipt,
      color: 'text-blue-600',
      bgGlow: 'bg-blue-50 border-blue-100 text-blue-700',
      preview: `GSTIN: ${gstNumber || '30AAAAA0000A1Z5'} (${taxRate})`
    },
    {
      id: 'payment',
      title: 'Payment Modes & Bank Details',
      sub: 'Bank Account, IFSC, UPI ID & Cash Policy',
      icon: CreditCard,
      color: 'text-amber-600',
      bgGlow: 'bg-amber-50 border-amber-100 text-amber-700',
      preview: `${bankName} (${accountNo}) | UPI: ${upiId}`
    },
    {
      id: 'branding',
      title: 'Branding & Public Website',
      sub: 'Logo URL, Cover Banner, Website Domain',
      icon: Globe,
      color: 'text-purple-600',
      bgGlow: 'bg-purple-50 border-purple-100 text-purple-700',
      preview: `${website || 'https://grandpalace.com'}`
    },
    {
      id: 'notifications',
      title: 'WhatsApp & SMS Automation',
      sub: 'Auto-Send Booking, Check-In & Checkout Alerts',
      icon: MessageSquare,
      color: 'text-emerald-600',
      bgGlow: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      preview: autoSendNotifications ? 'Auto-Triggers: Enabled (Simulation & Gateway)' : 'Auto-Triggers: Paused'
    },
    {
      id: 'security',
      title: 'Security & Access Control',
      sub: 'Multi-Tenant Scoping, Role Permissions',
      icon: ShieldCheck,
      color: 'text-rose-600',
      bgGlow: 'bg-rose-50 border-rose-100 text-rose-700',
      preview: 'Role: Hotel Owner • Multi-Tenant Isolated'
    }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Hotel Settings & Configuration" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Top Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 rounded-3xl border border-indigo-700/40 shadow-lg text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-[10px] font-black uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Enterprise Hotel Control Center
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">System Settings & Policies</h1>
              <p className="text-indigo-200 text-xs sm:text-sm font-medium">Click any settings box below to configure policies, GST, payments, and branding</p>
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-xs font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-300" />
                <span>Hotel Code: <strong className="text-amber-300">{hotel?.hotelCode || 'HTL-001'}</strong></span>
              </div>
            </div>
          </div>

          {/* Dynamic Message Banner */}
          {msg && (
            <div className={`p-4 rounded-2xl border text-xs font-extrabold flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200 ${
              msgType === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-2.5">
                {msgType === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                )}
                <span>{msg}</span>
              </div>
              <button onClick={() => setMsg('')} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Interactive Setting Box Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {settingCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => setActiveModal(card.id)}
                  className="bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-xl transition-all duration-300 p-6 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl ${card.bgGlow} flex items-center justify-center border shadow-xs group-hover:scale-110 transition-all duration-300`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="p-2 rounded-xl bg-slate-100 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white transition-all shadow-xs">
                        <Edit3 className="w-4 h-4" />
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-700 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-slate-500 text-xs font-medium mt-1">{card.sub}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-500 truncate max-w-[200px]">
                      {card.preview}
                    </span>
                    <span className="text-indigo-600 font-extrabold text-[11px] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Configure <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* INTERACTIVE SETTINGS MODAL (CLICK TO OPEN BOX) */}
          {activeModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Sparkles className="w-5 h-5 text-indigo-200" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-white">
                        {settingCards.find(c => c.id === activeModal)?.title}
                      </h3>
                      <p className="text-slate-400 text-xs font-medium">Update hotel configuration and database records</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Form Body */}
                <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
                  {msg && msgType === 'error' && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{msg}</span>
                    </div>
                  )}
                  {activeModal === 'general' && (
                    <>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Hotel Full Name *</label>
                        <input
                          type="text"
                          value={hotelName}
                          onChange={(e) => setHotelName(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-extrabold text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Address *</label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">City</label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">State</label>
                          <input
                            type="text"
                            value={stateName}
                            onChange={(e) => setStateName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Pincode</label>
                          <input
                            type="text"
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Guest WiFi Network Name (SSID) 📶</label>
                          <input
                            type="text"
                            value={wifiName}
                            onChange={(e) => setWifiName(e.target.value)}
                            placeholder="e.g. Hotel_Guest_WiFi"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-600 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Guest WiFi Password 🔑</label>
                          <input
                            type="text"
                            value={wifiPassword}
                            onChange={(e) => setWifiPassword(e.target.value)}
                            placeholder="e.g. Welcome2026"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-600 outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {activeModal === 'policy' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Standard Check-In Time</label>
                          <input
                            type="time"
                            value={checkInTime}
                            onChange={(e) => setCheckInTime(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Standard Check-Out Time</label>
                          <input
                            type="time"
                            value={checkOutTime}
                            onChange={(e) => setCheckOutTime(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2 text-indigo-900">
                        <p className="font-extrabold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Automatic Room Release Policy
                        </p>
                        <p className="text-[11px] text-indigo-700 font-medium">
                          Upon guest check-out, room status automatically updates to <strong>Available</strong> and returns immediately to the available room inventory.
                        </p>
                      </div>
                    </>
                  )}

                  {activeModal === 'tax' && (
                    <>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">GSTIN Number</label>
                        <input
                          type="text"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                          placeholder="e.g. 30AAAAA0000A1Z5"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Applicable GST Tax Slab Rate</label>
                        <select
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                        >
                          <option value="0%">0% (Exempt)</option>
                          <option value="12%">12% GST (Rooms ₹1,000 - ₹7,500)</option>
                          <option value="18%">18% GST (Luxury Rooms &gt; ₹7,500)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {activeModal === 'payment' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">IFSC Code</label>
                          <input
                            type="text"
                            value={ifsc}
                            onChange={(e) => setIfsc(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Account Number</label>
                        <input
                          type="text"
                          value={accountNo}
                          onChange={(e) => setAccountNo(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">UPI VPA ID for QR Code Payments</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                        />
                      </div>
                    </>
                  )}

                  {activeModal === 'branding' && (
                    <>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Hotel Public Website URL</label>
                        <input
                          type="text"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Logo Image URL</label>
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Google Review / Feedback Page Link ⭐</label>
                        <input
                          type="text"
                          value={reviewUrl}
                          onChange={(e) => setReviewUrl(e.target.value)}
                          placeholder="https://g.page/r/your-hotel-review"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-600 outline-none"
                        />
                        <p className="text-[10px] text-slate-500 font-medium mt-1">This Google Review link is automatically included in WhatsApp checkout messages so guests can leave a 5-star review!</p>
                      </div>
                    </>
                  )}

                  {activeModal === 'notifications' && (
                    <>
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-xs">
                            <Sparkles className="w-4 h-4 text-emerald-600" /> Auto-Notification Dispatch Engine
                          </p>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                            Active & Ready
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                          Whenever a reservation is <strong>Created</strong>, <strong>Checked-In</strong>, or <strong>Checked-Out</strong>, an automatic notification is formatted and dispatched in the background.
                        </p>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">WhatsApp & SMS Provider</label>
                        <select
                          value={waProvider}
                          onChange={(e) => setWaProvider(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold"
                        >
                          <option value="UltraMsg / Twilio">UltraMsg WhatsApp Gateway</option>
                          <option value="WATI">WATI WhatsApp API</option>
                          <option value="Twilio">Twilio WhatsApp & SMS</option>
                          <option value="Fast2SMS">Fast2SMS (India)</option>
                          <option value="Simulation">Simulation / Audit Log Mode</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Instance ID / Token</label>
                          <input
                            type="text"
                            value={waInstanceId}
                            onChange={(e) => setWaInstanceId(e.target.value)}
                            placeholder="e.g. instance10294"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">API Key / Token</label>
                          <input
                            type="password"
                            value={waApiKey}
                            onChange={(e) => setWaApiKey(e.target.value)}
                            placeholder="••••••••••••••••"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <input
                            type="checkbox"
                            checked={autoSendNotifications}
                            onChange={(e) => setAutoSendNotifications(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">Enable Auto-Send Background Triggers</p>
                            <p className="text-[11px] text-slate-500 font-medium">Auto-dispatch WhatsApp & SMS alerts on booking, check-in, and checkout</p>
                          </div>
                        </label>
                      </div>
                    </>
                  )}

                  {activeModal === 'security' && (
                    <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 space-y-3">
                      <p className="font-extrabold text-slate-900 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-600" /> Multi-Tenant Scoping & Security Policy
                      </p>
                      <p className="text-[11px] text-slate-600">
                        All property data is protected with enterprise multi-tenant scoping, role-based access control, and end-to-end data encryption.
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <Save className="w-4 h-4" /> Save Configuration
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
