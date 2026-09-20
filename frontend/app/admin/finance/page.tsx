'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HotelLogo from '@/components/HotelLogo';
import { invoiceApi, paymentApi, reservationApi, Invoice, Payment, Reservation } from '@/lib/api/services';
import { Receipt, CreditCard, Plus, Printer, CheckCircle, Clock, AlertCircle, FileText, X, IndianRupee, ArrowDownCircle } from 'lucide-react';

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Record Payment Form
  const [paymentReservationId, setPaymentReservationId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<number>(0); // 0: Cash, 1: UPI, 2: Card
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadFinanceData();
  }, []);

  async function loadFinanceData() {
    setLoading(true);
    try {
      const [invRes, payRes, resRes] = await Promise.all([
        invoiceApi.getInvoices(),
        paymentApi.getPayments(),
        reservationApi.getReservations(),
      ]);

      const fetchedInvoices: Invoice[] = (invRes && Array.isArray(invRes.data)) ? invRes.data : [];
      const fetchedPayments: Payment[] = (payRes && Array.isArray(payRes.data)) ? payRes.data : [];
      const fetchedReservations: Reservation[] = (resRes && Array.isArray(resRes.data)) ? resRes.data : [];

      setPayments(fetchedPayments);
      setReservations(fetchedReservations);
      if (fetchedReservations.length > 0) {
        setPaymentReservationId(fetchedReservations[0].id);
      }

      // Synthesize invoices for reservations if missing
      const existingResIds = new Set(fetchedInvoices.map(i => i.reservationId));
      const combinedInvoices = [...fetchedInvoices];

      for (const r of fetchedReservations) {
        if (!existingResIds.has(r.id)) {
          existingResIds.add(r.id);
          const cleanBooking = (r.bookingNumber || '').replace(/^BK-/i, '');
          combinedInvoices.push({
            id: r.id,
            hotelId: r.hotelId,
            reservationId: r.id,
            bookingNumber: r.bookingNumber || `BK-${r.id.slice(0, 4)}`,
            customerId: r.customerId,
            customerName: r.customerName || 'Guest',
            customerPhone: r.customerPhone || '',
            customerEmail: r.customerEmail || '',
            invoiceNumber: `INV-${cleanBooking || r.id.slice(0, 5)}`,
            subtotal: r.baseAmount || r.totalAmount || 0,
            discount: r.discountAmount || 0,
            tax: r.taxAmount || 0,
            total: r.totalAmount || 0,
            paid: r.paidAmount || 0,
            due: r.dueAmount || 0,
            status: (r.dueAmount || 0) <= 0 ? 'Paid' : 'Pending',
            issuedAt: r.checkInDate || new Date().toISOString(),
          } as Invoice);
        }
      }

      setInvoices(combinedInvoices);
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const res = await paymentApi.recordPayment({
      reservationId: paymentReservationId,
      amount: parseFloat(paymentAmount) || 0,
      paymentMethod: Number(paymentMethod),
      transactionId: transactionId || null,
      notes: notes || 'Manual Payment Entry',
    });

    if (res.success) {
      setShowPaymentModal(false);
      setSuccessMessage('Payment recorded successfully!');
      setPaymentAmount('');
      setTransactionId('');
      setNotes('');
      loadFinanceData();
    } else {
      setError(res.message || 'Failed to record payment');
    }
  };

  const getMethodName = (m: number) => {
    switch (m) {
      case 0: return 'Cash';
      case 1: return 'UPI';
      case 2: return 'Card';
      case 3: return 'Bank Transfer';
      case 4: return 'Razorpay Online';
      default: return 'Other';
    }
  };

  const totalCollectedAmount = Math.max(
    invoices.reduce((sum, inv) => sum + (inv.paid || 0), 0),
    payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    reservations.reduce((sum, r) => sum + (r.paidAmount || 0), 0)
  );

  const totalPendingDueAmount = Math.max(
    invoices.reduce((sum, inv) => sum + (inv.due || 0), 0),
    reservations.reduce((sum, r) => sum + (r.dueAmount || 0), 0)
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Billing, Invoices & Financial Settlement" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Dark Emerald Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-emerald-800/40 shadow-xl shadow-emerald-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <Receipt className="w-3.5 h-3.5 text-emerald-300" /> Financial Settlement Engine
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                  Automated GST Billing
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Billing & Revenue Settlement</h1>
                <p className="text-emerald-200/90 text-xs sm:text-sm font-medium mt-1">Generate GST tax invoices, process instant guest payments, and settle due balances</p>
              </div>

              {/* Realtime Finance Metric Summary Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-emerald-300 text-[11px] font-bold">Total Collected:</span>
                  <span className="font-mono font-black text-white text-sm">₹{totalCollectedAmount.toLocaleString()}</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-rose-300 text-[11px] font-bold">Pending Due:</span>
                  <span className="font-mono font-black text-white text-sm">₹{totalPendingDueAmount.toLocaleString()}</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-indigo-200 text-[11px] font-bold">Tax Invoices:</span>
                  <span className="font-mono font-black text-white text-sm">{invoices.length}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPaymentModal(true)}
              className="relative z-10 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs tracking-wide uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 self-start lg:self-center"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>

          {/* Feedback Banners */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> {successMessage}
              </span>
              <button onClick={() => setSuccessMessage('')}><X className="w-4 h-4 text-emerald-600 hover:scale-110 transition-transform" /></button>
            </div>
          )}

          {/* Tab Controls */}
          <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                activeTab === 'invoices'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-400" /> Tax Invoices ({invoices.length})
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                activeTab === 'payments'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <CreditCard className="w-4 h-4 text-indigo-400" /> Payment Transactions ({payments.length})
            </button>
          </div>

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="py-4 px-6">Invoice #</th>
                      <th className="py-4 px-6">Booking Ref</th>
                      <th className="py-4 px-6">Guest Name</th>
                      <th className="py-4 px-6">Total Amount</th>
                      <th className="py-4 px-6">Paid / Due</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-slate-500">
                          No invoices generated yet. Invoices are automatically generated upon Guest Check-Out.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6 font-bold text-indigo-600 font-mono">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-4 px-6 text-slate-900 font-semibold">{inv.bookingNumber}</td>
                          <td className="py-4 px-6 font-bold text-slate-900">{inv.customerName}</td>
                          <td className="py-4 px-6 font-extrabold text-slate-900">₹{inv.total.toLocaleString()}</td>
                          <td className="py-4 px-6 text-xs">
                            <p className="text-emerald-600 font-bold">Paid: ₹{inv.paid.toLocaleString()}</p>
                            <p className="text-rose-600 font-semibold">Due: ₹{inv.due.toLocaleString()}</p>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 ml-auto transition-colors border border-slate-200"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" /> View Invoice
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="py-4 px-6">Transaction ID</th>
                      <th className="py-4 px-6">Method</th>
                      <th className="py-4 px-6">Amount</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Date & Time</th>
                      <th className="py-4 px-6">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-slate-500">
                          No payment transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6 font-mono text-xs text-indigo-600 font-bold">
                            {p.transactionId}
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-900">
                            {getMethodName(p.paymentMethod)}
                          </td>
                          <td className="py-4 px-6 font-extrabold text-emerald-600">
                            +₹{p.amount.toLocaleString()}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                              {p.paymentStatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500">
                            {new Date(p.paymentDate).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500">
                            {p.notes || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase border border-indigo-100">
                  Tax Invoice
                </span>
                <span className="text-xs text-slate-500 font-mono font-bold">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Sheet */}
            <div className="bg-slate-50 text-slate-900 p-8 rounded-2xl border border-slate-200 space-y-6">
              {/* Hotel Header with Luxury Logo */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                <div className="space-y-1">
                  <HotelLogo variant="print" size="lg" hotelName="GRAND PALACE HOTEL" subTitle="OFFICIAL TAX INVOICE & REVENUE SETTLEMENT" />
                  <p className="text-xs text-slate-500 mt-2">123 Promenade Beach Road, Goa, India</p>
                  <p className="text-xs font-semibold text-slate-700">GSTIN: 30AAAAA0000A1Z5 | Contact: +91 9876543210</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3.5 py-1 bg-slate-950 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-sm">
                    TAX INVOICE
                  </span>
                  <p className="text-xs font-mono font-extrabold text-indigo-700 mt-2">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Issued: {new Date(selectedInvoice.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Guest Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Billed To:</p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedInvoice.customerName}</p>
                  <p className="text-slate-600">{selectedInvoice.customerPhone}</p>
                  <p className="text-slate-600">{selectedInvoice.customerEmail}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Stay Ref:</p>
                  <p className="font-bold text-indigo-600 text-sm mt-0.5">Booking #{selectedInvoice.bookingNumber}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 font-semibold text-slate-800">Room Accommodation Charges (Base)</td>
                    <td className="py-3 text-right font-bold text-slate-900">₹{selectedInvoice.subtotal.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-slate-600">Discounts & Coupons</td>
                    <td className="py-3 text-right font-semibold text-rose-600">-₹{selectedInvoice.discount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-slate-600">GST & Luxury Taxes</td>
                    <td className="py-3 text-right font-semibold text-slate-700">+₹{selectedInvoice.tax.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="border-t border-slate-200 pt-4 flex flex-col items-end text-xs space-y-1">
                <div className="flex justify-between w-48 font-bold text-sm text-slate-900">
                  <span>Net Total:</span>
                  <span>₹{selectedInvoice.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-48 text-emerald-700 font-semibold">
                  <span>Amount Paid:</span>
                  <span>₹{selectedInvoice.paid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-48 text-rose-700 font-bold border-t border-slate-200 pt-1 text-sm">
                  <span>Balance Due:</span>
                  <span>₹{selectedInvoice.due.toLocaleString()}</span>
                </div>
              </div>

              {/* Status Stamp */}
              <div className="pt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
                <span>Computer generated tax invoice.</span>
                <span className={`px-3 py-1 rounded-full font-extrabold text-xs uppercase border ${
                  selectedInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {selectedInvoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col my-auto space-y-4 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white z-10 pb-3 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" /> Record Guest Payment
              </h3>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                type="button"
                title="Close Modal"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all border border-slate-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-bold shrink-0">{error}</p>}

            <form onSubmit={handleRecordPayment} className="overflow-y-auto space-y-4 text-xs pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Reservation *</label>
                <select
                  value={paymentReservationId}
                  onChange={(e) => setPaymentReservationId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  {reservations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.bookingNumber} - {r.customerName} (Due: ₹{r.dueAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  min={1}
                  placeholder="e.g. 5000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-emerald-700 font-mono font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value={0}>Cash 💵</option>
                  <option value={1}>UPI (GPay / PhonePe / Paytm) 📱</option>
                  <option value={2}>Credit / Debit Card 💳</option>
                  <option value={3}>Bank Transfer 🏛️</option>
                  <option value={4}>Razorpay Online ⚡</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Ref / Reference No.</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="UPI-Ref-123456"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all mt-4"
              >
                Confirm Payment Settlement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
