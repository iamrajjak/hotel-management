'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { expenseApi } from '@/lib/api/services';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  IndianRupee, 
  Calendar, 
  Tag, 
  CreditCard, 
  Building2, 
  FileText, 
  X,
  TrendingDown,
  Sparkles
} from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  vendorName?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  referenceNumber?: string;
}

export default function ExpensesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [category, setCategory] = useState('Utilities');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendorName, setVendorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_info');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setCurrentUser(user);
          if (user.role === 'StaffManager') {
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        } catch {}
      }
    }
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    try {
      const res = await expenseApi.getExpenses();
      if (res.success && Array.isArray(res.data)) {
        setExpenses(res.data);
      } else {
        if (res.message?.includes('403') || res.message?.includes('Forbidden')) {
          setAccessDenied(true);
        }
        setExpenses([]);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await expenseApi.createExpense({
        category,
        description,
        amount: parseFloat(amount) || 0,
        expenseDate: expenseDate ? `${expenseDate}T12:00:00` : new Date().toISOString(),
        paymentMethod: paymentMethod || 'Cash',
        referenceNumber: vendorName || receiptNumber || null,
      });

      if (res.success) {
        setSuccessMsg('Expense logged successfully!');
        setShowAddModal(false);
        setDescription('');
        setAmount('');
        setVendorName('');
        setReceiptNumber('');
        loadExpenses();
      } else {
        setErrorMsg(res.message || (res.errors && res.errors.length > 0 ? res.errors.join(', ') : 'Failed to create expense entry'));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error saving expense');
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await expenseApi.deleteExpense(expenseToDelete.id);
      if (res.success) {
        setSuccessMsg(`Expense voucher "${expenseToDelete.description}" deleted successfully!`);
        setExpenseToDelete(null);
        loadExpenses();
      } else {
        setErrorMsg(res.message || 'Failed to delete expense entry');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error deleting expense');
    } finally {
      setDeleting(false);
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar userRole={currentUser?.role || 'HotelOwner'} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Expense Management & Outflow Tracking" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* ACCESS DENIED BANNER FOR STAFF MANAGER */}
          {accessDenied ? (
            <div className="bg-white border border-rose-200 rounded-3xl p-8 shadow-xl text-center space-y-4 max-w-2xl mx-auto my-12">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Expense management and operational cost controls are reserved exclusively for <span className="font-bold text-slate-900">Hotel Owner & Management</span>. Your current account role does not have permission to view or manage financial expenses.
              </p>
              <div className="pt-2">
                <a 
                  href="/dashboard" 
                  className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider inline-block transition-all shadow-md"
                >
                  Return to Dashboard
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Executive Red Outflow Hero Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-rose-950 via-red-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-rose-800/40 shadow-xl shadow-rose-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white/10 text-rose-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-300" /> Operational Expense Controls
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-400/30">
                      Owner Only
                    </span>
                  </div>

                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Expense Tracking & Vendor Bills</h1>
                    <p className="text-rose-200/90 text-xs sm:text-sm font-medium mt-1">Record recurring utility bills, maintenance overheads, staff food, and vendor invoices</p>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                      <span className="text-rose-300 text-[11px] font-bold">Total Expenses Logged:</span>
                      <span className="font-mono font-black text-white text-sm">₹{totalExpenseAmount.toLocaleString()}</span>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                      <span className="text-slate-300 text-[11px] font-bold">Total Voucher Entries:</span>
                      <span className="font-mono font-black text-white text-sm">{expenses.length}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="relative z-10 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs tracking-wide uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 self-start lg:self-center"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log New Expense</span>
                </button>
              </div>

              {/* Feedback Alert */}
              {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
                  <span>{successMsg}</span>
                  <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 text-emerald-600" /></button>
                </div>
              )}

              {/* Expense Table */}
              <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
                      <tr>
                        <th className="py-4 px-6">Date</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6">Description</th>
                        <th className="py-4 px-6">Vendor / Ref</th>
                        <th className="py-4 px-6">Payment Method</th>
                        <th className="py-4 px-6">Amount</th>
                        <th className="py-4 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="text-center py-16 text-slate-400 font-bold animate-pulse">
                            Loading hotel expense records...
                          </td>
                        </tr>
                      ) : expenses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-16 text-slate-500 space-y-2">
                            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="font-bold text-slate-700">No Expenses Recorded</p>
                            <p className="text-xs text-slate-400">Click "Log New Expense" above to add your first hotel operational expenditure.</p>
                          </td>
                        </tr>
                      ) : (
                        expenses.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6 font-mono text-slate-600">{item.expenseDate?.split('T')[0]}</td>
                            <td className="py-4 px-6">
                              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200 uppercase">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-900">{item.description}</td>
                            <td className="py-4 px-6 text-slate-600">{item.referenceNumber || item.vendorName || '-'}</td>
                            <td className="py-4 px-6 text-slate-600 font-medium">{item.paymentMethod || 'Cash'}</td>
                            <td className="py-4 px-6 font-black text-rose-600 font-mono text-sm">
                              ₹{item.amount.toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => setExpenseToDelete(item)}
                                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* CREATE EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" /> Log Operational Expense
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 font-bold">{errorMsg}</p>}

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-900"
                >
                  <option value="Utilities">Utilities (Electricity / Water / Internet)</option>
                  <option value="Maintenance">Maintenance & Repairs</option>
                  <option value="Supplies">Toiletries & Housekeeping Supplies</option>
                  <option value="KitchenInventory">Kitchen Groceries & Food Inventory</option>
                  <option value="Salaries">Staff Wages & Advance</option>
                  <option value="Marketing">Marketing & Advertising</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="e.g. Monthly Electricity Bill payment"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min={1}
                    placeholder="e.g. 4500"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-rose-600 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Reference Name</label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. State Power Board"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-900"
                  >
                    <option value="Cash">Cash</option>
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-rose-600/25 transition-all mt-4"
              >
                Confirm & Log Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM PREMIUM DELETE CONFIRMATION MODAL */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-rose-100 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Expense Voucher?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Are you sure you want to permanently remove this hotel expenditure voucher?
              </p>
            </div>

            {/* Expense Record Card Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                  {expenseToDelete.category}
                </span>
                <span className="font-mono font-black text-rose-600 text-sm">
                  ₹{(expenseToDelete.amount || 0).toLocaleString()}
                </span>
              </div>
              <p className="font-bold text-slate-900 text-sm leading-snug">{expenseToDelete.description}</p>
              {expenseToDelete.referenceNumber && (
                <p className="text-[11px] text-slate-500 font-medium">Ref / Vendor: {expenseToDelete.referenceNumber}</p>
              )}
            </div>

            <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200/80">
              ⚠️ This item will be permanently removed from your local database and live Turso Cloud database.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setExpenseToDelete(null)}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteExpense}
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
    </div>
  );
}
