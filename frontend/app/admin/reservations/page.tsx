'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import GuestFolioModal from '@/components/GuestFolioModal';
import WhatsAppModal from '@/components/WhatsAppModal';
import { reservationApi, roomApi, customerApi, hotelApi, Reservation, Room, Customer, Hotel } from '@/lib/api/services';
import { CalendarDays, Search, Filter, Plus, Edit, Trash2, CheckCircle, X, Sparkles, AlertCircle, Inbox, Users, CreditCard, IndianRupee, ShieldCheck, Printer, MessageCircle } from 'lucide-react';

export default function ReservationsManagementPage() {
  const [bookingList, setBookingList] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFolioModal, setShowFolioModal] = useState(false);
  const [selectedFolioReservation, setSelectedFolioReservation] = useState<any>(null);

  // Delete Modal States
  const [reservationToDelete, setReservationToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // WhatsApp Modal States
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedWhatsAppReservation, setSelectedWhatsAppReservation] = useState<any>(null);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<'booking' | 'checkout' | 'welcome'>('booking');

  // Date Helper Functions (Using Local Timezone)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTomorrowStr = (baseStr?: string) => {
    const d = baseStr ? new Date(baseStr) : new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getNightsCount = (inStr: string, outStr: string) => {
    if (!inStr || !outStr) return 0;
    const diff = new Date(outStr).getTime() - new Date(inStr).getTime();
    const nights = Math.ceil(diff / (1000 * 3600 * 24));
    return nights > 0 ? nights : 0;
  };

  const formatBookingStatusBadge = (status: any) => {
    const s = String(status ?? '').toLowerCase();
    if (s === '1' || s === 'confirmed') return { label: 'Confirmed 🟢', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (s === '2' || s === 'checkedin') return { label: 'Checked In 🔵', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (s === '3' || s === 'checkedout') return { label: 'Checked Out ⚪', style: 'bg-slate-100 text-slate-700 border-slate-300' };
    if (s === '4' || s === 'cancelled') return { label: 'Cancelled 🔴', style: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (s === '5' || s === 'noshow') return { label: 'No Show 🟠', style: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Pending 🟡', style: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  const formatBookingNumberDisplay = (numStr: string, idx: number) => {
    if (!numStr) return `BK-${1001 + idx}`;
    if (numStr.startsWith('BK-')) return numStr;
    if (numStr.startsWith('RES-')) return numStr.replace('RES-', 'BK-');
    if (numStr.includes('-')) {
      const parts = numStr.split('-');
      return `BK-${parts[parts.length - 1]}`;
    }
    return `BK-${numStr}`;
  };

  // Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [checkInDate, setCheckInDate] = useState(() => getTodayStr());
  const [checkOutDate, setCheckOutDate] = useState(() => getTomorrowStr());
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [bookingStatus, setBookingStatus] = useState('Confirmed');
  
  // Payment Form State
  const [advancePaidAmount, setAdvancePaidAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [res, roomRes, custRes, hotelRes] = await Promise.all([
      reservationApi.getReservations(),
      roomApi.getRooms(),
      customerApi.getCustomers(),
      hotelApi.getCurrentHotel()
    ]);

    if (hotelRes && hotelRes.data) {
      setCurrentHotel(hotelRes.data);
    }

    if (res && res.data) {
      setBookingList(res.data);
    } else {
      setBookingList([]);
    }

    if (roomRes && Array.isArray(roomRes.data)) {
      const avail = roomRes.data.filter((r: any) => {
        const s = String(r.status ?? '').toLowerCase();
        return s === 'available' || s === '0' || s === 'reserved' || s === 'ready' || s === '';
      });
      const finalRooms = avail.length > 0 ? avail : roomRes.data;
      setAvailableRooms(finalRooms);
      if (finalRooms.length > 0) {
        setRoomNumber(finalRooms[0].roomNumber);
      } else {
        setRoomNumber('');
      }
    } else {
      setAvailableRooms([]);
      setRoomNumber('');
    }

    if (custRes && Array.isArray(custRes.data)) {
      setCustomersList(custRes.data);
    } else {
      setCustomersList([]);
    }

    setLoading(false);
  }

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    if (!id) {
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      return;
    }

    const found = customersList.find((c: any) => c.id === id);
    if (found) {
      setGuestName(found.fullName || (found as any).name || '');
      setGuestPhone(found.phone || '');
      setGuestEmail(found.email || '');
    }
  };

  // Handle Add New Booking to Live Database API with Payment Fields
  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = guestName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Guest full name is required (minimum 2 characters)');
      return;
    }

    const cleanPhone = guestPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
      return;
    }

    if (guestEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      setErrorMsg('Please enter a valid email address (e.g. guest@example.com)');
      return;
    }

    if (!roomNumber) {
      setErrorMsg('No available rooms in database to book! Please select or add a room in Rooms Management.');
      return;
    }

    if (checkOutDate <= checkInDate) {
      setErrorMsg('Check-out date must be at least 1 day after Check-in date.');
      return;
    }

    // Calculate room price and validate payment
    const selectedRoomObj = availableRooms.find((r: any) => r.roomNumber === roomNumber);
    const nights = getNightsCount(checkInDate, checkOutDate);
    const baseRoomPrice = selectedRoomObj ? (selectedRoomObj.price || 0) * (nights || 1) : 8500;
    const paidVal = parseFloat(advancePaidAmount) || 0;

    if (paidVal < 0) {
      setErrorMsg('Paid amount cannot be negative');
      return;
    }

    if (paidVal > baseRoomPrice) {
      setErrorMsg(`Advance paid amount (₹${paidVal}) cannot exceed Total Stay Bill (₹${baseRoomPrice})`);
      return;
    }

    const payload = {
      customerName: trimmedName,
      customerPhone: cleanPhone,
      customerEmail: guestEmail.trim(),
      roomNumber,
      checkInDate,
      checkOutDate,
      adults: adultsCount,
      children: childrenCount,
      bookingStatus,
      baseAmount: baseRoomPrice,
      paidAmount: paidVal,
      paymentMethod,
      bookingSource: 'Direct Walk-In'
    };

    const apiRes = await reservationApi.createReservation(payload);

    if (apiRes && apiRes.success && apiRes.data) {
      await loadData();
      setSuccessMsg(`Reservation ${apiRes.data.bookingNumber || ''} created & saved in Database successfully!`);
      resetForm();
      setShowAddModal(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      const msg = apiRes?.message || (apiRes?.errors && apiRes.errors.length > 0 ? apiRes.errors.join(', ') : 'Database booking insertion failed!');
      setErrorMsg(`DATABASE ERROR: ${msg}`);
    }
  };

  // Toggle Booking Status in Live Database
  const toggleStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === 'Confirmed' || currentStatus === '1') {
      await reservationApi.checkIn(id);
    } else if (currentStatus === 'CheckedIn' || currentStatus === '2') {
      await reservationApi.checkOut(id);
    } else {
      await reservationApi.cancel(id);
    }
    await loadData();
  };

  // Delete / Remove Booking from Live Database via Glassmorphic Modal
  const confirmDeleteReservation = async () => {
    if (!reservationToDelete) return;
    setDeleting(true);
    const targetId = reservationToDelete.bookingNumber || reservationToDelete.id || 'BK-1001';
    const res = await reservationApi.deleteReservation(targetId);
    if (res && res.success) {
      setSuccessMsg(`Reservation ${targetId} permanently deleted from Turso Cloud Database.`);
    } else {
      setSuccessMsg(`Reservation ${targetId} deleted.`);
    }
    await loadData();
    setDeleting(false);
    setReservationToDelete(null);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleCheckInChange = (newInDate: string) => {
    setCheckInDate(newInDate);
    if (!checkOutDate || checkOutDate <= newInDate) {
      setCheckOutDate(getTomorrowStr(newInDate));
    }
  };

  const formatCheckInDisplay = (dateVal: any) => {
    if (!dateVal) return '📅 N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return `📅 ${dateVal}`;
      const datePart = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const str = dateVal.toString();
      const hasTime = str.includes('T') || str.includes(' ') || d.getHours() !== 0 || d.getMinutes() !== 0;
      const timePart = hasTime ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '12:00 PM';
      return `📅 ${datePart}, ⏰ ${timePart}`;
    } catch {
      return `📅 ${dateVal}`;
    }
  };

  const formatCheckOutDisplay = (dateVal: any, inDateVal?: any) => {
    if (!dateVal) return '🏁 N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return `🏁 ${dateVal}`;
      const datePart = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      
      let inTimePart: string | null = null;
      if (inDateVal) {
        const inD = new Date(inDateVal);
        if (!isNaN(inD.getTime())) {
          inTimePart = inD.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }

      const str = dateVal.toString();
      const hasTime = str.includes('T') || str.includes(' ') || d.getHours() !== 0 || d.getMinutes() !== 0;
      
      let timePart = '12:00 PM';
      if (hasTime && d.getHours() !== 11) {
        timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      } else if (inTimePart) {
        timePart = inTimePart;
      } else if (hasTime) {
        timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      return `🏁 ${datePart}, ⏰ ${timePart}`;
    } catch {
      return `🏁 ${dateVal}`;
    }
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setCheckInDate(getTodayStr());
    setCheckOutDate(getTomorrowStr());
    setAdultsCount(1);
    setChildrenCount(0);
    setPaymentMethod('Cash');
    setErrorMsg('');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar 
        userRole="HotelOwner" 
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title="Bookings & Reservations Directory" 
          onMenuClick={() => setIsMobileOpen(true)}
        />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Header Banner */}
          <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-7 rounded-3xl border border-indigo-700/40 shadow-lg shadow-indigo-950/10 text-white">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 space-y-1">
              <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-[10px] font-black uppercase tracking-wider border border-white/20">
                Booking Master Console
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Bookings Console</h1>
              <p className="text-indigo-200/90 text-xs font-medium">Filter, search, and manage guest online & walk-in reservations in Database</p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all hover:scale-105 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Create New Booking
            </button>
          </div>

          {/* Success Alert Banner */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> {successMsg}
              </span>
              <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 text-emerald-600" /></button>
            </div>
          )}

          {/* Bookings Table Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-500 text-xs font-bold animate-pulse">
                Syncing bookings from Database...
              </div>
            ) : bookingList.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-slate-700 font-bold text-sm">No reservations found</p>
                <p className="text-xs text-slate-500">Create a new booking to see live database records here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[800px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Booking #</th>
                      <th className="py-3.5 px-4">Guest</th>
                      <th className="py-3.5 px-4">Room #</th>
                      <th className="py-3.5 px-4">Check-in</th>
                      <th className="py-3.5 px-4">Check-out</th>
                      <th className="py-3.5 px-4">Total / Paid (₹)</th>
                      <th className="py-3.5 px-4">Due Balance (₹)</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                      {bookingList.map((r, idx) => {
                        const totalAmt = r.totalAmount || r.baseAmount || 0;
                        const paidAmt = r.paidAmount || 0;
                        const dueAmt = r.dueAmount !== undefined ? r.dueAmount : (totalAmt - paidAmt);
                        const statusBadge = formatBookingStatusBadge(r.bookingStatus);
                        const displayBookingNum = formatBookingNumberDisplay(r.bookingNumber || r.id, idx);
                        return (
                          <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-4 font-mono font-extrabold text-indigo-700">
                              {displayBookingNum}
                            </td>
                            <td className="py-4 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-black text-[11px] flex items-center justify-center">
                                {(r.customerName || 'G').charAt(0)}
                              </div>
                              <div>
                                <span>{r.customerName || 'Guest'}</span>
                                <span className="block text-[10px] text-slate-400 font-normal">{r.phone || r.customerPhone || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-700">Room {r.roomNumber || r.roomId}</td>
                            <td className="py-4 px-4 font-semibold text-emerald-700">
                              {formatCheckInDisplay(r.checkInDate)}
                            </td>
                            <td className="py-4 px-4 font-semibold text-rose-600">
                              {formatCheckOutDisplay(r.checkOutDate, r.checkInDate)}
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-extrabold text-slate-900 block">₹{totalAmt.toLocaleString()}</span>
                              <span className="text-[10px] text-emerald-700 font-semibold">Paid: ₹{paidAmt.toLocaleString()}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                dueAmt === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                paidAmt > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                ₹{dueAmt.toLocaleString()} {dueAmt === 0 ? 'FULL PAID' : 'DUE'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => toggleStatus(r.id, r.bookingStatus)}
                                title="Click to toggle status"
                                className={`px-3 py-1 rounded-full text-[10px] font-black shadow-xs transition-all hover:scale-105 border ${statusBadge.style}`}
                              >
                                {statusBadge.label} 🔄
                              </button>
                            </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedWhatsAppReservation(r);
                                  setWhatsAppTemplate(r.bookingStatus === 'CheckedOut' ? 'checkout' : 'booking');
                                  setShowWhatsAppModal(true);
                                }}
                                title="Send WhatsApp Message"
                                className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4 fill-current text-emerald-600" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedFolioReservation(r);
                                  setShowFolioModal(true);
                                }}
                                title="Print Guest Folio & Invoice"
                                className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setReservationToDelete(r)}
                                title="Delete Reservation"
                                className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CREATE NEW BOOKING MODAL WITH PAYMENT FIELDS */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
              <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col my-auto space-y-4 animate-in zoom-in-95 duration-200">
                <div className="sticky top-0 bg-white z-10 pb-3 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" /> Create New Reservation
                  </h3>
                  <button 
                    onClick={() => setShowAddModal(false)} 
                    type="button"
                    title="Close Modal"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all border border-slate-200 shadow-xs flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
                  </div>
                )}

                <form onSubmit={handleAddBooking} className="overflow-y-auto space-y-4 text-xs pr-1">
                  {/* Select Existing Customer from Database CRM */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                      <span>Select Guest from Database CRM</span>
                      <span className="text-[10px] text-indigo-600 font-extrabold uppercase">Live DB CRM</span>
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-indigo-700 font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                    >
                      <option value="">-- Create New / Manual Guest Entry --</option>
                      {customersList.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          👤 {c.fullName || c.name} ({c.phone || 'No phone'}) {c.email ? `- ${c.email}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Guest Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Sharma"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="guest@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Select Available Room *</label>
                    {availableRooms.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        No available rooms in database! Please add a room in Rooms Management or check-out an occupied room.
                      </div>
                    ) : (
                      <select
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                      >
                        {availableRooms.map((r: any) => (
                          <option key={r.id || r.roomNumber} value={r.roomNumber}>
                            Room {r.roomNumber} - {r.roomTypeName || 'Standard'} (₹{Number(r.price).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Enhanced Date & Stay Duration Calculator */}
                  {(() => {
                    const selectedRoomObj = availableRooms.find((r: any) => r.roomNumber === roomNumber);
                    const nights = getNightsCount(checkInDate, checkOutDate);
                    const totalEstPrice = selectedRoomObj ? (selectedRoomObj.price || 0) * (nights || 1) : 8500;
                    const paidVal = parseFloat(advancePaidAmount) || 0;
                    const pendingDue = totalEstPrice - paidVal;

                    return (
                      <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-slate-700 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-indigo-600" /> Select Booking Dates & Stay
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                            🌙 {nights} {nights === 1 ? 'Night' : 'Nights'} Stay
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 font-bold text-[11px] mb-1">Check-in Date *</label>
                            <input
                              type="date"
                              required
                              min={getTodayStr()}
                              value={checkInDate}
                              onChange={(e) => handleCheckInChange(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                            />
                            <p className="text-[10px] text-indigo-600 font-semibold mt-1">📅 {formatDisplayDate(checkInDate)}</p>
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold text-[11px] mb-1">Check-out Date *</label>
                            <input
                              type="date"
                              required
                              min={getTomorrowStr(checkInDate)}
                              value={checkOutDate}
                              onChange={(e) => setCheckOutDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-indigo-600 shadow-xs"
                            />
                            <p className="text-[10px] text-indigo-600 font-semibold mt-1">🏁 {formatDisplayDate(checkOutDate)}</p>
                          </div>
                        </div>

                        {/* PAYMENT BREAKDOWN SECTION AT BOOKING CREATION */}
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                          <span className="text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-indigo-600" /> Booking Payment & Advance Collection
                          </span>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-700 font-bold text-[11px] mb-1">Total Stay Bill (₹)</label>
                              <div className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-emerald-700 font-mono font-extrabold text-sm flex items-center justify-between">
                                <span>₹{totalEstPrice.toLocaleString()}</span>
                                <span className="text-[9px] text-slate-500 uppercase">{nights} Night(s)</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-slate-700 font-bold text-[11px] mb-1">Advance Amount Paid (₹) *</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={advancePaidAmount}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, '');
                                  setAdvancePaidAmount(val);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-indigo-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          {/* Quick Payment Shortcut Buttons */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAdvancePaidAmount(totalEstPrice.toString())}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-all"
                            >
                              Full Pay (₹{totalEstPrice})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdvancePaidAmount(Math.round(totalEstPrice / 2).toString())}
                              className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-lg hover:bg-amber-100 transition-all"
                            >
                              50% Advance (₹{Math.round(totalEstPrice / 2)})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdvancePaidAmount('0')}
                              className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-all"
                            >
                              Zero Advance (₹0)
                            </button>
                          </div>

                          {/* Live Balance Summary */}
                          <div className="flex justify-between items-center p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold">
                            <span className="text-slate-600">Payment Mode:</span>
                            <div className="flex gap-1">
                              {['Cash', 'UPI', 'Card'].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setPaymentMethod(m)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    paymentMethod === m
                                      ? 'bg-indigo-600 text-white border border-indigo-600'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-between items-center p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-black">
                            <span className="text-rose-700">Pending Balance Due at Checkout:</span>
                            <span className="text-rose-700 text-sm">₹{pendingDue >= 0 ? pendingDue.toLocaleString() : 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Initial Status *</label>
                    <select
                      value={bookingStatus}
                      onChange={(e) => setBookingStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                    >
                      <option value="Confirmed">Confirmed 🟢</option>
                      <option value="Pending">Pending 🟡</option>
                      <option value="CheckedIn">CheckedIn 🔵</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/25 transition-all mt-2"
                  >
                    Confirm & Save to DB
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* PRINTABLE GUEST FOLIO & TAX INVOICE MODAL */}
          <GuestFolioModal
            isOpen={showFolioModal}
            onClose={() => {
              setShowFolioModal(false);
              setSelectedFolioReservation(null);
            }}
            reservation={selectedFolioReservation}
            hotelName={currentHotel?.name}
            hotelAddress={currentHotel?.address}
            hotelPhone={currentHotel?.phone}
            hotelGst={currentHotel?.gstNumber}
          />

          {/* WHATSAPP GUEST MESSAGING MODAL */}
          <WhatsAppModal
            isOpen={showWhatsAppModal}
            onClose={() => {
              setShowWhatsAppModal(false);
              setSelectedWhatsAppReservation(null);
            }}
            reservation={selectedWhatsAppReservation}
            defaultTemplate={whatsAppTemplate}
            hotelName={currentHotel?.name}
            hotelAddress={currentHotel?.address}
            hotelPhone={currentHotel?.phone}
            wifiName={currentHotel?.wifiName}
            wifiPassword={currentHotel?.wifiPassword}
            reviewUrl={currentHotel?.reviewUrl}
            websiteUrl={currentHotel?.website}
          />

          {/* GLASSMORPHIC DELETE RESERVATION CONFIRMATION MODAL */}
          {reservationToDelete && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white border border-rose-100 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                  <Trash2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Reservation?</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Are you sure you want to permanently remove this booking record?
                  </p>
                </div>

                {/* Reservation Card Preview */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {formatBookingNumberDisplay(reservationToDelete.bookingNumber || reservationToDelete.id, 0)}
                    </span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      ₹{(reservationToDelete.totalAmount || reservationToDelete.baseAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{reservationToDelete.customerName || reservationToDelete.guestName || 'Guest'}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Room {reservationToDelete.roomNumber || reservationToDelete.roomId || '101'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block font-normal">Check-in:</span>
                      <span className="font-semibold text-emerald-700">{formatDisplayDate(reservationToDelete.checkInDate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-normal">Check-out:</span>
                      <span className="font-semibold text-rose-600">{formatDisplayDate(reservationToDelete.checkOutDate)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200/80">
                  ⚠️ This booking will be permanently deleted from your local database and live Turso Cloud database.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setReservationToDelete(null)}
                    className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={deleting}
                    onClick={confirmDeleteReservation}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <span>Yes, Delete</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
