'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import WhatsAppModal from '@/components/WhatsAppModal';
import HotelLogo from '@/components/HotelLogo';
import { reservationApi, paymentApi, hotelApi, Reservation, Hotel } from '@/lib/api/services';
import { LogIn, LogOut, CheckCircle, Clock, Search, X, Inbox, RefreshCw, AlertCircle, Info, Receipt, Printer, CreditCard, IndianRupee, ShieldCheck, MessageCircle, HelpCircle } from 'lucide-react';

export default function CheckInCheckOutPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // WhatsApp Modal States
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedWhatsAppRes, setSelectedWhatsAppRes] = useState<Reservation | null>(null);

  // Checkout & Billing Modal States
  const [selectedCheckoutRes, setSelectedCheckoutRes] = useState<Reservation | null>(null);
  const [confirmCheckoutTarget, setConfirmCheckoutTarget] = useState<Reservation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<number>(0); // 0: Cash, 1: UPI, 2: Card, 3: BankTransfer
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<{
    invoiceNumber: string;
    reservation: Reservation;
    paymentMethodName: string;
    issuedAt: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const [res, hotelRes] = await Promise.all([
        reservationApi.getReservations(),
        hotelApi.getCurrentHotel()
      ]);
      if (hotelRes && hotelRes.data) {
        setCurrentHotel(hotelRes.data);
      }
      if (res && Array.isArray(res.data)) {
        setReservations(res.data);
      } else {
        setReservations([]);
      }
    } catch (err) {
      console.error('Error loading reservations for front desk:', err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }

  // Booking Status Match Helpers
  const isCheckedOut = (status: any) => status === 'CheckedOut' || status === 3;
  const isCheckedIn = (status: any) => status === 'CheckedIn' || status === 2;
  const isConfirmedOrPending = (status: any) => status === 'Confirmed' || status === 1 || status === 'Pending' || status === 0;
  const isCancelledOrNoShow = (status: any) => status === 'Cancelled' || status === 4 || status === 'NoShow' || status === 5;

  const handleCheckIn = async (id: string) => {
    setMsg('');
    setErrorMsg('');
    try {
      const res = await reservationApi.checkIn(id);
      if (res.success) {
        setMsg(res.message || 'Check-in completed successfully! Guest is now Checked In (Active in House).');
        await loadData();
      } else {
        setErrorMsg(res.message || 'Check-in failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Check-in failed due to network error');
    }
  };

  // Open Checkout & Billing Modal
  const openCheckoutModal = (resItem: Reservation) => {
    setSelectedCheckoutRes(resItem);
    setMsg('');
    setErrorMsg('');
  };

  // Request Confirmation via Custom Modal (No native alert/confirm)
  const requestCheckOutConfirmation = (resOverride?: Reservation) => {
    const target = resOverride || selectedCheckoutRes;
    if (!target) return;
    setConfirmCheckoutTarget(target);
  };

  // Execute Check-Out & Generate Invoice Bill using Turso Cloud Data
  const performCheckOutAction = async (targetRes: Reservation) => {
    if (!targetRes) return;

    setIsProcessing(true);
    setErrorMsg('');
    setMsg('');

    try {
      // 1. Execute check-in if guest isn't checked in yet
      const statusStr = (targetRes.bookingStatus || '').toString();
      if (statusStr !== 'CheckedIn' && statusStr !== '2') {
        try {
          await reservationApi.checkIn(targetRes.id);
        } catch {}
      }

      // 2. Execute check-out in backend
      const res = await reservationApi.checkOut(targetRes.id);

      if (!res.success) {
        setErrorMsg(res.message || 'Check-out failed');
        setIsProcessing(false);
        return;
      }

      // 3. Record payment settlement if due amount > 0
      const dueAmount = targetRes.dueAmount || 0;
      if (dueAmount > 0) {
        await paymentApi.recordPayment({
          reservationId: targetRes.id,
          amount: dueAmount,
          paymentMethod: Number(paymentMethod),
          notes: 'Full Settlement at Express Checkout'
        });
      }

      // 4. Fetch rich invoice data directly from backend / Turso DB endpoint
      let richGuestName = targetRes.customerName || (targetRes as any).customer?.fullName || 'Guest';
      let richGuestPhone = targetRes.customerPhone || (targetRes as any).customer?.phone || 'N/A';
      let richRoomNum = targetRes.roomNumber || (targetRes as any).room?.roomNumber || '101';
      let richRoomType = targetRes.roomTypeName || (targetRes as any).room?.roomType?.name || 'Deluxe Room';
      let richBaseAmt = targetRes.baseAmount || targetRes.totalAmount || 2500;
      let richTotalAmt = targetRes.totalAmount || 2500;
      let richTaxAmt = targetRes.taxAmount || 0;
      let invNum = `INV-${targetRes.bookingNumber?.replace('BK-', '') || '1001'}`;

      try {
        const invApiRes = await fetch(`http://localhost:5000/api/invoices/reservation/${targetRes.id}`);
        if (invApiRes.ok) {
          const invJson = await invApiRes.json();
          if (invJson.success && invJson.data) {
            const data = invJson.data;
            if (data.invoiceNumber) invNum = data.invoiceNumber;
            if (data.guest?.name) richGuestName = data.guest.name;
            if (data.guest?.phone) richGuestPhone = data.guest.phone;
            if (data.booking?.roomNumber) richRoomNum = data.booking.roomNumber;
            if (data.booking?.roomType) richRoomType = data.booking.roomType;
            if (data.financials?.baseAmount) richBaseAmt = data.financials.baseAmount;
            if (data.financials?.totalAmount) richTotalAmt = data.financials.totalAmount;
            if (data.financials?.taxAmount) richTaxAmt = data.financials.taxAmount;
          }
        }
      } catch (err) {
        console.warn('Invoice API fetch fallback to targetRes:', err);
      }

      const methodNames = ['Cash Payment', 'UPI / QR Code', 'Credit/Debit Card', 'Bank Wire Transfer'];
      
      const updatedRes: Reservation = {
        ...targetRes,
        customerName: richGuestName,
        customerPhone: richGuestPhone,
        roomNumber: richRoomNum,
        roomTypeName: richRoomType,
        baseAmount: richBaseAmt,
        totalAmount: richTotalAmt,
        taxAmount: richTaxAmt,
        bookingStatus: 'CheckedOut',
        paidAmount: richTotalAmt,
        dueAmount: 0,
        paymentStatus: 'Paid'
      };

      setGeneratedBill({
        invoiceNumber: invNum,
        reservation: updatedRes,
        paymentMethodName: methodNames[paymentMethod] || 'Cash Payment',
        issuedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      });

      setSelectedCheckoutRes(null);
      setMsg(`Express Check-out completed for ${richGuestName} (Room ${richRoomNum})! Invoice ${invNum} generated & paid.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  const cleanBookingNum = (bNum: string, idStr: string) => {
    const raw = bNum || idStr || '';
    if (raw.toLowerCase().startsWith('res-')) return raw.substring(4);
    return raw;
  };

  const formatCheckInTime = (dateStr: string) => {
    if (!dateStr) return '📅 Today';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return `📅 ${dateStr}`;
      const formatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const hasTime = dateStr.includes('T') || dateStr.includes(' ') || d.getHours() !== 0 || d.getMinutes() !== 0;
      const timeStr = hasTime ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '12:00 AM';
      return `📅 ${formatted}, ⏰ ${timeStr}`;
    } catch {
      return `📅 ${dateStr}`;
    }
  };

  const formatCheckOutTime = (dateStr: string) => {
    if (!dateStr) return '🏁 Scheduled Checkout';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return `🏁 ${dateStr}`;
      const formatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const hasTime = dateStr.includes('T') || dateStr.includes(' ') || d.getHours() !== 0 || d.getMinutes() !== 0;
      const timeStr = hasTime ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '12:00 AM';
      return `📅 ${formatted}, ⏰ ${timeStr}`;
    } catch {
      return `🏁 ${dateStr}`;
    }
  };

  const isCheckoutDue = (dateStr: string) => {
    if (!dateStr) return false;
    try {
      const checkoutDate = new Date(dateStr);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return checkoutDate <= today;
    } catch {
      return false;
    }
  };

  const pendingArrivals = reservations.filter(
    (r: any) => isConfirmedOrPending(r.bookingStatus) && !isCheckedOut(r.bookingStatus) && !isCancelledOrNoShow(r.bookingStatus)
  );

  const activeDepartures = reservations.filter(
    (r: any) =>
      (isCheckedIn(r.bookingStatus) || isCheckoutDue(r.checkOutDate)) &&
      !isCheckedOut(r.bookingStatus) &&
      !isCancelledOrNoShow(r.bookingStatus)
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Check-in / Check-out Desk & Billing" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Dark Blue/Indigo Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-indigo-800/40 shadow-xl shadow-indigo-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <Receipt className="w-3.5 h-3.5 text-indigo-300" /> Front Desk & Express Billing
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-400/30">
                  Live Front Desk
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Check-in / Check-out Desk</h1>
                <p className="text-indigo-200/90 text-xs sm:text-sm font-medium mt-1">Manage guest arrivals, express check-outs, and instant tax billing invoices</p>
              </div>

              {/* Front Desk Metric Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-indigo-300 text-[11px] font-bold">Pending Arrivals:</span>
                  <span className="font-mono font-black text-white text-sm">{pendingArrivals.length} Guests</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-emerald-300 text-[11px] font-bold">In-House / Stayers:</span>
                  <span className="font-mono font-black text-white text-sm">{activeDepartures.length} Guests</span>
                </div>
              </div>
            </div>

            <button
              onClick={loadData}
              title="Refresh Front Desk"
              className="relative z-10 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2 text-xs font-extrabold backdrop-blur-md hover:scale-105 self-start lg:self-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Desk
            </button>
          </div>

          {/* Workflow Guidance Banner */}
          <div className="p-4.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-indigo-900 text-xs space-y-2 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-indigo-800">
              <Info className="w-4 h-4 text-indigo-600" /> Reception Desk Workflow Guidance:
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">
              1. **Check-In**: Click <span className="text-emerald-700 font-extrabold">Check In</span> when guests arrive at front desk.<br />
              2. **Check-Out & Bill**: Click <span className="text-rose-600 font-extrabold">Check Out & Bill</span> to open the billing modal, settle due payment balance, release room, and generate the Tax Invoice receipt.
            </p>
          </div>

          {/* Success Banner */}
          {msg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex justify-between items-center shadow-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> {msg}
              </span>
              <button onClick={() => setMsg('')}><X className="w-4 h-4 text-emerald-600" /></button>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex justify-between items-center shadow-sm">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" /> {errorMsg}
              </span>
              <button onClick={() => setErrorMsg('')}><X className="w-4 h-4 text-rose-600" /></button>
            </div>
          )}

          {/* SECTION 1: Pending Arrivals (Check-in) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <LogIn className="w-5 h-5 text-indigo-600" /> Pending Arrivals (Check-in Desk)
              </h3>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-full">
                {pendingArrivals.length} Guests Expected
              </span>
            </div>

            {loading ? (
              <div className="text-center py-10 text-slate-500 text-xs font-bold animate-pulse">
                Fetching arrivals from database...
              </div>
            ) : pendingArrivals.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                  <Inbox className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">No Pending Check-ins in Database</h4>
                <p className="text-xs text-slate-500">All expected guests have been checked in or checked out!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[500px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Booking ID</th>
                      <th className="py-3.5 px-4">Guest Name</th>
                      <th className="py-3.5 px-4">Room #</th>
                      <th className="py-3.5 px-4">Check-in (Time)</th>
                      <th className="py-3.5 px-4">Check-out (Time)</th>
                      <th className="py-3.5 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pendingArrivals.map((r: any, idx: number) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-indigo-600">{cleanBookingNum(r.bookingNumber, r.id)}</td>
                        <td className="py-4 px-4 font-bold text-slate-900">{r.customerName || 'Guest'}</td>
                        <td className="py-4 px-4 text-slate-600">Room {r.roomNumber || r.roomId}</td>
                        <td className="py-4 px-4 font-bold text-emerald-600">{formatCheckInTime(r.checkInDate)}</td>
                        <td className="py-4 px-4 font-bold text-slate-600">{formatCheckOutTime(r.checkOutDate)}</td>
                        <td className="py-4 px-4 flex items-center gap-2">
                          <button
                            onClick={() => handleCheckIn(r.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <LogIn className="w-3.5 h-3.5" /> Check In
                          </button>
                          <button
                            onClick={() => openCheckoutModal(r)}
                            title="Direct Express Check-Out & Bill Modal"
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-rose-600 border border-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                          >
                            <Receipt className="w-3.5 h-3.5 text-rose-600" /> Express Checkout & Bill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: Active Departures & Scheduled Check-outs */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <LogOut className="w-5 h-5 text-rose-600" /> Active Departures & Scheduled Check-outs
              </h3>
              <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-full">
                {activeDepartures.length} Departures Active / Due
              </span>
            </div>

            {loading ? (
              <div className="text-center py-10 text-slate-500 text-xs font-bold animate-pulse">
                Fetching active departures from database...
              </div>
            ) : activeDepartures.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                  <Inbox className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">No Active Check-outs in Database</h4>
                <p className="text-xs text-slate-500">Your reservations database currently has 0 active departures due.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[500px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Booking ID</th>
                      <th className="py-3.5 px-4">Guest Name</th>
                      <th className="py-3.5 px-4">Room #</th>
                      <th className="py-3.5 px-4">Check-in (Time)</th>
                      <th className="py-3.5 px-4">Check-out (Time)</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeDepartures.map((r: any, idx: number) => {
                      const isGuestInHouse = isCheckedIn(r.bookingStatus);
                      return (
                        <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-indigo-600">{cleanBookingNum(r.bookingNumber, r.id)}</td>
                          <td className="py-4 px-4 font-bold text-slate-900">{r.customerName || 'Guest'}</td>
                          <td className="py-4 px-4 text-slate-600">Room {r.roomNumber || r.roomId}</td>
                          <td className="py-4 px-4 font-bold text-emerald-600">{formatCheckInTime(r.checkInDate)}</td>
                          <td className="py-4 px-4 font-bold text-rose-600">{formatCheckOutTime(r.checkOutDate)}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              isGuestInHouse ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isGuestInHouse ? 'In-House (Checked In)' : 'Checkout Due Today'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => openCheckoutModal(r)}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <Receipt className="w-3.5 h-3.5" /> Check Out & Bill
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

      {/* MODAL 1: CHECKOUT & SETTLEMENT BILLING MODAL */}
      {selectedCheckoutRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
            <button
              onClick={() => setSelectedCheckoutRes(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Guest Billing & Check-Out</h3>
                <p className="text-xs text-slate-500">Final bill settlement & room checkout</p>
              </div>
            </div>

            {/* Guest & Room Details */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Guest Name:</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedCheckoutRes.customerName || (selectedCheckoutRes as any).customer?.fullName || 'Guest'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Booking #:</span>
                <span className="font-mono text-indigo-600 font-bold">{cleanBookingNum(selectedCheckoutRes.bookingNumber, selectedCheckoutRes.id)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Room Allocated:</span>
                <span className="font-bold text-slate-900">Room {selectedCheckoutRes.roomNumber || (selectedCheckoutRes as any).room?.roomNumber || '101'} ({selectedCheckoutRes.roomTypeName || 'Deluxe Room'})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Stay Dates:</span>
                <span className="font-medium text-slate-700">{formatCheckInTime(selectedCheckoutRes.checkInDate)} → {formatCheckOutTime(selectedCheckoutRes.checkOutDate)}</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5">
              <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-2">Financial Breakdown</h4>
              <div className="flex justify-between">
                <span className="text-slate-600">Base Room Charge:</span>
                <span className="font-bold text-slate-900">₹{(selectedCheckoutRes.baseAmount || selectedCheckoutRes.totalAmount || 2500).toLocaleString('en-IN')}</span>
              </div>
              {selectedCheckoutRes.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Taxes & Service Charges:</span>
                  <span className="font-semibold text-slate-700">₹{selectedCheckoutRes.taxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {selectedCheckoutRes.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount Applied:</span>
                  <span>- ₹{selectedCheckoutRes.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span>₹{(selectedCheckoutRes.totalAmount || 2500).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-600 font-bold">
                <span>Already Paid:</span>
                <span>₹{(selectedCheckoutRes.paidAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <span>Balance Due at Checkout:</span>
                <span>₹{(selectedCheckoutRes.dueAmount ?? selectedCheckoutRes.totalAmount ?? 2500).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Select Settlement Payment Mode:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 0, label: 'Cash' },
                  { id: 1, label: 'UPI / QR' },
                  { id: 2, label: 'Card' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all ${
                      paymentMethod === m.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCheckoutRes(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => requestCheckOutConfirmation(selectedCheckoutRes)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Confirm Check-Out & Bill
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOM TAILWIND CONFIRMATION DIALOG (Replaces native browser confirm alert) */}
      {confirmCheckoutTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-lg">Confirm Guest Check-Out</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to complete check-out for guest{' '}
                <span className="font-black text-slate-900">"{confirmCheckoutTarget.customerName || (confirmCheckoutTarget as any).customer?.fullName || 'Guest'}"</span> in{' '}
                <span className="font-black text-indigo-600">Room {confirmCheckoutTarget.roomNumber || (confirmCheckoutTarget as any).room?.roomNumber || '101'}</span>?
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-700 font-medium">
              <div className="flex justify-between">
                <span>Total Bill Amount:</span>
                <span className="font-extrabold text-slate-900">₹{(confirmCheckoutTarget.totalAmount || 2500).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Settlement Payment Mode:</span>
                <span className="font-bold text-emerald-700">{['Cash Payment', 'UPI / QR Code', 'Credit/Debit Card', 'Bank Wire Transfer'][paymentMethod] || 'Cash'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCheckoutTarget(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = confirmCheckoutTarget;
                  setConfirmCheckoutTarget(null);
                  performCheckOutAction(target);
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Yes, Complete Check-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GENERATED OFFICIAL TAX INVOICE & BILL RECEIPT (Pulls Real Turso Cloud Data) */}
      {generatedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden border border-slate-200">
            <button
              onClick={() => setGeneratedBill(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 transition-all print:hidden"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Receipt with Luxury Hotel Logo */}
            <div className="text-center border-b border-slate-200 pb-4 space-y-2 flex flex-col items-center">
              <span className="px-3.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                Official Tax Invoice / Bill Receipt
              </span>
              <HotelLogo variant="print" size="md" hotelName={currentHotel?.name || "ROYAL STAY"} subTitle="GRAND PALACE HOTEL & RESORTS" />
              <p className="text-slate-400 text-[10px] font-mono font-bold mt-1">Invoice #: {generatedBill.invoiceNumber} | Issued: {generatedBill.issuedAt}</p>
            </div>

            {/* Guest Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Guest Name:</span>
                <span className="font-extrabold text-slate-900 text-sm">{generatedBill.reservation.customerName || 'Guest'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone / Contact:</span>
                <span className="font-semibold text-slate-800">{generatedBill.reservation.customerPhone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Room #:</span>
                <span className="font-bold text-indigo-700">Room {generatedBill.reservation.roomNumber || '101'} ({generatedBill.reservation.roomTypeName || 'Deluxe Room'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Check-in Date:</span>
                <span className="text-slate-700">{formatCheckInTime(generatedBill.reservation.checkInDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Check-out Date:</span>
                <span className="text-slate-700">{formatCheckOutTime(generatedBill.reservation.checkOutDate)}</span>
              </div>
            </div>

            {/* Billing Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-2.5 px-3 text-slate-800">Room Accommodations ({generatedBill.reservation.roomTypeName || 'Deluxe Room'})</td>
                    <td className="py-2.5 px-3 text-right font-bold">₹{(generatedBill.reservation.baseAmount || generatedBill.reservation.totalAmount || 2500).toLocaleString('en-IN')}</td>
                  </tr>
                  {generatedBill.reservation.taxAmount > 0 && (
                    <tr>
                      <td className="py-2.5 px-3 text-slate-600">GST / Tax</td>
                      <td className="py-2.5 px-3 text-right">₹{generatedBill.reservation.taxAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-extrabold text-slate-900">
                    <td className="py-3 px-3">Total Amount Charged</td>
                    <td className="py-3 px-3 text-right text-sm text-indigo-900">₹{(generatedBill.reservation.totalAmount || 2500).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-800 font-bold">
                    <td className="py-2.5 px-3">Settled via {generatedBill.paymentMethodName}</td>
                    <td className="py-2.5 px-3 text-right">₹{(generatedBill.reservation.totalAmount || 2500).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-slate-900 text-white font-black text-sm">
                    <td className="py-3 px-3">Remaining Balance Due</td>
                    <td className="py-3 px-3 text-right text-emerald-400">₹0.00 (FULL PAID)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Stamp / Status */}
            <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 text-xs font-black uppercase tracking-wider">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              STATUS: CHECKED OUT & PAID IN FULL
            </div>

            {/* Print, WhatsApp & Close Action Buttons */}
            <div className="flex items-center gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setGeneratedBill(null)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all"
              >
                Close Desk
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedWhatsAppRes(generatedBill.reservation);
                  setShowWhatsAppModal(true);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 fill-current" /> WhatsApp Thank You
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP GUEST MESSAGING MODAL */}
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => {
          setShowWhatsAppModal(false);
          setSelectedWhatsAppRes(null);
        }}
        reservation={selectedWhatsAppRes}
        defaultTemplate="checkout"
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
